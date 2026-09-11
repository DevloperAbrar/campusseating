import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
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

import SuperAdminLogin from '../pages/superadmin/SuperAdminLogin'
import SuperAdminLayout from '../pages/superadmin/SuperAdminLayout'
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import Colleges from '../pages/superadmin/Colleges'
import CollegeDetail from '../pages/superadmin/CollegeDetail'

function RequireAuth({ children }) {
  const { admin, authLoading } = useStore()
  if (authLoading) return <Spinner />
  return admin ? children : <Navigate to="/login" replace />
}

function RequireSuperAdmin({ children }) {
  const { superAdmin, superAdminLoading, checkSuperAdmin } = useStore()

  useEffect(() => {
    if (superAdminLoading) checkSuperAdmin()
  }, [])

  if (superAdminLoading) return <Spinner />
  return superAdmin ? children : <Navigate to="/superadmin/login" replace />
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public lookup routes */}
      <Route element={<PublicLayout />}>
        <Route path="/lookup/student" element={<StudentLookup />} />
        <Route path="/lookup/faculty" element={<FacultyLookup />} />
      </Route>

      {/* Admin auth */}
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

      {/* Super Admin auth */}
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />

      {/* Super Admin routes — protected */}
      <Route
        path="/superadmin"
        element={
          <RequireSuperAdmin>
            <SuperAdminLayout />
          </RequireSuperAdmin>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="colleges" element={<Colleges />} />
        <Route path="colleges/:id" element={<CollegeDetail />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/lookup/student" replace />} />
      <Route path="*" element={<Navigate to="/lookup/student" replace />} />
    </Routes>
  )
}