const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Prisma unique constraint violation (P2002)
  if (err.code === "P2002") {
    statusCode = 409;
    const field = err.meta?.target?.[0] || "field";
    message = `A record with this ${field} already exists`;
    errors = [{ field, message }];
  }

  // Prisma foreign key constraint violation (P2003)
  if (err.code === "P2003") {
    statusCode = 400;
    const field = err.meta?.field_name || "reference";
    message = `Invalid reference: ${field} does not exist`;
    errors = [{ field, message }];
  }

  // Prisma record not found (P2025)
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 409;
    message = `${field} already exists`;
    errors = [{ field, message: `${err.keyValue[field]} is already taken` }];
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", err);
  }

  res.status(statusCode).json({ success: false, statusCode, message, errors });
};

module.exports = { notFound, errorHandler };