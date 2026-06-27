import { Navigate, Route, Routes } from 'react-router-dom'
import useStore from '../store'

import AdminLayout from '../components/layout/AdminLayout'
import PublicLayout from '../pages/public/PublicLayout'

import Login from '../pages/auth/Login'
import Dashboard from '../pages/admin/Dashboard'
import Academic from '../pages/admin/Academic'
import Students from '../pages/admin/Students'
import Faculty from '../pages/admin/Faculty'
import Rooms from '../pages/admin/Rooms'
import Exams from '../pages/admin/Exams'
import ExamDetail from '../pages/admin/ExamDetail'
import SeatingPlan from '../pages/admin/SeatingPlan'

import StudentLookup from '../pages/public/StudentLookup'
import FacultyLookup from '../pages/public/FacultyLookup'

function RequireAuth({ children }) {
  const { admin, authLoading } = useStore()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return admin ? children : <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public lookup routes */}
      <Route element={<PublicLayout />}>
        <Route path="/lookup/student" element={<StudentLookup />} />
        <Route path="/lookup/faculty" element={<FacultyLookup />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Admin routes — protected */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="academic" element={<Academic />} />
        <Route path="students" element={<Students />} />
        <Route path="faculty" element={<Faculty />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:examId" element={<ExamDetail />} />
        <Route path="exams/:examId/seating" element={<SeatingPlan />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/lookup/student" replace />} />
      <Route path="*" element={<Navigate to="/lookup/student" replace />} />
    </Routes>
  )
}