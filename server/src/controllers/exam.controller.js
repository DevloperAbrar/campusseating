const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Exam = require("../models/Exam.model");
const Shift = require("../models/Shift.model");
const Student = require("../models/Student.model");
const InvigilatorAssignment = require("../models/InvigilatorAssignment.model");
const Faculty = require("../models/Faculty.model");
const Room = require("../models/Room.model");
const ActivityLog = require("../models/ActivityLog.model");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

// ─── EXAMS ──────────────────────────────────────────────────────────────────

const getExams = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [exams, total] = await Promise.all([
    Exam.find(filter).skip(skip).limit(limit).sort({ examDate: -1 }),
    Exam.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Exams fetched", exams, buildPaginationMeta(total, page, limit)));
});

const createExam = asyncHandler(async (req, res) => {
  const { title, academicYear, examDate, description } = req.body;
  if (!title || !academicYear || !examDate) throw new ApiError(400, "title, academicYear, examDate required");
  const exam = await Exam.create({ title, academicYear, examDate, description });
  res.status(201).json(new ApiResponse(201, "Exam created", exam));
});

const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.isLocked) throw new ApiError(403, "Exam is locked");
  Object.assign(exam, req.body);
  await exam.save();
  res.json(new ApiResponse(200, "Exam updated", exam));
});

const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.isLocked) throw new ApiError(403, "Exam is locked — cannot delete");
  await Shift.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  res.json(new ApiResponse(200, "Exam deleted"));
});

// ─── SHIFTS ─────────────────────────────────────────────────────────────────

const getShifts = asyncHandler(async (req, res) => {
  const shifts = await Shift.find({ exam: req.params.examId })
    .populate("selectedBranches", "name code")
    .populate("rooms.room", "name building usableCapacity")
    .sort({ startTime: 1 });
  res.json(new ApiResponse(200, "Shifts fetched", shifts));
});

const createShift = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) throw new ApiError(404, "Exam not found");

  const { name, startTime, endTime, selectedBranches, selectedYears, rooms, seatingRules } = req.body;
  if (!name || !startTime || !endTime) throw new ApiError(400, "name, startTime, endTime required");

  // Check room conflicts — same room same shift
  if (rooms?.length) {
    const roomIds = rooms.map((r) => r.room);
    const existing = await Shift.findOne({ exam: req.params.examId, "rooms.room": { $in: roomIds }, name });
    if (existing) throw new ApiError(409, "Room already assigned to a shift with same name");
  }

  const shift = await Shift.create({
    exam: req.params.examId, name, startTime, endTime,
    selectedBranches, selectedYears, rooms, seatingRules,
  });

  res.status(201).json(new ApiResponse(201, "Shift created", shift));
});

const updateShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Shift is published — unpublish first");
  Object.assign(shift, req.body);
  await shift.save();
  res.json(new ApiResponse(200, "Shift updated", shift));
});

const deleteShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished) throw new ApiError(403, "Cannot delete published shift");
  await shift.deleteOne();
  res.json(new ApiResponse(200, "Shift deleted"));
});

const resolveStudents = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.shiftId, exam: req.params.examId });
  if (!shift) throw new ApiError(404, "Shift not found");

  const filter = { isActive: true };
  if (shift.selectedBranches?.length) filter.branch = { $in: shift.selectedBranches };
  if (shift.selectedYears?.length) filter.year = { $in: shift.selectedYears };

  const students = await Student.find(filter).select("_id");
  const totalSeats = shift.rooms.reduce((sum, r) => sum + (r.usableCapacity || 0), 0);

  if (students.length > totalSeats) {
    return res.json(new ApiResponse(200, "Warning: More students than seats", {
      studentIds: students.map((s) => s._id),
      totalStudents: students.length,
      totalAvailableSeats: totalSeats,
      warning: `${students.length - totalSeats} students cannot be seated`,
    }));
  }

  shift.studentIds = students.map((s) => s._id);
  shift.totalStudents = students.length;
  shift.totalAvailableSeats = totalSeats;
  await shift.save();

  res.json(new ApiResponse(200, "Students resolved", {
    totalStudents: shift.totalStudents,
    totalAvailableSeats: shift.totalAvailableSeats,
  }));
});

// ─── INVIGILATORS ────────────────────────────────────────────────────────────

const getInvigilators = asyncHandler(async (req, res) => {
  const assignments = await InvigilatorAssignment.find({
    exam: req.params.examId, shift: req.params.shiftId,
  }).populate("faculty", "name email designation").populate("room", "name building");
  res.json(new ApiResponse(200, "Invigilators fetched", assignments));
});

const assignInvigilator = asyncHandler(async (req, res) => {
  const { facultyId, roomId } = req.body;
  if (!facultyId || !roomId) throw new ApiError(400, "facultyId and roomId required");

  // Check faculty not in two rooms same shift
  const existing = await InvigilatorAssignment.findOne({ shift: req.params.shiftId, faculty: facultyId });
  if (existing) throw new ApiError(409, "Faculty already assigned to a room in this shift");

  const assignment = await InvigilatorAssignment.create({
    exam: req.params.examId, shift: req.params.shiftId, room: roomId, faculty: facultyId,
  });

  res.status(201).json(new ApiResponse(201, "Invigilator assigned", assignment));
});

const removeInvigilator = asyncHandler(async (req, res) => {
  const assignment = await InvigilatorAssignment.findByIdAndDelete(req.params.id);
  if (!assignment) throw new ApiError(404, "Assignment not found");
  res.json(new ApiResponse(200, "Invigilator removed"));
});

module.exports = {
  getExams, createExam, updateExam, deleteExam,
  getShifts, createShift, updateShift, deleteShift, resolveStudents,
  getInvigilators, assignInvigilator, removeInvigilator,
};