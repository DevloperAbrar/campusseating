const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  getRoomPDF,
  getAllRoomsPDF,
  getSeatLabelsPDF,
  getAllSeatLabelsPDF,
  getFacultyDutyPDF,
} = require("../controllers/pdf.controller");

// mergeParams: true so :examId from parent router is accessible
const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

// ── Room chart PDFs ──────────────────────────────────────────────────────────
// Single room chart
router.get("/shifts/:shiftId/pdf/room/:roomId", getRoomPDF);
// All rooms ZIP
router.get("/shifts/:shiftId/pdf/rooms/all", getAllRoomsPDF);

// ── Seat label PDFs ──────────────────────────────────────────────────────────
// Single room labels  — ?variant=detailed (default) or ?variant=simple
router.get("/shifts/:shiftId/pdf/room/:roomId/labels", getSeatLabelsPDF);
// All rooms labels ZIP — ?variant=detailed or ?variant=simple
router.get("/shifts/:shiftId/pdf/rooms/labels", getAllSeatLabelsPDF);

// ── Faculty duty chart ───────────────────────────────────────────────────────
router.get("/pdf/faculty-duty", getFacultyDutyPDF);

module.exports = router;