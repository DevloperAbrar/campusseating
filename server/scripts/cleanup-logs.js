// server/scripts/cleanup-logs.js
const { prisma } = require('../src/config/db');

async function cleanup() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6); // keep 6 months

  const result = await prisma.activityLog.deleteMany({
    where: { performedAt: { lt: cutoff } }
  });
  console.log(`Deleted ${result.count} old activity logs`);
  await prisma.$disconnect();
}

cleanup().catch(console.error);