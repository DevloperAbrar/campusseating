import { useMemo } from 'react'

const statusClass = {
  available:   'seat-available',
  blocked:     'seat-blocked',
  reserved:    'seat-reserved',
  invigilator: 'seat-invigilator',
  occupied:    'seat-occupied',
}

const statusLabel = {
  available:   'Available',
  blocked:     'Blocked',
  reserved:    'Reserved',
  invigilator: 'Invigilator',
  occupied:    'Occupied',
}

export default function SeatGrid({ seats = [], onSeatClick, readOnly = false, highlightStudentId }) {
  // Group seats: rows → benches → positions
  const grid = useMemo(() => {
    const rows = {}
    seats.forEach((seat) => {
      if (!rows[seat.row]) rows[seat.row] = {}
      if (!rows[seat.row][seat.bench]) rows[seat.row][seat.bench] = []
      rows[seat.row][seat.bench].push(seat)
    })
    // Sort positions within each bench
    Object.keys(rows).forEach((r) =>
      Object.keys(rows[r]).forEach((b) => {
        rows[r][b].sort((a, z) => a.position.localeCompare(z.position))
      })
    )
    return rows
  }, [seats])

  const rowKeys = Object.keys(grid).sort()
  const allBenches = [...new Set(seats.map((s) => s.bench))].sort((a, b) => a - b)

  const legendItems = [
    { status: 'available', label: 'Available' },
    { status: 'blocked', label: 'Blocked' },
    { status: 'reserved', label: 'Reserved (Special)' },
    { status: 'occupied', label: 'Occupied' },
  ]

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {legendItems.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-4 h-4 rounded text-center text-[9px] flex items-center justify-center font-medium ${statusClass[status]}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-8 text-gray-400 font-medium text-xs text-center pb-2">Row</th>
              {allBenches.map((b) => (
                <th key={b} className="text-gray-400 font-medium text-xs text-center pb-2 px-1">
                  B{b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((row) => (
              <tr key={row}>
                <td className="text-center text-gray-500 font-bold text-xs w-8 pr-2">{row}</td>
                {allBenches.map((bench) => {
                  const benchSeats = grid[row]?.[bench] || []
                  return (
                    <td key={bench} className="px-1 pb-1">
                      <div className="flex gap-0.5">
                        {benchSeats.length > 0 ? (
                          benchSeats.map((seat) => (
                            <button
                              key={seat.seatId}
                              disabled={readOnly || seat.status === 'invigilator'}
                              onClick={() => onSeatClick?.(seat)}
                              className={`
                                w-10 h-10 rounded text-center transition-all text-[9px] font-medium
                                ${statusClass[seat.status] || statusClass.available}
                                ${readOnly ? 'cursor-default' : ''}
                                ${highlightStudentId && seat.studentId === highlightStudentId ? 'ring-2 ring-yellow-400 scale-110' : ''}
                              `}
                              title={`${seat.seatId} — ${statusLabel[seat.status] || seat.status}${seat.studentName ? ` — ${seat.studentName}` : ''}`}
                            >
                              <span className="block leading-tight">{seat.position}</span>
                              {seat.studentBranch && (
                                <span className="block leading-tight text-[8px] opacity-75">{seat.studentBranch}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="w-10 h-10" />
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}