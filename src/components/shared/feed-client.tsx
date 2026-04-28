'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { postDailyUpdate, postIdea, deleteUpdate, deleteIdea } from '@/actions/updates-ideas'
import { saveAttachments } from '@/actions/attachments'
import { formatRelative } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Trash2, FileText, Lightbulb } from 'lucide-react'

interface FeedItem {
  id: string; content: string; created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | null
}

interface FeedClientProps {
  items: FeedItem[]
  currentUserId: string
  type: 'update' | 'idea'
  placeholder: string
  emptyText: string
  canUpload: boolean
}

export function FeedClient({ items, currentUserId, type, placeholder, emptyText, canUpload }: FeedClientProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canPost = (content.trim() || attachments.length > 0) && !attachments.some(a => a.uploading)

  const handlePost = () => {
    if (!canPost) return
    startTransition(async () => {
      const action = type === 'update' ? postDailyUpdate : postIdea
      const res = await action(content.trim())
      if (res.success) {
        if (attachments.length) {
          await saveAttachments(
            attachments.map(a => ({
              entity_type: (type === 'update' ? 'daily_update' : 'idea') as 'daily_update' | 'idea',
              entity_id: res.data.id,
              type: a.type,
              name: a.name,
              url: a.url,
              mime_type: a.mimeType,
              size_bytes: a.sizeBytes,
            }))
          )
        }
        setContent('')
        setAttachments([])
      }
    })
  }

  const handleDelete = () => {
    if (!confirmId) return
    startTransition(async () => {
      const action = type === 'update' ? deleteUpdate : deleteIdea
      await action(confirmId)
      setConfirmId(null)
    })
  }

  const Icon = type === 'update' ? FileText : Lightbulb

  return (
    <div className="space-y-4">
      {/* Post box */}
      <Card>
        <CardContent className="p-4">
          {canUpload ? (
            <RichInput
              value={content}
              onChange={setContent}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              placeholder={placeholder}
              disabled={isPending}
              rows={3}
            />
          ) : (
            <textarea
              placeholder={placeholder}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          )}
          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <Button onClick={handlePost} loading={isPending} disabled={!canPost} size="sm">
              Post {type === 'update' ? 'Update' : 'Idea'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">{emptyText}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={item.users?.name ?? '?'} src={item.users?.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.users?.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatRelative(item.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
                  </div>
                  {item.users?.id === currentUserId && (
                    <button onClick={() => setConfirmId(item.id)} disabled={isPending}
                      className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        message={`Delete this ${type === 'update' ? 'update' : 'idea'}? This cannot be undone.`}
        isPending={isPending}
      />
    </div>
  )
}
