const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Stream = require("../models/Stream.model");
const Department = require("../models/Department.model");
const Branch = require("../models/Branch.model");
const Student = require("../models/Student.model");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

// ─── STREAMS ────────────────────────────────────────────────────────────────

const getStreams = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = req.query.active !== undefined ? { isActive: req.query.active === "true" } : {};
  const [streams, total] = await Promise.all([
    Stream.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Stream.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Streams fetched", streams, buildPaginationMeta(total, page, limit)));
});

const createStream = asyncHandler(async (req, res) => {
  const { name, code, durationYears } = req.body;
  if (!name || !code || !durationYears) throw new ApiError(400, "name, code, durationYears required");
  const stream = await Stream.create({ name, code: code.toUpperCase(), durationYears });
  res.status(201).json(new ApiResponse(201, "Stream created", stream));
});

const updateStream = asyncHandler(async (req, res) => {
  const stream = await Stream.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!stream) throw new ApiError(404, "Stream not found");
  res.json(new ApiResponse(200, "Stream updated", stream));
});

const deleteStream = asyncHandler(async (req, res) => {
  const deps = await Department.countDocuments({ stream: req.params.id });
  if (deps > 0) throw new ApiError(400, "Cannot delete stream with existing departments");
  const stream = await Stream.findByIdAndDelete(req.params.id);
  if (!stream) throw new ApiError(404, "Stream not found");
  res.json(new ApiResponse(200, "Stream deleted"));
});

// ─── DEPARTMENTS ────────────────────────────────────────────────────────────

const getDepartments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.stream) filter.stream = req.query.stream;
  if (req.query.active !== undefined) filter.isActive = req.query.active === "true";
  const [departments, total] = await Promise.all([
    Department.find(filter).populate("stream", "name code").skip(skip).limit(limit).sort({ createdAt: -1 }),
    Department.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Departments fetched", departments, buildPaginationMeta(total, page, limit)));
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, stream } = req.body;
  if (!name || !code || !stream) throw new ApiError(400, "name, code, stream required");
  const streamDoc = await Stream.findById(stream);
  if (!streamDoc) throw new ApiError(404, "Stream not found");
  const dept = await Department.create({ name, code: code.toUpperCase(), stream });
  res.status(201).json(new ApiResponse(201, "Department created", dept));
});

const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("stream", "name code");
  if (!dept) throw new ApiError(404, "Department not found");
  res.json(new ApiResponse(200, "Department updated", dept));
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const branches = await Branch.countDocuments({ department: req.params.id });
  if (branches > 0) throw new ApiError(400, "Cannot delete department with existing branches");
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) throw new ApiError(404, "Department not found");
  res.json(new ApiResponse(200, "Department deleted"));
});

// ─── BRANCHES ───────────────────────────────────────────────────────────────

const getBranches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.stream) filter.stream = req.query.stream;
  if (req.query.active !== undefined) filter.isActive = req.query.active === "true";
  const [branches, total] = await Promise.all([
    Branch.find(filter).populate("department", "name code").populate("stream", "name code").skip(skip).limit(limit).sort({ createdAt: -1 }),
    Branch.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Branches fetched", branches, buildPaginationMeta(total, page, limit)));
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, code, department, stream, totalYears } = req.body;
  if (!name || !code || !department || !stream || !totalYears) throw new ApiError(400, "name, code, department, stream, totalYears required");
  const branch = await Branch.create({ name, code: code.toUpperCase(), department, stream, totalYears });
  res.status(201).json(new ApiResponse(201, "Branch created", branch));
});

const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("department stream", "name code");
  if (!branch) throw new ApiError(404, "Branch not found");
  res.json(new ApiResponse(200, "Branch updated", branch));
});

const deleteBranch = asyncHandler(async (req, res) => {
  const students = await Student.countDocuments({ branch: req.params.id });
  if (students > 0) throw new ApiError(400, "Cannot delete branch with assigned students");
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) throw new ApiError(404, "Branch not found");
  res.json(new ApiResponse(200, "Branch deleted"));
});

module.exports = {
  getStreams, createStream, updateStream, deleteStream,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getBranches, createBranch, updateBranch, deleteBranch,
};