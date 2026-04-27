'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { createTask, updateTaskStatus, deleteTask } from '@/actions/tasks'
import { formatDate, formatDateTime, priorityColor, statusColor } from '@/lib/utils'
import { Plus, CheckSquare, Trash2, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  deadline: string | null; assigned_by: string; assigned_to: string;
  assigner: User; assignee: User; created_at: string;
}

interface TasksClientProps {
  tasks: Task[]
  users: User[]
  canAssign: boolean
  currentUserId: string
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

export function TasksClient({ tasks, users, canAssign, currentUserId }: TasksClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', deadline: '' })
  const [error, setError] = useState<string | null>(null)

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    if (!form.title || !form.assigned_to) { setError('Title and assignee are required'); return }
    setError(null)
    startTransition(async () => {
      const res = await createTask({
        title: form.title,
        description: form.description || undefined,
        assigned_to: form.assigned_to,
        priority: form.priority as 'low' | 'medium' | 'high' | 'urgent',
        deadline: form.deadline || undefined,
      })
      if (res.success) {
        setShowCreateModal(false)
        setForm({ title: '', description: '', assigned_to: '', priority: 'medium', deadline: '' })
      } else {
        setError(res.error)
      }
    })
  }

  const handleStatusChange = (taskId: string, status: string) => {
    startTransition(async () => {
      await updateTaskStatus(taskId, status as 'pending' | 'in_progress' | 'completed' | 'cancelled')
    })
  }

  const handleDelete = (taskId: string) => {
    startTransition(async () => { await deleteTask(taskId) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          options={FILTER_OPTIONS}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full sm:w-40"
        />
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
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {isOverdue && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                            Overdue
                          </span>
                        )}
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                      </div>

                      {/* Collapsed preview */}
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
                          <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                            Due {formatDate(task.deadline)}
                          </span>
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
                      <button
                        onClick={() => setDetailTask(task)}
                        className="rounded p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                        title="View details"
                      >
                        <Maximize2 size={14} />
                      </button>
                      {task.description && (
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      {canAssign && (
                        <button onClick={() => handleDelete(task.id)} className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors" disabled={isPending}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded description */}
                  {isExpanded && task.description && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100">
                      {task.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Task Detail Modal */}
      {detailTask && (
        <Modal open={!!detailTask} onClose={() => setDetailTask(null)} title="Task Details" className="max-w-lg">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityColor(detailTask.priority)}`}>
                {detailTask.priority} priority
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(detailTask.status)}`}>
                {detailTask.status.replace('_', ' ')}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">{detailTask.title}</h3>
              {detailTask.description && (
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{detailTask.description}</p>
              )}
            </div>

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

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setDetailTask(null)} className="flex-1">Close</Button>
              {canAssign && (
                <Button
                  variant="destructive" size="sm"
                  onClick={() => { handleDelete(detailTask.id); setDetailTask(null) }}
                  loading={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Assign New Task" className="max-w-lg">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task description..." />
          <Select
            label="Assign To"
            options={users.map(u => ({ value: u.id, label: u.name }))}
            placeholder="Select team member..."
            value={form.assigned_to}
            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">Assign Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
