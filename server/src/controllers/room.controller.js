const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const MAX_ROWS = 26;
const MAX_BENCHES_PER_ROW = 50;
const MAX_SEATS_PER_BENCH = 4;

/**
 * A room is "locked" only while it is actually in use:
 *  - it has seating assignments, or
 *  - it is attached to a shift (ShiftRoom).
 * Computed live (not stored) so it can never go stale when an exam,
 * shift or seating plan is deleted/reset. The legacy `Room.isLocked` column is ignored.
 */
const getLockedRoomIds = async (roomIds) => {
  if (!roomIds.length) return new Set();

  const [assignmentGroups, shiftRoomGroups] = await Promise.all([
    prisma.seatingAssignment.groupBy({
      by: ["roomId"],
      where: { roomId: { in: roomIds } },
      _count: { _all: true },
    }),
    prisma.shiftRoom.groupBy({
      by: ["roomId"],
      where: { roomId: { in: roomIds } },
      _count: { _all: true },
    }),
  ]);

  return new Set([
    ...assignmentGroups.map((g) => g.roomId),
    ...shiftRoomGroups.map((g) => g.roomId),
  ]);
};

const isRoomLocked = async (roomId) => {
  const locked = await getLockedRoomIds([roomId]);
  return locked.has(roomId);
};

const findRoomOrFail = async (id, collegeId) => {
  const room = await prisma.room.findFirst({ where: { id, collegeId, isActive: true } });
  if (!room) throw new ApiError(404, "Room not found");
  return room;
};

// Validates and normalises the layout numbers. Throws 400 on bad input.
const parseLayout = ({ rows, benchesPerRow, defaultSeatsPerBench }) => {
  const r = Number(rows);
  const b = Number(benchesPerRow);
  const p = Number(defaultSeatsPerBench);

  if (![r, b, p].every((n) => Number.isInteger(n) && n > 0)) {
    throw new ApiError(400, "rows, benchesPerRow and defaultSeatsPerBench must be positive whole numbers");
  }
  if (r > MAX_ROWS) throw new ApiError(400, `Number of rows cannot exceed ${MAX_ROWS}`);
  if (b > MAX_BENCHES_PER_ROW) throw new ApiError(400, `Benches per row cannot exceed ${MAX_BENCHES_PER_ROW}`);
  if (p > MAX_SEATS_PER_BENCH) throw new ApiError(400, `Seats per bench cannot exceed ${MAX_SEATS_PER_BENCH}`);

  return { rows: r, benchesPerRow: b, defaultSeatsPerBench: p };
};

// Generates the seat array for a layout (same format as before)
const generateSeats = ({ rows, benchesPerRow, defaultSeatsPerBench }) => {
  const seats = [];
  for (let r = 1; r <= rows; r++) {
    for (let b = 1; b <= benchesPerRow; b++) {
      for (let p = 1; p <= defaultSeatsPerBench; p++) {
        seats.push({
          seatId: `R${r}B${b}P${p}`,
          row: `R${r}`,
          bench: b,
          position: p === 1 ? "L" : "R",
          status: "available",
        });
      }
    }
  }
  return seats;
};

const getRooms = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId, isActive: true };
  if (req.query.search) where.name = { contains: req.query.search, mode: "insensitive" };

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, building: true, floor: true, rows: true,
        benchesPerRow: true, defaultSeatsPerBench: true, totalCapacity: true,
        usableCapacity: true, isActive: true, createdAt: true,
      },
    }),
    prisma.room.count({ where }),
  ]);

  const lockedIds = await getLockedRoomIds(rooms.map((r) => r.id));
  const data = rooms.map((r) => ({ ...r, isLocked: lockedIds.has(r.id) }));

  res.json(new ApiResponse(200, "Rooms fetched", data, buildPaginationMeta(total, page, limit)));
});

const getRoomById = asyncHandler(async (req, res) => {
  const room = await findRoomOrFail(req.params.id, req.collegeId);
  const isLocked = await isRoomLocked(room.id);
  res.json(new ApiResponse(200, "Room fetched", { ...room, isLocked }));
});

const createRoom = asyncHandler(async (req, res) => {
  const { name, building, floor, rows, benchesPerRow, defaultSeatsPerBench } = req.body;
  if (!name || !String(name).trim() || !rows || !benchesPerRow || !defaultSeatsPerBench) {
    throw new ApiError(400, "name, rows, benchesPerRow, defaultSeatsPerBench required");
  }

  const layout = parseLayout({ rows, benchesPerRow, defaultSeatsPerBench });
  const seats = generateSeats(layout);

  const room = await prisma.room.create({
    data: {
      collegeId: req.collegeId,
      name: String(name).trim(),
      building: building || "",
      floor: floor || "",
      ...layout,
      seats,
      totalCapacity: seats.length,
      usableCapacity: seats.length,
    },
  });
  res.status(201).json(new ApiResponse(201, "Room created", { ...room, isLocked: false }));
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await findRoomOrFail(req.params.id, req.collegeId);
  if (await isRoomLocked(room.id)) {
    throw new ApiError(403, "Room is used in an exam and cannot be edited. Delete or reset the exam seating first.");
  }

  const { name, building, floor, rows, benchesPerRow, defaultSeatsPerBench } = req.body;
  const data = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new ApiError(400, "Room name cannot be empty");
    data.name = trimmed;
  }
  if (building !== undefined) data.building = building;
  if (floor !== undefined) data.floor = floor;

  // Layout: only regenerate seats when rows / benches / seats-per-bench actually changed,
  // so editing just the name or floor never wipes custom blocked/reserved seats.
  const layoutSent = [rows, benchesPerRow, defaultSeatsPerBench].some(
    (v) => v !== undefined && v !== null && v !== ""
  );
  if (layoutSent) {
    const layout = parseLayout({
      rows: rows ?? room.rows,
      benchesPerRow: benchesPerRow ?? room.benchesPerRow,
      defaultSeatsPerBench: defaultSeatsPerBench ?? room.defaultSeatsPerBench,
    });

    const layoutChanged =
      layout.rows !== room.rows ||
      layout.benchesPerRow !== room.benchesPerRow ||
      layout.defaultSeatsPerBench !== room.defaultSeatsPerBench;

    if (layoutChanged) {
      const seats = generateSeats(layout);
      Object.assign(data, layout, {
        seats,
        totalCapacity: seats.length,
        usableCapacity: seats.length,
      });
    }
  }

  if (Object.keys(data).length === 0) {
    return res.json(new ApiResponse(200, "No changes", { ...room, isLocked: false }));
  }

  // Duplicate name (P2002) is turned into a 409 by the error middleware
  const updated = await prisma.room.update({ where: { id: room.id }, data });
  res.json(new ApiResponse(200, "Room updated", { ...updated, isLocked: false }));
});

const updateRoomSeats = asyncHandler(async (req, res) => {
  const { seats: updatedSeats } = req.body;
  if (!Array.isArray(updatedSeats)) throw new ApiError(400, "seats array required");

  const room = await findRoomOrFail(req.params.id, req.collegeId);

  const seats = (room.seats || []).map((seat) => {
    const update = updatedSeats.find((s) => s.seatId === seat.seatId);
    return update ? { ...seat, status: update.status } : seat;
  });

  const usableCapacity = seats.filter((s) => s.status === "available").length;
  const updated = await prisma.room.update({
    where: { id: room.id },
    data: { seats, usableCapacity },
  });
  res.json(new ApiResponse(200, "Seats updated", { usableCapacity: updated.usableCapacity }));
});

const deleteRoom = asyncHandler(async (req, res) => {
  const room = await findRoomOrFail(req.params.id, req.collegeId);
  if (await isRoomLocked(room.id)) {
    throw new ApiError(403, "Room is used in an exam and cannot be deleted. Delete or reset the exam seating first.");
  }

  await prisma.room.update({ where: { id: room.id }, data: { isActive: false } });
  res.json(new ApiResponse(200, "Room deactivated"));
});

module.exports = { getRooms, getRoomById, createRoom, updateRoom, updateRoomSeats, deleteRoom };