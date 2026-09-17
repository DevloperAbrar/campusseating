import { useState } from 'react'
import { Plus, Pencil, Trash2, Upload, Search, Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useFetch, useMutation, useModal, useDebounce, usePagination, useDownload } from '../../hooks'
import { studentsAPI, branchesAPI, departmentsAPI, streamsAPI } from '../../api'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { ConfirmModal, Pagination, CSVUpload } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'
import { yearLabel, fmtDate } from '../../utils'
import toast from 'react-hot-toast'

export default function Students() {
  const [search, setSearch] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [csvOpen, setCsvOpen] = useState(false)
  const { page, limit, setPage } = usePagination()
  const debouncedSearch = useDebounce(search)
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()
  const { download } = useDownload()

  const { data: branches } = useFetch(() => branchesAPI.list({ limit: 200 }))
  const { data: departments } = useFetch(() => departmentsAPI.list({ limit: 100 }))
  const { data: streams } = useFetch(() => streamsAPI.list({ limit: 50 }))

  const {
    data: students,
    loading,
    refetch,
    data: studentData,
  } = useFetch(
    () => studentsAPI.list({ page, limit, search: debouncedSearch || undefined, branch: filterBranch || undefined, year: filterYear || undefined }),
    [page, debouncedSearch, filterBranch, filterYear]
  )

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => {
    reset({
      ...row,
      branch: row.branch?.id || row.branchId,
      department: row.department?.id || row.departmentId,
      stream: row.stream?.id || row.streamId,
    })
    modal.open(row)
  }

  const onSubmit = (data) => {
    const fn = modal.data?.id
      ? () => studentsAPI.update(modal.data.id, data)
      : () => studentsAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Student updated' : 'Student added',
      onSuccess: () => { modal.close(); refetch() },
    })
  }

  const onDelete = () => {
    mutate(() => studentsAPI.delete(confirm.data.id), {
      successMsg: 'Student deactivated',
      onSuccess: () => { confirm.close(); refetch() },
    })
  }

  const handleCSVUpload = async (file) => {
    const res = await studentsAPI.uploadCSV(file)
    refetch()
    return res
  }

  const handleTemplate = () => {
    download(() => studentsAPI.downloadTemplate(), 'students_template.csv')
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'enrollmentNo', label: 'Enrollment No', render: (r) => <span className="font-mono text-xs">{r.enrollmentNo}</span> },
    { key: 'branch', label: 'Branch', render: (r) => r.branch?.code ? <Badge color="blue">{r.branch.code}</Badge> : '—' },
    { key: 'year', label: 'Year', render: (r) => yearLabel(r.year) },
    { key: 'gender', label: 'Gender', render: (r) => <span className="capitalize">{r.gender || '—'}</span> },
    { key: 'specialNeeds', label: 'Special', render: (r) => r.specialNeeds ? <Badge color="amber">Yes</Badge> : '—' },
    {
      key: 'actions', label: '', width: 90,
      render: (r) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={13} /></button>
          <button onClick={() => confirm.open(r)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Upload} size="sm" onClick={() => setCsvOpen(true)}>Import CSV</Button>
          <Button icon={Plus} size="sm" onClick={openAdd}>Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, email, enrollment…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select className="min-w-36" value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setPage(1) }}>
          <option value="">All Branches</option>
          {branches?.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
        </Select>
        <Select className="min-w-28" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1) }}>
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
        </Select>
      </div>

      <div className="card">
        <Table columns={columns} data={students} loading={loading} emptyMessage="No students found" />
        <Pagination page={page} totalPages={Math.ceil((studentData?.length || 0) / limit)} onPage={setPage} />
      </div>

      {/* CSV Modal */}
      <Modal isOpen={csvOpen} onClose={() => setCsvOpen(false)} title="Import Students via CSV" size="md">
        <CSVUpload onUpload={handleCSVUpload} onDownloadTemplate={handleTemplate} loading={ml} />
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? 'Edit Student' : 'Add Student'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Full Name" required error={errors.name?.message} {...register('name', { required: 'Required' })} />
          </div>
          <Input label="Email" type="email" required error={errors.email?.message} {...register('email', { required: 'Required' })} />
          <Input label="Enrollment No" required error={errors.enrollmentNo?.message} {...register('enrollmentNo', { required: 'Required' })} />
          <Select label="Stream" required error={errors.stream?.message} {...register('stream', { required: 'Required' })}>
            <option value="">Select…</option>
            {streams?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Department" required error={errors.department?.message} {...register('department', { required: 'Required' })}>
            <option value="">Select…</option>
            {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Branch" required error={errors.branch?.message} {...register('branch', { required: 'Required' })}>
            <option value="">Select…</option>
            {branches?.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
          </Select>
          <Select label="Year" required {...register('year', { required: 'Required', valueAsNumber: true })}>
            <option value="">Select…</option>
            {[1,2,3,4,5,6].map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
          </Select>
          <Select label="Gender" {...register('gender')}>
            <option value="other">Other</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
          <Input label="Phone" {...register('phone')} />
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="specialNeeds" {...register('specialNeeds')} className="w-4 h-4 accent-navy" />
            <label htmlFor="specialNeeds" className="text-sm text-gray-700">Special Needs — will get priority/reserved seats</label>
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button>
            <Button type="submit" loading={ml}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Deactivate Student" message={`Deactivate "${confirm.data?.name}"? They won't appear in future exam assignments.`} confirmLabel="Deactivate" />
    </div>
  )
}