module.exports = {
  JWT_EXPIRY: process.env.JWT_EXPIRY || "8h",
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
  LOGIN_RATE_LIMIT: { windowMs: 15 * 60 * 1000, max: 20 },
  PUBLIC_RATE_LIMIT: { windowMs: 60 * 1000, max: 60 },
  CSV_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  SEAT_POSITIONS: ["L", "M", "R"],
  EXAM_STATUS: ["draft", "published", "ongoing", "completed"],
  GENDER_SEP: ["none", "rows", "rooms"],
  BRANCH_SEP: ["strict", "relaxed"],
  DESIGNATIONS: ["Professor", "Assistant Professor", "HOD", "Lab Assistant"],
};