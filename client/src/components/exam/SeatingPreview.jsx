import { useState, useMemo } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import { seatingAPI } from '../../api'
import { yearLabel } from '../../utils'
import toast from 'react-hot-toast'

// One colour per year so mixed benches are readable at a glance
const YEAR_STYLES = {
  1: { bar: 'border-l-sky-400',     dot: 'bg-sky-400',     chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  2: { bar: 'border-l-emerald-500', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  3: { bar: 'border-l-violet-500',  dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  4: { bar: 'border-l-amber-500',   dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
}
const FALLBACK_STYLE = { bar: 'border-l-gray-300', dot: 'bg-gray-300', chip: 'bg-gray-50 text-gray-600 border-gray-200' }
const styleFor = (year) => YEAR_STYLES[year] || FALLBACK_STYLE

const naturalSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })

// Seat number inside a bench: P1 = left, P2 = right ...
const seatCol = (a) => {
  const m = /P(\d+)$/.exec(String(a.seatId || ''))
  if (m) return Number(m[1])
  return a.position === 'R' ? 2 : 1
}

const colLabel = (col, total) => {
  if (total === 2) return col === 1 ? 'Left' : 'Right'
  return `Seat ${col}`
}

function YearLegend({ counts }) {
  const years = Object.keys(counts).sort(naturalSort)
  if (years.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {years.map((y) => (
        <span
          key={y}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium border rounded-full px-2 py-0.5 ${styleFor(Number(y)).chip}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${styleFor(Number(y)).dot}`} />
          {y === 'unknown' ? 'Year ?' : yearLabel(Number(y))}
          <span className="opacity-70">{counts[y]}</span>
        </span>
      ))}
    </div>
  )
}

function SeatCell({ assignment, col, totalCols, selected, onSelect }) {
  if (!assignment) {
    return (
      <div className="min-w-0 px-2 py-1.5 border-l-4 border-l-transparent bg-gray-50/60">
        <div className="text-[9px] uppercase tracking-wide text-gray-300">{colLabel(col, totalCols)}</div>
        <div className="text-[11px] text-gray-300 mt-0.5">Empty</div>
      </div>
    )
  }

  const s = assignment.student
  const name = s?.name || 'Unknown student'
  const enrollmentNo = s?.enrollmentNo || ''
  const branch = s?.branch?.code || ''
  const year = s?.year ? yearLabel(s.year) : ''
  const meta = [branch, year].filter(Boolean).join(' · ')
  const st = styleFor(s?.year)

  return (
    <button
      type="button"
      onClick={() => onSelect(assignment)}
      title={`${name}\n${enrollmentNo}\n${meta}\nSeat ${assignment.seatId}`}
      className={`min-w-0 text-left px-2 py-1.5 border-l-4 ${st.bar} transition-colors
        ${selected ? 'bg-amber-100' : 'bg-white hover:bg-blue-50'}`}
    >
      <div className="text-[9px] uppercase tracking-wide text-gray-400">{colLabel(col, totalCols)}</div>
      <div className="text-[12px] font-semibold text-gray-800 leading-tight truncate">{name}</div>
      {enrollmentNo && <div className="font-mono text-[10.5px] text-gray-500 truncate">{enrollmentNo}</div>}
      {meta && <div className="text-[10.5px] text-gray-500 truncate">{meta}</div>}
    </button>
  )
}

function BenchCard({ bench, cols, swapState, onSelectForSwap }) {
  const byCol = {}
  bench.assignments.forEach((a) => { byCol[seatCol(a)] = a })

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white min-w-0">
      <div className="px-2 py-0.5 bg-gray-50 border-b border-gray-200 text-[10px] font-medium text-gray-500">
        Bench {bench.bench}
      </div>
      <div
        className="grid divide-x divide-gray-100"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }, (_, i) => i + 1).map((col) => (
          <SeatCell
            key={col}
            col={col}
            totalCols={cols}
            assignment={byCol[col]}
            selected={!!byCol[col] && swapState?.selected?.id === byCol[col].id}
            onSelect={onSelectForSwap}
          />
        ))}
      </div>
    </div>
  )
}

function RoomBlock({ roomData, swapState, onSelectForSwap }) {
  const [collapsed, setCollapsed] = useState(false)
  const { room, assignments } = roomData

  const { rows, cols, yearCounts } = useMemo(() => {
    const rowMap = {}
    const counts = {}
    let maxCol = 1
    assignments.forEach((a) => {
      const c = seatCol(a)
      if (c > maxCol) maxCol = c
      if (!rowMap[a.row]) rowMap[a.row] = {}
      if (!rowMap[a.row][a.bench]) rowMap[a.row][a.bench] = { bench: a.bench, assignments: [] }
      rowMap[a.row][a.bench].assignments.push(a)
      const y = a.student?.year ?? 'unknown'
      counts[y] = (counts[y] || 0) + 1
    })
    const sortedRows = Object.keys(rowMap)
      .sort(naturalSort)
      .map((row) => ({
        row,
        benches: Object.values(rowMap[row]).sort((x, y) => Number(x.bench) - Number(y.bench)),
      }))
    return { rows: sortedRows, cols: Math.max(maxCol, 2), yearCounts: counts }
  }, [assignments])

  return (
    <div className="card mb-4">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left border-b border-gray-100"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="min-w-0">
          <span className="font-semibold text-gray-800">{room?.name}</span>
          {room?.building && <span className="text-gray-400 text-sm ml-2">{room.building}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block"><YearLegend counts={yearCounts} /></div>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
            {assignments.length} students
          </span>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {!collapsed && (
        <div className="p-3 sm:p-4 space-y-3">
          {rows.map(({ row, benches }) => (
            <div key={row}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Row {row}</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                {benches.map((b) => (
                  <BenchCard
                    key={b.bench}
                    bench={b}
                    cols={cols}
                    swapState={swapState}
                    onSelectForSwap={onSelectForSwap}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SeatingPreview({ data = [], examId, shiftId, onRefresh }) {
  const [swapState, setSwapState] = useState({ selected: null, loading: false })

  const totalCounts = useMemo(() => {
    const counts = {}
    data.forEach((rd) => rd.assignments.forEach((a) => {
      const y = a.student?.year ?? 'unknown'
      counts[y] = (counts[y] || 0) + 1
    }))
    return counts
  }, [data])

  const handleSelectForSwap = (assignment) => {
    if (swapState.loading) return

    if (!swapState.selected) {
      setSwapState({ selected: assignment, loading: false })
      toast('Now click another student to swap seats', { icon: '🔁' })
      return
    }

    if (swapState.selected.id === assignment.id) {
      setSwapState({ selected: null, loading: false })
      return
    }

    const studentA = swapState.selected.student?.id
    const studentB = assignment.student?.id

    setSwapState((s) => ({ ...s, loading: true }))
    seatingAPI
      .swap(examId, shiftId, { studentA, studentB })
      .then(() => {
        toast.success('Seats swapped')
        setSwapState({ selected: null, loading: false })
        onRefresh?.()
      })
      .catch(() => {
        toast.error('Swap failed')
        setSwapState({ selected: null, loading: false })
      })
  }

  const cancelSwap = () => setSwapState({ selected: null, loading: false })

  if (!data.length) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400">
        <p className="text-sm">No seating assignments yet. Generate a plan first.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Colour bar shows the year:</span>
        <YearLegend counts={totalCounts} />
      </div>

      {swapState.selected && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 min-w-0">
            <ArrowLeftRight size={15} className="shrink-0" />
            <span className="truncate">
              Swapping <strong>{swapState.selected.student?.name}</strong>
              {swapState.selected.student?.enrollmentNo && ` (${swapState.selected.student.enrollmentNo})`}
              {' '}from seat {swapState.selected.seatId}. Click another student to finish.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={cancelSwap}>Cancel</Button>
        </div>
      )}

      {data.map((roomData, i) => (
        <RoomBlock
          key={roomData.room?.id || i}
          roomData={roomData}
          swapState={swapState}
          onSelectForSwap={handleSelectForSwap}
        />
      ))}
    </div>
  )
}