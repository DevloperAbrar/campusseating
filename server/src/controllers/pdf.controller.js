const { Archiver } = require("archiver");          // v8: named export, not default function
const { PDFDocument } = require("pdf-lib");         // for merging multiple PDFs into one
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Exam = require("../models/Exam.model");
const Shift = require("../models/Shift.model");
const Room = require("../models/Room.model");
const SeatingAssignment = require("../models/SeatingAssignment.model");
const InvigilatorAssignment = require("../models/InvigilatorAssignment.model");
const {
  generateRoomChartHTML,
  generateFacultyDutyHTML,
  generateSeatLabelsHTML,
  htmlToPDF,
} = require("../services/pdf.service");

// ── Helper: create a zip archive ─────────────────────────────────────────────
const createZip = () => new Archiver("zip", { zlib: { level: 6 } });

// ── Helper: merge array of PDF Buffers into one PDF Buffer ───────────────────
const mergePDFs = async (pdfBuffers) => {
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
};

// ── Shared data fetcher ───────────────────────────────────────────────────────
const fetchRoomData = async (shiftId, roomId) => {
  const [assignments, invigilators] = await Promise.all([
    SeatingAssignment.find({ shift: shiftId, room: roomId })
      .populate({ path: "student", populate: { path: "branch", select: "name code" }, select: "name enrollmentNo branch" })
      .lean(),
    InvigilatorAssignment.find({ shift: shiftId, room: roomId })
      .populate("faculty", "name designation")
      .lean(),
  ]);
  return { assignments, invigilators };
};

// ── Room Chart — single room ──────────────────────────────────────────────────
const getRoomPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId, roomId } = req.params;
  const [exam, shift, room] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId), Room.findById(roomId)]);
  if (!exam || !shift || !room) throw new ApiError(404, "Not found");

  const { assignments, invigilators } = await fetchRoomData(shiftId, roomId);
  const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
  const pdf  = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${room.name.replace(/\s+/g, "_")}_seating.pdf"`);
  res.send(pdf);
});

// ── Room Charts — all rooms as ZIP ───────────────────────────────────────────
const getAllRoomsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const [exam, shift] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId)]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const rooms = await Room.find({ _id: { $in: shift.rooms.map((r) => r.room) } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="room_charts_${shift.name.replace(/\s+/g, "_")}.zip"`);

  const archive = createZip();
  archive.pipe(res);

  for (const room of rooms) {
    const { assignments, invigilators } = await fetchRoomData(shiftId, room._id);
    const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
    const pdf  = await htmlToPDF(html);
    archive.append(pdf, { name: `${room.name.replace(/\s+/g, "_")}_chart.pdf` });
  }

  archive.finalize();
});

// ── Room Charts — all rooms merged into ONE PDF ───────────────────────────────
const getAllRoomsMergedPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const [exam, shift] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId)]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const rooms = await Room.find({ _id: { $in: shift.rooms.map((r) => r.room) } });

  const pdfBuffers = [];
  for (const room of rooms) {
    const { assignments, invigilators } = await fetchRoomData(shiftId, room._id);
    const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
    pdfBuffers.push(await htmlToPDF(html));
  }

  const merged = await mergePDFs(pdfBuffers);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="all_rooms_${shift.name.replace(/\s+/g, "_")}.pdf"`);
  res.send(merged);
});

// ── Seat Labels — single room ─────────────────────────────────────────────────
const getSeatLabelsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId, roomId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";

  const [exam, shift, room] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId), Room.findById(roomId)]);
  if (!exam || !shift || !room) throw new ApiError(404, "Not found");

  const { assignments } = await fetchRoomData(shiftId, roomId);
  const html = generateSeatLabelsHTML(room, assignments, variant);
  const pdf  = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${room.name.replace(/\s+/g, "_")}_labels_${variant}.pdf"`);
  res.send(pdf);
});

// ── Seat Labels — all rooms as ZIP ───────────────────────────────────────────
const getAllSeatLabelsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";

  const [exam, shift] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId)]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const rooms = await Room.find({ _id: { $in: shift.rooms.map((r) => r.room) } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="seat_labels_${variant}_${shift.name.replace(/\s+/g, "_")}.zip"`);

  const archive = createZip();
  archive.pipe(res);

  for (const room of rooms) {
    const { assignments } = await fetchRoomData(shiftId, room._id);
    if (!assignments.length) continue;
    const html = generateSeatLabelsHTML(room, assignments, variant);
    const pdf  = await htmlToPDF(html);
    archive.append(pdf, { name: `${room.name.replace(/\s+/g, "_")}_labels_${variant}.pdf` });
  }

  archive.finalize();
});

// ── Seat Labels — all rooms merged into ONE PDF ───────────────────────────────
// pdf.controller.js — only getAllSeatLabelsMergedPDF changes

const getAllSeatLabelsMergedPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";

  const [exam, shift] = await Promise.all([Exam.findById(examId), Shift.findById(shiftId)]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const rooms = await Room.find({ _id: { $in: shift.rooms.map((r) => r.room) } });

  // Collect all rooms' data
  const roomsData = [];
  for (const room of rooms) {
    const { assignments } = await fetchRoomData(shiftId, room._id);
    if (!assignments.length) continue;
    roomsData.push({ room, assignments });
  }

  // Single HTML → single Puppeteer render → page-break-before per room
  const html = generateSeatLabelsHTML(roomsData, variant);
  const pdf  = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="all_labels_${variant}_${shift.name.replace(/\s+/g, "_")}.pdf"`);
  res.send(pdf);
});

// ── Faculty Duty Chart ────────────────────────────────────────────────────────
const getFacultyDutyPDF = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError(404, "Exam not found");

  const shifts      = await Shift.find({ exam: examId });
  const assignments = await InvigilatorAssignment.find({ exam: examId })
    .populate("faculty", "name designation email")
    .populate("room", "name building")
    .lean();

  const html = generateFacultyDutyHTML(exam, shifts, assignments);
  const pdf  = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=faculty_duty.pdf");
  res.send(pdf);
});

module.exports = {
  getRoomPDF,
  getAllRoomsPDF,
  getAllRoomsMergedPDF,
  getSeatLabelsPDF,
  getAllSeatLabelsPDF,
  getAllSeatLabelsMergedPDF,
  getFacultyDutyPDF,
};