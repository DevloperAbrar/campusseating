const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Room = require("../models/Room.model");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getRooms = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { isActive: true };
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };
  const [rooms, total] = await Promise.all([
    Room.find(filter).select("-seats").skip(skip).limit(limit).sort({ name: 1 }),
    Room.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Rooms fetched", rooms, buildPaginationMeta(total, page, limit)));
});

const createRoom = asyncHandler(async (req, res) => {
  const { name, building, floor, rows, benchesPerRow, defaultSeatsPerBench } = req.body;
  if (!name || !rows || !benchesPerRow || !defaultSeatsPerBench) throw new ApiError(400, "name, rows, benchesPerRow, defaultSeatsPerBench required");
  const room = await Room.create({ name, building, floor, rows, benchesPerRow, defaultSeatsPerBench });
  res.status(201).json(new ApiResponse(201, "Room created", room));
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, "Room not found");
  if (room.isLocked) throw new ApiError(403, "Room is locked after exam use");

  Object.assign(room, req.body);
  await room.save();
  res.json(new ApiResponse(200, "Room updated", room));
});

const updateRoomSeats = asyncHandler(async (req, res) => {
  const { seats } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, "Room not found");

  // Update seat statuses individually
  seats.forEach(({ seatId, status }) => {
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (seat) seat.status = status;
  });

  room.usableCapacity = room.seats.filter((s) => s.status === "available").length;
  await room.save();

  res.json(new ApiResponse(200, "Seats updated", { usableCapacity: room.usableCapacity }));
});

const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, "Room not found");
  if (room.isLocked) throw new ApiError(403, "Room is locked — cannot delete");
  room.isActive = false;
  await room.save();
  res.json(new ApiResponse(200, "Room deactivated"));
});

const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, "Room not found");
  res.json(new ApiResponse(200, "Room fetched", room));
});

// exports line replace karo
module.exports = { getRooms, getRoomById, createRoom, updateRoom, updateRoomSeats, deleteRoom };