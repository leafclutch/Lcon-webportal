'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { LinkText } from '@/components/shared/link-text'
import { createTaskBulk, updateTaskStatus, deleteTask } from '@/actions/tasks'
import { saveAttachments } from '@/actions/attachments'
import { getTaskComments, addTaskComment, deleteTaskComment, type TaskComment } from '@/actions/task-comments'
import { formatDate, formatDateTime, formatRelative, priorityColor, statusColor } from '@/lib/utils'
import { Plus, CheckSquare, Trash2, ChevronDown, ChevronUp, Maximize2, FileText, Link2, File, Image, Check, MessageSquare, Send, Loader2 } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface TaskAttachment { id: string; entity_id: string; type: string; name: string | null; url: string; mime_type: string | null; size_bytes: number | null }
interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  deadline: string | null; assigned_by: string; assigned_to: string;
  assigner: User; assignee: User; created_at: string;
  attachments: TaskAttachment[]
}

interface TasksClientProps {
  tasks: Task[]
  users: User[]
  canAssign: boolean
  canUpload: boolean
  canComment: boolean
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]
const FILTER_OPTIONS = [
  { value: 'all', label: 'All Tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function AttachmentChip({ a }: { a: TaskAttachment }) {
  const isVoice = a.type === 'voice' || a.mime_type?.startsWith('audio/')
  const isImage = a.type === 'image' || a.mime_type?.startsWith('image/')
  const isLink  = a.type === 'link'

  if (isVoice) {
    return <audio controls src={a.url} className="h-8 max-w-xs" />
  }
  if (isImage) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer">
        <img src={a.url} alt={a.name ?? ''} className="max-h-40 max-w-xs rounded-lg object-cover border border-gray-200" />
      </a>
    )
  }
  const Icon = isLink ? Link2 : a.mime_type?.includes('pdf') ? FileText : File
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
    >
      <Icon size={12} />
      <span className="max-w-40 truncate">{a.name ?? a.url}</span>
    </a>
  )
}

export function TasksClient({ tasks, users, canAssign, canUpload, canComment, currentUserId, currentUserName, currentUserAvatar }: TasksClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()

  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentPending, startCommentTransition] = useTransition()

  // Create form state
  const [form, setForm] = useState({ title: '', priority: 'medium', deadline: '' })
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load comments when task detail opens
  useEffect(() => {
    if (!detailTask) { setComments([]); setCommentText(''); setCommentError(null); return }
    setCommentsLoading(true)
    getTaskComments(detailTask.id).then(data => {
      setComments(data)
      setCommentsLoading(false)
    })
  }, [detailTask?.id])

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    if (!form.title) { setError('Title is required'); return }
    if (assignedTo.length === 0) { setError('Select at least one assignee'); return }
    if (attachments.some(a => a.uploading)) { setError('Please wait for uploads to finish'); return }
    setError(null)
    startTransition(async () => {
      const res = await createTaskBulk({
        title: form.title,
        description: description || undefined,
        assigned_to: assignedTo,
        priority: form.priority as 'low' | 'medium' | 'high' | 'urgent',
        deadline: form.deadline || undefined,
      })
      if (!res.success) { setError(res.error); return }

      if (attachments.length > 0) {
        await Promise.all(
          res.data.ids.map(taskId =>
            saveAttachments(
              attachments.filter(a => a.url).map(a => ({
                entity_type: 'task' as const,
                entity_id: taskId,
                type: a.type,
                name: a.name,
                url: a.url,
                mime_type: a.mimeType,
                size_bytes: a.sizeBytes,
              }))
            )
          )
        )
      }

      setShowCreateModal(false)
      setForm({ title: '', priority: 'medium', deadline: '' })
      setAssignedTo([])
      setDescription('')
      setAttachments([])
    })
  }

  const handleStatusChange = (taskId: string, status: string) => {
    startTransition(async () => {
      await updateTaskStatus(taskId, status as 'pending' | 'in_progress' | 'completed' | 'cancelled')
    })
  }

  const handleDelete = () => {
    if (!confirmId) return
    startTransition(async () => { await deleteTask(confirmId); setConfirmId(null); setDetailTask(null) })
  }

  const handleAddComment = () => {
    if (!commentText.trim() || !detailTask) return
    setCommentError(null)
    startCommentTransition(async () => {
      const res = await addTaskComment(detailTask.id, commentText.trim())
      if (!res.success) { setCommentError(res.error); return }
      setComments(prev => [...prev, {
        id: res.data.id,
        task_id: detailTask.id,
        user_id: currentUserId,
        content: commentText.trim(),
        created_at: new Date().toISOString(),
        user: { id: currentUserId, name: currentUserName, avatar_url: currentUserAvatar },
      }])
      setCommentText('')
    })
  }

  const handleDeleteComment = (commentId: string) => {
    startCommentTransition(async () => {
      const res = await deleteTaskComment(commentId)
      if (res.success) setComments(prev => prev.filter(c => c.id !== commentId))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select options={FILTER_OPTIONS} value={filter} onChange={e => setFilter(e.target.value)} className="w-full sm:w-40" />
        {canAssign && (
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={16} />
            Assign Task
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-400">No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(task => {
            const isExpanded = expandedIds.has(task.id)
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed'
            return (
              <Card key={task.id} className={isOverdue ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
                        {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Overdue</span>}
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        {task.attachments.length > 0 && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                            📎 {task.attachments.length}
                          </span>
                        )}
                      </div>
                      {!isExpanded && task.description && (
                        <p className="mb-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Avatar name={task.assignee.name} src={task.assignee.avatar_url} size="sm" />
                          {task.assignee.name}
                        </span>
                        <span>by {task.assigner.name}</span>
                        {task.deadline && (
                          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>Due {formatDate(task.deadline)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${statusColor(task.status)}`}
                        disabled={isPending}
                      >
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button onClick={() => setDetailTask(task)} className="rounded p-1 text-gray-400 hover:text-indigo-500 transition-colors" title="View details">
                        <Maximize2 size={14} />
                      </button>
                      {(task.description || task.attachments.length > 0) && (
                        <button onClick={() => toggleExpand(task.id)} className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      {canAssign && (
                        <button onClick={() => setConfirmId(task.id)} className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors" disabled={isPending}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {task.description && (
                        <p className="text-sm text-gray-700"><LinkText text={task.description} /></p>
                      )}
                      {task.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {task.attachments.map(a => <AttachmentChip key={a.id} a={a} />)}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        message="Delete this task? This cannot be undone."
        isPending={isPending}
      />

      {/* Task Detail Modal */}
      {detailTask && (
        <Modal open={!!detailTask} onClose={() => setDetailTask(null)} title="Task Details" className="max-w-lg">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityColor(detailTask.priority)}`}>{detailTask.priority} priority</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(detailTask.status)}`}>{detailTask.status.replace('_', ' ')}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{detailTask.title}</h3>
              {detailTask.description && <p className="mt-2 text-sm text-gray-600"><LinkText text={detailTask.description} /></p>}
            </div>
            {detailTask.attachments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Attachments ({detailTask.attachments.length})</p>
                <div className="flex flex-wrap gap-2">
                  {detailTask.attachments.map(a => <AttachmentChip key={a.id} a={a} />)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Assigned to</p>
                <div className="flex items-center gap-1.5">
                  <Avatar name={detailTask.assignee.name} src={detailTask.assignee.avatar_url} size="sm" />
                  <span className="font-medium text-gray-800">{detailTask.assignee.name}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Assigned by</p>
                <div className="flex items-center gap-1.5">
                  <Avatar name={detailTask.assigner.name} src={detailTask.assigner.avatar_url} size="sm" />
                  <span className="font-medium text-gray-800">{detailTask.assigner.name}</span>
                </div>
              </div>
              {detailTask.deadline && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
                  <p className="font-medium text-gray-800">{formatDateTime(detailTask.deadline)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Created</p>
                <p className="font-medium text-gray-800">{formatDate(detailTask.created_at)}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Update Status</p>
              <select
                value={detailTask.status}
                onChange={e => {
                  handleStatusChange(detailTask.id, e.target.value)
                  setDetailTask(prev => prev ? { ...prev, status: e.target.value } : null)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isPending}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Comments section */}
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <MessageSquare size={13} />
                Comments ({comments.length})
              </p>
              {commentsLoading ? (
                <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {comments.length === 0 && (
                    <p className="py-2 text-xs text-gray-400">No comments yet.</p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="group flex items-start gap-2">
                      <Avatar name={c.user.name} src={c.user.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">{c.user.name}</span>
                          <span className="text-gray-400">{formatRelative(c.created_at)}</span>
                        </div>
                        <LinkText text={c.content} className="text-gray-700" />
                      </div>
                      {c.user_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={commentPending}
                          className="mt-1 hidden shrink-0 text-gray-300 hover:text-red-500 group-hover:block"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canComment && (
                <>
                  {commentError && (
                    <p className="mt-1 text-xs text-red-500">{commentError}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      disabled={commentPending}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || commentPending}
                      className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 disabled:opacity-40"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDetailTask(null)} className="flex-1">Close</Button>
              {canAssign && (
                <Button variant="destructive" size="sm" onClick={() => setConfirmId(detailTask.id)} loading={isPending}>Delete</Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setAssignedTo([]); setError(null) }} title="Assign New Task" className="max-w-lg">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description &amp; Attachments</label>
            {canUpload ? (
              <RichInput
                value={description}
                onChange={setDescription}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                placeholder="Task description, files, voice notes, links…"
                rows={3}
              />
            ) : (
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Task description…"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Assign To
              {assignedTo.length > 0 && (
                <span className="ml-2 text-xs font-normal text-indigo-600">{assignedTo.length} selected</span>
              )}
            </label>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 p-1">
              {users.map(u => {
                const selected = assignedTo.includes(u.id)
                return (
                  <button key={u.id} type="button"
                    onClick={() => setAssignedTo(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <Avatar name={u.name} src={u.avatar_url} size="sm" />
                    <span className="flex-1">{u.name}</span>
                    {selected && <Check size={14} className="text-indigo-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); setAssignedTo([]); setError(null) }} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">
              {assignedTo.length > 1 ? `Assign to ${assignedTo.length} Members` : 'Assign Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
