'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, Link2, Mic, MicOff, X, Loader2, FileText, File, Image } from 'lucide-react'
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
  placeholder = 'Write something…',
  disabled = false,
  rows = 3,
  className = '',
}: RichInputProps) {
  const [linkMode, setLinkMode] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const addAttachment = useCallback((a: PendingAttachment) => {
    onAttachmentsChange([...attachments, a])
  }, [attachments, onAttachmentsChange])

  const updateAttachment = useCallback((id: string, patch: Partial<PendingAttachment>) => {
    onAttachmentsChange(attachments.map(a => a.id === id ? { ...a, ...patch } : a))
  }, [attachments, onAttachmentsChange])

  const removeAttachment = useCallback((id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id))
  }, [attachments, onAttachmentsChange])

  // ---------- File picker ----------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    for (const file of files) {
      const id = uid()
      const isImage = file.type.startsWith('image/')
      addAttachment({ id, type: isImage ? 'image' : 'file', name: file.name, url: '', uploading: true })

      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadToStorage(fd)

      if (res.success) {
        updateAttachment(id, {
          url: res.data.url,
          mimeType: res.data.mimeType,
          sizeBytes: res.data.sizeBytes,
          uploading: false,
        })
      } else {
        updateAttachment(id, { uploading: false, error: res.error })
      }
    }
  }

  // ---------- Link ----------
  const handleAddLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    let finalUrl = url
    if (!/^https?:\/\//i.test(url)) finalUrl = `https://${url}`
    addAttachment({
      id: uid(),
      type: 'link',
      name: linkName.trim() || finalUrl,
      url: finalUrl,
    })
    setLinkUrl('')
    setLinkName('')
    setLinkMode(false)
  }

  // ---------- Voice ----------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        setRecordSeconds(0)

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const id = uid()
        const name = `voice-${new Date().toISOString().slice(0, 19)}.webm`
        addAttachment({ id, type: 'voice', name, url: '', uploading: true })

        const fd = new FormData()
        fd.append('file', blob, name)
        const res = await uploadToStorage(fd)

        if (res.success) {
          updateAttachment(id, { url: res.data.url, mimeType: 'audio/webm', uploading: false })
        } else {
          updateAttachment(id, { uploading: false, error: res.error })
        }
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch {
      // User denied microphone or not supported
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
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
      />

      {/* Pending attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {attachments.map(a => (
            <div
              key={a.id}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                a.error ? 'border-red-200 bg-red-50 text-red-600' :
                a.uploading ? 'border-gray-200 bg-gray-50 text-gray-500' :
                a.type === 'voice' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                a.type === 'link' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                'border-indigo-200 bg-indigo-50 text-indigo-700'
              }`}
            >
              {a.uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : a.type === 'voice' ? (
                <span>🎤</span>
              ) : a.type === 'link' ? (
                <Link2 size={12} />
              ) : (
                <AttachmentIcon mimeType={a.mimeType} />
              )}
              <span className="max-w-[140px] truncate">
                {a.error ? a.error : a.uploading ? 'Uploading…' : a.name}
              </span>
              {a.sizeBytes && !a.uploading && (
                <span className="text-[10px] opacity-70">({formatBytes(a.sizeBytes)})</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="ml-0.5 rounded text-current opacity-60 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link input row */}
      {linkMode && (
        <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink() } }}
            autoFocus
          />
          <input
            value={linkName}
            onChange={e => setLinkName(e.target.value)}
            placeholder="Label (optional)"
            className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddLink}
            className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Add
          </button>
          <button type="button" onClick={() => setLinkMode(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 rounded-b-xl border-t border-gray-100 px-2 py-1.5">
        {/* File picker */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || recording}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          title="Attach file"
        >
          <Paperclip size={14} />
          <span>File</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Link */}
        <button
          type="button"
          onClick={() => setLinkMode(l => !l)}
          disabled={disabled || recording}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-40 ${linkMode ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          title="Attach link"
        >
          <Link2 size={14} />
          <span>Link</span>
        </button>

        {/* Voice recorder */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs disabled:opacity-40 ${
            recording
              ? 'animate-pulse bg-red-50 text-red-600 hover:bg-red-100'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
          title={recording ? 'Stop recording' : 'Record voice'}
        >
          {recording ? (
            <>
              <MicOff size={14} />
              <span>{String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}</span>
            </>
          ) : (
            <>
              <Mic size={14} />
              <span>Voice</span>
            </>
          )}
        </button>

        {/* Upload indicator */}
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
