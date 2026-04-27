'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { sendMessage } from '@/actions/messages'
import { saveAttachments } from '@/actions/attachments'
import { formatRelative } from '@/lib/utils'
import { Send, MessageCircle, FileText, Link2, File, Image } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; avatar_url: string | null }
interface MsgAttachment { id: string; entity_id: string; type: string; name: string; url: string; mime_type: string | null }
interface Message {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  voice_url: string | null; is_read: boolean; created_at: string;
  sender: User; attachments: MsgAttachment[]
}

function AttachmentPreview({ a }: { a: MsgAttachment }) {
  if (a.type === 'voice' || (a.mime_type?.startsWith('audio/'))) {
    return <audio controls src={a.url} className="h-8 max-w-[220px]" />
  }
  if (a.type === 'image' || a.mime_type?.startsWith('image/')) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer">
        <img src={a.url} alt={a.name} className="mt-1 max-h-48 max-w-[220px] rounded-lg object-cover" />
      </a>
    )
  }
  const Icon = a.type === 'link' ? Link2 : a.mime_type?.includes('pdf') ? FileText : File
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-current/20 bg-current/5 px-2 py-1 text-xs hover:bg-current/10"
    >
      <Icon size={12} />
      <span className="max-w-[160px] truncate">{a.name}</span>
    </a>
  )
}

export function MessagesClient({
  users, messages, currentUserId, canUpload,
}: {
  users: User[]; messages: Message[]; currentUserId: string; canUpload: boolean
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversation = selectedUser
    ? messages.filter(m =>
        (m.sender_id === currentUserId && m.receiver_id === selectedUser.id) ||
        (m.sender_id === selectedUser.id && m.receiver_id === currentUserId)
      ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.length])

  const handleSend = () => {
    if ((!text.trim() && !attachments.length) || !selectedUser) return
    if (attachments.some(a => a.uploading)) return

    // Find first voice attachment to set as voice_url
    const voiceAtt = attachments.find(a => a.type === 'voice')
    const fileAtts = attachments.filter(a => a.type !== 'voice' || a !== voiceAtt)

    startTransition(async () => {
      const res = await sendMessage({
        receiver_id: selectedUser.id,
        content: text.trim() || undefined,
        voice_url: voiceAtt?.url,
      })

      if (res.success && fileAtts.length) {
        await saveAttachments(
          fileAtts.map(a => ({
            entity_type: 'message' as const,
            entity_id: res.data.id,
            type: a.type,
            name: a.name,
            url: a.url,
            mime_type: a.mimeType,
            size_bytes: a.sizeBytes,
          }))
        )
      }

      setText('')
      setAttachments([])
    })
  }

  const contactsWithLastMessage = users.map(u => {
    const msgs = messages.filter(m =>
      (m.sender_id === currentUserId && m.receiver_id === u.id) ||
      (m.sender_id === u.id && m.receiver_id === currentUserId)
    )
    const last = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    return { user: u, lastMessage: last }
  }).sort((a, b) => {
    if (!a.lastMessage) return 1
    if (!b.lastMessage) return -1
    return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
  })

  const canSend = (text.trim() || attachments.length > 0) && !attachments.some(a => a.uploading)

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Contacts sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-gray-100">
        <div className="border-b border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700">Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contactsWithLastMessage.map(({ user, lastMessage }) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                selectedUser?.id === user.id && 'bg-indigo-50'
              )}
            >
              <Avatar name={user.name} src={user.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                {lastMessage && (
                  <p className="truncate text-xs text-gray-500">
                    {lastMessage.voice_url ? '🎤 Voice message' : lastMessage.content ?? '📎 Attachment'}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {selectedUser ? (
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
              <Avatar name={selectedUser.name} src={selectedUser.avatar_url} />
              <p className="font-medium text-gray-900">{selectedUser.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversation.length === 0 && (
                <p className="text-center text-sm text-gray-400">No messages yet. Say hello!</p>
              )}
              {conversation.map(msg => (
                <div key={msg.id} className={cn('flex', msg.sender_id === currentUserId ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                    msg.sender_id === currentUserId
                      ? 'rounded-br-sm bg-indigo-600 text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900'
                  )}>
                    {msg.voice_url && <audio controls src={msg.voice_url} className="h-8 w-48" />}
                    {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                    {/* File/link/image attachments from attachments table */}
                    {msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map(a => (
                          <AttachmentPreview key={a.id} a={a} />
                        ))}
                      </div>
                    )}

                    <p className={cn('mt-1 text-right text-xs', msg.sender_id === currentUserId ? 'text-indigo-200' : 'text-gray-400')}>
                      {formatRelative(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-3">
              <div className="flex items-end gap-2">
                {canUpload ? (
                  <RichInput
                    value={text}
                    onChange={setText}
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                    placeholder="Type a message…"
                    disabled={isPending}
                    rows={1}
                    className="flex-1"
                  />
                ) : (
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    disabled={isPending}
                  />
                )}
                <Button
                  onClick={handleSend}
                  loading={isPending}
                  disabled={!canSend}
                  size="icon"
                  className="shrink-0"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <MessageCircle className="mb-3 h-12 w-12" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
