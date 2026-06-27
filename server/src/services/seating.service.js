// /**
//  * CampusSeating — Core Seating Algorithm
//  * Pure function — zero DB calls. Controller feeds data, this returns assignments.
//  */

// const { shuffleArray, interleaveArrays } = require("../utils/helpers");

// /**
//  * @param {Object[]} students - [{_id, branch, year, specialNeeds, gender, enrollmentNo}]
//  * @param {Object[]} rooms    - [{_id, seats, usableCapacity, priority}]
//  * @param {Object}   rules    - seatingRules from Shift
//  * @returns {{ assignments, unassigned, warnings }}
//  */
// function generateSeatingPlan(students, rooms, rules) {
//   const assignments = [];
//   const warnings = [];

//   // ── STEP 1: Prepare seat pools ──────────────────────────────────────────
//   const roomPools = rooms
//     .sort((a, b) => a.priority - b.priority)
//     .map((room) => {
//       const available = room.seats.filter((s) => s.status === "available");
//       const reserved = room.seats.filter((s) => s.status === "reserved");
//       return { roomId: room._id, available, reserved, allAvailable: available };
//     });

//   // ── STEP 2: Special Needs First ─────────────────────────────────────────
//   let remaining = [...students];
//   const specialStudents = remaining.filter((s) => s.specialNeeds);
//   remaining = remaining.filter((s) => !s.specialNeeds);

//   let reservedPool = roomPools.flatMap((r) => r.reserved.map((s) => ({ ...s, roomId: r.roomId })));

//   for (const student of specialStudents) {
//     const seat = reservedPool.shift();
//     if (seat) {
//       assignments.push({ studentId: student._id, roomId: seat.roomId, seatId: seat.seatId, row: seat.row, bench: seat.bench, position: seat.position });
//     } else {
//       // Fall back to available
//       const fallback = findNextAvailableSeat(roomPools, assignments);
//       if (fallback) {
//         assignments.push({ studentId: student._id, ...fallback });
//         warnings.push(`Special needs student ${student.enrollmentNo} placed on standard seat`);
//       } else {
//         remaining.push(student); // Will be in unassigned
//       }
//     }
//   }

//   // ── STEP 3: Gender Separation ────────────────────────────────────────────
//   if (rules.genderSeparation === "rooms") {
//     const female = remaining.filter((s) => s.gender === "female");
//     const male = remaining.filter((s) => s.gender !== "female");
//     const femaleRooms = roomPools.slice(0, Math.ceil(roomPools.length / 2));
//     const maleRooms = roomPools.slice(Math.ceil(roomPools.length / 2));
//     assignGroup(female, femaleRooms, rules, assignments, warnings);
//     assignGroup(male, maleRooms, rules, assignments, warnings);
//     const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
//     const unassigned = remaining.filter((s) => !allAssignedIds.has(String(s._id)));
//     return { assignments, unassigned, warnings };
//   }

//   // ── STEPS 4-6: Main assignment ────────────────────────────────────────────
//   assignGroup(remaining, roomPools, rules, assignments, warnings);

//   const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
//   const unassigned = students.filter((s) => !allAssignedIds.has(String(s._id)));

//   return { assignments, unassigned, warnings };
// }

// function assignGroup(students, roomPools, rules, assignments, warnings) {
//   // Sort / interleave students
//   const sorted = sortStudents(students, rules);
//   const usedSeats = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));

//   let pointer = 0;

//   for (const roomPool of roomPools) {
//     const benchMap = {};

//     // Group available seats by bench
//     for (const seat of roomPool.available) {
//       const key = `${seat.row}-${seat.bench}`;
//       if (!benchMap[key]) benchMap[key] = [];
//       benchMap[key].push(seat);
//     }

//     const benches = Object.entries(benchMap).sort(([a], [b]) => a.localeCompare(b));

//     for (const [benchKey, seats] of benches) {
//       const positions = rules.gapSeating ? [seats[0]] : seats;

//       for (const seat of positions) {
//         if (pointer >= sorted.length) break;

//         const seatKey = `${roomPool.roomId}-${seat.seatId}`;
//         if (usedSeats.has(seatKey)) continue;

//         let student = sorted[pointer];

//         // Strict branch separation check
//         if (rules.branchSeparationMode === "strict") {
//           const benchAssigned = assignments.filter((a) => String(a.roomId) === String(roomPool.roomId) && a.bench === seat.bench);
//           const usedBranches = new Set(benchAssigned.map((a) => String(a.branchId)));

//           if (usedBranches.has(String(student.branch)) && usedBranches.size > 0 && benchAssigned.length > 0) {
//             // Try to swap with next different-branch student
//             const swapIdx = sorted.findIndex((s, i) => i > pointer && !usedBranches.has(String(s.branch)));
//             if (swapIdx !== -1) {
//               [sorted[pointer], sorted[swapIdx]] = [sorted[swapIdx], sorted[pointer]];
//               student = sorted[pointer];
//             } else {
//               warnings.push(`Branch separation violation at ${seat.seatId} — no alternative available`);
//             }
//           }
//         }

//         assignments.push({
//           studentId: student._id,
//           branchId: student.branch,
//           roomId: roomPool.roomId,
//           seatId: seat.seatId,
//           row: seat.row,
//           bench: seat.bench,
//           position: seat.position,
//         });

//         usedSeats.add(seatKey);
//         pointer++;
//       }

//       if (pointer >= sorted.length) break;
//     }

//     if (pointer >= sorted.length) break;
//   }
// }

// function sortStudents(students, rules) {
//   // Group by branch
//   const branchGroups = {};
//   students.forEach((s) => {
//     const key = String(s.branch);
//     if (!branchGroups[key]) branchGroups[key] = [];
//     branchGroups[key].push(s);
//   });

//   // Sort within each branch
//   Object.keys(branchGroups).forEach((key) => {
//     if (rules.rollNumberOrder) {
//       branchGroups[key].sort((a, b) => a.enrollmentNo.localeCompare(b.enrollmentNo));
//     } else {
//       branchGroups[key] = shuffleArray(branchGroups[key]);
//     }
//   });

//   if (rules.consecutivePairing && rules.branchPairs?.length) {
//     // Build interleaved list based on branchPairs config
//     const result = [];
//     const used = new Set();

//     for (const pair of rules.branchPairs) {
//       const pairArrays = pair.branches.map((b) => branchGroups[String(b)] || []);
//       const interleaved = interleaveArrays(pairArrays);
//       interleaved.forEach((s) => { if (!used.has(String(s._id))) { result.push(s); used.add(String(s._id)); } });
//     }

//     // Append remaining branches not in any pair
//     Object.values(branchGroups).flat().forEach((s) => {
//       if (!used.has(String(s._id))) result.push(s);
//     });

//     return result;
//   }

//   return interleaveArrays(Object.values(branchGroups));
// }

// function findNextAvailableSeat(roomPools, assignments) {
//   const usedSeats = new Set(assignments.map((a) => `${a.roomId}-${a.seatId}`));
//   for (const roomPool of roomPools) {
//     for (const seat of roomPool.available) {
//       const key = `${roomPool.roomId}-${seat.seatId}`;
//       if (!usedSeats.has(key)) {
//         return { roomId: roomPool.roomId, seatId: seat.seatId, row: seat.row, bench: seat.bench, position: seat.position };
//       }
//     }
//   }
//   return null;
// }

// module.exports = { generateSeatingPlan };





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

  // ── STEP 3: Year Separation ──────────────────────────────────────────────
  // If enabled, assign each year to its own block of rooms
  if (rules.yearSeparation && roomPools.length > 1) {
    const yearGroups = {};
    for (const s of remaining) {
      const y = s.year || "unknown";
      if (!yearGroups[y]) yearGroups[y] = [];
      yearGroups[y].push(s);
    }
    const years = Object.keys(yearGroups).sort();
    const totalSeats = roomPools.reduce((acc, r) => acc + r.capacity, 0);

    let poolCursor = 0;
    const assignedInYear = new Set();

    for (const year of years) {
      const group = yearGroups[year];
      const proportion = group.length / remaining.length;
      const targetSeats = Math.ceil(totalSeats * proportion);

      // Collect enough rooms for this year
      const yearPools = [];
      let collected = 0;
      while (poolCursor < roomPools.length && collected < targetSeats) {
        yearPools.push(roomPools[poolCursor]);
        collected += roomPools[poolCursor].capacity;
        poolCursor++;
      }

      assignGroup(group, yearPools, rules, assignments, warnings);
      group.forEach((s) => assignedInYear.add(String(s._id)));
    }

    // Any overflow goes to remaining rooms
    const overflow = remaining.filter((s) => !assignedInYear.has(String(s._id)));
    if (overflow.length && poolCursor < roomPools.length) {
      assignGroup(overflow, roomPools.slice(poolCursor), rules, assignments, warnings);
    }

    const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
    const unassigned = students.filter((s) => !allAssignedIds.has(String(s._id)));
    return { assignments, unassigned, warnings };
  }

  // ── STEP 4: Gender Separation by Rooms ───────────────────────────────────
  if (rules.genderSeparation === "rooms") {
    const female = remaining.filter((s) => s.gender === "female");
    const male   = remaining.filter((s) => s.gender !== "female");
    const split  = Math.ceil(roomPools.length * (female.length / (remaining.length || 1)));
    const femaleRooms = roomPools.slice(0, Math.max(1, split));
    const maleRooms   = roomPools.slice(Math.max(1, split));
    assignGroup(female, femaleRooms, rules, assignments, warnings);
    assignGroup(male,   maleRooms,   rules, assignments, warnings);
    const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
    const unassigned = remaining.filter((s) => !allAssignedIds.has(String(s._id)));
    return { assignments, unassigned, warnings };
  }

  // ── STEP 5: Main Assignment ───────────────────────────────────────────────
  // Spread mode: reorder room pools so students are distributed evenly
  const activePools =
    rules.roomFillStrategy === "spread"
      ? buildSpreadPools(remaining.length, roomPools)
      : roomPools;

  assignGroup(remaining, activePools, rules, assignments, warnings);

  const allAssignedIds = new Set(assignments.map((a) => String(a.studentId)));
  const unassigned = students.filter((s) => !allAssignedIds.has(String(s._id)));
  return { assignments, unassigned, warnings };
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
// If a branch runs out early → that column's remaining seats stay empty.
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

  // Standard fill for unpaired students on remaining columns
  if (unpairedStudents.length > 0 && colIdx < activeColumns.length) {
    const remainingCols = activeColumns.slice(colIdx);
    const tempPools = buildTempPoolsFromColumns(remainingCols, roomPools);
    assignStandard(unpairedStudents, tempPools, rules, assignments, warnings);
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
          const benchAssigned = assignments.filter(
            (a) => String(a.roomId) === String(roomPool.roomId) && a.bench === seat.bench
          );
          const usedBranches = new Set(benchAssigned.map((a) => String(a.branchId)));
          if (benchAssigned.length > 0 && usedBranches.has(String(student.branch))) {
            const swapIdx = sorted.findIndex(
              (s, i) => i > pointer && !usedBranches.has(String(s.branch))
            );
            if (swapIdx !== -1) {
              [sorted[pointer], sorted[swapIdx]] = [sorted[swapIdx], sorted[pointer]];
              student = sorted[pointer];
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