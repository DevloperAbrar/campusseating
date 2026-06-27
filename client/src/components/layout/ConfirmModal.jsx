// client/src/components/shared/ConfirmModal.jsx

import { AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Delete',
  variant = 'danger',
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-red-500" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

          <div className="flex gap-3 mt-5 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant}
              size="sm"
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}