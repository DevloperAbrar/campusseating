const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { prisma } = require("../config/db");

// Verifies JWT cookie and attaches req.user = { role, email, collegeId? }
const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new ApiError(401, "Unauthorized — please login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired session — please login again");
  }
});

// Only Anthropic-style super admin (you) can pass
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "SUPER_ADMIN") throw new ApiError(403, "Super admin access required");
  next();
};

// For all /admin/* college routes: loads the tenant, checks subscription
// status + expiry, and scopes every downstream query via req.collegeId
const tenantMiddleware = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "COLLEGE_ADMIN" || !req.user?.collegeId) {
    throw new ApiError(403, "College admin access required");
  }

  const college = await prisma.college.findUnique({ where: { id: req.user.collegeId } });
  if (!college) throw new ApiError(401, "College not found — please login again");

  if (college.status === "TERMINATED") throw new ApiError(403, "This account has been terminated. Contact support.");
  if (college.status === "SUSPENDED") throw new ApiError(403, "This account is suspended. Contact support to reactivate.");

  if (college.renewalDate < new Date() && college.status !== "TRIAL") {
    // Auto-suspend on expiry so stale sessions can't keep working
    await prisma.college.update({ where: { id: college.id }, data: { status: "SUSPENDED", suspendedAt: new Date() } });
    throw new ApiError(403, "Your subscription has expired. Please renew to continue.");
  }

  req.college = college;
  req.collegeId = college.id;
  next();
});

const checkLocked = asyncHandler(async (req, res, next) => {
  const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, collegeId: req.collegeId } });
  if (!exam) throw new ApiError(404, "Exam not found");
  if (exam.isLocked) throw new ApiError(403, "Exam is locked — no changes allowed after exam date");
  next();
});

const checkPublished = asyncHandler(async (req, res, next) => {
  const shift = await prisma.shift.findFirst({ where: { id: req.params.shiftId, collegeId: req.collegeId } });
  if (!shift) throw new ApiError(404, "Shift not found");
  if (shift.isPublished && req.method !== "GET") throw new ApiError(403, "Seating plan is published — unpublish first to make changes");
  next();
});

module.exports = { authMiddleware, requireSuperAdmin, tenantMiddleware, checkLocked, checkPublished };