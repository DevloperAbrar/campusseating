const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  getRoomPDF,
  getAllRoomsPDF,
  getAllRoomsMergedPDF,
  getSeatLabelsPDF,
  getAllSeatLabelsPDF,
  getAllSeatLabelsMergedPDF,
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
// All rooms merged single PDF
router.get("/shifts/:shiftId/pdf/rooms/merged", getAllRoomsMergedPDF);

// ── Seat label PDFs ──────────────────────────────────────────────────────────
// Single room labels  — ?variant=detailed (default) or ?variant=simple
router.get("/shifts/:shiftId/pdf/room/:roomId/labels", getSeatLabelsPDF);
// All rooms labels ZIP — ?variant=detailed or ?variant=simple
router.get("/shifts/:shiftId/pdf/rooms/labels", getAllSeatLabelsPDF);
// All rooms labels merged single PDF — ?variant=detailed or ?variant=simple
router.get("/shifts/:shiftId/pdf/rooms/labels/merged", getAllSeatLabelsMergedPDF);

// ── Faculty duty chart ───────────────────────────────────────────────────────
router.get("/pdf/faculty-duty", getFacultyDutyPDF);

module.exports = router;