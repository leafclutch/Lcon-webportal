'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { createTask, updateTaskStatus, deleteTask } from '@/actions/tasks'
import { formatDate, priorityColor, statusColor } from '@/lib/utils'
import { Plus, CheckSquare, Trash2, ChevronDown } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface Task {
  id: string; title: string; description: string | null; priority: string; status: string;
  deadline: string | null; assigned_by: string; assigned_to: string;
  assigner: User; assignee: User;
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
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', deadline: '' })
  const [error, setError] = useState<string | null>(null)

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

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
      if (res.success) { setShowModal(false); setForm({ title: '', description: '', assigned_to: '', priority: 'medium', deadline: '' }) }
      else setError(res.error)
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
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus size={16} />
            Assign Task
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-400">No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                    </div>
                    {task.description && (
                      <p className="mb-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Avatar name={task.assignee.name} src={task.assignee.avatar_url} size="sm" />
                        {task.assignee.name}
                      </span>
                      <span>by {task.assigner.name}</span>
                      {task.deadline && <span>Due {formatDate(task.deadline)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${statusColor(task.status)}`}
                      disabled={isPending}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {canAssign && (
                      <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign New Task" className="max-w-lg">
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
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            />
            <Input
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">Assign Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
