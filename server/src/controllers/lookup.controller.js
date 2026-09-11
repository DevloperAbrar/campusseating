const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");

const studentLookup = asyncHandler(async (req, res) => {
  const { enrollmentNo } = req.params;

  const student = await prisma.student.findFirst({
    where: { enrollmentNo, isActive: true },
    include: { branch: { select: { name: true, code: true } }, department: { select: { name: true } }, stream: { select: { name: true } } },
  });
  if (!student) throw new ApiError(404, "Student not found");

  const assignments = await prisma.seatingAssignment.findMany({
    where: { studentId: student.id },
    include: {
      room: { select: { name: true, building: true, floor: true } },
      shift: { select: { name: true, startTime: true, endTime: true, isPublished: true } },
      exam: { select: { title: true, academicYear: true, examDate: true, status: true } },
    },
  });

  const published = assignments.filter((a) => a.shift?.isPublished);

  res.json(new ApiResponse(200, "Student found", {
    student: { name: student.name, enrollmentNo: student.enrollmentNo, branch: student.branch?.name, year: student.year },
    seatAssignments: published.map((a) => ({
      exam: a.exam?.title, academicYear: a.exam?.academicYear, examDate: a.exam?.examDate,
      shift: a.shift?.name, time: `${a.shift?.startTime} – ${a.shift?.endTime}`,
      room: a.room?.name, building: a.room?.building, seatId: a.seatId,
    })),
  }));
});

const facultyLookup = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const faculty = await prisma.faculty.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
  });
  if (!faculty) throw new ApiError(404, "Faculty not found");

  const assignments = await prisma.invigilatorAssignment.findMany({
    where: { facultyId: faculty.id },
    include: {
      room: { select: { name: true, building: true } },
      shift: { select: { name: true, startTime: true, endTime: true, isPublished: true } },
      exam: { select: { title: true, academicYear: true, examDate: true } },
    },
  });

  const published = assignments.filter((a) => a.shift?.isPublished);

  res.json(new ApiResponse(200, "Faculty found", {
    faculty: { name: faculty.name, email: faculty.email, designation: faculty.designation },
    dutyAssignments: published.map((a) => ({
      exam: a.exam?.title, examDate: a.exam?.examDate, shift: a.shift?.name,
      time: `${a.shift?.startTime} – ${a.shift?.endTime}`, room: a.room?.name, building: a.room?.building,
    })),
  }));
});

module.exports = { studentLookup, facultyLookup };