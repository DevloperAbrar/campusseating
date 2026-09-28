/**
 * CampusSeating - Core Seating Algorithm (v3)
 * Pure function, zero DB calls. Controller feeds data, this returns assignments.
 *
 * Year modes (pick one in the shift form):
 *  - none   : years are treated like any other student (they mix freely)
 *  - rooms  : yearSeparation  -> every year gets its own block of rooms
 *  - bench  : yearBench       -> every bench holds one student of each year
 *                                (lowest year on the left seat, next year on the right seat)
 *
 * Guarantees:
 *  - a student is seated at most once, a seat is used at most once
 *  - blocked seats are never used; reserved seats only go to special-needs students
 *    (unless the rooms would otherwise be too small for everybody)
 *  - rows are filled in natural order: R1, R2, ... R9, R10, R11
 *  - seating order: row by row (left to right) or bench column by column (top to bottom)
 *  - gap seating is respected and included in capacity calculations
 *  - year, gender, branch pairing, roll order, spread/pack and fill direction work together
 *  - nobody is dropped because of a soft preference: leftovers go through a final pass
 */

const { shuffleArray } = require("../utils/helpers");

// ───────────────────────── small helpers ─────────────────────────

const nat = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });
const seatKey = (roomId, seatId) => `${roomId}::${seatId}`;
const benchKey = (roomId, row, bench) => `${roomId}|${row}|${bench}`;
const yearKey = (s) => (s.year == null ? "unknown" : String(s.year));

// Old shifts stored some rules in other shapes (true, "true", "ascending"...). Read them all.
function normRoll(v) {
  if (v === true || v === "true" || v === "asc" || v === "ascending") return "asc";
  if (v === "desc" || v === "descending") return "desc";
  return false;
}
function normGap(v) {
  if (v === "side" || v === "row") return v;
  return false;
}

function normalizeRules(rules) {
  const r = rules || {};
  const yearBench = r.yearBench === true || r.yearBench === "true";
  return {
    strict: r.branchSeparationMode === "strict",
    gender: r.genderSeparation === "rooms" || r.genderSeparation === "rows" ? r.genderSeparation : "none",
    roll: normRoll(r.rollNumberOrder),
    gap: normGap(r.gapSeating),
    spread: r.roomFillStrategy === "spread",
    back: r.fillDirection === "back",
    column: r.fillOrder === "column",
    yearBench,
    yearSeparation: (r.yearSeparation === true || r.yearSeparation === "true") && !yearBench,
    pairing: r.consecutivePairing === true || r.consecutivePairing === "true",
    autoPair: r.autoPair === true || r.autoPair === "true",
    pairingMode: r.pairingMode === "block" ? "block" : "interleaved",
    branchPairs: Array.isArray(r.branchPairs) ? r.branchPairs : [],
  };
}

// Slot order inside a room.
//  row order    (default): row by row, left to right  -> R1B1, R1B2, R1B3 ... then R2B1, R2B2 ...
//  column order          : bench column top to bottom  -> R1B1, R2B1, R3B1 ... then R1B2, R2B2 ...
// fillDirection "back" reverses the row direction in both orders.
function slotComparator(R) {
  const rowCmp = (a, b) => (R.back ? nat(b.row, a.row) : nat(a.row, b.row));
  const benchCmp = (a, b) => Number(a.bench) - Number(b.bench);
  return R.column
    ? (a, b) => benchCmp(a, b) || rowCmp(a, b) || nat(a.seatId, b.seatId)
    : (a, b) => rowCmp(a, b) || benchCmp(a, b) || nat(a.seatId, b.seatId);
}

function seatIndex(seat) {
  const m = /P(\d+)$/.exec(String(seat.seatId));
  return m ? Number(m[1]) : seat.position === "R" ? 2 : 1;
}

// ───────────────────────── seat pools ─────────────────────────

/**
 * One pool per room. `slots` = every seat the normal fill may use after the gap rule.
 *   gap "row"  -> only odd bench numbers (bench 1, 3, 5 ...) are used
 *   gap "side" -> only the first seat of every bench (left seat) is used
 */
function buildPools(rooms, R) {
  const cmp = slotComparator(R);
  return rooms
    .slice()
    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    .map((room) => {
      const seats = Array.isArray(room.seats) ? room.seats : [];
      const usable = seats.filter((s) => s.status === "available" || s.status === "reserved");

      const benches = new Map();
      for (const s of usable) {
        const k = `${s.row}|${s.bench}`;
        if (!benches.has(k)) benches.set(k, []);
        benches.get(k).push(s);
      }

      const slots = [];
      for (const list of benches.values()) {
        list.sort((a, b) => nat(a.seatId, b.seatId));
        if (R.gap === "row" && Number(list[0].bench) % 2 === 0) continue;
        if (R.gap === "side") slots.push(list[0]);
        else slots.push(...list);
      }
      slots.sort(cmp);

      const reserved = seats.filter((s) => s.status === "reserved").sort(cmp);
      return { roomId: room._id ?? room.id, priority: room.priority || 0, slots, reserved, limit: null };
    });
}

const isFree = (ctx, pool, slot) => {
  const k = seatKey(pool.roomId, slot.seatId);
  return !ctx.used.has(k) && !ctx.held.has(k);
};
const freeSlots = (ctx, pool) => pool.slots.filter((s) => isFree(ctx, pool, s));
const freeCount = (ctx, pool) => freeSlots(ctx, pool).length;

function place(ctx, pool, slot, student) {
  ctx.used.add(seatKey(pool.roomId, slot.seatId));
  const bk = benchKey(pool.roomId, slot.row, slot.bench);
  if (!ctx.benchBranches.has(bk)) ctx.benchBranches.set(bk, new Set());
  ctx.benchBranches.get(bk).add(String(student.branch));
  ctx.assignments.push({
    studentId: student._id,
    branchId: student.branch,
    roomId: pool.roomId,
    seatId: slot.seatId,
    row: slot.row,
    bench: slot.bench,
    position: slot.position,
  });
  ctx.seated.add(String(student._id));
}

// Groups free slots into physical benches (slots are already in fill order).
function groupBenches(slots) {
  const map = new Map();
  for (const s of slots) {
    const k = `${s.row}|${s.bench}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return [...map.values()];
}

// ───────────────────────── student queues ─────────────────────────

function buildQueues(students, R) {
  const tmp = new Map();
  for (const s of students) {
    const k = String(s.branch);
    if (!tmp.has(k)) tmp.set(k, []);
    tmp.get(k).push(s);
  }
  const queues = new Map();
  for (const k of [...tmp.keys()].sort(nat)) {
    let arr = tmp.get(k);
    if (R.roll === "asc") arr = arr.slice().sort((a, b) => nat(a.enrollmentNo || "", b.enrollmentNo || ""));
    else if (R.roll === "desc") arr = arr.slice().sort((a, b) => nat(b.enrollmentNo || "", a.enrollmentNo || ""));
    else arr = shuffleArray(arr);
    queues.set(k, arr);
  }
  return queues;
}

const queuesLeft = (queues) => [...queues.values()].flat();

// ───────────────────────── standard bench fill ─────────────────────────
/**
 * Fills benches in order. For every bench it picks the k students from the k LARGEST
 * remaining branches (avoiding branches already on that bench). Returns students it could
 * not seat (only when the pools run out of seats).
 */
function assignBenches(ctx, students, pools) {
  if (!students.length) return [];
  const queues = buildQueues(students, ctx.R);
  const lastUsed = new Map([...queues.keys()].map((b, i) => [b, i - queues.size]));
  let tick = 0;
  let remaining = students.length;
  let forcedBenches = 0;

  for (const pool of pools) {
    if (!remaining) break;
    let quota = pool.limit == null ? Infinity : pool.limit;

    for (const bench of groupBenches(freeSlots(ctx, pool))) {
      if (!remaining || quota <= 0) break;
      const seats = bench.slice(0, Math.min(bench.length, quota, remaining));
      const occupied = ctx.benchBranches.get(benchKey(pool.roomId, bench[0].row, bench[0].bench)) || new Set();

      const cands = [...queues.entries()]
        .filter(([, q]) => q.length)
        .sort(
          (a, b) =>
            (occupied.has(a[0]) ? 1 : 0) - (occupied.has(b[0]) ? 1 : 0) ||
            b[1].length - a[1].length ||
            lastUsed.get(a[0]) - lastUsed.get(b[0])
        );

      const chosen = [];
      for (const [b] of cands.slice(0, seats.length)) {
        if (occupied.has(b)) break;
        chosen.push({ b, s: queues.get(b).shift(), lu: lastUsed.get(b) });
      }
      let forced = false;
      while (chosen.length < seats.length) {
        const [b, q] = [...queues.entries()]
          .filter(([, q2]) => q2.length)
          .sort((a, c) => c[1].length - a[1].length)[0] || [];
        if (!b) break;
        chosen.push({ b, s: q.shift(), lu: lastUsed.get(b) });
        forced = true;
      }
      if (forced) forcedBenches++;

      chosen.sort((x, y) => x.lu - y.lu);
      chosen.forEach((c, i) => {
        place(ctx, pool, seats[i], c.s);
        lastUsed.set(c.b, tick++);
        remaining--;
        quota--;
      });
    }
  }

  if (forcedBenches > 0 && ctx.R.strict && ctx.multiBranch) ctx.forced += forcedBenches;
  return queuesLeft(queues);
}

// ───────────────────────── year on the same bench ─────────────────────────
/**
 * Every bench gets one student per year: the lowest year on the first (left) seat, the next
 * year on the second (right) seat, and so on. With gap "side" (one seat per bench) the years
 * alternate from bench to bench. If a year runs out, the other years fill the free seats.
 * Inside a year the roll-number order (or shuffle) is kept; with strict branch mode a
 * student whose branch is already on the bench is skipped when someone else is available.
 */
function assignYearBenches(ctx, students, pools) {
  if (!students.length) return [];
  const R = ctx.R;

  const byYear = new Map();
  for (const s of students) {
    const k = yearKey(s);
    if (!byYear.has(k)) byYear.set(k, []);
    byYear.get(k).push(s);
  }
  const keys = [...byYear.keys()].sort(nat);
  const lists = new Map(keys.map((k) => [k, queuesLeft(buildQueues(byYear.get(k), R))]));

  const take = (key, occupied) => {
    const own = lists.get(key);
    const list = own.length
      ? own
      : keys.map((k) => lists.get(k)).filter((l) => l.length).sort((a, b) => b.length - a.length)[0];
    if (!list) return null;
    let idx = 0;
    if (R.strict) {
      const found = list.findIndex((s) => !occupied.has(String(s.branch)));
      if (found > 0) idx = found;
    }
    return list.splice(idx, 1)[0];
  };

  let remaining = students.length;
  let benchCounter = 0;

  for (const pool of pools) {
    if (!remaining) break;
    let quota = pool.limit == null ? Infinity : pool.limit;

    for (const bench of groupBenches(freeSlots(ctx, pool))) {
      if (!remaining || quota <= 0) break;
      const seats = bench.slice(0, Math.min(bench.length, quota, remaining));
      const occupied = new Set(ctx.benchBranches.get(benchKey(pool.roomId, bench[0].row, bench[0].bench)) || []);
      const offset = bench.length === 1 ? benchCounter : 0;
      benchCounter++;

      const yearsOnBench = new Set();
      seats.forEach((slot, i) => {
        const st = take(keys[(i + offset) % keys.length], occupied);
        if (!st) return;
        place(ctx, pool, slot, st);
        occupied.add(String(st.branch));
        yearsOnBench.add(yearKey(st));
        remaining--;
        quota--;
      });
      if (seats.length > 1 && yearsOnBench.size < 2) ctx.singleYearBenches++;
    }
  }
  return keys.flatMap((k) => lists.get(k));
}

// ───────────────────────── branch pairing ─────────────────────────

function resolvePairs(students, R) {
  const counts = new Map();
  for (const s of students) counts.set(String(s.branch), (counts.get(String(s.branch)) || 0) + 1);

  if (R.autoPair) {
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || nat(a[0], b[0]));
    const half = Math.ceil(entries.length / 2);
    const left = entries.slice(0, half);
    const right = entries.slice(half).reverse();
    const pairs = [];
    for (let i = 0; i < left.length; i++) {
      if (right[i]) pairs.push([left[i][0], right[i][0]]);
    }
    return pairs;
  }

  const seen = new Set();
  const pairs = [];
  for (const p of R.branchPairs) {
    const list = (Array.isArray(p?.branches) ? p.branches : [])
      .map(String)
      .filter((b) => b && counts.has(b) && !seen.has(b));
    const uniq = [...new Set(list)];
    if (uniq.length >= 2) {
      uniq.forEach((b) => seen.add(b));
      pairs.push(uniq);
    }
  }
  return pairs;
}

/** INTERLEAVED: rows cycle through the pairs. Left seat = first branch, right seat = second. */
function assignInterleaved(ctx, students, pools, pairs) {
  const R = ctx.R;
  const queues = buildQueues(students, R);
  const has = (pair) => pair.some((b) => (queues.get(b) || []).length);
  let rowCounter = 0;

  for (const pool of pools) {
    const rows = new Map();
    for (const s of freeSlots(ctx, pool)) {
      if (!rows.has(s.row)) rows.set(s.row, []);
      rows.get(s.row).push(s);
    }
    for (const rowSlots of rows.values()) {
      const active = pairs.filter(has);
      if (!active.length) return queuesLeft(queues);
      const pair = active[rowCounter++ % active.length];

      groupBenches(rowSlots).forEach((bench, benchIdx) => {
        bench.forEach((slot, i) => {
          const bi = (R.gap === "side" ? benchIdx : i) % pair.length;
          let q = queues.get(pair[bi]);
          if (!q || !q.length) {
            if (R.strict) return;
            q = pair.map((b) => queues.get(b)).find((x) => x && x.length);
            if (!q) return;
          }
          place(ctx, pool, slot, q.shift());
        });
      });
    }
  }
  return queuesLeft(queues);
}

/** BLOCK: every bench position is a column running front to back; pair 1 first, then pair 2. */
function assignBlock(ctx, students, pools, pairs) {
  const R = ctx.R;
  const queues = buildQueues(students, R);

  const groups = [];
  for (const pool of pools) {
    const byBench = new Map();
    for (const s of freeSlots(ctx, pool)) {
      const b = Number(s.bench);
      if (!byBench.has(b)) byBench.set(b, new Map());
      const cols = byBench.get(b);
      const idx = seatIndex(s);
      if (!cols.has(idx)) cols.set(idx, []);
      cols.get(idx).push(s);
    }
    for (const b of [...byBench.keys()].sort((x, y) => x - y)) {
      const cols = byBench.get(b);
      groups.push({
        pool,
        cols: [...cols.keys()]
          .sort((x, y) => x - y)
          .map((k) => cols.get(k).sort((x, y) => (R.back ? nat(y.row, x.row) : nat(x.row, y.row)))),
      });
    }
  }

  let gi = 0;
  for (const pair of pairs) {
    const qs = pair.map((b) => queues.get(b));
    const has = () => qs.some((q) => q && q.length);
    let counter = 0;

    while (has() && gi < groups.length) {
      const g = groups[gi++];
      for (const col of g.cols) {
        const want = counter++ % pair.length;
        let q = qs[want];
        if (!q || !q.length) {
          if (R.strict) continue;
          q = qs.find((x) => x && x.length);
          if (!q) continue;
        }
        for (const slot of col) {
          if (!q.length) break;
          place(ctx, g.pool, slot, q.shift());
        }
      }
    }
  }
  return queuesLeft(queues);
}

// ───────────────────────── grouping (year rooms / gender) ─────────────────────────

/** Gives every group its own rooms, by need, in priority order (each later group keeps at least 1 room). */
function allocateByNeed(ctx, sizes, pools) {
  const caps = pools.map((p) => freeCount(ctx, p));
  let cursor = 0;
  return sizes.map((size, gi) => {
    const mine = [];
    if (size > 0) {
      const groupsAfter = sizes.slice(gi + 1).filter((n) => n > 0).length;
      const maxTake = Math.max(1, pools.length - cursor - groupsAfter);
      let got = 0;
      while (cursor < pools.length && got < size && mine.length < maxTake) {
        mine.push(pools[cursor]);
        got += caps[cursor];
        cursor++;
      }
    }
    return mine;
  });
}

/** Female students take the first rows (front) of the group's rooms, everyone else the rest. */
function splitPoolsByRows(ctx, pools, nFemale) {
  let need = nFemale;
  const fPools = [];
  const mPools = [];
  for (const pool of pools) {
    const rows = new Map();
    for (const s of freeSlots(ctx, pool)) {
      if (!rows.has(s.row)) rows.set(s.row, []);
      rows.get(s.row).push(s);
    }
    const f = [];
    const m = [];
    for (const row of [...rows.keys()].sort(nat)) {
      if (need > 0) {
        f.push(...rows.get(row));
        need -= rows.get(row).length;
      } else m.push(...rows.get(row));
    }
    f.sort(ctx.cmp);
    m.sort(ctx.cmp);
    if (f.length) fPools.push({ ...pool, slots: f, limit: null });
    if (m.length) mPools.push({ ...pool, slots: m, limit: null });
  }
  return [fPools, mPools];
}

function planGroups(ctx, students, pools) {
  const R = ctx.R;
  let groups = [{ students, pools }];

  if (R.yearSeparation) {
    const years = new Map();
    for (const s of students) {
      const k = yearKey(s);
      if (!years.has(k)) years.set(k, []);
      years.get(k).push(s);
    }
    if (years.size > 1) {
      if (pools.length < 2) {
        ctx.warnings.push("Year-wise room separation needs at least 2 rooms. Students were seated together.");
      } else {
        const keys = [...years.keys()].sort(nat);
        let cursor = 0;
        groups = keys.map((k, i) => {
          const list = years.get(k);
          const avail = pools.slice(cursor);
          const groupsAfter = keys.length - i - 1;
          const window = avail.slice(0, Math.max(1, avail.length - groupsAfter));
          const f = list.filter((x) => x.gender === "female").length;
          const o = list.length - f;
          let take;
          if (R.gender === "rooms" && f && o) {
            const [fp, op] = allocateByNeed(ctx, [f, o], window);
            take = fp.length + op.length;
          } else {
            take = allocateByNeed(ctx, [list.length], window)[0].length;
          }
          take = Math.max(1, Math.min(take, window.length));
          const mine = avail.slice(0, take);
          cursor += take;
          return { students: list, pools: mine, label: `year ${k}` };
        });
      }
    }
  }

  if (R.gender !== "none") {
    const next = [];
    for (const g of groups) {
      const female = g.students.filter((s) => s.gender === "female");
      const other = g.students.filter((s) => s.gender !== "female");
      if (!female.length || !other.length || !g.pools.length) {
        next.push(g);
        continue;
      }
      let fPools;
      let oPools;
      if (R.gender === "rooms" && g.pools.length >= 2) {
        [fPools, oPools] = allocateByNeed(ctx, [female.length, other.length], g.pools);
      } else {
        if (R.gender === "rooms") {
          ctx.warnings.push("Gender separation by rooms needs at least 2 rooms per group. Separated by rows instead.");
        }
        [fPools, oPools] = splitPoolsByRows(ctx, g.pools, female.length);
      }
      next.push({ students: female, pools: fPools, label: "female" });
      next.push({ students: other, pools: oPools, label: "male/other" });
    }
    groups = next;
  }
  return groups;
}

// Spread: share the group's students across its rooms in proportion to room size.
function withSpreadLimits(ctx, pools, n) {
  const caps = pools.map((p) => freeCount(ctx, p));
  const total = caps.reduce((a, b) => a + b, 0);
  if (!total || pools.length < 2) return pools;

  const exact = caps.map((c) => (n * c) / total);
  const quota = exact.map((x, i) => Math.min(caps[i], Math.floor(x)));
  let left = n - quota.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => i).sort((a, b) => exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])));
  for (let guard = 0; left > 0 && guard < 10 * pools.length; guard++) {
    for (const i of order) {
      if (left > 0 && quota[i] < caps[i]) {
        quota[i]++;
        left--;
      }
    }
  }
  return pools.map((p, i) => ({ ...p, limit: quota[i] }));
}

function seatGroup(ctx, group) {
  const R = ctx.R;
  let left = group.students;
  if (!left.length || !group.pools.length) return left;

  const pools =
    R.spread && !R.pairing ? withSpreadLimits(ctx, group.pools, left.length) : group.pools;

  // Year on the same bench takes priority over branch pairing.
  if (R.yearBench) {
    const yearCount = new Set(left.map(yearKey)).size;
    if (yearCount > 1) return assignYearBenches(ctx, left, pools);
    if (!ctx.yearBenchWarned) {
      ctx.yearBenchWarned = true;
      ctx.warnings.push("Year on same bench is on, but only one year is in this group. Students were seated normally.");
    }
  }

  if (R.pairing) {
    const pairs = resolvePairs(left, R);
    if (pairs.length) {
      left = R.pairingMode === "block"
        ? assignBlock(ctx, left, group.pools, pairs)
        : assignInterleaved(ctx, left, group.pools, pairs);
    } else if (!ctx.pairWarned) {
      ctx.pairWarned = true;
      ctx.warnings.push("Branch pairing is on but no usable branch pair was found. Students were seated without pairing.");
    }
  }

  if (left.length) {
    const p2 = R.spread && !R.pairing ? pools : group.pools;
    left = assignBenches(ctx, left, p2);
  }
  return left;
}

// ───────────────────────── main ─────────────────────────

function generateSeatingPlan(students, rooms, rules) {
  const R = normalizeRules(rules);
  const pools = buildPools(rooms, R);
  const ctx = {
    R,
    cmp: slotComparator(R),
    used: new Set(),
    held: new Set(),
    seated: new Set(),
    assignments: [],
    warnings: [],
    benchBranches: new Map(),
    forced: 0,
    singleYearBenches: 0,
    multiBranch: new Set(students.map((s) => String(s.branch))).size > 1,
  };

  if (R.yearBench && R.pairing) {
    ctx.warnings.push("Year on same bench and Branch Pairing were both on. Year on same bench was used, pairing was ignored.");
  }

  // Reserved seats are held back for special-needs students.
  for (const p of pools) for (const s of p.reserved) ctx.held.add(seatKey(p.roomId, s.seatId));

  // 1) special-needs students first
  const special = students.filter((s) => s.specialNeeds);
  const normal = students.filter((s) => !s.specialNeeds);
  const reservedList = pools.flatMap((p) => p.reserved.map((seat) => ({ pool: p, seat })));
  let ri = 0;
  for (const st of special) {
    while (ri < reservedList.length && ctx.used.has(seatKey(reservedList[ri].pool.roomId, reservedList[ri].seat.seatId))) ri++;
    if (ri < reservedList.length) {
      place(ctx, reservedList[ri].pool, reservedList[ri].seat, st);
      ri++;
      continue;
    }
    let done = false;
    for (const p of pools) {
      const slot = freeSlots(ctx, p)[0];
      if (slot) {
        place(ctx, p, slot, st);
        ctx.warnings.push(`Special needs student ${st.enrollmentNo} placed on a standard seat (no reserved seat left).`);
        done = true;
        break;
      }
    }
    if (!done) normal.push(st);
  }

  // Unused reserved seats are only released when the rooms would otherwise be too small.
  const totalFree = pools.reduce((n, p) => n + freeCount(ctx, p), 0);
  if (normal.length > totalFree) ctx.held.clear();

  const capacityNow = pools.reduce((n, p) => n + freeCount(ctx, p), 0);
  if (normal.length > capacityNow) {
    ctx.warnings.push(
      `Only ${capacityNow} usable seat(s) for ${normal.length} student(s)` +
        (R.gap ? ". Gap seating reduces capacity, add rooms or turn it off." : ". Add more rooms or unblock seats.")
    );
  }

  // 2) year-room / gender groups, then seat every group
  for (const group of planGroups(ctx, normal, pools)) {
    seatGroup(ctx, group);
  }

  // 3) final safety net: every student not yet seated goes to ANY free seat
  let leftover = students.filter((s) => !ctx.seated.has(String(s._id)));
  if (leftover.length) {
    const before = ctx.assignments.length;
    leftover = assignBenches(ctx, leftover, pools.map((p) => ({ ...p, limit: null })));
    if (leftover.length && ctx.held.size) {
      ctx.held.clear();
      leftover = assignBenches(ctx, leftover, pools.map((p) => ({ ...p, limit: null })));
    }
    const placed = ctx.assignments.length - before;
    if (placed > 0 && (R.yearSeparation || R.gender !== "none")) {
      ctx.warnings.push(
        `${placed} student(s) did not fit their own year/gender block and were placed on free seats elsewhere.`
      );
    }
  }

  if (ctx.singleYearBenches > 0) {
    ctx.warnings.push(
      `${ctx.singleYearBenches} bench(es) hold students of one year only, because the other year had fewer students.`
    );
  }

  if (ctx.forced > 0) {
    ctx.warnings.push(
      `Strict branch separation could not be fully honoured on ${ctx.forced} bench(es), one branch has more students than all other branches can pair with.`
    );
  }

  const unassigned = students.filter((s) => !ctx.seated.has(String(s._id)));
  if (unassigned.length) {
    ctx.warnings.push(`${unassigned.length} student(s) could not be seated, not enough usable seats in the selected rooms.`);
  }

  return { assignments: ctx.assignments, unassigned, warnings: ctx.warnings };
}

module.exports = { generateSeatingPlan };