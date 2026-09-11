require("dotenv").config();
const app = require("./src/app");
const { connectDB, prisma } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`✅ CampusSeating server running on port ${PORT} (pid ${process.pid})`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  });

  // Graceful shutdown — important under PM2 cluster reloads
  const shutdown = async () => {
    console.log("🛑 Shutting down gracefully...");
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});