const puppeteer = require("puppeteer");

const generateRoomChartHTML = (exam, shift, room, assignments, invigilators, orientation = "auto") => {
  const collegeName = process.env.COLLEGE_NAME || "College";

  // ── Build data structures ────────────────────────────────────────────────
  const byBench = {};
  assignments.forEach((a) => {
    const key = `${a.row}-${a.bench}`;
    if (!byBench[key]) byBench[key] = {};
    byBench[key][a.position] = a;
  });

  const rows      = [...new Set(assignments.map((a) => a.row))].sort();
  const benchNums = [...new Set(assignments.map((a) => a.bench))].sort((a, b) => a - b);

  // ── Auto-detect orientation ──────────────────────────────────────────────
  // More benches (columns) than rows → landscape; otherwise portrait
  const isLandscape =
    orientation === "landscape" ||
    (orientation === "auto" && benchNums.length > rows.length);

  // ── Collect all unique positions in bench (L, M, R etc.) ────────────────
  const allPositions = [...new Set(assignments.map((a) => a.position))].sort();

  // ── Build table rows ─────────────────────────────────────────────────────
  const tableRows = rows.map((row) => {
    const benchCells = benchNums.map((b) => {
      const benchData = byBench[`${row}-${b}`] || {};

      // Render seats side-by-side inside the cell
      const seatDivs = allPositions.map((pos) => {
        const a = benchData[pos];
        if (!a) {
          // Empty position slot — show placeholder so layout stays consistent
          return `<div class="seat seat-empty">
            <span class="seat-id">${row}-${b}-${pos}</span>
            <span class="student-name empty-text">—</span>
          </div>`;
        }
        return `<div class="seat">
          <span class="seat-id">${row}-${b}-${pos}</span>
          <span class="student-name">${a.student?.name || "—"}</span>
          <span class="branch-code">${a.student?.branch?.code || ""}</span>
        </div>`;
      }).join("");

      return `<td class="bench-cell"><div class="bench-inner">${seatDivs}</div></td>`;
    }).join("");

    return `<tr><td class="row-label">${row}</td>${benchCells}</tr>`;
  }).join("");

  // ── Compute column width based on positions per bench ───────────────────
  const posCount   = allPositions.length || 1;
  // Each seat card ~90px wide, plus gap; row label is 36px
  const seatWidth  = isLandscape ? 85 : 90;
  const cellWidth  = posCount * seatWidth + (posCount - 1) * 4 + 12; // padding
  const tableWidth = 36 + benchNums.length * (cellWidth + 2);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: A4 ${isLandscape ? "landscape" : "portrait"};
    margin: 10mm;
  }

  body {
    font-family: 'Arial', sans-serif;
    font-size: ${isLandscape ? "10px" : "11px"};
    color: #1a1a1a;
    padding: 0;
    width: ${isLandscape ? "277mm" : "190mm"};
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1e3a5f;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .college-name  { font-size: ${isLandscape ? "14px" : "16px"}; font-weight: 700; color: #1e3a5f; }
  .product-name  { font-size: 11px; color: #666; margin-top: 2px; }
  .generated-on  { font-size: 9px; color: #888; text-align: right; margin-top: 2px; }

  /* ── Meta block ── */
  .meta {
    margin-bottom: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px 12px;
    background: #f8fafc;
  }
  .meta-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 16px; }
  .meta-item   { display: flex; gap: 6px; font-size: 10px; }
  .meta-label  { font-weight: 600; color: #555; min-width: 86px; }

  /* ── Table ── */
  .table-wrap { overflow: visible; }
  table {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
    table-layout: fixed;
  }

  th, td {
    border: 1px solid #d0d5dd;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #1e3a5f;
    color: white;
    font-size: 9px;
    padding: 5px 6px;
    white-space: nowrap;
  }
  .row-label {
    font-weight: 700;
    background: #f1f5f9;
    width: 36px;
    min-width: 36px;
    text-align: center;
    font-size: 12px;
    color: #1e3a5f;
    vertical-align: middle;
    padding: 4px;
  }

  /* ── Bench cell ── */
  .bench-cell {
    padding: 4px 5px;
    width: ${cellWidth}px;
    min-width: ${cellWidth}px;
  }
  .bench-inner {
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: flex-start;
  }

  /* ── Individual seat card ── */
  .seat {
    flex: 1;
    min-width: 0;
    padding: 3px 4px;
    border-radius: 3px;
    background: #fff;
    border: 1px solid #e2e8f0;
  }
  .seat-empty {
    background: #fafafa;
    border-color: #eee;
  }
  .seat-id {
    display: block;
    font-size: 8px;
    color: #94a3b8;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .student-name {
    display: block;
    font-weight: 600;
    font-size: ${isLandscape ? "9px" : "10px"};
    line-height: 1.3;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-text { color: #ccc; font-weight: 400; }
  .branch-code {
    display: inline-block;
    font-size: 8px;
    background: #e8f4fd;
    color: #1e6bb8;
    padding: 1px 4px;
    border-radius: 3px;
    margin-top: 2px;
    font-weight: 600;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 12px;
    border-top: 1px solid #eee;
    padding-top: 6px;
    text-align: center;
    color: #aaa;
    font-size: 9px;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="college-name">${collegeName}</div>
    <div class="product-name">CampusSeating — Room Chart</div>
  </div>
  <div>
    <div class="generated-on">Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
  </div>
</div>

<div class="meta">
  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Exam:</span><span>${exam.title}</span></div>
    <div class="meta-item"><span class="meta-label">Academic Year:</span><span>${exam.academicYear}</span></div>
    <div class="meta-item"><span class="meta-label">Shift:</span><span>${shift.name} | ${shift.startTime} – ${shift.endTime}</span></div>
    <div class="meta-item"><span class="meta-label">Room:</span><span>${room.name}${room.building ? ` | ${room.building}` : ""}${room.floor ? `, ${room.floor}` : ""}</span></div>
    <div class="meta-item"><span class="meta-label">Students:</span><span>${assignments.length}</span></div>
    <div class="meta-item"><span class="meta-label">Invigilators:</span><span>${invigilators.map((i) => i.faculty?.name).join(", ") || "—"}</span></div>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:36px;">Row</th>
        ${benchNums.map((b) => `<th style="width:${cellWidth}px;">Bench ${b}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>

<div class="footer">Generated by CampusSeating &bull; ${collegeName}</div>
</body>
</html>`;
};

// ── Faculty Duty Chart (unchanged) ──────────────────────────────────────────

const generateFacultyDutyHTML = (exam, allShifts, allAssignments) => {
  const collegeName = process.env.COLLEGE_NAME || "College";

  const facultyMap = {};
  allAssignments.forEach((a) => {
    const fId = String(a.faculty?._id);
    if (!facultyMap[fId]) facultyMap[fId] = { faculty: a.faculty, duties: [] };
    facultyMap[fId].duties.push({
      shift: allShifts.find((s) => String(s._id) === String(a.shift)),
      room: a.room,
    });
  });

  const facultyRows = Object.values(facultyMap).map(({ faculty, duties }) => `
    <div class="faculty-block">
      <div class="faculty-name">${faculty?.name || "—"} <span class="designation">(${faculty?.designation || "Faculty"})</span></div>
      <table class="duty-table">
        <thead><tr><th>Shift</th><th>Time</th><th>Room</th></tr></thead>
        <tbody>
          ${duties.map((d) => `<tr>
            <td>${d.shift?.name || "—"}</td>
            <td>${d.shift?.startTime || "—"} – ${d.shift?.endTime || "—"}</td>
            <td>${d.room?.name || "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
  h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
  .faculty-block { margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 14px; break-inside: avoid; }
  .faculty-name { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #1e3a5f; }
  .designation { font-weight: 400; color: #888; font-size: 11px; }
  .duty-table { width: 100%; border-collapse: collapse; }
  .duty-table th, .duty-table td { border: 1px solid #ddd; padding: 5px 8px; }
  .duty-table th { background: #f1f5f9; font-size: 10px; }
  .footer { margin-top: 20px; border-top: 1px solid #eee; padding-top: 8px; text-align: center; color: #aaa; font-size: 9px; }
</style>
</head>
<body>
<h1>Invigilator Duty Chart</h1>
<div class="subtitle">${exam.title} &bull; ${exam.academicYear} &bull; ${new Date(exam.examDate).toLocaleDateString("en-IN")}</div>
${facultyRows}
<div class="footer">Generated by CampusSeating &bull; ${collegeName}</div>
</body>
</html>`;
};

// ── Seat Label PDFs ──────────────────────────────────────────────────────────
// Two variants: 'detailed' (seat ID + name + branch) and 'simple' (seat ID only)
// Packed in a tight grid — 4 columns × as many rows as needed, minimal whitespace.


const generateSeatLabelsHTML = (roomsData, variant = 'detailed') => {
  const collegeName = process.env.COLLEGE_NAME || 'College';
  const isDetailed = variant === 'detailed';
  const cols = isDetailed ? 8 : 10;
  const seatNumSize = isDetailed ? '10px' : '13px';

  const rooms = Array.isArray(roomsData)
    ? roomsData
    : [{ room: roomsData, assignments: [] }];

  const roomBlocks = rooms.map(({ room, assignments }) => {
    const sorted = [...assignments].sort((a, b) => {
      if (a.row !== b.row) return a.row.localeCompare(b.row);
      if (a.bench !== b.bench) return a.bench - b.bench;
      return a.position.localeCompare(b.position);
    });

    const labelCards = sorted.map((a) => {
      const seatId = a.row + '-' + a.bench + '-' + a.position;
      if (isDetailed) {
        return '<div class="label">'
          + '<span class="room-tag">' + room.name + '</span>'
          + '<span class="seat-num">' + seatId + '</span>'
          + '<span class="student-name">' + (a.student?.name || '—') + '</span>'
          + '<span class="branch-pill">' + (a.student?.branch?.code || '') + '</span>'
          + '</div>';
      } else {
        return '<div class="label label-simple">'
          + '<span class="room-tag">' + room.name + '</span>'
          + '<span class="seat-num">' + seatId + '</span>'
          + '</div>';
      }
    }).join('');

    return `<div class="page-header">
  <span class="page-header-left">${collegeName} — Seat Labels · ${room.name}${room.building ? ' (' + room.building + ')' : ''}</span>
  <span class="page-header-right">${isDetailed ? 'Detailed' : 'Simple'} · ${sorted.length} seats · cut along dashed lines</span>
</div>
<div class="grid">${labelCards}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 portrait; margin: 3mm; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; width: 204mm; }
  .page-header {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid #1e3a5f; padding-bottom: 2px; margin-bottom: 3px;
    margin-top: 4px; font-size: 7.5px;
  }
  .page-header:first-child { margin-top: 0; }
  .page-header-left  { font-weight: 700; color: #1e3a5f; }
  .page-header-right { color: #999; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 1mm; margin-bottom: 2mm; }
  .label {
    border: 0.5px dashed #b0bec5; border-radius: 2px; padding: 2px 3px;
    background: #fff; display: flex; flex-direction: column;
    break-inside: avoid; page-break-inside: avoid; min-height: 0;
  }
  .room-tag { font-size: 5.5px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1.1; }
  .seat-num { font-size: ${seatNumSize}; font-weight: 800; color: #1e3a5f; line-height: 1.15; }
  .student-name { font-size: 7px; font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
  .branch-pill { display: inline-block; font-size: 6px; font-weight: 700; background: #e8f4fd; color: #1565c0; padding: 0px 3px; border-radius: 2px; line-height: 1.4; width: fit-content; margin-top: 1px; }
  .label-simple { justify-content: center; }
</style>
</head>
<body>${roomBlocks}</body>
</html>`;
};

// ── Puppeteer renderer ───────────────────────────────────────────────────────
// Launches a browser once. No hardcoded path — uses Puppeteer's own
// bundled/installed Chromium (set PUPPETEER_EXECUTABLE_PATH in .env
// only if you specifically need to point at a system Chrome).
const launchBrowser = async () => {
  // headless: "new" was removed in Puppeteer v21 — use boolean true.
  // --disable-dev-shm-usage is mandatory on Linux VPS/Docker: the default /dev/shm
  // is only 64MB which Chrome fills instantly and crashes silently without this flag.
  return puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  });
};

// Renders one HTML string to PDF using an already-open browser.
// Opens/closes only a PAGE (cheap), not a browser (expensive).
const renderPDFOnBrowser = async (browser, html, landscape = false) => {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    return pdf;
  } finally {
    await page.close();
  }
};

// Original single-shot helper — kept for single-room routes so they
// don't need any changes. Launches, renders, closes — same as before.
const htmlToPDF = async (html, landscape = false) => {
  const browser = await launchBrowser();
  try {
    return await renderPDFOnBrowser(browser, html, landscape);
  } finally {
    await browser.close();
  }
};

module.exports = {
  generateRoomChartHTML,
  generateFacultyDutyHTML,
  generateSeatLabelsHTML,
  htmlToPDF,
  launchBrowser,
  renderPDFOnBrowser,
};