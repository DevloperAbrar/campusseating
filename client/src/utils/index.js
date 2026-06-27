import { format, parseISO } from 'date-fns'

// ── Date formatting ───────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return '—'
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'dd MMM yyyy') }
  catch { return '—' }
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'dd MMM yyyy, hh:mm a') }
  catch { return '—' }
}

export const toInputDate = (d) => {
  if (!d) return ''
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'yyyy-MM-dd') }
  catch { return '' }
}

// ── String helpers ────────────────────────────────────────────────────────────
export const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

export const truncate = (s, len = 30) => s && s.length > len ? s.slice(0, len) + '…' : s

export const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// ── Status badge colors ────────────────────────────────────────────────────────
export const examStatusColor = {
  draft:     'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-700',
  ongoing:   'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
}

export const seatStatusColor = {
  available:   'seat-available',
  blocked:     'seat-blocked',
  reserved:    'seat-reserved',
  invigilator: 'seat-invigilator',
}

// ── Error extraction ───────────────────────────────────────────────────────────
export const extractError = (err) => {
  const data = err?.response?.data
  if (!data) return 'An unexpected error occurred'
  if (data.errors?.length) return data.errors.map((e) => e.message).join(', ')
  return data.message || 'An unexpected error occurred'
}

// ── API pagination helper ──────────────────────────────────────────────────────
export const buildQuery = (params) => {
  const q = {}
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q[k] = v
  })
  return q
}

// ── Download blob ─────────────────────────────────────────────────────────────
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Year labels ───────────────────────────────────────────────────────────────
export const yearLabel = (y) => {
  const map = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year', 6: '6th Year' }
  return map[y] || `Year ${y}`
}

// ── Seat position sort ────────────────────────────────────────────────────────
export const sortSeats = (seats) =>
  [...seats].sort((a, b) => {
    if (a.row !== b.row) return a.row.localeCompare(b.row)
    if (a.bench !== b.bench) return a.bench - b.bench
    return a.position.localeCompare(b.position)
  })