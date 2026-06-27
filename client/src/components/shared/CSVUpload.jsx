// client/src/components/shared/CSVUpload.jsx

import { useRef, useState } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import Button from '../ui/Button'

export default function CSVUpload({ onUpload, onDownloadTemplate, loading }) {
  const fileRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setResult(null)
    setError(null)
    setUploading(true)
    try {
      const res = await onUpload(file)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600">
          Upload a CSV matching the required format. All rows must be valid — if
          any row fails, nothing is imported.
        </p>
        {onDownloadTemplate && (
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={onDownloadTemplate}
            className="shrink-0"
          >
            Template
          </Button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-navy bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files[0])
        }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">
          Drag &amp; drop a CSV file here, or click to select
        </p>
        <p className="text-xs text-gray-400 mt-1">Max 5 MB · .csv only</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Uploading spinner */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          Uploading and validating…
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              {result.message || 'Import successful'}
            </p>
            {result.data?.imported && (
              <p className="text-xs text-green-600 mt-0.5">
                {result.data.imported} records imported
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Import failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}