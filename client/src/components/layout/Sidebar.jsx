import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Users,
  Building2,
  ClipboardList,
  School,
  LogOut,
} from 'lucide-react'
import useStore from '../../store'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/academic',  icon: School,          label: 'Academic'  },
  { to: '/admin/students',  icon: GraduationCap,   label: 'Students'  },
  { to: '/admin/faculty',   icon: Users,           label: 'Faculty'   },
  { to: '/admin/rooms',     icon: Building2,       label: 'Rooms'     },
  { to: '/admin/exams',     icon: ClipboardList,   label: 'Exams'     },
]

export default function Sidebar({ collapsed }) {
  const { admin, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside
      className={`
        flex flex-col bg-white border-r border-gray-200 shrink-0
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
          <BookOpen size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">
              CampusSeating
            </p>
            <p className="text-xs text-gray-400 truncate leading-tight">
              {admin?.collegeName || 'Admin Portal'}
            </p>
          </div>
        )}
      </div>

      {/* ── Nav links ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `
              sidebar-link
              ${isActive ? 'active' : ''}
              ${collapsed ? 'justify-center px-2' : ''}
            `}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── User strip ────────────────────────────────────────── */}
      <div className="border-t border-gray-100 p-3">
        {collapsed ? (
          /* Collapsed: just the logout icon */
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full flex justify-center p-1.5 rounded-lg
              hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        ) : (
          /* Expanded: avatar + email + logout */
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-navy">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {admin?.email}
              </p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-red-50
                text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}