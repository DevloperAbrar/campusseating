import { Outlet, Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy to-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm">CampusSeating</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link to="/lookup/student" className="text-white/60 hover:text-white transition-colors">
            Student Lookup
          </Link>
          <Link to="/lookup/faculty" className="text-white/60 hover:text-white transition-colors">
            Faculty Duty
          </Link>
          <Link to="/login" className="text-white/60 hover:text-white transition-colors">
            Admin
          </Link>
        </div>
      </header>
      <div className="flex justify-center items-start min-h-[calc(100vh-64px)] p-6">
        <Outlet />
      </div>
    </div>
  )
}