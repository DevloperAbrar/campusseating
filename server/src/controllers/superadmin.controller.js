const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { COOKIE_OPTIONS } = require("../config/constants");
const { prisma } = require("../config/db");

// ── SUPER ADMIN LOGIN (credentials from .env only, never in DB) ──
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required");

  if (email.toLowerCase() !== process.env.SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new ApiError(401, "Invalid credentials");
  }
  const valid = await bcrypt.compare(password, process.env.SUPER_ADMIN_PASSWORD_HASH);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const token = jwt.sign(
    { email: email.toLowerCase(), role: "SUPER_ADMIN" },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json(new ApiResponse(200, "Super admin login successful", { email, role: "SUPER_ADMIN" }));
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json(new ApiResponse(200, "Logged out"));
});

// ── CREATE COLLEGE (yearly onboarding) ──
const createCollege = asyncHandler(async (req, res) => {
  const { name, code, contactEmail, contactPhone, adminEmail, adminPassword, plan, maxStudents, maxRooms, maxFaculty } = req.body;

  if (!name || !code || !contactEmail || !adminEmail || !adminPassword) {
    throw new ApiError(400, "name, code, contactEmail, adminEmail, adminPassword are required");
  }
  if (adminPassword.length < 8) throw new ApiError(400, "Admin password must be at least 8 characters");

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const renewalDate = new Date();
  renewalDate.setFullYear(renewalDate.getFullYear() + 1); // yearly by default

  const college = await prisma.college.create({
    data: {
      name,
      code: code.toLowerCase(),
      contactEmail,
      contactPhone,
      adminEmail: adminEmail.toLowerCase(),
      adminPasswordHash,
      plan: plan || "TRIAL",
      status: plan ? "ACTIVE" : "TRIAL",
      renewalDate,
      maxStudents: maxStudents || 2000,
      maxRooms: maxRooms || 50,
      maxFaculty: maxFaculty || 200,
    },
  });

  res.status(201).json(new ApiResponse(201, "College created", {
    id: college.id, name: college.name, code: college.code,
    adminEmail: college.adminEmail, renewalDate: college.renewalDate,
    plan: college.plan, status: college.status,
  }));
});

// ── LIST / VIEW ──
const listColleges = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { code: { contains: search, mode: "insensitive" } },
    { adminEmail: { contains: search, mode: "insensitive" } },
  ];

  const skip = (Number(page) - 1) * Number(limit);
  const [colleges, total] = await Promise.all([
    prisma.college.findMany({
      where, skip, take: Number(limit), orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, code: true, adminEmail: true, plan: true, status: true,
        renewalDate: true, startDate: true, maxStudents: true, createdAt: true,
        _count: { select: { students: true, faculty: true, rooms: true, exams: true } },
      },
    }),
    prisma.college.count({ where }),
  ]);

  res.json(new ApiResponse(200, "Colleges fetched", colleges, {
    total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit),
  }));
});

const getCollege = asyncHandler(async (req, res) => {
  const college = await prisma.college.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { students: true, faculty: true, rooms: true, exams: true } } },
  });
  if (!college) throw new ApiError(404, "College not found");
  const { adminPasswordHash, ...safe } = college;
  res.json(new ApiResponse(200, "College fetched", safe));
});

// ── RENEW (yearly subscription extension) ──
const renewCollege = asyncHandler(async (req, res) => {
  const { years = 1, plan } = req.body;
  const college = await prisma.college.findUnique({ where: { id: req.params.id } });
  if (!college) throw new ApiError(404, "College not found");

  // Renew from whichever is later: today, or their current expiry (so early renewals stack)
  const base = college.renewalDate > new Date() ? college.renewalDate : new Date();
  const newRenewalDate = new Date(base);
  newRenewalDate.setFullYear(newRenewalDate.getFullYear() + Number(years));

  const updated = await prisma.college.update({
    where: { id: req.params.id },
    data: {
      renewalDate: newRenewalDate,
      status: "ACTIVE",
      suspendedAt: null,
      terminatedAt: null,
      ...(plan ? { plan } : {}),
    },
  });
  res.json(new ApiResponse(200, "College renewed", { id: updated.id, renewalDate: updated.renewalDate, status: updated.status }));
});

// ── ASSIGN / RESET ADMIN PASSWORD ──
const resetAdminPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new ApiError(400, "newPassword must be at least 8 characters");

  const adminPasswordHash = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.college.update({
    where: { id: req.params.id },
    data: { adminPasswordHash },
  });
  res.json(new ApiResponse(200, "Admin password updated", { id: updated.id, adminEmail: updated.adminEmail }));
});

// Generate a random strong password for a college (handy when onboarding by phone/email)
const generatePassword = asyncHandler(async (req, res) => {
  const password = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
  res.json(new ApiResponse(200, "Password generated", { password }));
});

// ── SUSPEND / TERMINATE / REACTIVATE ──
const suspendCollege = asyncHandler(async (req, res) => {
  const college = await prisma.college.update({
    where: { id: req.params.id },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });
  res.json(new ApiResponse(200, "College suspended", { id: college.id, status: college.status }));
});

const terminateCollege = asyncHandler(async (req, res) => {
  const college = await prisma.college.update({
    where: { id: req.params.id },
    data: { status: "TERMINATED", terminatedAt: new Date() },
  });
  res.json(new ApiResponse(200, "College terminated", { id: college.id, status: college.status }));
});

const reactivateCollege = asyncHandler(async (req, res) => {
  const college = await prisma.college.update({
    where: { id: req.params.id },
    data: { status: "ACTIVE", suspendedAt: null, terminatedAt: null },
  });
  res.json(new ApiResponse(200, "College reactivated", { id: college.id, status: college.status }));
});

// ── PLATFORM STATS (for your own dashboard) ──
const platformStats = asyncHandler(async (req, res) => {
  const [total, active, trial, suspended, terminated, students] = await Promise.all([
    prisma.college.count(),
    prisma.college.count({ where: { status: "ACTIVE" } }),
    prisma.college.count({ where: { status: "TRIAL" } }),
    prisma.college.count({ where: { status: "SUSPENDED" } }),
    prisma.college.count({ where: { status: "TERMINATED" } }),
    prisma.student.count(),
  ]);
  res.json(new ApiResponse(200, "Platform stats", { total, active, trial, suspended, terminated, totalStudents: students }));
});

module.exports = {
  login, logout, createCollege, listColleges, getCollege, renewCollege,
  resetAdminPassword, generatePassword, suspendCollege, terminateCollege,
  reactivateCollege, platformStats,
};