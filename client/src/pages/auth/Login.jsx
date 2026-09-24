import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import useStore from '../../store'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

export default function Login() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/admin/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials'
      setError('root', { message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden px-12"
        style={{ background: 'linear-gradient(145deg, #0d1f4e 0%, #1a3a7c 50%, #0d1f4e 100%)' }}>

        {/* decorative blobs */}
        <div className="absolute w-72 h-72 rounded-full opacity-10 -top-16 -left-16"
          style={{ background: '#f97316' }} />
        <div className="absolute w-96 h-96 rounded-full opacity-10 -bottom-24 -right-24"
          style={{ background: '#1e4fa3' }} />
        <div className="absolute w-48 h-48 rounded-full opacity-10 bottom-32 left-8"
          style={{ background: '#f97316' }} />

        {/* content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <img src={logo} alt="CampusSeating" className="h-20 w-auto object-contain mb-10" />

          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Exam Seating<br />Management System
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-xs">
            Automate seating plans, assign invigilators, and generate printable PDFs in minutes.
          </p>

          {/* feature pills */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[
              'Generate seating plans instantly',
              'Branch-wise mixing algorithm',
              'Print-ready PDF seat labels',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">

          {/* mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={logo} alt="CampusSeating" className="h-14 w-auto object-contain" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-6">
              Sign in to your admin account
            </p>

            {/* secure badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-6"
              style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              <ShieldCheck size={15} />
              Secured admin access — credentials only
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="admin@college.edu"
                    autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-all"
                    style={{
                      borderColor: errors.email ? '#fca5a5' : '#e5e7eb',
                      background: errors.email ? '#fff5f5' : '#fff',
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a3a7c'}
                    onBlur={e => e.target.style.borderColor = errors.email ? '#fca5a5' : '#e5e7eb'}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                    })}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border outline-none transition-all"
                    style={{
                      borderColor: errors.password ? '#fca5a5' : '#e5e7eb',
                      background: errors.password ? '#fff5f5' : '#fff',
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a3a7c'}
                    onBlur={e => e.target.style.borderColor = errors.password ? '#fca5a5' : '#e5e7eb'}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {errors.root && (
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {errors.root.message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-opacity disabled:opacity-70 mt-1"
                style={{ background: 'linear-gradient(90deg, #f97316, #ea6c0a)' }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            {/* public links */}
            <div className="flex gap-4 mt-6 pt-5 border-t border-gray-100">
              <a href="/lookup/student"
                className="flex-1 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
                Student Lookup
              </a>
              <a href="/lookup/faculty"
                className="flex-1 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
                Faculty Duty
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            CampusSeating · Exam Seating Management System
          </p>
        </div>
      </div>
    </div>
  )
}