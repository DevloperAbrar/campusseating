const fs = require("fs");
const Papa = require("papaparse");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Student = require("../models/Student.model");
const Branch = require("../models/Branch.model");
const Department = require("../models/Department.model");
const Stream = require("../models/Stream.model");
const ActivityLog = require("../models/ActivityLog.model");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { isActive: true };
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.year) filter.year = parseInt(req.query.year);
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { enrollmentNo: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }
  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("stream", "name code")
      .skip(skip).limit(limit).sort({ enrollmentNo: 1 }),
    Student.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Students fetched", students, buildPaginationMeta(total, page, limit)));
});

const createStudent = asyncHandler(async (req, res) => {
  const { name, email, enrollmentNo, stream, department, branch, year, gender, phone, specialNeeds } = req.body;
  if (!name || !email || !enrollmentNo || !stream || !department || !branch || !year) {
    throw new ApiError(400, "Required fields missing");
  }
  const student = await Student.create({ name, email, enrollmentNo, stream, department, branch, year, gender, phone, specialNeeds });
  res.status(201).json(new ApiResponse(201, "Student created", student));
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate("branch department stream", "name code");
  if (!student) throw new ApiError(404, "Student not found");
  res.json(new ApiResponse(200, "Student updated", student));
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!student) throw new ApiError(404, "Student not found");
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

  const required = ["name", "email", "enrollmentNo", "branchCode", "year"];
  const missing = required.filter((f) => !Object.keys(data[0] || {}).includes(f));
  if (missing.length) throw new ApiError(400, `Missing CSV columns: ${missing.join(", ")}`);

  // Resolve branches
  const branchCodes = [...new Set(data.map((r) => r.branchCode?.toUpperCase()))];
  const branches = await Branch.find({ code: { $in: branchCodes } }).populate("department stream");
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
      rowErrors.push({ row: i + 2, field: "year", message: `Invalid year value: '${row.year}' — must be 1 to 6` });
      continue;
    }

    toInsert.push({
      name: row.name.trim(),
      email: row.email.trim().toLowerCase(),
      enrollmentNo: row.enrollmentNo.trim(),
      stream: branch.stream._id,
      department: branch.department._id,
      branch: branch._id,
      year: yearVal,
      gender: row.gender || "other",
      phone: row.phone || "",
      specialNeeds: row.specialNeeds === "true" || row.specialNeeds === "1",
    });
  }

  if (rowErrors.length > 0) throw new ApiError(400, "CSV validation failed", rowErrors);

  try {
    await Student.insertMany(toInsert, { ordered: true });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, "Duplicate enrollment number or email in CSV");
    throw err;
  }

  await ActivityLog.create({
    action: "STUDENT_CSV_UPLOAD",
    entity: "Student",
    description: `${toInsert.length} students imported via CSV`,
    metadata: { count: toInsert.length },
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