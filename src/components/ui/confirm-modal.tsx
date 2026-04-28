'use client'

import { Modal } from './modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  isPending?: boolean
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm Delete', message, isPending }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <p className="mb-5 text-sm text-gray-600">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isPending}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
