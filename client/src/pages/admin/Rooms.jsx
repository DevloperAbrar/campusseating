import { useState } from 'react'
import { Plus, Pencil, Trash2, Grid3X3, Search } from 'lucide-react'
import { useFetch, useMutation, useModal, useDebounce } from '../../hooks'
import { roomsAPI } from '../../api'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { ConfirmModal } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'
import RoomForm from '../../components/room/RoomForm'
import SeatGrid from '../../components/room/SeatGrid'
import toast from 'react-hot-toast'

export default function Rooms() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const modal = useModal()
  const seatModal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()

  const { data: rooms, loading, refetch } = useFetch(
    () => roomsAPI.list({ search: debouncedSearch || undefined }),
    [debouncedSearch]
  )

  const handleSave = (data) => {
    const fn = modal.data?.id
      ? () => roomsAPI.update(modal.data.id, data)
      : () => roomsAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Room updated' : 'Room created',
      onSuccess: () => { modal.close(); refetch() },
    })
  }

  const handleDelete = () => {
    mutate(() => roomsAPI.delete(confirm.data.id), {
      successMsg: 'Room deactivated',
      onSuccess: () => { confirm.close(); refetch() },
    })
  }

  const handleSeatClick = async (seat) => {
    const room = seatModal.data
    const cycleStatus = { available: 'blocked', blocked: 'reserved', reserved: 'available' }
    const newStatus = cycleStatus[seat.status] || 'available'

    try {
      await roomsAPI.updateSeats(room.id, [{ seatId: seat.seatId, status: newStatus }])
      const updated = {
        ...room,
        seats: room.seats.map((s) => s.seatId === seat.seatId ? { ...s, status: newStatus } : s),
      }
      seatModal.open(updated)
      refetch()
    } catch {
      toast.error('Failed to update seat')
    }
  }

  const openSeatEditor = async (room) => {
    try {
      const res = await roomsAPI.getById(room.id)
      seatModal.open(res.data.data)
    } catch {
      toast.error('Failed to load seat layout')
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'building', label: 'Building', render: (r) => r.building || '—' },
    { key: 'floor', label: 'Floor', render: (r) => r.floor || '—' },
    { key: 'totalCapacity', label: 'Total Seats' },
    { key: 'usableCapacity', label: 'Usable Seats' },
    {
      key: 'isLocked', label: 'Status',
      render: (r) => r.isLocked
        ? <Badge color="red">Locked</Badge>
        : <Badge color="green">Available</Badge>
    },
    {
      key: 'actions', label: '', width: 120,
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => openSeatEditor(r)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Edit Seats">
            <Grid3X3 size={13} />
          </button>
          <button
            onClick={() => { modal.open(r) }}
            disabled={r.isLocked}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            title="Edit Room"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => confirm.open(r)}
            disabled={r.isLocked}
            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-30"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Rooms</h1>
        <Button icon={Plus} size="sm" onClick={() => modal.open(null)}>Add Room</Button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search room name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={rooms} loading={loading} emptyMessage="No rooms added yet" />
      </div>

      {/* Add/Edit Room Modal */}
      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? `Edit Room — ${modal.data.name}` : 'Add New Room'} size="md">
        <RoomForm
          defaultValues={modal.data}
          onSubmit={handleSave}
          loading={ml}
          onCancel={modal.close}
        />
      </Modal>

      {/* Seat Editor Modal */}
      <Modal isOpen={seatModal.isOpen} onClose={seatModal.close} title={`Seat Layout — ${seatModal.data?.name}`} size="xl">
        {seatModal.data?.seats?.length > 0 ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Click a seat to cycle its status: <strong>Available → Blocked → Reserved</strong>.
              Reserved seats are assigned to special-needs students first.
            </p>
            <SeatGrid seats={seatModal.data.seats} onSeatClick={handleSeatClick} />
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-8 text-center">
            No seats generated. Save the room first with rows and benches configured.
          </p>
        )}
      </Modal>

      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={handleDelete} loading={ml} title="Deactivate Room" message={`Deactivate room "${confirm.data?.name}"? It will no longer appear in exam assignments.`} confirmLabel="Deactivate" />
    </div>
  )
}