import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Users,
  Building2,
  ClipboardList,
  School,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import useStore from '../../store'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/academic', icon: School, label: 'Academic' },
  { to: '/admin/students', icon: GraduationCap, label: 'Students' },
  { to: '/admin/faculty', icon: Users, label: 'Faculty' },
  { to: '/admin/rooms', icon: Building2, label: 'Rooms' },
  { to: '/admin/exams', icon: ClipboardList, label: 'Exams' },
]

export default function AdminLayout() {
  const { admin, logout, sidebarOpen, toggleSidebar } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-white border-r border-gray-200 shrink-0 transition-all duration-200
          ${sidebarOpen ? 'w-64' : 'w-16'}
        `}
      >
     
     {/* Brand */}
<div className="flex flex-col items-center justify-center px-3 border-b border-gray-100 overflow-hidden"
  style={{ minHeight: '72px' }}>
  {sidebarOpen ? (
    <>
      <img
        src={logo}
        alt="CampusSeating"
        className="object-contain mb-1"
        style={{ maxHeight: '48px', maxWidth: '200px', width: '100%' }}
      />
      <p className="text-xs text-gray-400 truncate w-full text-center leading-tight">
        {import.meta.env.VITE_COLLEGE_NAME || 'CampusSafar College'}
      </p>
    </>
  ) : (
    <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
      <BookOpen size={15} className="text-white" />
    </div>
  )}
</div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-gray-100 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-navy">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{admin?.email}</p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}