const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const Faculty = require("../models/Faculty.model");
const { getPagination, buildPaginationMeta } = require("../utils/helpers");

const getFaculty = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { isActive: true };
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { employeeId: { $regex: req.query.search, $options: "i" } },
    ];
  }
  const [faculty, total] = await Promise.all([
    Faculty.find(filter).populate("departments", "name code").skip(skip).limit(limit).sort({ name: 1 }),
    Faculty.countDocuments(filter),
  ]);
  res.json(new ApiResponse(200, "Faculty fetched", faculty, buildPaginationMeta(total, page, limit)));
});

const createFaculty = asyncHandler(async (req, res) => {
  const { name, email, employeeId, departments, designation, phone } = req.body;
  if (!name || !email || !employeeId || !designation) throw new ApiError(400, "name, email, employeeId, designation required");
  const faculty = await Faculty.create({ name, email, employeeId, departments, designation, phone });
  res.status(201).json(new ApiResponse(201, "Faculty created", faculty));
});

const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("departments", "name code");
  if (!faculty) throw new ApiError(404, "Faculty not found");
  res.json(new ApiResponse(200, "Faculty updated", faculty));
});

const deleteFaculty = asyncHandler(async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!faculty) throw new ApiError(404, "Faculty not found");
  res.json(new ApiResponse(200, "Faculty deactivated"));
});

module.exports = { getFaculty, createFaculty, updateFaculty, deleteFaculty };