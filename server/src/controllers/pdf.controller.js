const { PDFDocument } = require("pdf-lib");
const archiver = require("archiver");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { prisma } = require("../config/db");
const {
  generateRoomChartHTML, generateFacultyDutyHTML,
  generateSeatLabelsHTML, htmlToPDF, launchBrowser, renderPDFOnBrowser,
} = require("../services/pdf.service");

const mergePDFs = async (pdfBuffers) => {
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
};

const fetchRoomData = async (shiftId, roomId) => {
  const [assignments, invigilators] = await Promise.all([
    prisma.seatingAssignment.findMany({
      where: { shiftId, roomId },
      include: { student: { include: { branch: { select: { name: true, code: true } } } } },
    }),
    prisma.invigilatorAssignment.findMany({
      where: { shiftId, roomId },
      include: { faculty: { select: { name: true, designation: true } } },
    }),
  ]);
  return { assignments, invigilators };
};

const getRoomPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId, roomId } = req.params;
  const [exam, shift, room] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId } }),
    prisma.room.findFirst({ where: { id: roomId, collegeId: req.collegeId } }),
  ]);
  if (!exam || !shift || !room) throw new ApiError(404, "Not found");

  const { assignments, invigilators } = await fetchRoomData(shiftId, roomId);
  const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
  const pdf = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${room.name.replace(/\s+/g, "_")}_seating.pdf"`);
  res.send(pdf);
});

const getAllRoomsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const [exam, shift] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId }, include: { shiftRooms: true } }),
  ]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const roomIds = shift.shiftRooms.map((r) => r.roomId);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="room_charts_${shift.name.replace(/\s+/g, "_")}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  const browser = await launchBrowser();
  try {
    for (const room of rooms) {
      const { assignments, invigilators } = await fetchRoomData(shiftId, room.id);
      const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
      const pdf = await renderPDFOnBrowser(browser, html);
      archive.append(Buffer.from(pdf), { name: `${room.name.replace(/\s+/g, "_")}_chart.pdf` });
    }
  } finally {
    await browser.close();
  }
  archive.finalize();
});

const getAllRoomsMergedPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const [exam, shift] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId }, include: { shiftRooms: true } }),
  ]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const roomIds = shift.shiftRooms.map((r) => r.roomId);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });

  const pdfBuffers = [];
  const browser = await launchBrowser();
  try {
    for (const room of rooms) {
      const { assignments, invigilators } = await fetchRoomData(shiftId, room.id);
      const html = generateRoomChartHTML(exam, shift, room, assignments, invigilators);
      pdfBuffers.push(await renderPDFOnBrowser(browser, html));
    }
  } finally {
    await browser.close();
  }

  const merged = await mergePDFs(pdfBuffers);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="all_rooms_${shift.name.replace(/\s+/g, "_")}.pdf"`);
  res.send(merged);
});

const getSeatLabelsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId, roomId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";
  const [exam, shift, room] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId } }),
    prisma.room.findFirst({ where: { id: roomId, collegeId: req.collegeId } }),
  ]);
  if (!exam || !shift || !room) throw new ApiError(404, "Not found");

  const { assignments } = await fetchRoomData(shiftId, roomId);
  const html = generateSeatLabelsHTML(room, assignments, variant);
  const pdf = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${room.name.replace(/\s+/g, "_")}_labels_${variant}.pdf"`);
  res.send(pdf);
});

// ── NEW: zipped seat labels for every room in the shift ──
const getAllSeatLabelsPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";
  const [exam, shift] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId }, include: { shiftRooms: true } }),
  ]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const roomIds = shift.shiftRooms.map((r) => r.roomId);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="seat_labels_${variant}_${shift.name.replace(/\s+/g, "_")}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  const browser = await launchBrowser();
  try {
    for (const room of rooms) {
      const { assignments } = await fetchRoomData(shiftId, room.id);
      const html = generateSeatLabelsHTML(room, assignments, variant);
      const pdf = await renderPDFOnBrowser(browser, html);
      archive.append(Buffer.from(pdf), { name: `${room.name.replace(/\s+/g, "_")}_labels_${variant}.pdf` });
    }
  } finally {
    await browser.close();
  }
  archive.finalize();
});

// ── NEW: single merged PDF of seat labels for every room in the shift ──
const getAllSeatLabelsMergedPDF = asyncHandler(async (req, res) => {
  const { examId, shiftId } = req.params;
  const variant = req.query.variant === "simple" ? "simple" : "detailed";
  const [exam, shift] = await Promise.all([
    prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } }),
    prisma.shift.findFirst({ where: { id: shiftId, collegeId: req.collegeId }, include: { shiftRooms: true } }),
  ]);
  if (!exam || !shift) throw new ApiError(404, "Not found");

  const roomIds = shift.shiftRooms.map((r) => r.roomId);
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });

  const pdfBuffers = [];
  const browser = await launchBrowser();
  try {
    for (const room of rooms) {
      const { assignments } = await fetchRoomData(shiftId, room.id);
      const html = generateSeatLabelsHTML(room, assignments, variant);
      pdfBuffers.push(await renderPDFOnBrowser(browser, html));
    }
  } finally {
    await browser.close();
  }

  const merged = await mergePDFs(pdfBuffers);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="all_seat_labels_${variant}_${shift.name.replace(/\s+/g, "_")}.pdf"`);
  res.send(merged);
});

const getFacultyDutyPDF = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await prisma.exam.findFirst({ where: { id: examId, collegeId: req.collegeId } });
  if (!exam) throw new ApiError(404, "Exam not found");

  const [shifts, assignments] = await Promise.all([
    prisma.shift.findMany({ where: { examId, collegeId: req.collegeId } }),
    prisma.invigilatorAssignment.findMany({
      where: { examId, collegeId: req.collegeId },
      include: {
        faculty: { select: { name: true, designation: true, email: true } },
        room: { select: { name: true, building: true } },
      },
    }),
  ]);

  const html = generateFacultyDutyHTML(exam, shifts, assignments);
  const pdf = await htmlToPDF(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=faculty_duty.pdf");
  res.send(pdf);
});

module.exports = {
  getRoomPDF, getAllRoomsPDF, getAllRoomsMergedPDF,
  getSeatLabelsPDF, getAllSeatLabelsPDF, getAllSeatLabelsMergedPDF,
  getFacultyDutyPDF,
};