'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendMessage } from '@/actions/messages'
import { formatRelative } from '@/lib/utils'
import { Send, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; avatar_url: string | null }
interface Message {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  voice_url: string | null; is_read: boolean; created_at: string;
  sender: User
}

export function MessagesClient({ users, messages, currentUserId }: {
  users: User[]; messages: Message[]; currentUserId: string
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [text, setText] = useState('')
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
    if (!text.trim() || !selectedUser) return
    startTransition(async () => {
      await sendMessage({ receiver_id: selectedUser.id, content: text.trim() })
      setText('')
    })
  }

  // Get last message per contact for sidebar
  const contactsWithLastMessage = users.map(u => {
    const msgs = messages.filter(m =>
      (m.sender_id === currentUserId && m.receiver_id === u.id) ||
      (m.sender_id === u.id && m.receiver_id === currentUserId)
    )
    const last = msgs[0]
    return { user: u, lastMessage: last }
  }).sort((a, b) => {
    if (!a.lastMessage) return 1
    if (!b.lastMessage) return -1
    return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
  })

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Contacts sidebar */}
      <div className="flex w-72 flex-col border-r border-gray-100">
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
                  <p className="truncate text-xs text-gray-500">{lastMessage.content ?? '🎤 Voice message'}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
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
                    {msg.voice_url ? (
                      <audio controls src={msg.voice_url} className="h-8 w-48" />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <p className={cn('mt-1 text-right text-xs', msg.sender_id === currentUserId ? 'text-indigo-200' : 'text-gray-400')}>
                      {formatRelative(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  className="flex-1"
                />
                <Button onClick={handleSend} loading={isPending} disabled={!text.trim()} size="icon">
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
