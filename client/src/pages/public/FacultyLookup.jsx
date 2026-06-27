import { useState } from 'react'
import { Search, MapPin, Clock, AlertCircle, UserCircle2, Building2, ClipboardList } from 'lucide-react'
import { lookupAPI } from '../../api'
import { fmtDate } from '../../utils'
import logo from '../../assets/logo.png'

export default function FacultyLookup() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    const val = input.trim().toLowerCase()
    if (!val) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await lookupAPI.faculty(val)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Faculty not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden px-12"
        style={{ background: 'linear-gradient(145deg, #0d1f4e 0%, #1a3a7c 50%, #0d1f4e 100%)' }}>

        <div className="absolute w-72 h-72 rounded-full opacity-10 -top-16 -left-16" style={{ background: '#f97316' }} />
        <div className="absolute w-96 h-96 rounded-full opacity-10 -bottom-24 -right-24" style={{ background: '#1e4fa3' }} />
        <div className="absolute w-48 h-48 rounded-full opacity-10 bottom-32 left-8" style={{ background: '#f97316' }} />

        <div className="relative z-10 flex flex-col items-center text-center">
          <img src={logo} alt="CampusSeating" className="h-20 w-auto object-contain mb-10" />
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Invigilator<br />Duty Lookup
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-10 max-w-xs">
            Enter your email to view your assigned exam duty — room, shift, and timing details at a glance.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[
              'View all duty assignments',
              'Room & building details',
              'Shift timing at a glance',
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Duty Lookup</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email to see your exam duty assignments</p>

            {/* Search */}
            <div className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border border-gray-200 outline-none bg-white transition-all"
                  placeholder="faculty@college.edu"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={e => e.target.style.borderColor = '#1a3a7c'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-70 transition-opacity"
                style={{ background: 'linear-gradient(90deg, #f97316, #ea6c0a)' }}
              >
                {loading ? '…' : 'Find'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-4">
                {/* Faculty info */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#1a3a7c' }}>
                    <UserCircle2 size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{result.faculty.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.faculty.designation} · {result.faculty.email}
                    </p>
                  </div>
                </div>

                {/* Duty assignments */}
                {result.dutyAssignments?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No published duty assignments found.
                  </p>
                ) : (
                  result.dutyAssignments.map((a, i) => (
                    <div key={i} className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid #e2e8f0' }}>

                      {/* Exam header */}
                      <div className="px-4 py-3" style={{ background: '#0d1f4e' }}>
                        <p className="font-semibold text-sm text-white">{a.exam}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {fmtDate(a.examDate)}
                        </p>
                      </div>

                      {/* Details */}
                      <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={13} className="text-gray-400 flex-shrink-0" />
                          <span><strong className="text-gray-800">{a.shift}</strong> — {a.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                          <span>{a.room}{a.building ? `, ${a.building}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span>{a.floor || 'Ground Floor'}</span>
                        </div>

                        {/* Duty badge */}
                        <div className="pt-1">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #f97316, #ea6c0a)' }}>
                            <ClipboardList size={14} className="text-white/80" />
                            <div>
                              <p className="text-xs text-white/70 uppercase tracking-wider font-semibold leading-none mb-0.5">Duty Room</p>
                              <p className="text-base font-bold text-white leading-tight">{a.room}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            CampusSeating · Exam Seating Management System
          </p>
        </div>
      </div>
    </div>
  )
}