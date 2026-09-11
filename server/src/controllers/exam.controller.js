const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

// ─── EXAMS ───────────────────────────────────────────────────────────────────

const getExams = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId };
  if (req.query.status) where.status = req.query.status;

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({ where, skip, take: limit, orderBy: { examDate: "desc" } }),
    prisma.exam.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Exams fetched", exams, buildPaginationMeta(total, page, limit)));
});

const createExam = asyncHandler(async (req, res) => {
  const { title, academicYear, examDate, description } = req.body;
  if (!title || !academicYear || !examDate) throw new ApiError(400, "title, academicYear, examDate required");

  const exam = await prisma.exam.create({
    data: { collegeId: req.collegeId, title, academicYear, examDate: new Date(examDate), description: description || "" },
  });
  res.status(201).json(new ApiResponse(201, "Exam created", exam));
});

const updateExam = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.isLocked) throw new ApiError(403, "Exam is locked");

  const updated = await prisma.exam.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Exam updated", updated));
});

const deleteExam = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.isLocked) throw new ApiError(403, "Exam is locked — cannot delete");

  // Cascade delete shifts + assignments (Prisma handles via onDelete: Cascade in schema)
  await prisma.exam.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Exam deleted"));
});

// ─── SHIFTS ──────────────────────────────────────────────────────────────────

const getShifts = asyncHandler(async (req, res) => {
  const shifts = await prisma.shift.findMany({
    where: { examId: req.params.examId, collegeId: req.collegeId },
    orderBy: { startTime: "asc" },
    include: { shiftRooms: { include: { room: { select: { name: true, building: true, usableCapacity: true } } } } },
  });
  res.json(new ApiResponse(200, "Shifts fetched", shifts));
});

const createShift = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, collegeId: req.collegeId } });
  if (!exam) throw new ApiError(404, "Exam not found");

  const { name, startTime, endTime, selectedBranchIds, selectedYears, rooms, seatingRules } = req.body;
  if (!name || !startTime || !endTime) throw new ApiError(400, "name, startTime, endTime required");

  const shift = await prisma.shift.create({
    data: {
      collegeId: req.collegeId,
      examId: req.params.examId,
      name, startTime, endTime,
      selectedBranchIds: selectedBranchIds || [],
      selectedYears: selectedYears || [],
      seatingRules: seatingRules || {},
      shiftRooms: rooms?.length ? {
        create: rooms.map((r) => ({
          roomId: r.room, priority: r.priority || 0, usableCapacity: r.usableCapacity || 0,
        })),
      } : undefined,
    },
    include: { shiftRooms: true },
  });
  res.status(201).json(new ApiResponse(201, "Shift created", shift));
});

const updateShift = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Shift is published — unpublish first");

  const updated = await prisma.shift.update({ where: { id: req.params.shiftId }, data: req.body });
  res.json(new ApiResponse(200, "Shift updated", updated));
});

const deleteShift = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Cannot delete published shift");

  await prisma.shift.delete({ where: { id: req.params.shiftId } });
  res.json(new ApiResponse(200, "Shift deleted"));
});

const resolveStudents = asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, examId: req.params.examId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");

  const where = { collegeId: req.collegeId, isActive: true };
  if (shift.selectedBranchIds?.length) where.branchId = { in: shift.selectedBranchIds };
  if (shift.selectedYears?.length) where.year = { in: shift.selectedYears };

  const students = await prisma.student.findMany({ where, select: { id: true } });

  const shiftRooms = await prisma.shiftRoom.findMany({ where: { shiftId: shift.id } });
  const totalSeats = shiftRooms.reduce((sum, r) => sum + (r.usableCapacity || 0), 0);

  if (students.length > totalSeats) {
    return res.json(new ApiResponse(200, "Warning: More students than seats", {
      studentIds: students.map((s) => s.id),
      totalStudents: students.length,
      totalAvailableSeats: totalSeats,
      warning: `${students.length - totalSeats} students cannot be seated`,
    }));
  }

  await prisma.shift.update({
    where: { id: shift.id },
    data: { studentIds: students.map((s) => s.id), totalStudents: students.length, totalAvailableSeats: totalSeats },
  });

  res.json(new ApiResponse(200, "Students resolved", { totalStudents: students.length, totalAvailableSeats: totalSeats }));
});

// ─── INVIGILATORS ────────────────────────────────────────────────────────────

const getInvigilators = asyncHandler(async (req, res) => {
  const assignments = await prisma.invigilatorAssignment.findMany({
    where: { examId: req.params.examId, shiftId: req.params.shiftId, collegeId: req.collegeId },
    include: {
      faculty: { select: { name: true, email: true, designation: true } },
      room: { select: { name: true, building: true } },
    },
  });
  res.json(new ApiResponse(200, "Invigilators fetched", assignments));
});

const assignInvigilator = asyncHandler(async (req, res) => {
  const { facultyId, roomId } = req.body;
  if (!facultyId || !roomId) throw new ApiError(400, "facultyId and roomId required");

  const existing = await prisma.invigilatorAssignment.findFirst({ where: { shiftId: req.params.shiftId, facultyId } });
  if (existing) throw new ApiError(409, "Faculty already assigned to a room in this shift");

  const assignment = await prisma.invigilatorAssignment.create({
    data: { collegeId: req.collegeId, examId: req.params.examId, shiftId: req.params.shiftId, roomId, facultyId },
  });
  res.status(201).json(new ApiResponse(201, "Invigilator assigned", assignment));
});

const removeInvigilator = asyncHandler(async (req, res) => {
  const assignment = await prisma.invigilatorAssignment.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!assignment) throw new ApiError(404, "Assignment not found");

  await prisma.invigilatorAssignment.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Invigilator removed"));
});

module.exports = {
  getExams, createExam, updateExam, deleteExam,
  getShifts, createShift, updateShift, deleteShift, resolveStudents,
  getInvigilators, assignInvigilator, removeInvigilator,
};