const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new ApiError(401, "Unauthorized — please login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired session — please login again");
  }
});

const checkLocked = (Model) =>
  asyncHandler(async (req, res, next) => {
    const exam = await require("../models/Exam.model").findById(req.params.examId);
    if (!exam) throw new ApiError(404, "Exam not found");
    if (exam.isLocked) throw new ApiError(403, "Exam is locked — no changes allowed after exam date");
    next();
  });

const checkPublished = asyncHandler(async (req, res, next) => {
  const Shift = require("../models/Shift.model");
  const shift = await Shift.findById(req.params.shiftId);
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished && req.method !== "GET") throw new ApiError(403, "Seating plan is published — unpublish first to make changes");
  next();
});

module.exports = { authMiddleware, checkLocked, checkPublished };