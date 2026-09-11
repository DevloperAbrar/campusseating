import { useEffect, useState } from 'react'
import { Building2, GraduationCap, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { superadminAPI } from '../../api'
import StatCard from '../../components/shared/StatCard'
import Loader from '../../components/ui/Loader'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    superadminAPI.stats()
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Loader text="Loading stats…" /></div>

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of all colleges on CampusSeating</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Colleges" value={stats?.total} icon={Building2} color="navy" />
        <StatCard title="Active" value={stats?.active} icon={CheckCircle} color="green" />
        <StatCard title="Trial" value={stats?.trial} icon={Clock} color="amber" />
        <StatCard title="Suspended" value={stats?.suspended} icon={AlertTriangle} color="red" />
        <StatCard title="Terminated" value={stats?.terminated} icon={XCircle} color="red" />
        <StatCard title="Total Students" value={stats?.totalStudents?.toLocaleString()} icon={GraduationCap} color="blue" />
      </div>

      {/* Status breakdown visual */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">College Status Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Active', key: 'active', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Trial', key: 'trial', color: '#d97706', bg: '#fffbeb' },
            { label: 'Suspended', key: 'suspended', color: '#dc2626', bg: '#fff5f5' },
            { label: 'Terminated', key: 'terminated', color: '#6b7280', bg: '#f9fafb' },
          ].map(({ label, key, color, bg }) => {
            const val = stats?.[key] || 0
            const total = stats?.total || 1
            const pct = Math.round((val / total) * 100)
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-20">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{val}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}