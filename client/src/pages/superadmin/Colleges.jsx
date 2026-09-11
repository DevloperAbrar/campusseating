import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw, Eye, Wand2 } from 'lucide-react'
import { superadminAPI } from '../../api'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Loader from '../../components/ui/Loader'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

const STATUS_COLORS = {
  ACTIVE:     'bg-green-100 text-green-700',
  TRIAL:      'bg-amber-100 text-amber-700',
  SUSPENDED:  'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-500',
}

const PLAN_COLORS = {
  TRIAL:      'bg-blue-50 text-blue-600',
  BASIC:      'bg-indigo-50 text-indigo-600',
  STANDARD:   'bg-purple-50 text-purple-600',
  PREMIUM:    'bg-pink-50 text-pink-600',
}

export default function Colleges() {
  const navigate = useNavigate()
  const [colleges, setColleges] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [genPwd, setGenPwd] = useState('')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    defaultValues: { plan: 'TRIAL', maxStudents: 2000, maxRooms: 50, maxFaculty: 200 }
  })

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await superadminAPI.listColleges({ search, status: statusFilter, page, limit: 15 })
      setColleges(res.data.data)
      setMeta(res.data.meta || {})
    } catch {
      toast.error('Failed to load colleges')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => { fetch() }, [fetch])

  const handleGeneratePassword = async () => {
    try {
      const res = await superadminAPI.generatePassword()
      const pwd = res.data.data.password
      setGenPwd(pwd)
      setValue('adminPassword', pwd)
      toast.success('Password generated & filled!')
    } catch {
      toast.error('Failed to generate password')
    }
  }

  const onCreate = async (data) => {
    setCreating(true)
    try {
      await superadminAPI.createCollege(data)
      toast.success(`College "${data.name}" created!`)
      setShowCreate(false)
      reset()
      setGenPwd('')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create college')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Colleges</h1>
          <p className="text-sm text-gray-500">{meta.total || 0} colleges registered</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>Add College</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search name, code, email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input w-auto"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <Button variant="secondary" icon={RefreshCw} onClick={fetch}>Refresh</Button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader text="Loading…" /></div>
        ) : colleges.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No colleges found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">College</th>
                  <th className="table-th">Code</th>
                  <th className="table-th">Admin Email</th>
                  <th className="table-th">Plan</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Renewal</th>
                  <th className="table-th">Students</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colleges.map(col => (
                  <tr key={col.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-medium">{col.name}</td>
                    <td className="table-td">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{col.code}</span>
                    </td>
                    <td className="table-td text-gray-500">{col.adminEmail}</td>
                    <td className="table-td">
                      <span className={`badge ${PLAN_COLORS[col.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {col.plan}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${STATUS_COLORS[col.status] || 'bg-gray-100 text-gray-600'}`}>
                        {col.status}
                      </span>
                    </td>
                    <td className="table-td text-gray-500 text-xs">
                      {col.renewalDate ? new Date(col.renewalDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="table-td text-gray-500">{col._count?.students ?? '—'}</td>
                    <td className="table-td">
                      <button
                        onClick={() => navigate(`/superadmin/colleges/${col.id}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); setGenPwd('') }} title="Add New College" size="lg">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">College Name *</label>
              <input className="input" placeholder="ABC Engineering College"
                {...register('name', { required: 'Required' })} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">College Code *</label>
              <input className="input" placeholder="abc-eng" style={{ textTransform: 'lowercase' }}
                {...register('code', { required: 'Required' })} />
              {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Contact Email *</label>
              <input className="input" type="email" placeholder="contact@college.edu"
                {...register('contactEmail', { required: 'Required' })} />
              {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Contact Phone</label>
              <input className="input" placeholder="+91 9999999999"
                {...register('contactPhone')} />
            </div>
            <div className="form-group">
              <label className="label">Admin Login Email *</label>
              <input className="input" type="email" placeholder="admin@college.edu"
                {...register('adminEmail', { required: 'Required' })} />
              {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Admin Password *</label>
              <div className="flex gap-2">
                <input className="input flex-1" type="text" placeholder="Min 8 characters"
                  {...register('adminPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                <button type="button" onClick={handleGeneratePassword}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors whitespace-nowrap">
                  <Wand2 size={13} /> Generate
                </button>
              </div>
              {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword.message}</p>}
              {genPwd && <p className="text-xs text-green-600 font-mono mt-1 bg-green-50 px-2 py-1 rounded">Generated: {genPwd}</p>}
            </div>
            <div className="form-group">
              <label className="label">Plan</label>
              <select className="input" {...register('plan')}>
                <option value="TRIAL">Trial</option>
                <option value="BASIC">Basic</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Max Students</label>
              <input className="input" type="number" {...register('maxStudents', { valueAsNumber: true })} />
            </div>
            <div className="form-group">
              <label className="label">Max Rooms</label>
              <input className="input" type="number" {...register('maxRooms', { valueAsNumber: true })} />
            </div>
            <div className="form-group">
              <label className="label">Max Faculty</label>
              <input className="input" type="number" {...register('maxFaculty', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); reset(); setGenPwd('') }}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>Create College</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}