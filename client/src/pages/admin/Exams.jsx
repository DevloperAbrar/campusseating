import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useFetch, useMutation, useModal } from '../../hooks'
import { examsAPI } from '../../api'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import { ConfirmModal } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'
import { fmtDate, examStatusColor, toInputDate } from '../../utils'

export default function Exams() {
  const [filterStatus, setFilterStatus] = useState('')
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()

  const { data: exams, loading, refetch } = useFetch(
    () => examsAPI.list({ status: filterStatus || undefined }),
    [filterStatus]
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => {
    reset({ ...row, examDate: toInputDate(row.examDate) })
    modal.open(row)
  }

  const onSubmit = (data) => {
    const fn = modal.data?.id
      ? () => examsAPI.update(modal.data.id, data)
      : () => examsAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Exam updated' : 'Exam created',
      onSuccess: () => { modal.close(); refetch() },
    })
  }

  const onDelete = () => {
    mutate(() => examsAPI.delete(confirm.data.id), {
      successMsg: 'Exam deleted',
      onSuccess: () => { confirm.close(); refetch() },
    })
  }

  const columns = [
    {
      key: 'title', label: 'Exam',
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-gray-400">{r.academicYear}</p>
        </div>
      ),
    },
    { key: 'examDate', label: 'Date', render: (r) => <span className="flex items-center gap-1.5"><CalendarDays size={13} className="text-gray-400" />{fmtDate(r.examDate)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge className={examStatusColor[r.status]}>{r.status}</Badge> },
    { key: 'isLocked', label: '', render: (r) => r.isLocked ? <Badge color="red">Locked</Badge> : null },
    {
      key: 'actions', label: '', width: 120,
      render: (r) => (
        <div className="flex gap-1 items-center">
          <button onClick={() => openEdit(r)} disabled={r.isLocked} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"><Pencil size={13} /></button>
          <button onClick={() => confirm.open(r)} disabled={r.isLocked} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
          <Link to={`/admin/exams/${r.id}`} className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700">
            <ChevronRight size={15} />
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Exams</h1>
        <Button icon={Plus} size="sm" onClick={openAdd}>Create Exam</Button>
      </div>

      <div className="card p-4 flex gap-3 items-end">
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-48">
          <option value="">All Statuses</option>
          {['draft', 'published', 'ongoing', 'completed'].map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </Select>
      </div>

      <div className="card">
        <Table columns={columns} data={exams} loading={loading} emptyMessage="No exams created yet" />
      </div>

      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? 'Edit Exam' : 'Create Exam'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Exam Title" required placeholder="e.g. End Semester Examination Nov 2024" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Academic Year" required placeholder="e.g. 2024-25" error={errors.academicYear?.message} {...register('academicYear', { required: 'Required' })} />
            <Input label="Exam Date" type="date" required error={errors.examDate?.message} {...register('examDate', { required: 'Required' })} />
          </div>
          {modal.data?.id && (
            <Select label="Status" {...register('status')}>
              {['draft', 'published', 'ongoing', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          )}
          <Textarea label="Description" placeholder="Optional notes about the exam" {...register('description')} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button>
            <Button type="submit" loading={ml}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Delete Exam" message={`Delete "${confirm.data?.title}"? All shifts will also be deleted.`} />
    </div>
  )
}