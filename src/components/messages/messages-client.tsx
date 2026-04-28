'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { LinkText } from '@/components/shared/link-text'
import { sendMessage, editMessage, deleteMessage } from '@/actions/messages'
import { createGroup, sendGroupMessage, markGroupMessagesRead, deleteGroup } from '@/actions/groups'
import { saveAttachments } from '@/actions/attachments'
import { formatRelative } from '@/lib/utils'
import { Send, MessageCircle, FileText, Link2, File, Users, Plus, X, Check, CheckCheck, Trash2, Pencil, MailOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────
interface User { id: string; name: string; avatar_url: string | null }

interface MsgAttachment { id: string; entity_id: string; type: string; name: string | null; url: string; mime_type: string | null }

interface Message {
  id: string; sender_id: string; receiver_id: string; content: string | null;
  voice_url: string | null; is_read: boolean; is_seen: boolean; is_delivered: boolean;
  is_edited: boolean; deleted_at: string | null; created_at: string;
  sender: User; attachments: MsgAttachment[]
}

interface GroupMessage {
  id: string; group_id: string; sender_id: string; content: string | null;
  voice_url: string | null; created_at: string;
  sender: User; readBy: string[]; attachments: MsgAttachment[]
}

interface Group {
  id: string; name: string; description: string | null;
  created_by: string; created_at: string;
  members: User[]
}

// ── Attachment preview ─────────────────────────────────────────────────
function AttachmentPreview({ a }: { a: MsgAttachment }) {
  if (a.type === 'voice' || a.mime_type?.startsWith('audio/')) {
    return <audio controls src={a.url} className="h-8 max-w-55" />
  }
  if (a.type === 'image' || a.mime_type?.startsWith('image/')) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer">
        <img src={a.url} alt={a.name ?? ''} className="mt-1 max-h-48 max-w-55 rounded-lg object-cover" />
      </a>
    )
  }
  const Icon = a.type === 'link' ? Link2 : a.mime_type?.includes('pdf') ? FileText : File
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-current/20 bg-current/5 px-2 py-1 text-xs hover:bg-current/10">
      <Icon size={12} />
      <span className="max-w-40 truncate">{a.name ?? a.url}</span>
    </a>
  )
}

// ── Tick indicator ─────────────────────────────────────────────────────
function MessageTick({ msg }: { msg: Message }) {
  if (msg.is_seen) return <CheckCheck size={12} className="text-blue-400 shrink-0" />
  if (msg.is_delivered) return <CheckCheck size={12} className="text-indigo-300/80 shrink-0" />
  return <Check size={12} className="text-indigo-300/80 shrink-0" />
}

// ── Main Component ─────────────────────────────────────────────────────
export function MessagesClient({
  users, allUsers, messages: initialMessages, groups: initialGroups,
  groupMessages: initialGroupMessages, currentUserId, canUpload, canCreateGroup,
}: {
  users: User[]
  allUsers: User[]
  messages: Message[]
  groups: Group[]
  groupMessages: GroupMessage[]
  currentUserId: string
  canUpload: boolean
  canCreateGroup: boolean
}) {
  const [tab, setTab] = useState<'direct' | 'groups'>('direct')

  // Direct messages state
  const [allMessages, setAllMessages] = useState<Message[]>(initialMessages)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dmText, setDmText] = useState('')
  const [dmAttachments, setDmAttachments] = useState<PendingAttachment[]>([])

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Group state
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [allGroupMessages, setAllGroupMessages] = useState<GroupMessage[]>(initialGroupMessages)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupText, setGroupText] = useState('')
  const [groupAttachments, setGroupAttachments] = useState<PendingAttachment[]>([])

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)

  // Delete group
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [editPending, startEditTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const usersById = useRef<Record<string, User>>({})

  useEffect(() => {
    usersById.current = Object.fromEntries(allUsers.map(u => [u.id, u]))
  }, [allUsers])

  // ── Direct message realtime ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const handleDmInsert = (payload: { new: Record<string, unknown> }) => {
      const raw = payload.new as unknown as Message
      setAllMessages(prev => {
        if (prev.some(m => m.id === raw.id)) return prev
        return [...prev, { ...raw, sender: usersById.current[raw.sender_id] ?? { id: raw.sender_id, name: 'Unknown', avatar_url: null }, attachments: [] }]
      })
    }

    const handleDmUpdate = (payload: { new: Record<string, unknown> }) => {
      const raw = payload.new as unknown as Message
      setAllMessages(prev =>
        prev.map(m => m.id === raw.id ? { ...m, ...raw, sender: m.sender, attachments: m.attachments } : m)
      )
    }

    const channel = supabase.channel(`dm:${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, handleDmInsert)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, handleDmInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, handleDmUpdate)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, handleDmUpdate)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  // ── Group message realtime ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || groups.length === 0) return
    const supabase = createClient()
    const groupIds = groups.map(g => g.id)

    const handleGmInsert = (payload: { new: Record<string, unknown> }) => {
      const raw = payload.new as { id: string; group_id: string; sender_id: string; content: string | null; voice_url: string | null; created_at: string }
      if (!groupIds.includes(raw.group_id)) return
      setAllGroupMessages(prev => {
        if (prev.some(m => m.id === raw.id)) return prev
        return [...prev, { ...raw, sender: usersById.current[raw.sender_id] ?? { id: raw.sender_id, name: 'Unknown', avatar_url: null }, readBy: [], attachments: [] }]
      })
    }

    const handleReadInsert = (payload: { new: Record<string, unknown> }) => {
      const raw = payload.new as { message_id: string; user_id: string }
      setAllGroupMessages(prev =>
        prev.map(m => m.id === raw.message_id && !m.readBy.includes(raw.user_id)
          ? { ...m, readBy: [...m.readBy, raw.user_id] }
          : m
        )
      )
    }

    const channel = supabase.channel(`groups:${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, handleGmInsert)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_message_reads' }, handleReadInsert)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, groups])

  // ── Scroll to bottom ─────────────────────────────────────────────────
  const dmConversation = selectedUser
    ? allMessages.filter(m => (m.sender_id === currentUserId && m.receiver_id === selectedUser.id) || (m.sender_id === selectedUser.id && m.receiver_id === currentUserId))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : []

  const groupConversation = selectedGroup
    ? allGroupMessages.filter(m => m.group_id === selectedGroup.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : []

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [dmConversation.length, groupConversation.length])

  // ── Mark DM as read (also sets delivered + seen) ─────────────────────
  const markDmRead = useCallback(async (contactId: string) => {
    const supabase = createClient()
    await supabase.from('messages')
      .update({ is_read: true, is_delivered: true, is_seen: true })
      .eq('sender_id', contactId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false)
    setAllMessages(prev => prev.map(m =>
      m.sender_id === contactId && m.receiver_id === currentUserId
        ? { ...m, is_read: true, is_delivered: true, is_seen: true }
        : m
    ))
  }, [currentUserId])

  // ── Mark conversation as unread ──────────────────────────────────────
  const handleMarkUnread = useCallback(async (contactId: string) => {
    const lastMsg = allMessages
      .filter(m => m.sender_id === contactId && m.receiver_id === currentUserId && !m.deleted_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    if (!lastMsg) return
    const supabase = createClient()
    await supabase.from('messages')
      .update({ is_read: false, is_seen: false })
      .eq('id', lastMsg.id)
    setAllMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, is_read: false, is_seen: false } : m))
    if (selectedUser?.id === contactId) setSelectedUser(null)
  }, [allMessages, currentUserId, selectedUser])

  // ── Mark group messages as read ──────────────────────────────────────
  const markGroupRead = useCallback(async (groupId: string) => {
    const unreadIds = allGroupMessages
      .filter(m => m.group_id === groupId && m.sender_id !== currentUserId && !m.readBy.includes(currentUserId))
      .map(m => m.id)
    if (!unreadIds.length) return
    await markGroupMessagesRead(unreadIds)
    setAllGroupMessages(prev =>
      prev.map(m => unreadIds.includes(m.id) ? { ...m, readBy: [...m.readBy, currentUserId] } : m)
    )
  }, [allGroupMessages, currentUserId])

  // ── Send DM ──────────────────────────────────────────────────────────
  const handleSendDm = () => {
    if ((!dmText.trim() && !dmAttachments.length) || !selectedUser) return
    if (dmAttachments.some(a => a.uploading)) return
    const voiceAtt = dmAttachments.find(a => a.type === 'voice')
    const fileAtts = dmAttachments.filter(a => a !== voiceAtt)
    startTransition(async () => {
      const res = await sendMessage({ receiver_id: selectedUser.id, content: dmText.trim() || undefined, voice_url: voiceAtt?.url })
      if (res.success && fileAtts.length) {
        await saveAttachments(fileAtts.map(a => ({ entity_type: 'message' as const, entity_id: res.data.id, type: a.type, name: a.name, url: a.url, mime_type: a.mimeType, size_bytes: a.sizeBytes })))
      }
      setDmText(''); setDmAttachments([])
    })
  }

  // ── Edit message ─────────────────────────────────────────────────────
  const handleStartEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditText(msg.content ?? '')
  }

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return
    const id = editingId
    const text = editText.trim()
    startEditTransition(async () => {
      const res = await editMessage(id, text)
      if (res.success) {
        setAllMessages(prev => prev.map(m => m.id === id ? { ...m, content: text, is_edited: true } : m))
      }
      setEditingId(null)
      setEditText('')
    })
  }

  // ── Delete message ───────────────────────────────────────────────────
  const handleDeleteMsg = (id: string) => {
    startEditTransition(async () => {
      const res = await deleteMessage(id)
      if (res.success) {
        setAllMessages(prev => prev.map(m => m.id === id ? { ...m, deleted_at: new Date().toISOString(), content: null } : m))
      }
    })
  }

  // ── Send Group Message ───────────────────────────────────────────────
  const handleSendGroup = () => {
    if ((!groupText.trim() && !groupAttachments.length) || !selectedGroup) return
    if (groupAttachments.some(a => a.uploading)) return
    const voiceAtt = groupAttachments.find(a => a.type === 'voice')
    const fileAtts = groupAttachments.filter(a => a !== voiceAtt)
    startTransition(async () => {
      const res = await sendGroupMessage(selectedGroup.id, groupText.trim() || undefined, voiceAtt?.url)
      if (res.success && fileAtts.length) {
        await saveAttachments(fileAtts.map(a => ({ entity_type: 'group_message' as const, entity_id: res.data.id, type: a.type, name: a.name, url: a.url, mime_type: a.mimeType, size_bytes: a.sizeBytes })))
      }
      setGroupText(''); setGroupAttachments([])
    })
  }

  // ── Create Group ─────────────────────────────────────────────────────
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) { setCreateError('Group name is required'); return }
    if (newGroupMembers.length === 0) { setCreateError('Add at least one member'); return }
    setCreateError(null)
    startTransition(async () => {
      const res = await createGroup(newGroupName.trim(), newGroupMembers)
      if (!res.success) { setCreateError(res.error); return }
      setShowCreateGroup(false); setNewGroupName(''); setNewGroupMembers([])
    })
  }

  // ── Delete Group ─────────────────────────────────────────────────────
  const handleDeleteGroup = () => {
    if (!deleteTarget) return
    setDeleteError(null)
    startTransition(async () => {
      const res = await deleteGroup(deleteTarget.id)
      if (!res.success) { setDeleteError(res.error); return }
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id))
      if (selectedGroup?.id === deleteTarget.id) setSelectedGroup(null)
      setDeleteTarget(null)
    })
  }

  // ── Contact list with unread count ───────────────────────────────────
  const contactsWithMeta = users.map(u => {
    const msgs = allMessages.filter(m => (m.sender_id === currentUserId && m.receiver_id === u.id) || (m.sender_id === u.id && m.receiver_id === currentUserId))
    const last = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    const unread = msgs.filter(m => m.sender_id === u.id && m.receiver_id === currentUserId && !m.is_read).length
    return { user: u, lastMessage: last, unread }
  }).sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
    if (bTime !== aTime) return bTime - aTime
    return a.user.name.localeCompare(b.user.name)
  })

  const groupsWithMeta = groups.map(g => {
    const msgs = allGroupMessages.filter(m => m.group_id === g.id)
    const last = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    const unread = msgs.filter(m => m.sender_id !== currentUserId && !m.readBy.includes(currentUserId)).length
    return { group: g, lastMessage: last, unread }
  }).sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
    if (bTime !== aTime) return bTime - aTime
    return a.group.name.localeCompare(b.group.name)
  })

  const canSendDm = (dmText.trim() || dmAttachments.length > 0) && !dmAttachments.some(a => a.uploading)
  const canSendGroup = (groupText.trim() || groupAttachments.length > 0) && !groupAttachments.some(a => a.uploading)

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">

      {/* ── Left sidebar ────────────────────────────────────────────── */}
      <div className="flex w-64 shrink-0 flex-col border-r border-gray-100 lg:w-72">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('direct')} className={cn('flex-1 py-3 text-sm font-medium transition-colors', tab === 'direct' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700')}>
            Direct
          </button>
          <button onClick={() => setTab('groups')} className={cn('flex-1 py-3 text-sm font-medium transition-colors', tab === 'groups' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700')}>
            Groups
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'direct' ? (
            contactsWithMeta.map(({ user, lastMessage, unread }) => (
              <div key={user.id} className="group relative">
                <button onClick={() => { setSelectedUser(user); setSelectedGroup(null); markDmRead(user.id) }}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50', selectedUser?.id === user.id && 'bg-indigo-50')}>
                  <Avatar name={user.name} src={user.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm text-gray-900', unread > 0 ? 'font-semibold' : 'font-medium')}>{user.name}</p>
                    {lastMessage && (
                      <p className={cn('truncate text-xs', unread > 0 ? 'text-indigo-600 font-medium' : 'text-gray-500')}>
                        {lastMessage.deleted_at ? '🗑 Message deleted' : lastMessage.voice_url ? '🎤 Voice message' : lastMessage.content ?? '📎 Attachment'}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                </button>
                {/* Mark as unread (shown on hover when there are read messages from this contact) */}
                {lastMessage && lastMessage.sender_id === user.id && lastMessage.is_read && (
                  <button
                    onClick={() => handleMarkUnread(user.id)}
                    title="Mark as unread"
                    className="absolute right-2 top-1/2 -translate-y-1/2 hidden rounded p-1 text-gray-300 hover:text-indigo-500 group-hover:flex"
                  >
                    <MailOpen size={13} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <>
              {canCreateGroup && (
                <div className="px-4 py-2">
                  <button onClick={() => setShowCreateGroup(true)}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    <Plus size={14} /> New Group
                  </button>
                </div>
              )}
              {groupsWithMeta.map(({ group, lastMessage, unread }) => (
                <button key={group.id} onClick={() => { setSelectedGroup(group); setSelectedUser(null); markGroupRead(group.id) }}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50', selectedGroup?.id === group.id && 'bg-indigo-50')}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm text-gray-900', unread > 0 ? 'font-semibold' : 'font-medium')}>{group.name}</p>
                    <p className="text-xs text-gray-500">{group.members.length} members</p>
                    {lastMessage && (
                      <p className={cn('truncate text-xs', unread > 0 ? 'text-indigo-600 font-medium' : 'text-gray-400')}>
                        {lastMessage.sender_id === currentUserId ? 'You' : lastMessage.sender.name}: {lastMessage.voice_url ? '🎤' : lastMessage.content ?? '📎'}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
              ))}
              {groups.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-gray-400">No groups yet. Create one!</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Direct message chat */}
        {tab === 'direct' && selectedUser ? (
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
              <Avatar name={selectedUser.name} src={selectedUser.avatar_url} />
              <p className="font-medium text-gray-900">{selectedUser.name}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {dmConversation.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No messages yet. Say hello!</p>}
              {dmConversation.map(msg => {
                const isOwn = msg.sender_id === currentUserId
                const isEditing = editingId === msg.id

                return (
                  <div key={msg.id} className={cn('group flex items-end gap-1 py-0.5', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                    {/* Hover actions for own messages */}
                    {isOwn && !msg.deleted_at && !isEditing && (
                      <div className="hidden group-hover:flex items-center gap-0.5 pb-1">
                        <button
                          onClick={() => handleStartEdit(msg)}
                          title="Edit"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-500 transition-colors"
                          disabled={editPending}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          title="Delete"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
                          disabled={editPending}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                      isOwn ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-900',
                      msg.deleted_at && 'opacity-60'
                    )}>
                      {msg.deleted_at ? (
                        <p className="italic text-sm">This message was deleted</p>
                      ) : (
                        <>
                          {msg.voice_url && <audio controls src={msg.voice_url} className="h-8 w-48" />}
                          {isEditing ? (
                            <div className="space-y-1 min-w-[180px]">
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                rows={2}
                                autoFocus
                                className="w-full resize-none rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/50 focus:outline-none"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                                  if (e.key === 'Escape') { setEditingId(null) }
                                }}
                              />
                              <div className="flex gap-1 text-xs">
                                <button onClick={handleSaveEdit} disabled={editPending} className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30">Save</button>
                                <button onClick={() => setEditingId(null)} className="rounded px-2 py-0.5 hover:bg-white/10 opacity-70">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.content && (
                                <p>
                                  <LinkText
                                    text={msg.content}
                                    linkClassName={cn('underline break-all', isOwn ? 'text-indigo-200 hover:text-white' : 'text-indigo-600 hover:text-indigo-800')}
                                  />
                                  {msg.is_edited && <span className="ml-1 text-[10px] opacity-60">(edited)</span>}
                                </p>
                              )}
                            </>
                          )}
                          {!isEditing && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">{msg.attachments.map(a => <AttachmentPreview key={a.id} a={a} />)}</div>
                          )}
                        </>
                      )}
                      <div className={cn('mt-1 flex items-center gap-1', isOwn ? 'justify-end' : 'justify-start')}>
                        <p className={cn('text-xs', isOwn ? 'text-indigo-200' : 'text-gray-400')}>{formatRelative(msg.created_at)}</p>
                        {isOwn && <MessageTick msg={msg} />}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-100 p-3">
              <div className="flex items-end gap-2">
                {canUpload ? (
                  <RichInput value={dmText} onChange={setDmText} attachments={dmAttachments} onAttachmentsChange={setDmAttachments} placeholder="Type a message…" disabled={isPending} rows={1} className="flex-1" />
                ) : (
                  <input value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Type a message…"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDm() } }}
                    disabled={isPending} />
                )}
                <Button onClick={handleSendDm} loading={isPending} disabled={!canSendDm} size="icon" className="shrink-0"><Send size={16} /></Button>
              </div>
            </div>
          </>
        ) : tab === 'groups' && selectedGroup ? (
          /* Group chat */
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                <Users size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{selectedGroup.name}</p>
                <p className="text-xs text-gray-500">{selectedGroup.members.map(m => m?.name).filter(Boolean).join(', ')}</p>
              </div>
              {selectedGroup.created_by === currentUserId && (
                <button onClick={() => { setDeleteTarget(selectedGroup); setDeleteError(null) }}
                  className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete group">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {groupConversation.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation!</p>}
              {groupConversation.map((msg, idx) => {
                const isOwn = msg.sender_id === currentUserId
                const isLast = idx === groupConversation.length - 1
                const readers = msg.readBy
                  .filter(uid => uid !== msg.sender_id)
                  .map(uid => selectedGroup.members.find(m => m?.id === uid))
                  .filter(Boolean) as User[]

                return (
                  <div key={msg.id} className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                    {!isOwn && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <Avatar name={msg.sender.name} src={msg.sender.avatar_url} size="sm" />
                        <span className="text-xs font-medium text-gray-600">{msg.sender.name}</span>
                      </div>
                    )}
                    <div className={cn('max-w-[70%] rounded-2xl px-4 py-2 text-sm', isOwn ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-900')}>
                      {msg.voice_url && <audio controls src={msg.voice_url} className="h-8 w-48" />}
                      {msg.content && (
                        <p>
                          <LinkText
                            text={msg.content}
                            linkClassName={cn('underline break-all', isOwn ? 'text-indigo-200 hover:text-white' : 'text-indigo-600 hover:text-indigo-800')}
                          />
                        </p>
                      )}
                      {msg.attachments.length > 0 && <div className="mt-2 space-y-1">{msg.attachments.map(a => <AttachmentPreview key={a.id} a={a} />)}</div>}
                      <p className={cn('mt-1 text-right text-xs', isOwn ? 'text-indigo-200' : 'text-gray-400')}>{formatRelative(msg.created_at)}</p>
                    </div>
                    {readers.length > 0 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                        <Check size={10} />
                        <span>Seen by</span>
                        {readers.slice(0, 5).map(u => (
                          <span key={u.id} title={u.name}>
                            <Avatar name={u.name} src={u.avatar_url} size="sm" />
                          </span>
                        ))}
                        {readers.length > 5 && <span>+{readers.length - 5}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-3">
              <div className="flex items-end gap-2">
                {canUpload ? (
                  <RichInput value={groupText} onChange={setGroupText} attachments={groupAttachments} onAttachmentsChange={setGroupAttachments} placeholder="Message group…" disabled={isPending} rows={1} className="flex-1" />
                ) : (
                  <input value={groupText} onChange={e => setGroupText(e.target.value)} placeholder="Message group…"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGroup() } }}
                    disabled={isPending} />
                )}
                <Button onClick={handleSendGroup} loading={isPending} disabled={!canSendGroup} size="icon" className="shrink-0"><Send size={16} /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            {tab === 'groups' ? <Users className="mb-3 h-12 w-12" /> : <MessageCircle className="mb-3 h-12 w-12" />}
            <p className="text-sm">{tab === 'groups' ? 'Select a group or create one' : 'Select a conversation to start messaging'}</p>
          </div>
        )}
      </div>

      {/* ── Delete Group Confirm Modal ───────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Delete Group</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? All messages will be permanently removed.
            </p>
            {deleteError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteGroup} disabled={isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Group Modal ───────────────────────────────────────── */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Create Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {createError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Design Team"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {allUsers.filter(u => u.id !== currentUserId).map(u => {
                    const selected = newGroupMembers.includes(u.id)
                    return (
                      <button key={u.id}
                        onClick={() => setNewGroupMembers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors', selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700')}>
                        <Avatar name={u.name} src={u.avatar_url} size="sm" />
                        <span className="flex-1">{u.name}</span>
                        {selected && <Check size={14} className="text-indigo-600" />}
                      </button>
                    )
                  })}
                </div>
                {newGroupMembers.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{newGroupMembers.length} member{newGroupMembers.length > 1 ? 's' : ''} selected</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateGroup} disabled={isPending} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  {isPending ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
