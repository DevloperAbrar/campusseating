import { useState } from 'react'
import { ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Loader'
import Button from '../ui/Button'
import { seatingAPI } from '../../api'
import toast from 'react-hot-toast'

function StudentPill({ assignment, selected, onSelect }) {
  const s = assignment.student
  return (
    <button
      onClick={() => onSelect(assignment)}
      className={`
        text-left text-xs px-2 py-1.5 rounded-lg border transition-all
        ${selected
          ? 'bg-amber-100 border-amber-400 ring-1 ring-amber-400'
          : 'bg-white border-gray-200 hover:border-navy hover:bg-blue-50'
        }
      `}
      title={`${s?.name} (${s?.branch?.code}) — ${assignment.seatId}`}
    >
      <span className="font-medium truncate block max-w-[80px]">{s?.name?.split(' ')[0]}</span>
      <span className="text-gray-400 block">{assignment.seatId}</span>
      <span className="text-blue-600">{s?.branch?.code}</span>
    </button>
  )
}

function RoomBlock({ roomData, examId, shiftId, onSwapped, swapState, onSelectForSwap }) {
  const [collapsed, setCollapsed] = useState(false)
  const { room, assignments } = roomData

  return (
    <div className="card mb-4">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left border-b border-gray-100"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div>
          <span className="font-semibold text-gray-800">{room?.name}</span>
          {room?.building && <span className="text-gray-400 text-sm ml-2">{room.building}</span>}
        </div>
        <div className="flex items-center gap-3">
          <Badge color="blue">{assignments.length} students</Badge>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {!collapsed && (
        <div className="p-5">
          {/* Group by row */}
          {(() => {
            const rows = {}
            assignments.forEach((a) => {
              if (!rows[a.row]) rows[a.row] = []
              rows[a.row].push(a)
            })
            return Object.entries(rows).sort(([a], [b]) => a.localeCompare(b)).map(([row, rowAssignments]) => (
              <div key={row} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-500 w-6">Row {row}</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rowAssignments
                    .sort((a, b) => a.bench - b.bench || a.position.localeCompare(b.position))
                    .map((a) => (
                      <StudentPill
                        key={a._id}
                        assignment={a}
                        selected={swapState?.selected?._id === a._id}
                        onSelect={onSelectForSwap}
                      />
                    ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}

export default function SeatingPreview({ data = [], examId, shiftId, onRefresh }) {
  const [swapState, setSwapState] = useState({ selected: null, loading: false })

  const handleSelectForSwap = (assignment) => {
    if (!swapState.selected) {
      setSwapState({ selected: assignment, loading: false })
      toast('Now click another student to swap seats', { icon: '🔄' })
      return
    }

    if (swapState.selected._id === assignment._id) {
      setSwapState({ selected: null, loading: false })
      return
    }

    // Do swap
    const studentA = swapState.selected.student?._id
    const studentB = assignment.student?._id

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
      {/* Swap banner */}
      {swapState.selected && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <ArrowLeftRight size={15} />
            <span>
              Swapping: <strong>{swapState.selected.student?.name}</strong> ({swapState.selected.seatId}). Click another student to complete swap.
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={cancelSwap}>Cancel</Button>
        </div>
      )}

      {data.map((roomData, i) => (
        <RoomBlock
          key={roomData.room?._id || i}
          roomData={roomData}
          examId={examId}
          shiftId={shiftId}
          onSwapped={onRefresh}
          swapState={swapState}
          onSelectForSwap={handleSelectForSwap}
        />
      ))}
    </div>
  )
}