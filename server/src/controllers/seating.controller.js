const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { generateSeatingPlan } = require("../services/seating.service");

const generateSeating = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({
    where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId },
    include: { shiftRooms: true },
  });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Shift is published — reset first");
  if (!shift.studentIds?.length) throw new ApiError(400, "Resolve students first");

  const students = await prisma.student.findMany({
    where: { id: { in: shift.studentIds }, isActive: true },
    select: { id: true, enrollmentNo: true, branchId: true, year: true, gender: true, specialNeeds: true, name: true },
  });

  const roomIds = shift.shiftRooms.map((r) => r.roomId);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });

  const enrichedRooms = rooms.map((room) => {
    const shiftRoom = shift.shiftRooms.find((r) => r.roomId === room.id);
    return { ...room, priority: shiftRoom?.priority || 99, usableCapacity: shiftRoom?.usableCapacity || room.usableCapacity };
  });

  const { assignments, unassigned, warnings } = generateSeatingPlan(students, enrichedRooms, shift.seatingRules);

  await prisma.seatingAssignment.deleteMany({ where: { shiftId: shift.id } });

  await prisma.seatingAssignment.createMany({
    data: assignments.map((a) => ({
      collegeId: req.collegeId,
      examId: req.params.examId,
      shiftId: shift.id,
      roomId: a.roomId,
      studentId: a.studentId,
      seatId: a.seatId,
      row: a.row,
      bench: a.bench,
      position: a.position,
    })),
  });

  await prisma.room.updateMany({ where: { id: { in: roomIds } }, data: { isLocked: true } });
  await prisma.shift.update({ where: { id: shift.id }, data: { planGenerated: true, planGeneratedAt: new Date() } });

  await prisma.activityLog.create({
    data: {
      collegeId: req.collegeId, action: "SEATING_GENERATED", entity: "Shift", entityId: shift.id,
      description: `Seating plan generated: ${assignments.length} students assigned`,
      metadata: { assigned: assignments.length, unassigned: unassigned.length, warnings },
    },
  });

  res.json(new ApiResponse(200, "Seating plan generated", {
    assigned: assignments.length, unassigned: unassigned.length,
    unassignedStudents: unassigned.map((s) => ({ id: s.id, name: s.name, enrollmentNo: s.enrollmentNo })),
    warnings,
  }));
});

const previewSeating = asyncHandler(async (req, res) => {
  const assignments = await prisma.seatingAssignment.findMany({
    where: { shiftId: req.params.shiftId, collegeId: req.collegeId },
    include: {
      student: { include: { branch: { select: { name: true, code: true } } } },
      room: { select: { id: true, name: true, building: true } },
    },
  });

  const grouped = {};
  for (const a of assignments) {
    const roomId = a.room.id;
    if (!grouped[roomId]) grouped[roomId] = { room: a.room, assignments: [] };
    grouped[roomId].assignments.push(a);
  }
  res.json(new ApiResponse(200, "Seating preview", Object.values(grouped)));
});

const swapSeats = asyncHandler(async (req, res) => {
  const { studentA, studentB } = req.body;
  if (!studentA || !studentB) throw new ApiError(400, "studentA and studentB required");

  const [a, b] = await Promise.all([
    prisma.seatingAssignment.findFirst({ where: { shiftId: req.params.shiftId, studentId: studentA } }),
    prisma.seatingAssignment.findFirst({ where: { shiftId: req.params.shiftId, studentId: studentB } }),
  ]);
  if (!a || !b) throw new ApiError(404, "One or both student assignments not found");

  await Promise.all([
    prisma.seatingAssignment.update({ where: { id: a.id }, data: { roomId: b.roomId, seatId: b.seatId, row: b.row, bench: b.bench, position: b.position, isManualOverride: true } }),
    prisma.seatingAssignment.update({ where: { id: b.id }, data: { roomId: a.roomId, seatId: a.seatId, row: a.row, bench: a.bench, position: a.position, isManualOverride: true } }),
  ]);
  res.json(new ApiResponse(200, "Seats swapped successfully"));
});

const manualAssign = asyncHandler(async (req, res) => {
  const { studentId, roomId, seatId } = req.body;
  if (!studentId || !roomId || !seatId) throw new ApiError(400, "studentId, roomId, seatId required");

  const taken = await prisma.seatingAssignment.findFirst({ where: { shiftId: req.params.shiftId, roomId, seatId } });
  if (taken) throw new ApiError(409, `Seat ${seatId} is already occupied`);

  const room = await prisma.room.findFirst({ where: { id: roomId, collegeId: req.collegeId } });
  const seat = room?.seats?.find((s) => s.seatId === seatId);
  if (!seat) throw new ApiError(404, "Seat not found in room");

  await prisma.seatingAssignment.deleteMany({ where: { shiftId: req.params.shiftId, studentId } });

  const assignment = await prisma.seatingAssignment.create({
    data: {
      collegeId: req.collegeId, examId: req.params.examId, shiftId: req.params.shiftId,
      roomId, studentId, seatId, row: seat.row, bench: seat.bench, position: seat.position, isManualOverride: true,
    },
  });
  res.json(new ApiResponse(200, "Manual assignment done", assignment));
});

const resetSeating = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Unpublish first before resetting");

  await prisma.seatingAssignment.deleteMany({ where: { shiftId: shift.id } });
  await prisma.shift.update({ where: { id: shift.id }, data: { planGenerated: false, planGeneratedAt: null } });
  res.json(new ApiResponse(200, "Seating plan reset"));
});

const publishSeating = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (!shift.planGenerated) throw new ApiError(400, "Generate seating plan first");

  const assigned = await prisma.seatingAssignment.count({ where: { shiftId: shift.id } });
  const unassigned = shift.totalStudents - assigned;
  if (unassigned > 0) throw new ApiError(400, `${unassigned} students unassigned — cannot publish`);

  await prisma.shift.update({ where: { id: shift.id }, data: { isPublished: true, publishedAt: new Date() } });
  await prisma.activityLog.create({
    data: { collegeId: req.collegeId, action: "SEATING_PUBLISHED", entity: "Shift", entityId: shift.id, description: "Seating plan published" },
  });
  res.json(new ApiResponse(200, "Seating plan published"));
});

const unpublishSeating = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");

  await prisma.shift.update({ where: { id: shift.id }, data: { isPublished: false, publishedAt: null } });
  res.json(new ApiResponse(200, "Seating plan unpublished"));
});

module.exports = { generateSeating, previewSeating, swapSeats, manualAssign, resetSeating, publishSeating, unpublishSeating };