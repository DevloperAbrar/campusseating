import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import useStore from '../../store'
import toast from 'react-hot-toast'

export default function SuperAdminLogin() {
  const { superAdminLogin } = useStore()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, setError } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      await superAdminLogin(email, password)
      toast.success('Welcome, Super Admin!')
      navigate('/superadmin/dashboard')
    } catch (err) {
      setError('root', { message: err.response?.data?.message || 'Invalid credentials' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden px-12"
        style={{ background: 'linear-gradient(145deg, #1a0533 0%, #3b0764 50%, #1a0533 100%)' }}
      >
        <div className="absolute w-72 h-72 rounded-full opacity-10 -top-16 -left-16" style={{ background: '#a855f7' }} />
        <div className="absolute w-96 h-96 rounded-full opacity-10 -bottom-24 -right-24" style={{ background: '#7c3aed' }} />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
            style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <Shield size={36} className="text-purple-300" />
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Super Admin<br />Control Panel
          </h2>
          <p className="text-purple-300 text-sm leading-relaxed mb-10 max-w-xs">
            Manage all colleges, subscriptions, and platform-wide settings from one place.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[
              'Onboard & manage colleges',
              'Renew / suspend subscriptions',
              'Platform-wide analytics',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#a855f7' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f3e8ff' }}>
                <Shield size={18} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Super Admin</h1>
                <p className="text-xs text-gray-400">Platform management access</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="superadmin@platform.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border border-gray-200 outline-none transition-all focus:border-purple-500"
                    {...register('email', { required: 'Email is required' })}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm border border-gray-200 outline-none transition-all focus:border-purple-500"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-opacity disabled:opacity-70 mt-1"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)' }}
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to College Admin Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}