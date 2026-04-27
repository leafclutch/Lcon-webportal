'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { createAnnouncement, deleteAnnouncement } from '@/actions/announcements'
import { saveAttachments } from '@/actions/attachments'
import { formatRelative } from '@/lib/utils'
import { Plus, Megaphone, Trash2 } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface Announcement {
  id: string; title: string; content: string; created_at: string;
  author: User
}

export function AnnouncementsClient({ announcements, canCreate, currentUserId, canUpload }: {
  announcements: Announcement[]; canCreate: boolean; currentUserId: string; canUpload: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetModal = () => {
    setShowModal(false)
    setTitle('')
    setContent('')
    setAttachments([])
    setError(null)
  }

  const handleCreate = () => {
    if (!title || !content) { setError('All fields required'); return }
    if (attachments.some(a => a.uploading)) return

    startTransition(async () => {
      const res = await createAnnouncement({ title, content })
      if (res.success) {
        if (attachments.length) {
          await saveAttachments(
            attachments.map(a => ({
              entity_type: 'announcement' as const,
              entity_id: res.data.id,
              type: a.type,
              name: a.name,
              url: a.url,
              mime_type: a.mimeType,
              size_bytes: a.sizeBytes,
            }))
          )
        }
        resetModal()
      } else {
        setError(res.error)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteAnnouncement(id) })
  }

  const canPost = !!title && !!content && !attachments.some(a => a.uploading)

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus size={16} /> New Announcement
          </Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">No announcements</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <Megaphone size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{a.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar name={a.author.name} src={a.author.avatar_url} size="sm" />
                        <span className="text-xs text-gray-400">{a.author.name} · {formatRelative(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {canCreate && (
                    <button onClick={() => handleDelete(a.id)} disabled={isPending}
                      className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={resetModal} title="New Announcement" className="max-w-lg">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
          {canUpload ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Content &amp; Attachments</label>
              <RichInput
                value={content}
                onChange={setContent}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                placeholder="What do you want to announce?"
                disabled={isPending}
                rows={4}
              />
            </div>
          ) : (
            <Textarea label="Content" value={content} onChange={e => setContent(e.target.value)} placeholder="What do you want to announce?" className="min-h-[120px]" />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} disabled={!canPost} className="flex-1">Post Announcement</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
