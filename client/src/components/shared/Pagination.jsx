// client/src/components/shared/Pagination.jsx

import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null

  // Build visible page numbers — show at most 7, with ellipsis logic
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    // Always show first, last, current ± 1
    const set = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages))
    const sorted = [...set].sort((a, b) => a - b)
    // Insert ellipsis markers (null) where gaps > 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push(null)
      pages.push(sorted[i])
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="w-7 text-center text-gray-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors
                ${page === p
                  ? 'bg-navy text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}