const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getFaculty = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = { collegeId: req.collegeId, isActive: true };
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: "insensitive" } },
      { email: { contains: req.query.search, mode: "insensitive" } },
      { employeeId: { contains: req.query.search, mode: "insensitive" } },
    ];
  }

  const [faculty, total] = await Promise.all([
    prisma.faculty.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.faculty.count({ where }),
  ]);
  res.json(new ApiResponse(200, "Faculty fetched", faculty, buildPaginationMeta(total, page, limit)));
});

const createFaculty = asyncHandler(async (req, res) => {
  const { name, email, employeeId, departmentIds, designation, phone } = req.body;
  if (!name || !email || !employeeId || !designation) throw new ApiError(400, "name, email, employeeId, designation required");

  const faculty = await prisma.faculty.create({
    data: {
      collegeId: req.collegeId,
      name, email: email.toLowerCase(), employeeId,
      departmentIds: departmentIds || [],
      designation, phone: phone || "",
    },
  });
  res.status(201).json(new ApiResponse(201, "Faculty created", faculty));
});

const updateFaculty = asyncHandler(async (req, res) => {
  const existing = await prisma.faculty.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Faculty not found");

  const faculty = await prisma.faculty.update({ where: { id: req.params.id }, data: req.body });
  res.json(new ApiResponse(200, "Faculty updated", faculty));
});

const deleteFaculty = asyncHandler(async (req, res) => {
  const existing = await prisma.faculty.findFirst({ where: { id: req.params.id, collegeId: req.collegeId } });
  if (!existing) throw new ApiError(404, "Faculty not found");

  await prisma.faculty.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json(new ApiResponse(200, "Faculty deactivated"));
});

module.exports = { getFaculty, createFaculty, updateFaculty, deleteFaculty };