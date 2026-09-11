const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

// ─── STREAMS ────────────────────────────────────────────────────────────────

const getStreams = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId };
  if (req.query.active !== undefined) where.isActive = req.query.active === "true";

  const [streams, total] = await Promise.all([
    prisma.stream.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.stream.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Streams fetched", streams, buildPaginationMeta(total, page, limit)));
});

const createStream = asyncHandler(async (req, res) => {
  const { name, code, durationYears } = req.body;
  if (!name || !code || !durationYears) throw new ApiError(400, "name, code, durationYears required");

  const stream = await prisma.stream.create({
    data: { collegeId: req.collegeId, name, code: code.toUpperCase(), durationYears: Number(durationYears) },
  });
  res.status(201).json(new ApiResponse(201, "Stream created", stream));
});

const updateStream = asyncHandler(async (req, res) => {
  const existing = await prisma.stream.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Stream not found");

  const stream = await prisma.stream.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Stream updated", stream));
});

const deleteStream = asyncHandler(async (req, res) => {
  const deps = await prisma.department.count({ where: { streamId: req.params.id, collegeId: req.collegeId } });
  if (deps > 0) throw new ApiError(400, "Cannot delete stream with existing departments");

  const existing = await prisma.stream.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Stream not found");

  await prisma.stream.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Stream deleted"));
});

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────

const getDepartments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId };
  if (req.query.stream) where.streamId = req.query.stream;
  if (req.query.active !== undefined) where.isActive = req.query.active === "true";

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where, skip, take: limit, orderBy: { createdAt: "desc" },
      include: { stream: { select: { name: true, code: true } } },
    }),
    prisma.department.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Departments fetched", departments, buildPaginationMeta(total, page, limit)));
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, stream } = req.body;
  if (!name || !code || !stream) throw new ApiError(400, "name, code, stream required");

  const streamDoc = await prisma.stream.findFirst({ where: { id: stream, collegeId: req.collegeId } });
  if (!streamDoc) throw new ApiError(404, "Stream not found");

  const department = await prisma.department.create({
    data: { collegeId: req.collegeId, name, code: code.toUpperCase(), streamId: stream },
  });
  res.status(201).json(new ApiResponse(201, "Department created", department));
});

const updateDepartment = asyncHandler(async (req, res) => {
  const existing = await prisma.department.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Department not found");

  const department = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Department updated", department));
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const branches = await prisma.branch.count({ where: { departmentId: req.params.id, collegeId: req.collegeId } });
  if (branches > 0) throw new ApiError(400, "Cannot delete department with existing branches");

  const existing = await prisma.department.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Department not found");

  await prisma.department.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Department deleted"));
});

// ─── BRANCHES ────────────────────────────────────────────────────────────────

const getBranches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId };
  if (req.query.department) where.departmentId = req.query.department;
  if (req.query.stream) where.streamId = req.query.stream;
  if (req.query.active !== undefined) where.isActive = req.query.active === "true";

  const [branches, total] = await Promise.all([
    prisma.branch.findMany({
      where, skip, take: limit, orderBy: { createdAt: "desc" },
      include: {
        department: { select: { name: true, code: true } },
        stream: { select: { name: true, code: true } },
      },
    }),
    prisma.branch.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Branches fetched", branches, buildPaginationMeta(total, page, limit)));
});

const createBranch = asyncHandler(async (req, res) => {
  const { name, code, department, stream, totalYears } = req.body;
  if (!name || !code || !department || !stream || !totalYears) {
    throw new ApiError(400, "name, code, department, stream, totalYears required");
  }

  const [deptDoc, streamDoc] = await Promise.all([
    prisma.department.findFirst({ where: { id: department, collegeId: req.collegeId } }),
    prisma.stream.findFirst({ where: { id: stream, collegeId: req.collegeId } }),
  ]);
  if (!deptDoc) throw new ApiError(404, "Department not found");
  if (!streamDoc) throw new ApiError(404, "Stream not found");

  const branch = await prisma.branch.create({
    data: {
      collegeId: req.collegeId,
      name,
      code: code.toUpperCase(),
      departmentId: department,
      streamId: stream,
      totalYears: Number(totalYears),
    },
  });
  res.status(201).json(new ApiResponse(201, "Branch created", branch));
});

const updateBranch = asyncHandler(async (req, res) => {
  const existing = await prisma.branch.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Branch not found");

  const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Branch updated", branch));
});

const deleteBranch = asyncHandler(async (req, res) => {
  const students = await prisma.student.count({ where: { branchId: req.params.id, collegeId: req.collegeId } });
  if (students > 0) throw new ApiError(400, "Cannot delete branch with existing students");

  const existing = await prisma.branch.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Branch not found");

  await prisma.branch.delete({ where: { id: req.params.id } });
  res.json(new ApiResponse(200, "Branch deleted"));
});

module.exports = {
  getStreams, createStream, updateStream, deleteStream,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getBranches, createBranch, updateBranch, deleteBranch,
};