'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { postDailyUpdate, postIdea, deleteUpdate, deleteIdea } from '@/actions/updates-ideas'
import { formatRelative } from '@/lib/utils'
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
}

export function FeedClient({ items, currentUserId, type, placeholder, emptyText }: FeedClientProps) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  const handlePost = () => {
    if (!content.trim()) return
    startTransition(async () => {
      const action = type === 'update' ? postDailyUpdate : postIdea
      const res = await action(content.trim())
      if (res.success) setContent('')
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const action = type === 'update' ? deleteUpdate : deleteIdea
      await action(id)
    })
  }

  const Icon = type === 'update' ? FileText : Lightbulb

  return (
    <div className="space-y-4">
      {/* Post box */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[80px] resize-none border-0 shadow-none focus:ring-0 p-0"
          />
          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <Button onClick={handlePost} loading={isPending} disabled={!content.trim()} size="sm">
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
                    <button onClick={() => handleDelete(item.id)} disabled={isPending}
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
    </div>
  )
}
