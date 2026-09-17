import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useFetch, useMutation, useModal } from '../../hooks'
import { streamsAPI, departmentsAPI, branchesAPI } from '../../api'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { ConfirmModal } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'
import toast from 'react-hot-toast'

// ── Generic CRUD table for each entity
function EntitySection({ title, columns, data, loading, onAdd, onEdit, onDelete, deleteLoading }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <Button size="sm" icon={Plus} onClick={onAdd}>Add</Button>
      </div>
      <Table
        columns={[
          ...columns,
          {
            key: 'actions',
            label: '',
            width: 90,
            render: (row) => (
              <div className="flex gap-1">
                <button onClick={() => onEdit(row)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(row)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
        data={data}
        loading={loading}
        emptyMessage={`No ${title.toLowerCase()} added yet`}
      />
    </div>
  )
}

// ── Streams section
function Streams({ streams, loading, onRefresh }) {
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => { reset(row); modal.open(row) }

  const onSubmit = (data) => {
    const fn = modal.data?.id
      ? () => streamsAPI.update(modal.data.id, data)
      : () => streamsAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Stream updated' : 'Stream created',
      onSuccess: () => { modal.close(); onRefresh() },
    })
  }

  const onDelete = () => {
    mutate(() => streamsAPI.delete(confirm.data.id), {
      successMsg: 'Stream deleted',
      onSuccess: () => { confirm.close(); onRefresh() },
    })
  }

  return (
    <>
      <EntitySection
        title="Streams"
        data={streams}
        loading={loading}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(row) => confirm.open(row)}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code', render: (r) => <span className="badge bg-navy text-white">{r.code}</span> },
          { key: 'durationYears', label: 'Duration', render: (r) => `${r.durationYears} years` },
          { key: 'isActive', label: 'Status', render: (r) => <Badge color={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />
      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? 'Edit Stream' : 'Add Stream'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" required placeholder="e.g. BTech" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Code" required placeholder="e.g. BTECH" error={errors.code?.message} {...register('code', { required: 'Required' })} />
          <Input label="Duration (Years)" type="number" required min={1} max={6} error={errors.durationYears?.message} {...register('durationYears', { required: 'Required', valueAsNumber: true })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button><Button type="submit" loading={ml}>Save</Button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Delete Stream" message={`Delete stream "${confirm.data?.name}"? This cannot be undone.`} />
    </>
  )
}

// ── Departments section
function Departments({ departments, streams, loading, onRefresh }) {
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => { reset({ ...row, stream: row.stream?.id || row.stream }); modal.open(row) }

  const onSubmit = (data) => {
    const fn = modal.data?.id
      ? () => departmentsAPI.update(modal.data.id, data)
      : () => departmentsAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Department updated' : 'Department created',
      onSuccess: () => { modal.close(); onRefresh() },
    })
  }

  const onDelete = () => {
    mutate(() => departmentsAPI.delete(confirm.data.id), {
      successMsg: 'Department deleted',
      onSuccess: () => { confirm.close(); onRefresh() },
    })
  }

  return (
    <>
      <EntitySection
        title="Departments"
        data={departments}
        loading={loading}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(row) => confirm.open(row)}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code', render: (r) => <span className="badge bg-blue-100 text-blue-700">{r.code}</span> },
          { key: 'stream', label: 'Stream', render: (r) => r.stream?.name || '—' },
          { key: 'isActive', label: 'Status', render: (r) => <Badge color={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />
      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? 'Edit Department' : 'Add Department'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" required placeholder="e.g. Dept of Computer Science" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Code" required placeholder="e.g. CSE" error={errors.code?.message} {...register('code', { required: 'Required' })} />
          <Select label="Stream" required error={errors.stream?.message} {...register('stream', { required: 'Required' })}>
            <option value="">Select stream…</option>
            {streams?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex justify-end gap-3"><Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button><Button type="submit" loading={ml}>Save</Button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Delete Department" message={`Delete "${confirm.data?.name}"?`} />
    </>
  )
}

// ── Branches section
function Branches({ branches, departments, streams, loading, onRefresh }) {
  const modal = useModal()
  const confirm = useModal()
  const { mutate, loading: ml } = useMutation()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openAdd = () => { reset({}); modal.open(null) }
  const openEdit = (row) => {
    reset({ ...row, department: row.department?.id || row.department, stream: row.stream?.id || row.stream })
    modal.open(row)
  }

  const onSubmit = (data) => {
    const fn = modal.data?.id
      ? () => branchesAPI.update(modal.data.id, data)
      : () => branchesAPI.create(data)
    mutate(fn, {
      successMsg: modal.data?.id ? 'Branch updated' : 'Branch created',
      onSuccess: () => { modal.close(); onRefresh() },
    })
  }

  const onDelete = () => {
    mutate(() => branchesAPI.delete(confirm.data.id), {
      successMsg: 'Branch deleted',
      onSuccess: () => { confirm.close(); onRefresh() },
    })
  }

  return (
    <>
      <EntitySection
        title="Branches"
        data={branches}
        loading={loading}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(row) => confirm.open(row)}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code', render: (r) => <span className="badge bg-green-100 text-green-700">{r.code}</span> },
          { key: 'department', label: 'Department', render: (r) => r.department?.name || '—' },
          { key: 'stream', label: 'Stream', render: (r) => r.stream?.name || '—' },
          { key: 'totalYears', label: 'Years' },
        ]}
      />
      <Modal isOpen={modal.isOpen} onClose={modal.close} title={modal.data?.id ? 'Edit Branch' : 'Add Branch'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" required placeholder="e.g. Computer Science & Engineering" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Code" required placeholder="e.g. CSE" error={errors.code?.message} {...register('code', { required: 'Required' })} />
          <Select label="Stream" required error={errors.stream?.message} {...register('stream', { required: 'Required' })}>
            <option value="">Select stream…</option>
            {streams?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Department" required error={errors.department?.message} {...register('department', { required: 'Required' })}>
            <option value="">Select department…</option>
            {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Total Years" type="number" required min={1} max={6} {...register('totalYears', { required: 'Required', valueAsNumber: true })} />
          <div className="flex justify-end gap-3"><Button variant="secondary" type="button" onClick={modal.close}>Cancel</Button><Button type="submit" loading={ml}>Save</Button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={confirm.isOpen} onClose={confirm.close} onConfirm={onDelete} loading={ml} title="Delete Branch" message={`Delete branch "${confirm.data?.name}"?`} />
    </>
  )
}

// ── Main page
export default function Academic() {
  const { data: streams, loading: sl, refetch: rStreams } = useFetch(() => streamsAPI.list({ limit: 100 }))
  const { data: departments, loading: dl, refetch: rDepts } = useFetch(() => departmentsAPI.list({ limit: 100 }))
  const { data: branches, loading: bl, refetch: rBranches } = useFetch(() => branchesAPI.list({ limit: 100 }))

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Academic Structure</h1>
        <p className="text-sm text-gray-500">Manage streams, departments, and branches</p>
      </div>

      <Streams streams={streams} loading={sl} onRefresh={rStreams} />
      <Departments departments={departments} streams={streams} loading={dl} onRefresh={rDepts} />
      <Branches branches={branches} departments={departments} streams={streams} loading={bl} onRefresh={rBranches} />
    </div>
  )
}