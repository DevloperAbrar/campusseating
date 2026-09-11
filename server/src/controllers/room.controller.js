const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getRooms = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId, isActive: true };
  if (req.query.search) where.name = { contains: req.query.search, mode: "insensitive" };

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({ where, skip, take: limit, orderBy: { name: "asc" },
      select: {
        id: true, name: true, building: true, floor: true, rows: true,
        benchesPerRow: true, defaultSeatsPerBench: true, totalCapacity: true,
        usableCapacity: true, isLocked: true, isActive: true, createdAt: true,
      },
    }),
    prisma.room.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Rooms fetched", rooms, buildPaginationMeta(total, page, limit)));
});

const getRoomById = asyncHandler(async (req, res) => {
  const room = await prisma.room.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!room) throw new ApiError(404, "Room not found");
  res.json(new ApiResponse(200, "Room fetched", room));
});

const createRoom = asyncHandler(async (req, res) => {
  const { name, building, floor, rows, benchesPerRow, defaultSeatsPerBench } = req.body;
  if (!name || !rows || !benchesPerRow || !defaultSeatsPerBench) {
    throw new ApiError(400, "name, rows, benchesPerRow, defaultSeatsPerBench required");
  }

  // Generate seats array
  const seats = [];
  for (let r = 1; r <= rows; r++) {
    for (let b = 1; b <= benchesPerRow; b++) {
      for (let p = 1; p <= defaultSeatsPerBench; p++) {
        seats.push({
          seatId: `R${r}B${b}P${p}`,
          row: `R${r}`, bench: b, position: p === 1 ? "L" : "R",
          status: "available",
        });
      }
    }
  }

  const totalCapacity = seats.length;
  const room = await prisma.room.create({
    data: {
      collegeId: req.collegeId, name, building: building || "", floor: floor || "",
      rows: Number(rows), benchesPerRow: Number(benchesPerRow),
      defaultSeatsPerBench: Number(defaultSeatsPerBench),
      seats, totalCapacity, usableCapacity: totalCapacity,
    },
  });
  res.status(201).json(new ApiResponse(201, "Room created", room));
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await prisma.room.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!room) throw new ApiError(404, "Room not found");
  if (room.isLocked) throw new ApiError(403, "Room is locked after exam use");

  const updated = await prisma.room.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Room updated", updated));
});

const updateRoomSeats = asyncHandler(async (req, res) => {
  const { seats: updatedSeats } = req.body;
  const room = await prisma.room.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!room) throw new ApiError(404, "Room not found");

  const seats = room.seats.map((seat) => {
    const update = updatedSeats.find((s) => s.seatId === seat.seatId);
    return update ? { ...seat, status: update.status } : seat;
  });

  const usableCapacity = seats.filter((s) => s.status === "available").length;
  const updated = await prisma.room.update({
    where: { id: req.params.id },
    data: { seats, usableCapacity },
  });
  res.json(new ApiResponse(200, "Seats updated", { usableCapacity: updated.usableCapacity }));
});

const deleteRoom = asyncHandler(async (req, res) => {
  const room = await prisma.room.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!room) throw new ApiError(404, "Room not found");
  if (room.isLocked) throw new ApiError(403, "Room is locked — cannot delete");

  await prisma.room.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json(new ApiResponse(200, "Room deactivated"));
});

module.exports = { getRooms, getRoomById, createRoom, updateRoom, updateRoomSeats, deleteRoom };