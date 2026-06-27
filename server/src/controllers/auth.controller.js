const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { COOKIE_OPTIONS } = require("../config/constants");

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, "Email and password are required");

  if (email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const token = jwt.sign(
    { email: email.toLowerCase(), role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "8h" }
  );

  res.cookie("token", token, COOKIE_OPTIONS);

  res.json(new ApiResponse(200, "Login successful", {
    email: email.toLowerCase(),
    role: "admin",
    collegeName: process.env.COLLEGE_NAME,
  }));
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json(new ApiResponse(200, "Logged out successfully"));
});

const me = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, "Admin info", {
    email: req.admin.email,
    role: req.admin.role,
    collegeName: process.env.COLLEGE_NAME,
  }));
});

module.exports = { login, logout, me };