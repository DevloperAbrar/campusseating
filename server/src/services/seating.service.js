/**
 * CampusSeating — Core Seating Algorithm
 * Pure function — zero DB calls. Controller feeds data, this returns assignments.
 */

const { shuffleArray, interleaveArrays } = require("../utils/helpers");

/**
 * @param {Object[]} students - [{_id, branch, year, specialNeeds, gender, enrollmentNo}]
 * @param {Object[]} rooms    - [{_id, seats, usableCapacity, priority}]
 * @param {Object}   rules    - seatingRules from Shift
 * @returns {{ assignments, unassigned, warnings }}
 */
function generateSeatingPlan(students, rooms, rules) {
  const assignments = [];
  const warnings = [];

  // ── STEP 1: Prepare seat pools ───────────────────────────────────────────
  let roomPools = rooms
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((room) => {
      const available = room.seats.filter((s) => s.status === "available");
      const reserved  = room.seats.filter((s) => s.status === "reserved");
      return { roomId: room._id, available, reserved, capacity: available.length };
    });

  // ── STEP 2: Special Needs First ──────────────────────────────────────────
  let remaining = [...students];
  const specialStudents = remaining.filter((s) => s.specialNeeds);
  remaining = remaining.filter((s) => !s.specialNeeds);

  const reservedPool = roomPools.flatMap((r) =>
    r.reserved.map((s) => ({ ...s, roomId: r.roomId }))
  );

  for (const student of specialStudents) {
    const seat = reservedPool.shift();
    if (seat) {
      assignments.push({
        studentId: student._id,
        roomId: seat.roomId,
        seatId: seat.seatId,
        row: seat.row,
        bench: seat.bench,
        position: seat.position,
      });
    } else {
      const fallback = findNextAvailableSeat(roomPools, assignments);
      if (fallback) {
        assignments.push({ studentId: student._id, ...fallback });
        warnings.push(`Special needs student ${student.enrollmentNo} placed on standard seat`);
      } else {
        remaining.push(student);
      }
    }
  }

  // FIX: reserved seats are carved out for special-needs students. If there were
  // fewer special-needs students than reserved seats (or none at all), the leftover
  // reserved seats used to sit locked out of the standard pool forever — silently
  // shrinking real capacity below what the UI reported. Release any unused reserved
  // seats back into their room's available pool so everyone else can still be seated.
  if (reservedPool.length > 0) {
    for (const seat of reservedPool) {
      const pool = roomPools.find((r) => String(r.roomId) === String(seat.roomId));
      if (pool) {
        pool.available.push(seat);
        pool.capacity += 1;
      }
    }
  }

  // ── STEP 3 / 4: Grouped assignment (year separation, then/or gender separation) ──
  // FIX (structural): previously, year-separation and gender-separation each carved
  // out whole ROOMS per group using Math.ceil() on a proportional target. Because
  // rooms only come in fixed chunks (e.g. 30 seats each), every group except the
  // last one over-collects and rounds up to the next whole room, wasting seats. The
  // final group then runs out of rooms — and because all rooms had already been
  // handed out, there was nothing left for the old "overflow" fallback to use, even
  // though the seats those earlier groups wasted were sitting empty the whole time.
  // Example that was actually reproduced: 14 rooms × 30 seats (420 total) for
  // 361 students split 95/92/88/86 across 4 years — years 1–3 wasted 85 seats
  // between them on rounding, year 4 came up 26 seats short, and 0 rooms were left
  // for the safety net to use.
  //
  // Fix: still assign each group to its own room block first (so branch/pairing
  // rules still see clean per-group room pools), but afterwards run a single
  // universal reconciliation pass (see reconcileUnseated below) that looks at every
  // seat still truly unused ANYWHERE — including leftover seats inside another
  // group's block — and places any still-unseated student there. This guarantees
  // that as long as total capacity >= total demand, nobody is left unseated just
  // because of room-size rounding.
  if (rules.yearSeparation && roomPools.length > 1) {
    assignByGroups(remaining, "year", roomPools, rules, assignments, warnings);
  } else if (rules.genderSeparation === "rooms" || rules.genderSeparation === "rows") {
    assignByGender(remaining, roomPools, rules, assignments, warnings);
  } else {
    // ── STEP 5: Main Assignment ─────────────────────────────────────────────
    // Spread mode: reorder room pools so students are distributed evenly
    const activePools =
      rules.roomFillStrategy === "spread"
        ? buildSpreadPools(remaining.length, roomPools)
        : roomPools;

    assignGroup(remaining, activePools, rules, assignments, warnings);
  }

  // ── FINAL SAFETY NET ─────────────────────────────────────────────────────
  // Runs after every path above (year separation, gender separation, or plain
  // fill). Catches anyone still unseated and tries every seat that is truly
  // still empty, anywhere, regardless of which group's "block" it originally
  // belonged to. This is what actually fixes the year/gender rounding bug —
  // without it, the room-block partitioning above can strand students next to
  // empty seats in a neighboring block.
  reconcileUnseated(students, roomPools, rules, assignments, warnings);

  const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
  const unassigned = students.filter((s) => !allAssignedIds.has(String(s._id)));

  if (unassigned.length > 0) {
    const totalCapacity = roomPools.reduce((sum, r) => sum + r.available.length, 0);
    if (totalCapacity < students.length) {
      warnings.push(
        `Total seat capacity (${totalCapacity}) is less than total students (${students.length}) — ${unassigned.length} student(s) genuinely have nowhere to sit.`
      );
    } else {
      warnings.push(
        `${unassigned.length} student(s) could not be seated even though total capacity was sufficient — likely due to strict seating-rule constraints (e.g. too few distinct branches to satisfy strict branch separation on the remaining seats).`
      );
    }
  }

  return { assignments, unassigned, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// assignByGroups — generic proportional room-block assignment used by
// year-separation. Groups students by the given key ("year"), gives each group
// its own block of rooms sized proportionally to its share of students, then
// seats each group within its block. Any shortfall from room-size rounding is
// caught later by reconcileUnseated().
// ─────────────────────────────────────────────────────────────────────────────

function assignByGroups(remainingStudents, groupKey, roomPools, rules, assignments, warnings) {
  const groups = {};
  for (const s of remainingStudents) {
    const key = s[groupKey] || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const keys = Object.keys(groups).sort();
  const totalSeats = roomPools.reduce((acc, r) => acc + r.capacity, 0);
  const totalStudentsInGroups = remainingStudents.length || 1;

  let poolCursor = 0;
  for (const key of keys) {
    const group = groups[key];
    const proportion = group.length / totalStudentsInGroups;
    const targetSeats = Math.ceil(totalSeats * proportion);

    const groupPools = [];
    let collected = 0;
    while (poolCursor < roomPools.length && collected < targetSeats) {
      groupPools.push(roomPools[poolCursor]);
      collected += roomPools[poolCursor].capacity;
      poolCursor++;
    }

    assignGroup(group, groupPools, rules, assignments, warnings);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// assignByGender — "rooms" mode carves out whole rooms (same proportional
// approach as assignByGroups); "rows" mode splits each room's own rows
// proportionally instead, so it isn't subject to the same whole-room rounding.
// ─────────────────────────────────────────────────────────────────────────────

function assignByGender(remainingStudents, roomPools, rules, assignments, warnings) {
  const female = remainingStudents.filter((s) => s.gender === "female");
  const male   = remainingStudents.filter((s) => s.gender !== "female");
  const femaleProportion = female.length / (remainingStudents.length || 1);

  let femalePools, malePools;

  if (rules.genderSeparation === "rooms") {
    const split = Math.ceil(roomPools.length * femaleProportion);
    femalePools = roomPools.slice(0, Math.max(1, split));
    malePools   = roomPools.slice(Math.max(1, split));
  } else {
    // "rows": split each room's own rows proportionally, so female students take
    // the earliest rows in every room and male students take the rest.
    femalePools = [];
    malePools = [];
    for (const pool of roomPools) {
      const rowGroups = {};
      for (const seat of pool.available) {
        if (!rowGroups[seat.row]) rowGroups[seat.row] = [];
        rowGroups[seat.row].push(seat);
      }
      const rowKeys = Object.keys(rowGroups).sort();
      const femaleRowCount = Math.min(
        rowKeys.length,
        Math.max(femaleProportion > 0 ? 1 : 0, Math.round(rowKeys.length * femaleProportion))
      );
      const femaleSeats = rowKeys.slice(0, femaleRowCount).flatMap((r) => rowGroups[r]);
      const maleSeats   = rowKeys.slice(femaleRowCount).flatMap((r) => rowGroups[r]);
      if (femaleSeats.length) femalePools.push({ ...pool, available: femaleSeats });
      if (maleSeats.length) malePools.push({ ...pool, available: maleSeats });
    }
  }

  assignGroup(female, femalePools, rules, assignments, warnings);
  assignGroup(male,   malePools,   rules, assignments, warnings);
}

// ─────────────────────────────────────────────────────────────────────────────
// reconcileUnseated — universal safety net. Finds every student not yet in
// `assignments` and every seat not yet used by `assignments` (scanning ALL
// room pools, not just whichever block a group was given), then makes one
// more best-effort standard-fill pass. This is what prevents room-size
// rounding in year/gender separation from stranding students next to seats
// that are technically empty but belong to a different group's block.
// ─────────────────────────────────────────────────────────────────────────────

function reconcileUnseated(students, roomPools, rules, assignments, warnings) {
  const assignedIds = new Set(assignments.map((a) => String(a.studentId)));
  const stillUnseated = students.filter((s) => !s.specialNeeds && !assignedIds.has(String(s._id)));
  // Special-needs students who never found any seat at all (extremely rare —
  // only happens if total capacity is short) are handled too, so they aren't
  // silently dropped just because they came from a different code path.
  const stillUnseatedSpecials = students.filter((s) => s.specialNeeds && !assignedIds.has(String(s._id)));
  const candidates = [...stillUnseated, ...stillUnseatedSpecials];
  if (!candidates.length) return;

  const usedSeatKeys = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));
  const leftoverPools = roomPools
    .map((pool) => ({
      ...pool,
      available: pool.available.filter((seat) => !usedSeatKeys.has(`${pool.roomId}-${seat.seatId}`)),
    }))
    .filter((pool) => pool.available.length > 0);

  if (!leftoverPools.length) return; // genuinely no seats left anywhere

  const before = assignments.length;
  assignStandard(candidates, leftoverPools, rules, assignments, warnings);
  const placed = assignments.length - before;
  if (placed > 0) {
    warnings.push(
      `${placed} student(s) required a second pass to seat (room-block rounding) — they were placed on leftover seats outside their primary block.`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spread pool builder
// Interleaves seat slots across rooms so students are distributed evenly.
// e.g. 3 rooms of 40 seats each, 60 students → 20 per room instead of 40+20+0
// ─────────────────────────────────────────────────────────────────────────────

function buildSpreadPools(studentCount, roomPools) {
  const totalSeats = roomPools.reduce((a, r) => a + r.capacity, 0);
  if (totalSeats === 0) return roomPools;

  // For each room, calculate how many seats to "offer" proportionally
  return roomPools.map((pool) => {
    const quota = Math.ceil((pool.capacity / totalSeats) * studentCount);
    return { ...pool, available: pool.available.slice(0, quota) };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// assignGroup — dispatches to block-column or standard fill
// ─────────────────────────────────────────────────────────────────────────────

function assignGroup(students, roomPools, rules, assignments, warnings) {
  const isBlock =
    rules.consecutivePairing &&
    rules.branchPairs?.length &&
    rules.pairingMode === "block";

  if (isBlock) {
    assignBlockColumn(students, roomPools, rules, assignments, warnings);
  } else {
    assignStandard(students, roomPools, rules, assignments, warnings);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK-COLUMN MODE
// Each bench-position column is owned by exactly one branch.
// Fill order: all rows top-to-bottom for each column, across all rooms.
// If a branch runs out of dedicated columns before its queue is empty, the
// leftover students fall through to standard fill on whatever columns remain
// (same as originally-unpaired students) instead of being silently dropped.
// ─────────────────────────────────────────────────────────────────────────────

function assignBlockColumn(students, roomPools, rules, assignments, warnings) {
  const usedSeats   = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));
  const branchGroups = buildBranchGroups(students, rules);
  const gapSeating   = normalizeGap(rules.gapSeating);

  // Resolve pairs (auto or manual)
  const pairs = resolvePairs(rules, branchGroups);

  // Build per-pair branch queues
  const pairQueues = pairs.map((pair) =>
    pair.branches.map((b) => [...(branchGroups[String(b)] || [])])
  );

  // Branches not in any pair
  const pairedIds = new Set(pairs.flatMap((p) => p.branches.map(String)));
  const unpairedStudents = Object.entries(branchGroups)
    .filter(([k]) => !pairedIds.has(k))
    .flatMap(([, arr]) => arr);

  // Build ordered column list: room priority → bench → position (top-to-bottom within each)
  const columns = buildColumns(roomPools, rules);

  // Apply row-wise gap to columns
  const activeColumns =
    gapSeating === "row" ? columns.filter((_, i) => i % 2 === 0) : columns;

  let colIdx = 0;

  for (const queues of pairQueues) {
    const branchCount = queues.length;
    while (queues.some((q) => q.length > 0) && colIdx < activeColumns.length) {
      for (let b = 0; b < branchCount; b++) {
        if (colIdx >= activeColumns.length) break;
        const col   = activeColumns[colIdx++];
        const queue = queues[b];

        for (const seat of col.seats) {
          if (queue.length === 0) break;
          const seatKey = `${col.roomId}-${seat.seatId}`;
          if (usedSeats.has(seatKey)) continue;

          const student = queue.shift();
          assignments.push({
            studentId: student._id,
            branchId:  student.branch,
            roomId:    col.roomId,
            seatId:    seat.seatId,
            row:       seat.row,
            bench:     seat.bench,
            position:  seat.position,
          });
          usedSeats.add(seatKey);
        }
      }
    }
  }

  // FIX: previously, any pair whose columns ran out before its queue emptied
  // (e.g. one branch in the pair is much larger than the block gave it credit
  // for) just silently lost those students — they were never added to the
  // fallback fill. Now any leftover queued students are folded into the
  // fallback pool alongside genuinely unpaired students.
  const leftoverPaired = pairQueues.flat().flat();

  // Standard fill for unpaired + leftover-paired students on remaining columns
  const fallbackStudents = [...unpairedStudents, ...leftoverPaired];
  if (fallbackStudents.length > 0 && colIdx < activeColumns.length) {
    const remainingCols = activeColumns.slice(colIdx);
    const tempPools = buildTempPoolsFromColumns(remainingCols, roomPools);
    assignStandard(fallbackStudents, tempPools, rules, assignments, warnings);
  } else if (fallbackStudents.length > 0) {
    // No columns left at all in this room block — leave them for the caller's
    // reconciliation pass rather than silently dropping them here.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD FILL — row by row (interleaved + non-pairing modes)
// ─────────────────────────────────────────────────────────────────────────────

function assignStandard(students, roomPools, rules, assignments, warnings) {
  const sorted     = sortStudentsStandard(students, rules);
  const usedSeats  = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));
  const gapSeating = normalizeGap(rules.gapSeating);

  let pointer = 0;
  let forcedSameBranch = 0;

  for (const roomPool of roomPools) {
    if (pointer >= sorted.length) break;

    // Group seats by bench-row
    const benchMap = {};
    for (const seat of roomPool.available) {
      const key = `${seat.row}-${String(seat.bench).padStart(4, "0")}`;
      if (!benchMap[key]) benchMap[key] = [];
      benchMap[key].push(seat);
    }

    let benches = Object.entries(benchMap).sort(([a], [b]) => a.localeCompare(b));

    // Fill direction: back-to-front reverses bench order
    if (rules.fillDirection === "back") benches = benches.reverse();

    // Row-wise gap: skip every other bench
    const activeBenches =
      gapSeating === "row" ? benches.filter((_, i) => i % 2 === 0) : benches;

    for (const [, seats] of activeBenches) {
      if (pointer >= sorted.length) break;

      // Side gap: only first seat of bench
      const positions = gapSeating === "side" ? [seats[0]] : seats;

      for (const seat of positions) {
        if (pointer >= sorted.length) break;

        const seatKey = `${roomPool.roomId}-${seat.seatId}`;
        if (usedSeats.has(seatKey)) continue;

        let student = sorted[pointer];

        // Strict branch separation
        if (rules.branchSeparationMode === "strict") {
          // Bench numbers restart at 1 in every row, so row must be matched
          // alongside bench number — otherwise bench 3 in row A and bench 3 in
          // row B would be wrongly treated as the same physical bench.
          const benchAssigned = assignments.filter(
            (a) => String(a.roomId) === String(roomPool.roomId) && a.row === seat.row && a.bench === seat.bench
          );
          const usedBranches = new Set(benchAssigned.map((a) => String(a.branchId)));
          if (benchAssigned.length > 0 && usedBranches.has(String(student.branch))) {
            const swapIdx = sorted.findIndex(
              (s, i) => i > pointer && !usedBranches.has(String(s.branch))
            );
            if (swapIdx !== -1) {
              [sorted[pointer], sorted[swapIdx]] = [sorted[swapIdx], sorted[pointer]];
              student = sorted[pointer];
            } else {
              // No student left who wouldn't collide — every remaining student
              // shares a branch with someone already on this bench. We still
              // seat them (never drop a student over a soft preference) but
              // count it so the caller can be told strict separation wasn't
              // fully achievable with this student/room mix.
              forcedSameBranch++;
            }
          }
        }

        assignments.push({
          studentId: student._id,
          branchId:  student.branch,
          roomId:    roomPool.roomId,
          seatId:    seat.seatId,
          row:       seat.row,
          bench:     seat.bench,
          position:  seat.position,
        });

        usedSeats.add(seatKey);
        pointer++;
      }
    }
  }

  if (forcedSameBranch > 0) {
    warnings.push(
      `Strict branch separation could not be fully honored for ${forcedSameBranch} seat(s) — too few distinct branches remaining for the available benches.`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sortStudentsStandard — interleaved pairing or plain interleave
// ─────────────────────────────────────────────────────────────────────────────

function sortStudentsStandard(students, rules) {
  const branchGroups = buildBranchGroups(students, rules);

  if (!rules.consecutivePairing) {
    return interleaveArrays(Object.values(branchGroups));
  }

  const pairs = resolvePairs(rules, branchGroups);
  if (!pairs.length) return interleaveArrays(Object.values(branchGroups));

  const result = [];
  const used   = new Set();

  // Build one interleaved stream per pair, then round-robin across pairs
  const pairStreams = pairs.map((pair) => {
    const arrays = pair.branches.map((b) => branchGroups[String(b)] || []);
    return interleaveArrays(arrays);
  });

  const maxLen = Math.max(...pairStreams.map((p) => p.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const stream of pairStreams) {
      if (i < stream.length) {
        const s = stream[i];
        if (!used.has(String(s._id))) { result.push(s); used.add(String(s._id)); }
      }
    }
  }

  // Append unpaired branches
  for (const s of Object.values(branchGroups).flat()) {
    if (!used.has(String(s._id))) result.push(s);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// resolvePairs
// Returns effective pairs array — auto-generated or manual based on rules.
// ─────────────────────────────────────────────────────────────────────────────

function resolvePairs(rules, branchGroups) {
  if (!rules.consecutivePairing) return [];

  // Auto-pair: sort branches by student count (desc), then pair largest with smallest
  // This balances seat fill so neither branch heavily dominates a column.
  if (rules.autoPair) {
    const entries = Object.entries(branchGroups)
      .filter(([, arr]) => arr.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    const pairs = [];
    const left  = entries.slice(0, Math.ceil(entries.length / 2));
    const right  = [...entries.slice(Math.ceil(entries.length / 2))].reverse();

    for (let i = 0; i < left.length; i++) {
      const branchA = left[i][0];
      const branchB = right[i]?.[0];
      if (branchB) {
        pairs.push({ branches: [branchA, branchB] });
      } else {
        // Odd branch out — pair with itself (single column)
        pairs.push({ branches: [branchA] });
      }
    }
    return pairs;
  }

  // Manual pairs
  return (rules.branchPairs || []).filter((p) => p.branches?.length >= 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildBranchGroups — group + sort students per branch
// ─────────────────────────────────────────────────────────────────────────────

function buildBranchGroups(students, rules) {
  const groups = {};
  for (const s of students) {
    const key = String(s.branch);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  const order =
    rules.rollNumberOrder === "false" || !rules.rollNumberOrder
      ? false
      : rules.rollNumberOrder;

  for (const key of Object.keys(groups)) {
    if (order === "asc") {
      groups[key].sort((a, b) =>
        a.enrollmentNo.localeCompare(b.enrollmentNo, undefined, { numeric: true })
      );
    } else if (order === "desc") {
      groups[key].sort((a, b) =>
        b.enrollmentNo.localeCompare(a.enrollmentNo, undefined, { numeric: true })
      );
    } else {
      groups[key] = shuffleArray(groups[key]);
    }
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildColumns — ordered list of (roomId, bench, position) columns
// Each column contains its seats sorted row A→Z (or Z→A for back fill)
// ─────────────────────────────────────────────────────────────────────────────

function buildColumns(roomPools, rules) {
  const columns = [];

  for (const roomPool of roomPools) {
    const colMap = new Map();
    for (const seat of roomPool.available) {
      const key = `${String(seat.bench).padStart(4, "0")}-${seat.position}`;
      if (!colMap.has(key)) colMap.set(key, []);
      colMap.get(key).push(seat);
    }

    const sortedKeys = [...colMap.keys()].sort();
    for (const key of sortedKeys) {
      let seats = colMap.get(key).sort((a, b) => a.row.localeCompare(b.row));
      if (rules.fillDirection === "back") seats = seats.reverse();
      columns.push({ roomId: roomPool.roomId, seats });
    }
  }

  return columns;
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildTempPoolsFromColumns(columns, originalPools) {
  const roomSeatMap = new Map();
  for (const col of columns) {
    const rid = String(col.roomId);
    if (!roomSeatMap.has(rid)) roomSeatMap.set(rid, []);
    for (const seat of col.seats) roomSeatMap.get(rid).push(seat);
  }
  return originalPools
    .filter((p) => roomSeatMap.has(String(p.roomId)))
    .map((p) => ({ ...p, available: roomSeatMap.get(String(p.roomId)) }));
}

function normalizeGap(v) {
  return v === "false" || !v ? false : v;
}

function findNextAvailableSeat(roomPools, assignments) {
  const usedSeats = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));
  for (const roomPool of roomPools) {
    for (const seat of roomPool.available) {
      const key = `${roomPool.roomId}-${seat.seatId}`;
      if (!usedSeats.has(key)) {
        return {
          roomId:   roomPool.roomId,
          seatId:   seat.seatId,
          row:      seat.row,
          bench:    seat.bench,
          position: seat.position,
        };
      }
    }
  }
  return null;
}

module.exports = { generateSeatingPlan };