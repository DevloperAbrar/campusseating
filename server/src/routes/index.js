const express = require("express");
const rateLimit = require("express-rate-limit");
const { LOGIN_RATE_LIMIT, PUBLIC_RATE_LIMIT } = require("../config/constants");

const router = express.Router();

const loginLimiter = rateLimit({ ...LOGIN_RATE_LIMIT, message: { success: false, statusCode: 429, message: "Too many login attempts — try after 15 minutes" } });
const publicLimiter = rateLimit({ ...PUBLIC_RATE_LIMIT, message: { success: false, statusCode: 429, message: "Too many requests" } });

router.use("/admin/auth", loginLimiter, require("./auth.routes"));
router.use("/admin/dashboard", require("./academic.routes").dashboardRouter);
router.use("/admin/academic", require("./academic.routes").router);
router.use("/admin/students", require("./student.routes"));
router.use("/admin/faculty", require("./faculty.routes"));
router.use("/admin/rooms", require("./room.routes"));
router.use("/admin/exams", require("./exam.routes"));
router.use("/public", publicLimiter, require("./lookup.routes"));

module.exports = router;