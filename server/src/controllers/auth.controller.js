const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { COOKIE_OPTIONS } = require("../config/constants");
const { prisma } = require("../config/db");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required");

  const college = await prisma.college.findUnique({ where: { adminEmail: email.toLowerCase() } });
  if (!college) throw new ApiError(401, "Invalid credentials");

  if (college.status === "TERMINATED") throw new ApiError(403, "This account has been terminated.");
  if (college.status === "SUSPENDED") throw new ApiError(403, "This account is suspended. Contact support.");

  const valid = await bcrypt.compare(password, college.adminPasswordHash);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const token = jwt.sign(
    { email: email.toLowerCase(), role: "COLLEGE_ADMIN", collegeId: college.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "8h" }
  );

  res.cookie("token", token, COOKIE_OPTIONS);
  res.json(new ApiResponse(200, "Login successful", {
    email: email.toLowerCase(),
    role: "COLLEGE_ADMIN",
    collegeName: college.name,
    collegeCode: college.code,
    plan: college.plan,
    renewalDate: college.renewalDate,
  }));
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json(new ApiResponse(200, "Logged out successfully"));
});

const me = asyncHandler(async (req, res) => {
  // req.college is NOT set here — tenantMiddleware is not applied to /me
  // So we fetch the college directly from the JWT's collegeId
  if (!req.user?.collegeId) throw new ApiError(401, "Invalid session — please login again");

  const college = await prisma.college.findUnique({ where: { id: req.user.collegeId } });
  if (!college) throw new ApiError(401, "College not found — please login again");

  res.json(new ApiResponse(200, "Admin info", {
    email: req.user.email,
    role: req.user.role,
    collegeName: college.name,
    collegeCode: college.code,
    plan: college.plan,
    status: college.status,
    renewalDate: college.renewalDate,
  }));
});

module.exports = { login, logout, me };