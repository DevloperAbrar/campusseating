// client/src/components/shared/StatCard.jsx

const iconBg = {
  navy:   'bg-navy/10 text-navy',
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  amber:  'bg-amber-100 text-amber-600',
  red:    'bg-red-100 text-red-600',
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'navy',
  subtitle,
  trend,          // optional: "+12 this month"
}) {
  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      {/* Icon badge */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[color] || iconBg.navy}`}>
        {Icon && <Icon size={18} />}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {value ?? <span className="text-gray-300">—</span>}
        </p>
        {(subtitle || trend) && (
          <p className="text-xs text-gray-400 mt-1 truncate">{trend || subtitle}</p>
        )}
      </div>
    </div>
  )
}