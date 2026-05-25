'use client'

import { useCallback } from 'react'
import { Paperclip, X, Loader2, FileText, File, Image } from 'lucide-react'
import { uploadToStorage } from '@/actions/attachments'

export interface PendingAttachment {
  id: string
  type: 'file' | 'voice' | 'link' | 'image'
  name: string
  url: string
  mimeType?: string
  sizeBytes?: number
  uploading?: boolean
  error?: string
}

interface RichInputProps {
  value: string
  onChange: (val: string) => void
  attachments: PendingAttachment[]
  onAttachmentsChange: (a: PendingAttachment[]) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  className?: string
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentIcon({ mimeType }: { mimeType?: string }) {
  if (!mimeType) return <File size={14} />
  if (mimeType.startsWith('image/')) return <Image size={14} />
  if (mimeType.includes('pdf') || mimeType.includes('text')) return <FileText size={14} />
  return <File size={14} />
}

export function RichInput({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSubmit,
  placeholder = 'Write something…',
  disabled = false,
  rows = 3,
  className = '',
}: RichInputProps) {
  // Use functional updates to avoid stale closure issues with async uploads
  const set = onAttachmentsChange as unknown as React.Dispatch<React.SetStateAction<PendingAttachment[]>>

  const removeAttachment = useCallback((id: string) => {
    set(prev => prev.filter(a => a.id !== id))
  }, [set])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    for (const file of files) {
      const id = uid()
      const isImage = file.type.startsWith('image/')
      set(prev => [...prev, { id, type: isImage ? 'image' : 'file', name: file.name, url: '', uploading: true }])

      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadToStorage(fd)

      set(prev => prev.map(a => a.id !== id ? a : res.success
        ? { ...a, url: res.data.url, mimeType: res.data.mimeType, sizeBytes: res.data.sizeBytes, uploading: false }
        : { ...a, uploading: false, error: res.error }
      ))
    }
  }

  const allUploaded = attachments.every(a => !a.uploading)

  return (
    <div className={`rounded-xl border border-gray-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${className}`}>
      {/* Textarea */}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none rounded-t-xl border-0 bg-transparent px-3 pt-3 pb-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />

      {/* Pending attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {attachments.map(a => (
            <div key={a.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
              a.error ? 'border-red-200 bg-red-50 text-red-600' :
              a.uploading ? 'border-gray-200 bg-gray-50 text-gray-500' :
              'border-indigo-200 bg-indigo-50 text-indigo-700'
            }`}>
              {a.uploading ? <Loader2 size={12} className="animate-spin" /> : <AttachmentIcon mimeType={a.mimeType} />}
              <span className="max-w-[140px] truncate">
                {a.error ? a.error : a.uploading ? 'Uploading…' : a.name}
              </span>
              {a.sizeBytes && !a.uploading && (
                <span className="text-[10px] opacity-70">({formatBytes(a.sizeBytes)})</span>
              )}
              <button type="button" onClick={() => removeAttachment(a.id)} className="ml-0.5 rounded text-current opacity-60 hover:opacity-100">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 rounded-b-xl border-t border-gray-100 px-2 py-1.5">
        {/* File picker — label wraps input so mobile browsers open picker reliably */}
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
          <Paperclip size={14} />
          <span>File</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.csv"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChange}
          />
        </label>

        {!allUploaded && (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            Uploading…
          </span>
        )}
      </div>
    </div>
  )
}
