const puppeteer = require("puppeteer");

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const natCompare = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true });

const generateRoomChartHTML = (exam, shift, room, assignments, invigilators, collegeName = "College", orientation = "auto") => {
  // ── 1. Seat map: full room layout + who sits where ───────────────────────
  const assignBySeat = new Map();
  assignments.forEach((a) => assignBySeat.set(a.seatId, a));

  const seatMap = new Map(); // seatId -> { seatId, row, bench, status }
  (Array.isArray(room.seats) ? room.seats : []).forEach((s) => {
    seatMap.set(s.seatId, {
      seatId: s.seatId,
      row: String(s.row),
      bench: Number(s.bench),
      status: s.status || "available",
    });
  });
  // Assigned seats missing from the room layout (room edited later) are still printed
  assignments.forEach((a) => {
    if (!seatMap.has(a.seatId)) {
      seatMap.set(a.seatId, { seatId: a.seatId, row: String(a.row), bench: Number(a.bench), status: "available" });
    }
  });
  const seatList = [...seatMap.values()];

  const rows    = [...new Set(seatList.map((s) => s.row))].sort(natCompare);
  const benches = [...new Set(seatList.map((s) => s.bench))].sort((a, b) => a - b);

  const grid = {}; // "row|bench" -> seats[] (ordered left to right)
  seatList.forEach((s) => {
    const k = `${s.row}|${s.bench}`;
    if (!grid[k]) grid[k] = [];
    grid[k].push(s);
  });
  Object.values(grid).forEach((arr) => arr.sort((a, b) => natCompare(a.seatId, b.seatId)));
  const slots = Math.max(1, ...Object.values(grid).map((arr) => arr.length)); // seats per bench

  // ── 2. Layout: pick orientation and split benches so every page fits ─────
  const ROW_COL_MM  = 9;   // "Row" label column
  const MIN_SEAT_MM = 25;  // narrowest readable seat card
  const MAX_SEAT_MM = 40;  // stop cards from getting silly-wide on small rooms
  const maxColsFor  = (widthMm) => Math.max(1, Math.floor((widthMm - ROW_COL_MM) / MIN_SEAT_MM));

  const totalCols = benches.length * slots;
  const mode =
    orientation === "portrait" || orientation === "landscape"
      ? orientation
      : totalCols <= maxColsFor(190) ? "portrait" : "landscape";
  const isLandscape = mode === "landscape";
  const pageW = isLandscape ? 277 : 190; // A4 minus 10mm margins

  const benchesPerPage = Math.max(1, Math.floor(maxColsFor(pageW) / slots));
  const pageCount      = Math.max(1, Math.ceil(benches.length / benchesPerPage));
  const chunkSize      = Math.max(1, Math.ceil(benches.length / pageCount)); // widest page
  // Spread benches evenly across pages (e.g. 10 benches / 4 pages -> 3,3,2,2)
  const baseSize = Math.floor(benches.length / pageCount);
  const extra    = benches.length % pageCount;
  const chunks = [];
  let cursor = 0;
  for (let i = 0; i < pageCount && cursor < benches.length; i++) {
    const size = baseSize + (i < extra ? 1 : 0);
    chunks.push(benches.slice(cursor, cursor + size));
    cursor += size;
  }
  if (!chunks.length) chunks.push([]);

  const seatMm   = Math.min(MAX_SEAT_MM, (pageW - ROW_COL_MM) / (chunkSize * slots));
  const nameFont = seatMm >= 32 ? 9 : seatMm >= 27 ? 8.5 : 8;   // pt
  const smallFont = seatMm >= 30 ? 7 : 6.5;                       // pt

  // ── 3. Summary numbers ───────────────────────────────────────────────────
  const capacity = seatList.filter((s) => s.status === "available").length;
  const branchCounts = {};
  assignments.forEach((a) => {
    const c = a.student?.branch?.code || "—";
    branchCounts[c] = (branchCounts[c] || 0) + 1;
  });
  const branchSummary =
    Object.entries(branchCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${esc(c)}: ${n}`)
      .join("&nbsp;&nbsp;·&nbsp;&nbsp;") || "—";
  const invigilatorNames = invigilators.map((i) => esc(i.faculty?.name)).filter(Boolean).join(", ") || "—";
  const generatedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // ── 4. Builders ──────────────────────────────────────────────────────────
  const seatCell = (seat, isFirstInBench) => {
    const start = isFirstInBench ? " bench-start" : "";
    if (!seat) return `<td class="seat seat-none${start}"></td>`;

    const a = assignBySeat.get(seat.seatId);
    if (a) {
      return `<td class="seat${start}">
        <div class="top"><span class="sid">${esc(seat.seatId)}</span><span class="br">${esc(a.student?.branch?.code || "")}</span></div>
        <div class="nm">${esc(a.student?.name || "—")}</div>
        <div class="en">${esc(a.student?.enrollmentNo || "")}</div>
      </td>`;
    }
    const isAvailable = seat.status === "available";
    const label = isAvailable ? "Vacant" : seat.status === "reserved" ? "Reserved" : "Not in use";
    const cls = isAvailable ? "seat-vacant" : "seat-off";
    return `<td class="seat ${cls}${start}">
      <div class="top"><span class="sid">${esc(seat.seatId)}</span></div>
      <div class="state">${label}</div>
    </td>`;
  };

  const buildTable = (chunk) => {
    const tableW = ROW_COL_MM + seatMm * chunk.length * slots;
    const colgroup =
      `<colgroup><col style="width:${ROW_COL_MM}mm">` +
      chunk.map(() => Array.from({ length: slots }, () => `<col style="width:${seatMm}mm">`).join("")).join("") +
      `</colgroup>`;
    const head =
      `<tr><th class="row-h">Row</th>` +
      chunk.map((b) => `<th class="bench-h bench-start" colspan="${slots}">Bench ${b}</th>`).join("") +
      `</tr>`;
    const body = rows
      .map((r) => {
        const cells = chunk
          .map((b) => {
            const arr = grid[`${r}|${b}`] || [];
            return Array.from({ length: slots }, (_, i) => seatCell(arr[i], i === 0)).join("");
          })
          .join("");
        return `<tr><td class="row-label">${esc(r)}</td>${cells}</tr>`;
      })
      .join("");
    return `<table style="width:${tableW}mm">${colgroup}<thead>${head}</thead><tbody>${body}</tbody></table>`;
  };

  const sections = chunks
    .map((chunk, idx) => {
      const partLabel =
        chunks.length > 1
          ? `<div class="part">Benches ${chunk[0]}–${chunk[chunk.length - 1]} &nbsp;•&nbsp; Page ${idx + 1} of ${chunks.length}</div>`
          : "";
      const content = chunk.length
        ? buildTable(chunk)
        : `<div class="empty">No seating data available for this room.</div>`;
      return `<section class="sheet">
  <div class="hdr">
    <div>
      <div class="college">${esc(collegeName)}</div>
      <div class="sub">CampusSeating — Room Seating Chart</div>
    </div>
    <div class="gen">Generated: ${generatedOn}</div>
  </div>
  <div class="meta">
    <div><b>Exam:</b>${esc(exam.title)}</div>
    <div><b>Academic Year:</b>${esc(exam.academicYear)}</div>
    <div><b>Shift:</b>${esc(shift.name)} | ${esc(shift.startTime)} – ${esc(shift.endTime)}</div>
    <div><b>Room:</b>${esc(room.name)}${room.building ? ` | ${esc(room.building)}` : ""}${room.floor ? `, ${esc(room.floor)}` : ""}</div>
    <div><b>Students:</b>${assignments.length}</div>
    <div><b>Room Capacity:</b>${capacity}</div>
    <div class="wide"><b>Invigilators:</b>${invigilatorNames}</div>
    <div class="wide"><b>Branch-wise:</b>${branchSummary}</div>
  </div>
  ${partLabel}
  ${content}
  <div class="foot">Generated by CampusSeating &bull; ${esc(collegeName)}</div>
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="pdf-orientation" content="${mode}">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 ${mode}; margin: 10mm; }

  html, body { width: ${pageW}mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* One sheet per group of benches; each sheet repeats the header */
  .sheet { width: ${pageW}mm; page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }

  /* ── Header ── */
  .hdr {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 0.6mm solid #1e3a5f; padding-bottom: 2mm; margin-bottom: 3mm;
  }
  .college { font-size: 15pt; font-weight: 700; color: #1e3a5f; }
  .sub     { font-size: 9pt; color: #64748b; margin-top: 0.5mm; }
  .gen     { font-size: 8pt; color: #94a3b8; }

  /* ── Meta ── */
  .meta {
    display: flex; flex-wrap: wrap;
    border: 0.3mm solid #e2e8f0; border-radius: 1.5mm; background: #f8fafc;
    padding: 2.2mm 3mm; margin-bottom: 3mm; font-size: 8.5pt;
  }
  .meta > div { width: 33.33%; padding: 0.6mm 3mm 0.6mm 0; }
  .meta > div.wide { width: 100%; }
  .meta b { color: #475569; margin-right: 1.5mm; font-weight: 700; }

  .part { font-size: 9.5pt; font-weight: 700; color: #1e3a5f; margin-bottom: 1.5mm; }
  .empty { padding: 20mm 0; text-align: center; color: #94a3b8; font-size: 11pt; }

  /* ── Table ── */
  table { border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th, td { border: 0.3mm solid #cbd5e1; }
  th {
    background: #1e3a5f; color: #fff; font-size: 8pt; font-weight: 700;
    text-align: center; padding: 1.3mm 1mm;
  }
  .bench-start { border-left: 0.7mm solid #1e3a5f; }
  .row-label {
    background: #eef2f7; color: #1e3a5f; font-weight: 700; font-size: 10pt;
    text-align: center; vertical-align: middle;
  }

  /* ── Seat card ── */
  td.seat { height: 15mm; padding: 1mm 1.3mm; vertical-align: top; overflow: hidden; }
  .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5mm; }
  .sid { font-size: ${smallFont}pt; color: #64748b; }
  .br  {
    font-size: ${smallFont}pt; font-weight: 700; color: #1e6bb8;
    background: #e8f4fd; padding: 0 1mm; border-radius: 0.8mm;
  }
  .nm {
    font-size: ${nameFont}pt; font-weight: 700; line-height: 1.15; word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .en {
    font-size: ${smallFont}pt; color: #475569; margin-top: 0.4mm;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .seat-vacant { background: #f8fafc; }
  .seat-none   { background: #f1f5f9; }
  .seat-off {
    background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 1.5mm, #e2e8f0 1.5mm, #e2e8f0 3mm);
  }
  .state { font-size: ${smallFont + 0.5}pt; color: #94a3b8; font-style: italic; margin-top: 2.5mm; }

  /* ── Footer ── */
  .foot {
    margin-top: 3mm; border-top: 0.3mm solid #e2e8f0; padding-top: 1.5mm;
    text-align: center; color: #94a3b8; font-size: 8pt;
  }
</style>
</head>
<body>
${sections}
</body>
</html>`;
};

// ── Faculty Duty Chart (unchanged) ──────────────────────────────────────────

const generateFacultyDutyHTML = (exam, allShifts, allAssignments, collegeName = "College") => {

  const facultyMap = {};
  allAssignments.forEach((a) => {
    // Prisma returns .id not ._id; a.shiftId is the FK field, not a.shift
    const fId = String(a.faculty?.id || a.facultyId);
    if (!facultyMap[fId]) facultyMap[fId] = { faculty: a.faculty, duties: [] };
    facultyMap[fId].duties.push({
      shift: allShifts.find((s) => String(s.id) === String(a.shiftId)),
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


const generateSeatLabelsHTML = (roomsData, variant = 'detailed', collegeName = 'College') => {
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
  // Resolve Chrome executable:
  // 1. Honour explicit env override (set PUPPETEER_EXECUTABLE_PATH in .env if needed)
  // 2. Ask puppeteer for the path to the Chrome it downloaded during npm install
  //    (executablePath() is async in puppeteer v21+)
  // 3. Fall back to common system paths
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
  if (!executablePath) {
    try {
      executablePath = await puppeteer.executablePath();
    } catch (_) {
      // executablePath() throws if Chrome was never downloaded
    }
  }
  if (!executablePath) {
    const fs = require("fs");
    const candidates = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
    ];
    executablePath = candidates.find((p) => fs.existsSync(p)) || undefined;
  }

  // headless: "new" was removed in Puppeteer v21 — boolean true is correct for v21+.
  // --disable-dev-shm-usage: mandatory on Linux VPS/Docker — /dev/shm is only 64 MB
  //   and Chrome fills it immediately, causing a silent crash without this flag.
  // --no-zygote + --single-process removed: they conflict with each other in Chrome 131+
  //   and cause crashes on multi-core systems.
  return puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
};

// Renders one HTML string to PDF using an already-open browser.
// Opens/closes only a PAGE (cheap), not a browser (expensive).
const renderPDFOnBrowser = async (browser, html, landscape = false) => {
  // Room charts pick their own orientation and declare it in the HTML.
  // Puppeteer ignores the CSS @page size, so it has to be passed explicitly.
  const isLandscape =
    landscape || html.includes('<meta name="pdf-orientation" content="landscape">');

  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: isLandscape,
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