import { Loader2 } from 'lucide-react'

// ── Badge ─────────────────────────────────────────────────────────────────────
const colorMap = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  navy:   'bg-navy text-white',
}

export function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`badge ${colorMap[color] || ''} ${className}`}>
      {children}
    </span>
  )
}

// ── Loader ────────────────────────────────────────────────────────────────────
export default function Loader({ text = 'Loading…', size = 18 }) {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-400">
      <Loader2 size={size} className="animate-spin text-navy" />
      {text && <p className="text-xs">{text}</p>}
    </div>
  )
}