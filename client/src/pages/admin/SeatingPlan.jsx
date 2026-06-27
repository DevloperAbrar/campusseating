import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Zap, Eye, Globe, RotateCcw, EyeOff,
  Download, FileDown, AlertTriangle, CheckCircle2,
  Tag, ChevronDown, FileText, X, Package,
} from 'lucide-react'
import { useFetch, useMutation, useDownload } from '../../hooks'
import { shiftsAPI, seatingAPI, pdfAPI } from '../../api'
import { Badge } from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import { ConfirmModal } from '../../components/shared/index.jsx'
import SeatingPreview from '../../components/exam/SeatingPreview'
import Loader from '../../components/ui/Loader'

// ── Label variant dropdown ───────────────────────────────────────────────────
function LabelDropdown({ label, onDetailed, onSimple, loading }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Tag size={12} />
        <span>{label}</span>
        <ChevronDown size={11} className="text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 text-sm">
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-0.5"
              onClick={() => { setOpen(false); onDetailed() }}
            >
              <span className="font-medium text-gray-800 text-xs">Detailed</span>
              <span className="text-gray-400" style={{fontSize:'11px'}}>No · Name · Branch</span>
            </button>
            <div className="border-t border-gray-100" />
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-0.5"
              onClick={() => { setOpen(false); onSimple() }}
            >
              <span className="font-medium text-gray-800 text-xs">Simple</span>
              <span className="text-gray-400" style={{fontSize:'11px'}}>Seat no only · saves paper</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── PDF Drawer ───────────────────────────────────────────────────────────────
function PDFDrawer({ open, onClose, activeShift, examId, previewData, dlLoading, download }) {
  if (!open) return null

  const shiftName = activeShift?.name || 'shift'

  const downloadAllRooms = (mode) =>
    mode === 'zip'
      ? download(() => pdfAPI.allRoomsPDF(examId, activeShift._id), `room_charts_${shiftName}.zip`)
      : download(() => pdfAPI.allRoomsMergedPDF(examId, activeShift._id), `all_rooms_${shiftName}.pdf`)

  const downloadRoom = (roomId, roomName) =>
    download(() => pdfAPI.roomPDF(examId, activeShift._id, roomId), `${roomName.replace(/\s+/g, '_')}_seating.pdf`)

  const downloadAllLabels = (variant, mode) =>
    mode === 'zip'
      ? download(() => pdfAPI.allRoomsLabelsPDF(examId, activeShift._id, variant), `seat_labels_${variant}_${shiftName}.zip`)
      : download(() => pdfAPI.allRoomsLabelsMergedPDF(examId, activeShift._id, variant), `all_labels_${variant}_${shiftName}.pdf`)

  const downloadRoomLabels = (roomId, roomName, variant) =>
    download(() => pdfAPI.roomLabelsPDF(examId, activeShift._id, roomId, variant), `${roomName.replace(/\s+/g, '_')}_labels_${variant}.pdf`)

  const downloadFacultyDuty = () =>
    download(() => pdfAPI.facultyDutyPDF(examId), 'faculty_duty.pdf')

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl">

        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-navy" />
            <span className="font-semibold text-gray-800 text-sm">Download PDFs</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── Faculty duty ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Faculty</p>
            <button
              onClick={downloadFacultyDuty}
              disabled={dlLoading}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-left disabled:opacity-50"
            >
              <FileDown size={14} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-800">Faculty duty chart</p>
                <p className="text-gray-400" style={{fontSize:'11px'}}>All shifts · all rooms</p>
              </div>
            </button>
          </div>

          {/* ── Room chart PDFs ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Room Charts</p>
            {/* Bulk options */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => downloadAllRooms('pdf')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <FileDown size={12} />
                All · One PDF
              </button>
              <button
                onClick={() => downloadAllRooms('zip')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <Package size={12} />
                All · ZIP
              </button>
            </div>
            <div className="space-y-1">
              {previewData?.map(rd => (
                <button
                  key={rd.room?._id}
                  onClick={() => downloadRoom(rd.room._id, rd.room.name)}
                  disabled={dlLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-left disabled:opacity-50"
                >
                  <FileDown size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{rd.room?.name}</span>
                  {rd.room?.building && <span className="text-gray-400 ml-auto" style={{fontSize:'11px'}}>{rd.room.building}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Seat label PDFs ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Seat Labels</p>
            </div>
            <p className="text-gray-400 mb-2" style={{fontSize:'11px'}}>Print &amp; paste on desks</p>

            {/* Bulk download — Detailed */}
            <p className="text-xs text-gray-500 font-medium mb-1">Detailed <span className="text-gray-400 font-normal">(no · name · branch)</span></p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => downloadAllLabels('detailed', 'pdf')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <FileDown size={12} />
                All · One PDF
              </button>
              <button
                onClick={() => downloadAllLabels('detailed', 'zip')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <Package size={12} />
                All · ZIP
              </button>
            </div>
            {/* Bulk download — Simple */}
            <p className="text-xs text-gray-500 font-medium mb-1">Simple <span className="text-gray-400 font-normal">(seat no only · saves paper)</span></p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => downloadAllLabels('simple', 'pdf')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <FileDown size={12} />
                All · One PDF
              </button>
              <button
                onClick={() => downloadAllLabels('simple', 'zip')}
                disabled={dlLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                <Package size={12} />
                All · ZIP
              </button>
            </div>

            {/* Per-room label dropdowns */}
            <div className="space-y-1">
              {previewData?.map(rd => (
                <div key={rd.room?._id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
                  <Tag size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 flex-1">{rd.room?.name}</span>
                  <LabelDropdown
                    label="Download"
                    loading={dlLoading}
                    onDetailed={() => downloadRoomLabels(rd.room._id, rd.room.name, 'detailed')}
                    onSimple={() => downloadRoomLabels(rd.room._id, rd.room.name, 'simple')}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Detailed = seat no · name · branch &nbsp;|&nbsp; Simple = seat no only
          </p>
        </div>
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SeatingPlan() {
  const { examId } = useParams()
  const [activeShiftId, setActiveShiftId] = useState(null)
  const [generateResult, setGenerateResult] = useState(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pdfDrawerOpen, setPdfDrawerOpen] = useState(false)
  const { mutate, loading: ml } = useMutation()
  const { download, loading: dlLoading } = useDownload()

  const { data: shifts, loading: shLoading, refetch: refetchShifts } = useFetch(
    () => shiftsAPI.list(examId), [examId]
  )
  const activeShift = (shifts || []).find(s => s._id === activeShiftId) || shifts?.[0]

  const { data: previewData, loading: previewLoading, refetch: refetchPreview } = useFetch(
    () => activeShift ? seatingAPI.preview(examId, activeShift._id) : Promise.resolve({ data: { data: [] } }),
    [activeShift?._id]
  )

  const handleGenerate = async () => {
    setGenerateResult(null)
    try {
      const res = await mutate(() => seatingAPI.generate(examId, activeShift._id), { successMsg: 'Seating plan generated!' })
      setGenerateResult(res.data)
      refetchShifts()
      refetchPreview()
    } catch {}
  }

  const handlePublish = () =>
    mutate(() => seatingAPI.publish(examId, activeShift._id), {
      successMsg: 'Seating plan published!',
      onSuccess: () => { setConfirmPublish(false); refetchShifts() },
    })

  const handleUnpublish = () =>
    mutate(() => seatingAPI.unpublish(examId, activeShift._id), {
      successMsg: 'Seating plan unpublished',
      onSuccess: () => { setConfirmUnpublish(false); refetchShifts() },
    })

  const handleReset = () =>
    mutate(() => seatingAPI.reset(examId, activeShift._id), {
      successMsg: 'Seating plan reset',
      onSuccess: () => { setConfirmReset(false); setGenerateResult(null); refetchShifts(); refetchPreview() },
    })

  if (shLoading) return <div className="flex justify-center py-20"><Loader text="Loading shifts…" /></div>

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <Link to={`/admin/exams/${examId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={14} /> Back to Exam
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="page-title">Seating Plan</h1>
          {activeShift?.planGenerated && (
            <Button
              variant="secondary"
              icon={FileDown}
              size="sm"
              onClick={() => setPdfDrawerOpen(true)}
            >
              Download PDFs
            </Button>
          )}
        </div>
      </div>

      {/* Shift selector */}
      {shifts?.length > 0 ? (
        <div className="card p-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium mr-2">Shift:</span>
          {shifts.map(s => (
            <button
              key={s._id}
              onClick={() => { setActiveShiftId(s._id); setGenerateResult(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2
                ${activeShift?._id === s._id ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}
            >
              {s.name}
              {s.isPublished && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-gray-400 text-sm">
          No shifts found. <Link to={`/admin/exams/${examId}`} className="text-navy underline">Add a shift</Link> first.
        </div>
      )}

      {activeShift && (
        <>
          {/* Status + Controls */}
          <div className="card p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-800">{activeShift.name} Shift</h2>
                  {activeShift.isPublished
                    ? <Badge color="green">Published</Badge>
                    : activeShift.planGenerated
                      ? <Badge color="amber">Plan Ready</Badge>
                      : <Badge color="gray">Not Generated</Badge>}
                </div>
                <p className="text-sm text-gray-500">
                  {activeShift.startTime} – {activeShift.endTime} · {activeShift.totalStudents || 0} students · {activeShift.totalAvailableSeats || 0} seats
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!activeShift.isPublished && (
                  <Button icon={Zap} onClick={handleGenerate} loading={ml} disabled={!activeShift.studentIds?.length}>
                    {activeShift.planGenerated ? 'Regenerate' : 'Generate Plan'}
                  </Button>
                )}
                {activeShift.planGenerated && !activeShift.isPublished && (
                  <>
                    <Button icon={Globe} variant="secondary" onClick={() => setConfirmPublish(true)}>Publish</Button>
                    <Button icon={RotateCcw} variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>Reset</Button>
                  </>
                )}
                {activeShift.isPublished && (
                  <Button icon={EyeOff} variant="secondary" onClick={() => setConfirmUnpublish(true)}>Unpublish</Button>
                )}
              </div>
            </div>
            {!activeShift.studentIds?.length && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14} />
                Students not resolved yet. Go to <Link to={`/admin/exams/${examId}`} className="underline font-medium">Exam Detail</Link> and click "Resolve Students".
              </div>
            )}
          </div>

          {/* Generate result */}
          {generateResult && (
            <div className={`card p-4 ${generateResult.unassigned > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-start gap-3">
                {generateResult.unassigned > 0
                  ? <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  : <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium text-sm">
                    {generateResult.assigned} students assigned
                    {generateResult.unassigned > 0 && `, ${generateResult.unassigned} could not be seated`}
                  </p>
                  {generateResult.unassignedStudents?.slice(0, 5).map(s => (
                    <p key={s.id} className="text-xs text-red-700">✗ {s.name} ({s.enrollmentNo})</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Seating Preview section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <Eye size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Seating Preview</h2>
              <span className="text-xs text-gray-400">(click two students to swap seats)</span>
            </div>
            {previewLoading ? (
              <div className="flex justify-center py-10"><Loader /></div>
            ) : (
              <SeatingPreview
                data={previewData || []}
                examId={examId}
                shiftId={activeShift._id}
                onRefresh={refetchPreview}
              />
            )}
          </div>
        </>
      )}

      {/* PDF Drawer */}
      <PDFDrawer
        open={pdfDrawerOpen}
        onClose={() => setPdfDrawerOpen(false)}
        activeShift={activeShift}
        examId={examId}
        previewData={previewData}
        dlLoading={dlLoading}
        download={download}
      />

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={confirmPublish} onClose={() => setConfirmPublish(false)} onConfirm={handlePublish} loading={ml}
        title="Publish Seating Plan"
        message="Publishing makes seat assignments visible to students and faculty via public lookup."
        confirmLabel="Publish" variant="primary"
      />
      <ConfirmModal
        isOpen={confirmUnpublish} onClose={() => setConfirmUnpublish(false)} onConfirm={handleUnpublish} loading={ml}
        title="Unpublish Seating Plan"
        message="Seats will no longer be visible to students. The plan is preserved — you can republish it anytime."
        confirmLabel="Unpublish" variant="secondary"
      />
      <ConfirmModal
        isOpen={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={handleReset} loading={ml}
        title="Reset Seating Plan"
        message="All seat assignments for this shift will be deleted. This cannot be undone."
        confirmLabel="Reset"
      />
    </div>
  )
}