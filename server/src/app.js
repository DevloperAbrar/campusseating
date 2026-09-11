const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const routes = require("./routes/index");

const app = express();

app.set("trust proxy", 1);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Routes
app.use("/api/v1", routes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", service: "CampusSeating API" }));

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;