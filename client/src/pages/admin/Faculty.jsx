import { useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useFetch, useMutation, useModal, useDebounce, usePagination } from '../../hooks'
import { facultyAPI, departmentsAPI } from '../../api'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { ConfirmModal, Pagination } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'

const DESIGNATIONS = ['Professor', 'Assistant Professor', 'HOD', 'Lab Assistant']

export default function Faculty() {
  const [search, setSearch] = useState('')
  const { page, limit, setPage } = usePagination()
  const debouncedSearch = useDebounce(search)
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()

  const { data: departments } = useFetch(() => departmentsAPI.list({ limit: 100 }))
  const { data: faculty, loading, refetch } = useFetch(
    () => facultyAPI.list({ page, limit, search: debouncedSearch || undefined }),
    [page, debouncedSearch]
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => {
    reset({ ...row, departments: row.departments?.map((d) => d._id || d) })
    modal.open(row)
  }

  const onSubmit = (data) => {
    // departments may come as single value from select; coerce to array
    const payload = { ...data, departments: data.departments ? [data.departments].flat() : [] }
    const fn = modal.data?._id
      ? () => facultyAPI.update(modal.data._id, payload)
      : () => facultyAPI.create(payload)
    mutate(fn, {
      successMsg: modal.data?._id ? 'Faculty updated' : 'Faculty added',
      onSuccess: () => { modal.close(); refetch() },
    })
  }

  const onDelete = () => {
    mutate(() => facultyAPI.delete(confirm.data._id), {
      successMsg: 'Faculty deactivated',
      onSuccess: () => { confirm.close(); refetch() },
    })
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: (r) => <span className="text-gray-500 text-xs">{r.email}</span> },
    { key: 'employeeId', label: 'Employee ID', render: (r) => <span className="font-mono text-xs">{r.employeeId}</span> },
    { key: 'designation', label: 'Designation', render: (r) => <Badge color="blue">{r.designation}</Badge> },
    { key: 'departments', label: 'Departments', render: (r) => r.departments?.map((d) => d.code).join(', ') || '—' },
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
        <h1 className="page-title">Faculty</h1>
        <Button icon={Plus} size="sm" onClick={openAdd}>Add Faculty</Button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, email, employee ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={faculty} loading={loading} emptyMessage="No faculty added yet" />
        <Pagination page={page} totalPages={Math.ceil((faculty?.length || 0) / limit)} onPage={setPage} />
      </div>

      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?._id ? 'Edit Faculty' : 'Add Faculty'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Full Name" required error={errors.name?.message} {...register('name', { required: 'Required' })} />
          </div>
          <Input label="Email" type="email" required error={errors.email?.message} {...register('email', { required: 'Required' })} />
          <Input label="Employee ID" required error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Select label="Designation" required error={errors.designation?.message} {...register('designation', { required: 'Required' })}>
            <option value="">Select…</option>
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Input label="Phone" {...register('phone')} />
          <div className="col-span-2">
            <Select label="Department" {...register('departments')}>
              <option value="">Select department…</option>
              {departments?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button>
            <Button type="submit" loading={ml}>Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Deactivate Faculty" message={`Deactivate "${confirm.data?.name}"?`} confirmLabel="Deactivate" />
    </div>
  )
}