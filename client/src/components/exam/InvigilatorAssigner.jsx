import { useState } from 'react'
import { Plus, Trash2, UserCheck } from 'lucide-react'
import { useFetch, useMutation } from '../../hooks'
import { invigilatorsAPI, facultyAPI } from '../../api'
import { Badge } from '../ui/Loader'
import Button from '../ui/Button'
import { ConfirmModal } from '../shared/index.jsx'

export default function InvigilatorAssigner({ examId, shiftId, rooms = [] }) {
  // ── Normalize rooms ────────────────────────────────────────────────────────
  // The shift.rooms array contains objects shaped like:
  //   { room: { _id, name, usableCapacity }, priority, usableCapacity }
  // OR sometimes plain room objects { _id, name, ... }
  // Normalize everything to { _id, name } for consistent use below.
  const normalizedRooms = rooms.map((r) => {
    if (r.room && typeof r.room === 'object') {
      // shift-room object: { room: { _id, name }, priority, ... }
      return { _id: r.room._id, name: r.room.name }
    }
    // plain room object
    return { _id: r._id, name: r.name }
  })

  const [selectedRoom, setSelectedRoom] = useState(normalizedRooms[0]?._id || '')
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const { mutate, loading: ml } = useMutation()

  const { data: assignments, refetch } = useFetch(
    () => invigilatorsAPI.list(examId, shiftId),
    [examId, shiftId]
  )

  const { data: faculty } = useFetch(() => facultyAPI.list({ limit: 200 }))

  const handleAssign = () => {
    if (!selectedRoom || !selectedFaculty) return
    mutate(
      () => invigilatorsAPI.assign(examId, shiftId, { facultyId: selectedFaculty, roomId: selectedRoom }),
      {
        successMsg: 'Invigilator assigned',
        onSuccess: () => {
          setSelectedFaculty('')
          refetch()
        },
      }
    )
  }

  const handleRemove = () => {
    mutate(() => invigilatorsAPI.remove(examId, shiftId, confirmRemove._id), {
      successMsg: 'Invigilator removed',
      onSuccess: () => { setConfirmRemove(null); refetch() },
    })
  }

  // ── Group assignments by room ──────────────────────────────────────────────
  // Build the map using normalizedRooms so keys are always plain _id strings
  const byRoom = {}
  normalizedRooms.forEach((r) => {
    byRoom[r._id] = { room: r, faculty: [] }
  })

  assignments?.forEach((a) => {
    // assignment.room may be a populated object or just an id string
    const rId = a.room?._id || a.room
    if (byRoom[rId]) {
      byRoom[rId].faculty.push(a)
    }
  })

  return (
    <div className="space-y-5">
      {/* Assign form */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="form-group flex-1 min-w-40">
          <label className="label">Room</label>
          <select className="input" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            <option value="">Select room…</option>
            {normalizedRooms.map((r) => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group flex-1 min-w-52">
          <label className="label">Faculty</label>
          <select className="input" value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)}>
            <option value="">Select faculty…</option>
            {faculty?.map((f) => (
              <option key={f._id} value={f._id}>{f.name} ({f.designation})</option>
            ))}
          </select>
        </div>
        <Button icon={Plus} size="sm" loading={ml} onClick={handleAssign} disabled={!selectedRoom || !selectedFaculty}>
          Assign
        </Button>
      </div>

      {/* Current assignments by room */}
      {Object.values(byRoom).map(({ room, faculty: fas }) => (
        <div key={room._id} className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-gray-400" />
              <span className="font-medium text-sm">{room.name}</span>
            </div>
            <Badge color={fas.length > 0 ? 'green' : 'gray'}>
              {fas.length} invigilator{fas.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {fas.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">No invigilators assigned to this room</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {fas.map((a) => (
                <li key={a._id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.faculty?.name}</p>
                    <p className="text-xs text-gray-400">{a.faculty?.designation} · {a.faculty?.email}</p>
                  </div>
                  <button
                    onClick={() => setConfirmRemove(a)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        loading={ml}
        title="Remove Invigilator"
        message={`Remove ${confirmRemove?.faculty?.name} from this room?`}
        confirmLabel="Remove"
      />
    </div>
  )
}