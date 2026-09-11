import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, KeyRound, Wand2, Users, GraduationCap, BookOpen, ClipboardList
} from 'lucide-react'
import { superadminAPI } from '../../api'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import StatCard from '../../components/shared/StatCard'
import Loader from '../../components/ui/Loader'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

const STATUS_COLORS = {
  ACTIVE:     'bg-green-100 text-green-700',
  TRIAL:      'bg-amber-100 text-amber-700',
  SUSPENDED:  'bg-red-100 text-red-700',
  TERMINATED: 'bg-gray-100 text-gray-500',
}

export default function CollegeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [college, setCollege] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRenew, setShowRenew] = useState(false)
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const renewForm = useForm({ defaultValues: { years: 1, plan: '' } })
  const pwdForm = useForm()

  const fetchCollege = async () => {
    try {
      const res = await superadminAPI.getCollege(id)
      setCollege(res.data.data)
    } catch {
      toast.error('Failed to load college')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCollege() }, [id])

  const doAction = async (actionKey, apiFn, successMsg) => {
    setActionLoading(actionKey)
    try {
      await apiFn()
      toast.success(successMsg)
      fetchCollege()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading('')
    }
  }

  const handleRenew = async (data) => {
    await doAction('renew', () => superadminAPI.renewCollege(id, data), 'College renewed!')
    setShowRenew(false)
    renewForm.reset()
  }

  const handleResetPwd = async (data) => {
    await doAction('resetpwd', () => superadminAPI.resetPassword(id, { newPassword: data.newPassword }), 'Password updated!')
    setShowResetPwd(false)
    pwdForm.reset()
  }

  const handleGenPwd = async () => {
    try {
      const res = await superadminAPI.generatePassword()
      const pwd = res.data.data.password
      pwdForm.setValue('newPassword', pwd)
      toast.success('Password generated!')
    } catch {
      toast.error('Failed to generate')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader text="Loading college…" /></div>
  if (!college) return <div className="text-center py-20 text-gray-400">College not found.</div>

  const counts = college._count || {}

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/superadmin/colleges')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{college.name}</h1>
            <span className={`badge ${STATUS_COLORS[college.status] || 'bg-gray-100'}`}>{college.status}</span>
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{college.code}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{college.adminEmail}</p>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={counts.students ?? '—'} icon={GraduationCap} color="navy" />
        <StatCard title="Faculty" value={counts.faculty ?? '—'} icon={Users} color="blue" />
        <StatCard title="Rooms" value={counts.rooms ?? '—'} icon={Building2} color="green" />
        <StatCard title="Exams" value={counts.exams ?? '—'} icon={ClipboardList} color="purple" />
      </div>

      {/* Info card */}
      <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {[
          { label: 'Plan', value: college.plan },
          { label: 'Contact Email', value: college.contactEmail },
          { label: 'Contact Phone', value: college.contactPhone || '—' },
          { label: 'Start Date', value: college.startDate ? new Date(college.startDate).toLocaleDateString() : '—' },
          { label: 'Renewal Date', value: college.renewalDate ? new Date(college.renewalDate).toLocaleDateString() : '—' },
          { label: 'Max Students', value: college.maxStudents },
          { label: 'Max Rooms', value: college.maxRooms },
          { label: 'Max Faculty', value: college.maxFaculty },
          { label: 'Suspended At', value: college.suspendedAt ? new Date(college.suspendedAt).toLocaleDateString() : '—' },
          { label: 'Terminated At', value: college.terminatedAt ? new Date(college.terminatedAt).toLocaleDateString() : '—' },
          { label: 'Created', value: new Date(college.createdAt).toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button icon={RefreshCw} onClick={() => setShowRenew(true)}>
            Renew Subscription
          </Button>
          <Button variant="secondary" icon={KeyRound} onClick={() => setShowResetPwd(true)}>
            Reset Admin Password
          </Button>

          {college.status !== 'ACTIVE' && college.status !== 'TERMINATED' && (
            <Button variant="secondary" icon={CheckCircle}
              loading={actionLoading === 'reactivate'}
              onClick={() => doAction('reactivate', () => superadminAPI.reactivateCollege(id), 'College reactivated!')}>
              Reactivate
            </Button>
          )}

          {college.status === 'ACTIVE' || college.status === 'TRIAL' ? (
            <Button variant="danger" icon={AlertTriangle}
              loading={actionLoading === 'suspend'}
              onClick={() => {
                if (confirm(`Suspend "${college.name}"? Their admin won't be able to log in.`))
                  doAction('suspend', () => superadminAPI.suspendCollege(id), 'College suspended.')
              }}>
              Suspend
            </Button>
          ) : null}

          {college.status !== 'TERMINATED' && (
            <Button variant="danger" icon={XCircle}
              loading={actionLoading === 'terminate'}
              onClick={() => {
                if (confirm(`TERMINATE "${college.name}"? This is permanent.`))
                  doAction('terminate', () => superadminAPI.terminateCollege(id), 'College terminated.')
              }}>
              Terminate
            </Button>
          )}
        </div>
      </div>

      {/* Renew Modal */}
      <Modal isOpen={showRenew} onClose={() => setShowRenew(false)} title="Renew Subscription">
        <form onSubmit={renewForm.handleSubmit(handleRenew)} className="space-y-4">
          <div className="form-group">
            <label className="label">Extend by (years)</label>
            <input className="input" type="number" min={1} max={5}
              {...renewForm.register('years', { valueAsNumber: true, min: 1 })} />
          </div>
          <div className="form-group">
            <label className="label">Change Plan (optional)</label>
            <select className="input" {...renewForm.register('plan')}>
              <option value="">Keep current ({college.plan})</option>
              <option value="TRIAL">Trial</option>
              <option value="BASIC">Basic</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowRenew(false)}>Cancel</Button>
            <Button type="submit" loading={actionLoading === 'renew'}>Renew</Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetPwd} onClose={() => setShowResetPwd(false)} title="Reset Admin Password">
        <form onSubmit={pwdForm.handleSubmit(handleResetPwd)} className="space-y-4">
          <div className="form-group">
            <label className="label">New Password *</label>
            <div className="flex gap-2">
              <input className="input flex-1" type="text" placeholder="Min 8 characters"
                {...pwdForm.register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
              <button type="button" onClick={handleGenPwd}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors whitespace-nowrap">
                <Wand2 size={13} /> Generate
              </button>
            </div>
            {pwdForm.formState.errors.newPassword && (
              <p className="text-xs text-red-500">{pwdForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            ⚠️ Share this password securely with the college admin. They should change it on first login.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowResetPwd(false)}>Cancel</Button>
            <Button type="submit" loading={actionLoading === 'resetpwd'}>Update Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}