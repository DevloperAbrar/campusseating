import { Users, GraduationCap, Building2, ClipboardList, Clock } from 'lucide-react'
import { useFetch } from '../../hooks'
import { dashboardAPI } from '../../api'
import { StatCard } from '../../components/shared/index.jsx'
import { Badge } from '../../components/ui/Loader'
import { fmtDateTime, examStatusColor } from '../../utils'
import Loader from '../../components/ui/Loader'

export default function Dashboard() {
  const { data, loading } = useFetch(dashboardAPI.get)

  if (loading) return <div className="flex justify-center py-20"><Loader text="Loading dashboard…" /></div>

  const stats = data?.stats || {}
  const byStatus = data?.examsByStatus || {}
  const logs = data?.recentActivity || []

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, Admin</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={stats.students?.toLocaleString()} icon={GraduationCap} color="navy" />
        <StatCard title="Faculty" value={stats.faculty?.toLocaleString()} icon={Users} color="blue" />
        <StatCard title="Rooms" value={stats.rooms?.toLocaleString()} icon={Building2} color="green" />
        <StatCard title="Exams" value={stats.exams?.toLocaleString()} icon={ClipboardList} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams by status */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Exams by Status</h2>
          <div className="space-y-3">
            {['draft', 'published', 'ongoing', 'completed'].map((s) => (
              <div key={s} className="flex items-center justify-between">
                <Badge className={examStatusColor[s]}>{s}</Badge>
                <span className="text-sm font-semibold text-gray-700">{byStatus[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-gray-400" />
            Recent Activity
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-navy mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(log.performedAt)}</p>
                  </div>
                  <span className="badge bg-gray-100 text-gray-600 text-xs shrink-0">{log.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}