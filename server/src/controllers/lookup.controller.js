const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Student = require("../models/Student.model");
const Faculty = require("../models/Faculty.model");
const SeatingAssignment = require("../models/SeatingAssignment.model");
const InvigilatorAssignment = require("../models/InvigilatorAssignment.model");
const Exam = require("../models/Exam.model");
const Shift = require("../models/Shift.model");

const studentLookup = asyncHandler(async (req, res) => {
  const { enrollmentNo } = req.params;

  const student = await Student.findOne({ enrollmentNo, isActive: true })
    .populate("branch department stream", "name code").lean();
  if (!student) throw new ApiError(404, "Student not found");

  // Find published assignments
  const assignments = await SeatingAssignment.find({ student: student._id })
    .populate("room", "name building floor")
    .populate({ path: "shift", select: "name startTime endTime isPublished" })
    .populate({ path: "exam", select: "title academicYear examDate status" })
    .lean();

  const published = assignments.filter((a) => a.shift?.isPublished);

  res.json(new ApiResponse(200, "Student found", {
    student: {
      name: student.name,
      enrollmentNo: student.enrollmentNo,
      branch: student.branch?.name,
      year: student.year,
    },
    seatAssignments: published.map((a) => ({
      exam: a.exam?.title,
      academicYear: a.exam?.academicYear,
      examDate: a.exam?.examDate,
      shift: a.shift?.name,
      time: `${a.shift?.startTime} – ${a.shift?.endTime}`,
      room: a.room?.name,
      building: a.room?.building,
      seatId: a.seatId,
    })),
  }));
});

const facultyLookup = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const faculty = await Faculty.findOne({ email: email.toLowerCase(), isActive: true })
    .populate("departments", "name code").lean();
  if (!faculty) throw new ApiError(404, "Faculty not found");

  const assignments = await InvigilatorAssignment.find({ faculty: faculty._id })
    .populate("room", "name building")
    .populate({ path: "shift", select: "name startTime endTime isPublished" })
    .populate({ path: "exam", select: "title academicYear examDate" })
    .lean();

  const published = assignments.filter((a) => a.shift?.isPublished);

  res.json(new ApiResponse(200, "Faculty found", {
    faculty: {
      name: faculty.name,
      email: faculty.email,
      designation: faculty.designation,
    },
    dutyAssignments: published.map((a) => ({
      exam: a.exam?.title,
      examDate: a.exam?.examDate,
      shift: a.shift?.name,
      time: `${a.shift?.startTime} – ${a.shift?.endTime}`,
      room: a.room?.name,
      building: a.room?.building,
    })),
  }));
});

module.exports = { studentLookup, facultyLookup };