const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const { prisma } = require("../config/db");

const getDashboard = asyncHandler(async (req, res) => {
  const collegeId = req.collegeId;

  const [students, faculty, rooms, exams, recentLogs, examsByStatus] = await Promise.all([
    prisma.student.count({ where: { collegeId, isActive: true } }),
    prisma.faculty.count({ where: { collegeId, isActive: true } }),
    prisma.room.count({ where: { collegeId, isActive: true } }),
    prisma.exam.count({ where: { collegeId } }),
    prisma.activityLog.findMany({
      where: { collegeId },
      orderBy: { performedAt: "desc" },
      take: 10,
    }),
    prisma.exam.groupBy({
      by: ["status"],
      where: { collegeId },
      _count: { status: true },
    }),
  ]);

  const statusMap = {};
  examsByStatus.forEach((e) => (statusMap[e.status] = e._count.status));

  res.json(new ApiResponse(200, "Dashboard data", {
    stats: { students, faculty, rooms, exams },
    examsByStatus: statusMap,
    recentActivity: recentLogs,
  }));
});

module.exports = { getDashboard };