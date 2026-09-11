const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");

// One connection pool shared across the whole process.
// connection_limit in DATABASE_URL is ignored when using adapter — pool size is set here.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,                    // 2 workers × 8 = 16 total, leaves headroom
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,     // ADD THIS — lets pool drain cleanly on PM2 reload
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "production"
    ? ["error", "warn"]
    : ["query", "error", "warn"],
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma (adapter-pg)");
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };