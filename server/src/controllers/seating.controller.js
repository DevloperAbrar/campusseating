const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Shift = require("../models/Shift.model");
const Student = require("../models/Student.model");
const Room = require("../models/Room.model");
const SeatingAssignment = require("../models/SeatingAssignment.model");
const ActivityLog = require("../models/ActivityLog.model");
const { generateSeatingPlan } = require("../services/seating.service");

const generateSeating = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Shift is published — reset first");
  if (!shift.studentIds?.length) throw new ApiError(400, "Resolve students first before generating plan");

  // Fetch students
  const students = await Student.find({ _id: { $in: shift.studentIds }, isActive: true })
    .select("_id enrollmentNo branch year gender specialNeeds name").lean();

  // Fetch rooms with seats
  const roomIds = shift.rooms.map((r) => r.room);
  const rooms = await Room.find({ _id: { $in: roomIds } }).lean();

  // Add priority and usableCapacity from shift config
  const enrichedRooms = rooms.map((room) => {
    const shiftRoom = shift.rooms.find((r) => String(r.room) === String(room._id));
    return { ...room, priority: shiftRoom?.priority || 99, usableCapacity: shiftRoom?.usableCapacity || room.usableCapacity };
  });

  const { assignments, unassigned, warnings } = generateSeatingPlan(students, enrichedRooms, shift.seatingRules);

  // Delete previous assignments
  await SeatingAssignment.deleteMany({ shift: shift._id });

  // Save new
  const docs = assignments.map((a) => ({
    exam: req.params.examId,
    shift: shift._id,
    room: a.roomId,
    student: a.studentId,
    seatId: a.seatId,
    row: a.row,
    bench: a.bench,
    position: a.position,
  }));

  await SeatingAssignment.insertMany(docs, { ordered: false });

  // Mark rooms as locked
  await Room.updateMany({ _id: { $in: roomIds } }, { isLocked: true });

  shift.planGenerated = true;
  shift.planGeneratedAt = new Date();
  await shift.save();

  await ActivityLog.create({
    action: "SEATING_GENERATED",
    entity: "Shift",
    entityId: shift._id,
    description: `Seating plan generated: ${assignments.length} students assigned`,
    metadata: { assigned: assignments.length, unassigned: unassigned.length, warnings },
  });

  res.json(new ApiResponse(200, "Seating plan generated", {
    assigned: assignments.length,
    unassigned: unassigned.length,
    unassignedStudents: unassigned.map((s) => ({ id: s._id, name: s.name, enrollmentNo: s.enrollmentNo })),
    warnings,
  }));
});

const previewSeating = asyncHandler(async (req, res) => {
  const assignments = await SeatingAssignment.find({ shift: req.params.shiftId })
    .populate("student", "name enrollmentNo branch year")
    .populate("room", "name building")
    .populate({ path: "student", populate: { path: "branch", select: "name code" } })
    .lean();

  // Group by room
  const grouped = {};
  for (const a of assignments) {
    const roomId = String(a.room._id);
    if (!grouped[roomId]) grouped[roomId] = { room: a.room, assignments: [] };
    grouped[roomId].assignments.push(a);
  }

  res.json(new ApiResponse(200, "Seating preview", Object.values(grouped)));
});

const swapSeats = asyncHandler(async (req, res) => {
  const { studentA, studentB } = req.body;
  if (!studentA || !studentB) throw new ApiError(400, "studentA and studentB required");

  const [a, b] = await Promise.all([
    SeatingAssignment.findOne({ shift: req.params.shiftId, student: studentA }),
    SeatingAssignment.findOne({ shift: req.params.shiftId, student: studentB }),
  ]);

  if (!a || !b) throw new ApiError(404, "One or both student assignments not found");

  // Swap seats
  const tempRoom = a.room; const tempSeat = a.seatId; const tempRow = a.row;
  const tempBench = a.bench; const tempPos = a.position;

  a.room = b.room; a.seatId = b.seatId; a.row = b.row; a.bench = b.bench; a.position = b.position; a.isManualOverride = true;
  b.room = tempRoom; b.seatId = tempSeat; b.row = tempRow; b.bench = tempBench; b.position = tempPos; b.isManualOverride = true;

  await Promise.all([a.save(), b.save()]);
  res.json(new ApiResponse(200, "Seats swapped successfully"));
});

const manualAssign = asyncHandler(async (req, res) => {
  const { studentId, roomId, seatId } = req.body;
  if (!studentId || !roomId || !seatId) throw new ApiError(400, "studentId, roomId, seatId required");

  // Check seat not taken
  const taken = await SeatingAssignment.findOne({ shift: req.params.shiftId, room: roomId, seatId });
  if (taken) throw new ApiError(409, `Seat ${seatId} is already occupied`);

  // Remove current assignment
  await SeatingAssignment.deleteOne({ shift: req.params.shiftId, student: studentId });

  // Get seat details from room
  const room = await Room.findById(roomId);
  const seat = room?.seats.find((s) => s.seatId === seatId);
  if (!seat) throw new ApiError(404, "Seat not found in room");

  const assignment = await SeatingAssignment.create({
    exam: req.params.examId, shift: req.params.shiftId, room: roomId,
    student: studentId, seatId, row: seat.row, bench: seat.bench, position: seat.position, isManualOverride: true,
  });

  res.json(new ApiResponse(200, "Manual assignment done", assignment));
});

const resetSeating = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Unpublish first before resetting");

  await SeatingAssignment.deleteMany({ shift: shift._id });
  shift.planGenerated = false;
  shift.planGeneratedAt = undefined;
  await shift.save();

  res.json(new ApiResponse(200, "Seating plan reset"));
});

const publishSeating = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (!shift.planGenerated) throw new ApiError(400, "Generate seating plan first");

  const unassignedCount = shift.totalStudents - (await SeatingAssignment.countDocuments({ shift: shift._id }));
  if (unassignedCount > 0) throw new ApiError(400, `${unassignedCount} students are unassigned — cannot publish`);

  shift.isPublished = true;
  shift.publishedAt = new Date();
  await shift.save();

  await ActivityLog.create({ action: "SEATING_PUBLISHED", entity: "Shift", entityId: shift._id, description: "Seating plan published" });

  res.json(new ApiResponse(200, "Seating plan published"));
});

const unpublishSeating = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");

  shift.isPublished = false;
  shift.publishedAt = undefined;
  await shift.save();

  res.json(new ApiResponse(200, "Seating plan unpublished"));
});

module.exports = { generateSeating, previewSeating, swapSeats, manualAssign, resetSeating, publishSeating, unpublishSeating };