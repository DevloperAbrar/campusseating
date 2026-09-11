const fs = require("fs");
const Papa = require("papaparse");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId, isActive: true };
  if (req.query.branch) where.branchId = req.query.branch;
  if (req.query.department) where.departmentId = req.query.department;
  if (req.query.year) where.year = parseInt(req.query.year);
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: "insensitive" } },
      { enrollmentNo: { startsWith: req.query.search, mode: "insensitive" } },
      { email: { contains: req.query.search, mode: "insensitive" } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where, skip, take: limit, orderBy: { enrollmentNo: "asc" },
      include: {
        branch: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        stream: { select: { name: true, code: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  res.json(new ApiResponse(200, "Students fetched", students, buildPaginationMeta(total, page, limit)));
});

const createStudent = asyncHandler(async (req, res) => {
  const { name, email, enrollmentNo, stream, department, branch, year, gender, phone, specialNeeds } = req.body;
  if (!name || !email || !enrollmentNo || !stream || !department || !branch || !year) {
    throw new ApiError(400, "Required fields missing");
  }

  const student = await prisma.student.create({
    data: {
      collegeId: req.collegeId,
      name,
      email: email.toLowerCase(),
      enrollmentNo,
      streamId: stream,
      departmentId: department,
      branchId: branch,
      year: Number(year),
      gender: gender || "other",
      phone: phone || "",
      specialNeeds: specialNeeds || false,
    },
  });

  res.status(201).json(new ApiResponse(201, "Student created", student));
});

const updateStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Student not found");

  // Map frontend field names to Prisma field names
  const data = { ...req.body };
  if (data.stream) { data.streamId = data.stream; delete data.stream; }
  if (data.department) { data.departmentId = data.department; delete data.department; }
  if (data.branch) { data.branchId = data.branch; delete data.branch; }

  const student = await prisma.student.update({
    where: { id: req.params.id },
    data,
    include: {
      branch: { select: { name: true, code: true } },
      department: { select: { name: true, code: true } },
      stream: { select: { name: true, code: true } },
    },
  });

  res.json(new ApiResponse(200, "Student updated", student));
});

const deleteStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Student not found");

  await prisma.student.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json(new ApiResponse(200, "Student deactivated"));
});

const uploadCSV = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "CSV file required");

  const fileContent = fs.readFileSync(req.file.path, "utf-8");
  fs.unlinkSync(req.file.path);

  const { data, errors: parseErrors } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (parseErrors.length > 0) throw new ApiError(400, "CSV parse error", parseErrors);
  if (!data.length) throw new ApiError(400, "CSV is empty");

  const required = ["name", "email", "enrollmentNo", "branchCode", "year"];
  const missing = required.filter((f) => !Object.keys(data[0]).includes(f));
  if (missing.length) throw new ApiError(400, `Missing CSV columns: ${missing.join(", ")}`);

  // Resolve branches for this college only
  const branchCodes = [...new Set(data.map((r) => r.branchCode?.toUpperCase()))];
  const branches = await prisma.branch.findMany({
    where: { collegeId: req.collegeId, code: { in: branchCodes } },
    include: {
      department: { select: { id: true } },
      stream: { select: { id: true } },
    },
  });

  const branchMap = {};
  branches.forEach((b) => (branchMap[b.code] = b));

  const rowErrors = [];
  const toInsert = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const branch = branchMap[row.branchCode?.toUpperCase()];

    if (!branch) {
      rowErrors.push({ row: i + 2, field: "branchCode", message: `Branch '${row.branchCode}' not found` });
      continue;
    }
    if (!row.name || !row.email || !row.enrollmentNo) {
      rowErrors.push({ row: i + 2, field: "required", message: "Missing required field" });
      continue;
    }

    const yearVal = parseInt(String(row.year).trim(), 10);
    if (isNaN(yearVal) || yearVal < 1 || yearVal > 6) {
      rowErrors.push({ row: i + 2, field: "year", message: `Invalid year: '${row.year}' — must be 1 to 6` });
      continue;
    }

    toInsert.push({
      collegeId: req.collegeId,
      name: row.name.trim(),
      email: row.email.trim().toLowerCase(),
      enrollmentNo: row.enrollmentNo.trim(),
      streamId: branch.stream.id,
      departmentId: branch.department.id,
      branchId: branch.id,
      year: yearVal,
      gender: row.gender || "other",
      phone: row.phone || "",
      specialNeeds: row.specialNeeds === "true" || row.specialNeeds === "1",
    });
  }

  if (rowErrors.length > 0) throw new ApiError(400, "CSV validation failed", rowErrors);

  try {
    await prisma.student.createMany({ data: toInsert, skipDuplicates: true });
  } catch (err) {
    throw new ApiError(409, "Duplicate enrollment number or email in CSV");
  }

  await prisma.activityLog.create({
    data: {
      collegeId: req.collegeId,
      action: "STUDENT_CSV_UPLOAD",
      entity: "Student",
      description: `${toInsert.length} students imported via CSV`,
      metadata: { count: toInsert.length },
    },
  });

  res.json(new ApiResponse(200, `${toInsert.length} students imported successfully`, { imported: toInsert.length }));
});

const getCSVTemplate = asyncHandler(async (req, res) => {
  const csv = "name,email,enrollmentNo,branchCode,year,gender,phone,specialNeeds\nRahul Sharma,rahul@college.edu,0901CS211001,CSE,2,male,9876543210,false\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=students_template.csv");
  res.send(csv);
});

module.exports = { getStudents, createStudent, updateStudent, deleteStudent, uploadCSV, getCSVTemplate };