import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Shield, LayoutDashboard, Building2, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import useStore from '../../store'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/superadmin/colleges',  icon: Building2,       label: 'Colleges'  },
]

export default function SuperAdminLayout() {
  const { superAdminLogout } = useStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await superAdminLogout()
    toast.success('Logged out')
    navigate('/superadmin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ background: '#1a0533', borderRight: '1px solid rgba(168,85,247,0.15)' }}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 overflow-hidden"
          style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(168,85,247,0.2)' }}>
            <Shield size={15} className="text-purple-300" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate leading-tight">CampusSeating</p>
              <p className="text-xs text-purple-400 truncate leading-tight">Super Admin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                 ${collapsed ? 'justify-center px-2' : ''}
                 ${isActive
                   ? 'text-white'
                   : 'text-purple-300 hover:text-white hover:bg-white/5'
                 }`
              }
              style={({ isActive }) => isActive ? { background: 'rgba(168,85,247,0.25)' } : {}}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
          {collapsed ? (
            <button onClick={handleLogout} title="Logout"
              className="w-full flex justify-center p-1.5 rounded-lg text-purple-400 hover:text-red-400 hover:bg-white/5 transition-colors">
              <LogOut size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(168,85,247,0.2)' }}>
                <Shield size={14} className="text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">Super Admin</p>
                <p className="text-xs text-purple-400">Platform Owner</p>
              </div>
              <button onClick={handleLogout} title="Logout"
                className="p-1.5 rounded-lg text-purple-400 hover:text-red-400 hover:bg-white/5 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
          <button onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-purple-500" />
            <span className="text-sm font-semibold text-gray-700">Super Admin Panel</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}