// import { useState, useEffect } from 'react'
// import { Plus, Trash2, Info } from 'lucide-react'
// import { Select } from '../ui/Input'
// import Button from '../ui/Button'

// function Tip({ text }) {
//   return (
//     <p className="flex items-start gap-1.5 text-xs text-gray-400 mt-1">
//       <Info size={11} className="mt-0.5 shrink-0" />
//       {text}
//     </p>
//   )
// }

// function Toggle({ label, description, checked, onChange }) {
//   return (
//     <label className="flex items-start gap-3 cursor-pointer">
//       <div className="relative mt-0.5 shrink-0">
//         <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
//         <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-navy' : 'bg-gray-200'}`} />
//         <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
//       </div>
//       <div>
//         <p className="text-sm font-medium text-gray-800">{label}</p>
//         {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
//       </div>
//     </label>
//   )
// }

// export default function AlgorithmConfig({ value, onChange, branches = [] }) {
//   const [rules, setRules] = useState(value || {
//     branchSeparationMode: 'strict',
//     consecutivePairing: false,
//     branchPairs: [],
//     rollNumberOrder: true,
//     genderSeparation: 'none',
//     gapSeating: false,
//     sameRowSameBranch: false,
//   })

//   useEffect(() => {
//     if (value) setRules(value)
//   }, [JSON.stringify(value)])

//   const update = (patch) => {
//     const next = { ...rules, ...patch }
//     setRules(next)
//     onChange?.(next)
//   }

//   const addPair = () => {
//     update({
//       branchPairs: [
//         ...rules.branchPairs,
//         { positions: ['L', 'R'], branches: [branches[0]?._id || '', branches[1]?._id || ''] },
//       ],
//     })
//   }

//   const removePair = (i) => {
//     const pairs = rules.branchPairs.filter((_, idx) => idx !== i)
//     update({ branchPairs: pairs })
//   }

//   const updatePair = (i, patch) => {
//     const pairs = rules.branchPairs.map((p, idx) => idx === i ? { ...p, ...patch } : p)
//     update({ branchPairs: pairs })
//   }

//   return (
//     <div className="space-y-5">
//       {/* Branch Separation */}
//       <div>
//         <label className="label">Branch Separation Mode</label>
//         <div className="flex gap-3">
//           {['strict', 'relaxed'].map((mode) => (
//             <label key={mode} className="flex items-center gap-2 cursor-pointer">
//               <input
//                 type="radio"
//                 name="branchSep"
//                 value={mode}
//                 checked={rules.branchSeparationMode === mode}
//                 onChange={() => update({ branchSeparationMode: mode })}
//                 className="accent-navy"
//               />
//               <span className="text-sm capitalize">{mode}</span>
//             </label>
//           ))}
//         </div>
//         <Tip text="Strict: no two students from the same branch sit on the same bench. Relaxed: best-effort only." />
//       </div>

//       {/* Gender Separation */}
//       <div>
//         <Select
//           label="Gender Separation"
//           value={rules.genderSeparation}
//           onChange={(e) => update({ genderSeparation: e.target.value })}
//         >
//           <option value="none">None</option>
//           <option value="rows">By Rows (female rows first)</option>
//           <option value="rooms">By Rooms (female rooms first)</option>
//         </Select>
//       </div>

//       {/* Toggles */}
//       <div className="space-y-4 pt-2">
//         <Toggle
//           label="Sort by Roll Number"
//           description="Students are seated in enrollment number order within their branch."
//           checked={rules.rollNumberOrder}
//           onChange={(v) => update({ rollNumberOrder: v })}
//         />
//         <Toggle
//           label="Gap Seating"
//           description="Leave one seat gap between students (uses only first position of each bench)."
//           checked={rules.gapSeating}
//           onChange={(v) => update({ gapSeating: v })}
//         />
//         <Toggle
//           label="Consecutive Branch Pairing"
//           description="Interleave specified branch pairs at bench positions (e.g. CSE-L, IOT-R alternating)."
//           checked={rules.consecutivePairing}
//           onChange={(v) => update({ consecutivePairing: v })}
//         />
//       </div>

//       {/* Branch Pairs — shown only when consecutivePairing is on */}
//       {rules.consecutivePairing && (
//         <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
//           <div className="flex items-center justify-between">
//             <p className="text-sm font-semibold text-gray-700">Branch Pairs</p>
//             <Button size="sm" variant="secondary" icon={Plus} onClick={addPair} type="button">
//               Add Pair
//             </Button>
//           </div>

//           {rules.branchPairs.length === 0 && (
//             <p className="text-xs text-gray-400 text-center py-2">
//               No pairs defined. Add a pair to configure which branches share benches.
//             </p>
//           )}

//           {rules.branchPairs.map((pair, i) => (
//             <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3">
//               <div className="flex-1 grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="label">Branch A</label>
//                   <select
//                     className="input"
//                     value={pair.branches[0] || ''}
//                     onChange={(e) => {
//                       const b = [...pair.branches]; b[0] = e.target.value
//                       updatePair(i, { branches: b })
//                     }}
//                   >
//                     <option value="">Select branch…</option>
//                     {branches.map((b) => <option key={b._id} value={b._id}>{b.code} — {b.name}</option>)}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="label">Branch B</label>
//                   <select
//                     className="input"
//                     value={pair.branches[1] || ''}
//                     onChange={(e) => {
//                       const b = [...pair.branches]; b[1] = e.target.value
//                       updatePair(i, { branches: b })
//                     }}
//                   >
//                     <option value="">Select branch…</option>
//                     {branches.map((b) => <option key={b._id} value={b._id}>{b.code} — {b.name}</option>)}
//                   </select>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => removePair(i)}
//                 className="mt-6 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
//               >
//                 <Trash2 size={13} />
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }









import { useState, useEffect } from 'react'
import { Plus, Trash2, Info, Zap } from 'lucide-react'
import { Select } from '../ui/Input'
import Button from '../ui/Button'

function Tip({ text }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-400 mt-1">
      <Info size={11} className="mt-0.5 shrink-0" />{text}
    </p>
  )
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="sr-only" checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)} />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-navy' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// 3-way toggle: 'false' | aValue | bValue
function TriToggle({ label, description, value, offLabel = 'Off', aLabel, bLabel, aValue, bValue, onChange }) {
  const isOff = !value || value === 'false'
  const isA   = value === aValue
  const isB   = value === bValue

  const cycle = () => {
    if (isOff) onChange(aValue)
    else if (isA) onChange(bValue)
    else onChange('false')
  }

  return (
    <div className="flex items-start gap-3">
      <button type="button" onClick={cycle}
        className={`relative mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-navy/40 ${!isOff ? 'bg-navy' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isB ? 'translate-x-4' : isA ? 'translate-x-2' : ''}`} />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isOff ? 'bg-gray-100 text-gray-400' : 'bg-navy/10 text-navy'}`}>
            {isOff ? offLabel : isA ? aLabel : bLabel}
          </span>
        </div>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        {!isOff && (
          <div className="flex gap-2 mt-2">
            {[{ v: aValue, l: aLabel }, { v: bValue, l: bLabel }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => onChange(v)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${value === v ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-500 hover:border-navy/40'}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Binary radio option card
function OptionCards({ label, tip, value, onChange, options }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">{label}</p>
      <div className={`grid gap-2 grid-cols-${options.length}`}>
        {options.map((opt) => (
          <label key={opt.value}
            className={`flex flex-col gap-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${value === opt.value ? 'border-navy bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="flex items-center gap-2">
              <input type="radio" name={label} value={opt.value} checked={value === opt.value}
                onChange={() => onChange(opt.value)} className="accent-navy" />
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
            </div>
            <p className="text-xs text-gray-400 leading-snug pl-5">{opt.desc}</p>
          </label>
        ))}
      </div>
      {tip && <Tip text={tip} />}
    </div>
  )
}

const DEFAULT_RULES = {
  branchSeparationMode: 'strict',
  consecutivePairing: false,
  autoPair: false,
  pairingMode: 'interleaved',
  branchPairs: [],
  rollNumberOrder: 'asc',
  genderSeparation: 'none',
  gapSeating: 'false',
  sameRowSameBranch: false,
  roomFillStrategy: 'pack',
  fillDirection: 'front',
  yearSeparation: false,
}

export default function AlgorithmConfig({ value, onChange, branches = [] }) {
  const [rules, setRules] = useState(() => ({ ...DEFAULT_RULES, ...(value || {}) }))

  useEffect(() => {
    if (value) setRules({ ...DEFAULT_RULES, ...value })
  }, [JSON.stringify(value)]) // eslint-disable-line

  const update = (patch) => {
    const next = { ...rules, ...patch }
    setRules(next)
    onChange?.(next)
  }

  const addPair = () => update({
    branchPairs: [...rules.branchPairs,
      { positions: ['L', 'R'], branches: [branches[0]?._id || '', branches[1]?._id || ''] }]
  })

  const removePair = (i) => update({ branchPairs: rules.branchPairs.filter((_, idx) => idx !== i) })

  const updatePair = (i, patch) =>
    update({ branchPairs: rules.branchPairs.map((p, idx) => idx === i ? { ...p, ...patch } : p) })

  return (
    <div className="space-y-5">

      {/* ── Branch Separation ───────────────────────────────────── */}
      <div>
        <label className="label">Branch Separation Mode</label>
        <div className="flex gap-3">
          {['strict', 'relaxed'].map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="branchSep" value={mode}
                checked={rules.branchSeparationMode === mode}
                onChange={() => update({ branchSeparationMode: mode })}
                className="accent-navy" />
              <span className="text-sm capitalize">{mode}</span>
            </label>
          ))}
        </div>
        <Tip text="Strict: no two students from the same branch on the same bench. Relaxed: best-effort only." />
      </div>

      {/* ── Gender Separation ───────────────────────────────────── */}
      <div>
        <Select label="Gender Separation" value={rules.genderSeparation}
          onChange={(e) => update({ genderSeparation: e.target.value })}>
          <option value="none">None</option>
          <option value="rows">By Rows (female rows first)</option>
          <option value="rooms">By Rooms (female rooms first)</option>
        </Select>
      </div>

      {/* ── Sort by Roll Number ─────────────────────────────────── */}
      <TriToggle
        label="Sort by Roll Number"
        description="Seat students in enrollment number order within each branch."
        value={rules.rollNumberOrder}
        offLabel="Off (random)" aLabel="Ascending" bLabel="Descending"
        aValue="asc" bValue="desc"
        onChange={(v) => update({ rollNumberOrder: v })}
      />

      {/* ── Gap Seating ─────────────────────────────────────────── */}
      <TriToggle
        label="Gap Seating"
        description="Leave a gap between students to reduce copying."
        value={rules.gapSeating}
        offLabel="Off" aLabel="Side-by-side" bLabel="Row-wise"
        aValue="side" bValue="row"
        onChange={(v) => update({ gapSeating: v })}
      />
      {rules.gapSeating === 'side' && <p className="text-xs text-gray-400 ml-12 -mt-3">Uses only left seat of each bench — right seat stays empty.</p>}
      {rules.gapSeating === 'row'  && <p className="text-xs text-gray-400 ml-12 -mt-3">Uses bench 1, skips bench 2, uses bench 3… entire alternating benches stay empty.</p>}

      {/* ── Room Fill Strategy ──────────────────────────────────── */}
      <OptionCards
        label="Room Fill Strategy"
        value={rules.roomFillStrategy}
        onChange={(v) => update({ roomFillStrategy: v })}
        options={[
          { value: 'pack', label: 'Pack',   desc: 'Fill each room completely before moving to the next.' },
          { value: 'spread', label: 'Spread', desc: 'Distribute students evenly across all rooms.' },
        ]}
        tip="Spread is useful when you want balanced room occupancy."
      />

      {/* ── Fill Direction ──────────────────────────────────────── */}
      <OptionCards
        label="Fill Direction"
        value={rules.fillDirection}
        onChange={(v) => update({ fillDirection: v })}
        options={[
          { value: 'front', label: 'Front → Back', desc: 'Start seating from row A (front of room).' },
          { value: 'back',  label: 'Back → Front', desc: 'Start seating from the last row (back of room).' },
        ]}
      />

      {/* ── Year Separation ─────────────────────────────────────── */}
      <Toggle
        label="Year-wise Room Separation"
        description="If multiple years are in this shift, assign each year to its own block of rooms."
        checked={rules.yearSeparation}
        onChange={(v) => update({ yearSeparation: v })}
      />

      {/* ── Consecutive Branch Pairing ──────────────────────────── */}
      <Toggle
        label="Consecutive Branch Pairing"
        description="Assign specific branch pairs to alternate bench positions."
        checked={rules.consecutivePairing}
        onChange={(v) => update({ consecutivePairing: v, autoPair: v ? rules.autoPair : false })}
      />

      {rules.consecutivePairing && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">

          {/* Auto-pair toggle */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${rules.autoPair ? 'border-navy bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            onClick={() => update({ autoPair: !rules.autoPair })}>
            <div className="mt-0.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${rules.autoPair ? 'border-navy bg-navy' : 'border-gray-300'}`}>
                {rules.autoPair && <Zap size={11} className="text-white" />}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Auto-Pair Branches</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically pairs branches by balancing student counts — largest branch paired with smallest for even column fill. No manual selection needed.
              </p>
            </div>
          </div>

          {/* Pairing mode */}
          <OptionCards
            label="Pairing Mode"
            value={rules.pairingMode}
            onChange={(v) => update({ pairingMode: v })}
            options={[
              { value: 'interleaved', label: 'Interleaved', desc: 'Cycles pairs row by row: Row 1→Pair A, Row 2→Pair B, Row 3→Pair A…' },
              { value: 'block',       label: 'Block',       desc: 'Fills all columns with pair 1 first (top→bottom), then pair 2, then pair 3…' },
            ]}
          />

          {/* Manual pairs — hidden when autoPair is on */}
          {!rules.autoPair && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Branch Pairs</p>
                <Button size="sm" variant="secondary" icon={Plus} onClick={addPair} type="button">Add Pair</Button>
              </div>

              {rules.branchPairs.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  No pairs defined. Add a pair to configure which branches share benches.
                </p>
              )}

              {rules.branchPairs.map((pair, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-navy/10 text-navy text-xs font-bold shrink-0 mt-6">{i + 1}</div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {[0, 1].map((pos) => (
                      <div key={pos}>
                        <label className="label">{pos === 0 ? 'Branch A (Left seat)' : 'Branch B (Right seat)'}</label>
                        <select className="input" value={pair.branches[pos] || ''}
                          onChange={(e) => {
                            const b = [...pair.branches]; b[pos] = e.target.value
                            updatePair(i, { branches: b })
                          }}>
                          <option value="">Select branch…</option>
                          {branches.map((b) => <option key={b._id} value={b._id}>{b.code} — {b.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => removePair(i)}
                    className="mt-6 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {rules.branchPairs.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {rules.pairingMode === 'interleaved'
                    ? `${rules.branchPairs.length} pair(s) will cycle row by row.`
                    : `Seats filled pair by pair: ${rules.branchPairs.map((_, i) => `Pair ${i + 1}`).join(' → ')}.`}
                </p>
              )}
            </div>
          )}

          {rules.autoPair && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Auto-pair will run when seating is generated. Pairs are computed from the actual student distribution at that time.
            </p>
          )}
        </div>
      )}
    </div>
  )
}