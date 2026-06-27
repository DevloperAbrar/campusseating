const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  getExams, createExam, updateExam, deleteExam,
  getShifts, createShift, updateShift, deleteShift, resolveStudents,
  getInvigilators, assignInvigilator, removeInvigilator,
} = require("../controllers/exam.controller");
const {
  generateSeating, previewSeating, swapSeats, manualAssign,
  resetSeating, publishSeating, unpublishSeating,
} = require("../controllers/seating.controller");
const {
  getRoomPDF,
  getAllRoomsPDF,
  getAllRoomsMergedPDF,
  getSeatLabelsPDF,
  getAllSeatLabelsPDF,
  getAllSeatLabelsMergedPDF,
  getFacultyDutyPDF,
} = require("../controllers/pdf.controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/", getExams);
router.post("/", createExam);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);

router.get("/:examId/shifts", getShifts);
router.post("/:examId/shifts", createShift);
router.put("/:examId/shifts/:shiftId", updateShift);
router.delete("/:examId/shifts/:shiftId", deleteShift);
router.post("/:examId/shifts/:shiftId/resolve-students", resolveStudents);

router.get("/:examId/shifts/:shiftId/invigilators", getInvigilators);
router.post("/:examId/shifts/:shiftId/invigilators", assignInvigilator);
router.delete("/:examId/shifts/:shiftId/invigilators/:id", removeInvigilator);

router.post("/:examId/shifts/:shiftId/seating/generate", generateSeating);
router.get("/:examId/shifts/:shiftId/seating/preview", previewSeating);
router.put("/:examId/shifts/:shiftId/seating/swap", swapSeats);
router.put("/:examId/shifts/:shiftId/seating/manual", manualAssign);
router.delete("/:examId/shifts/:shiftId/seating/reset", resetSeating);
router.post("/:examId/shifts/:shiftId/seating/publish", publishSeating);
router.delete("/:examId/shifts/:shiftId/seating/unpublish", unpublishSeating);

// PDF — Room charts
router.get("/:examId/shifts/:shiftId/pdf/room/:roomId", getRoomPDF);
router.get("/:examId/shifts/:shiftId/pdf/rooms/all", getAllRoomsPDF);
router.get("/:examId/shifts/:shiftId/pdf/rooms/merged", getAllRoomsMergedPDF);

// PDF — Seat labels (?variant=detailed or ?variant=simple)
router.get("/:examId/shifts/:shiftId/pdf/room/:roomId/labels", getSeatLabelsPDF);
router.get("/:examId/shifts/:shiftId/pdf/rooms/labels", getAllSeatLabelsPDF);
router.get("/:examId/shifts/:shiftId/pdf/rooms/labels/merged", getAllSeatLabelsMergedPDF);

// PDF — Faculty duty
router.get("/:examId/pdf/faculty-duty", getFacultyDutyPDF);

module.exports = router;