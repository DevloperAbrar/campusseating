const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const Student = require("../models/Student.model");
const Faculty = require("../models/Faculty.model");
const Room = require("../models/Room.model");
const Exam = require("../models/Exam.model");
const ActivityLog = require("../models/ActivityLog.model");

const getDashboard = asyncHandler(async (req, res) => {
  const [students, faculty, rooms, exams, recentLogs] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    Faculty.countDocuments({ isActive: true }),
    Room.countDocuments({ isActive: true }),
    Exam.countDocuments(),
    ActivityLog.find().sort({ performedAt: -1 }).limit(10).lean(),
  ]);

  const examsByStatus = await Exam.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusMap = {};
  examsByStatus.forEach((e) => (statusMap[e._id] = e.count));

  res.json(new ApiResponse(200, "Dashboard data", {
    stats: { students, faculty, rooms, exams },
    examsByStatus: statusMap,
    recentActivity: recentLogs,
  }));
});

module.exports = { getDashboard };