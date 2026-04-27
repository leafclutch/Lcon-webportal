'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { RichInput, type PendingAttachment } from '@/components/shared/rich-input'
import { createTodo, updateTodoStatus, deleteTodo } from '@/actions/todos'
import { saveAttachments } from '@/actions/attachments'
import { statusColor } from '@/lib/utils'
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface Todo {
  id: string; title: string; description: string | null; status: string;
  user_id: string; attachment_url: string | null;
  users: { id: string; name: string; avatar_url: string | null } | null
}

export function TodosClient({ todos, currentUserId, canViewAll, canUpload }: {
  todos: Todo[]; currentUserId: string; canViewAll: boolean; canUpload: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetModal = () => {
    setShowModal(false)
    setTitle('')
    setDescription('')
    setAttachments([])
    setError(null)
  }

  const handleCreate = () => {
    if (!title) { setError('Title is required'); return }
    if (attachments.some(a => a.uploading)) return

    startTransition(async () => {
      const res = await createTodo({ title, description: description || undefined, user_id: currentUserId })
      if (res.success) {
        if (attachments.length) {
          await saveAttachments(
            attachments.map(a => ({
              entity_type: 'todo' as const,
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

  const handleToggle = (todo: Todo) => {
    const next = todo.status === 'completed' ? 'pending' : 'completed'
    startTransition(async () => { await updateTodoStatus(todo.id, next) })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteTodo(id) })
  }

  const pending = todos.filter(t => t.status !== 'completed')
  const completed = todos.filter(t => t.status === 'completed')
  const canSend = !!title && !attachments.some(a => a.uploading)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} /> New Todo
        </Button>
      </div>

      {todos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">No todos yet</CardContent></Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-600">{pending.length} remaining</h3>
              <div className="space-y-2">
                {pending.map(todo => <TodoItem key={todo.id} todo={todo} currentUserId={currentUserId} onToggle={handleToggle} onDelete={handleDelete} isPending={isPending} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-400">{completed.length} completed</h3>
              <div className="space-y-2">
                {completed.map(todo => <TodoItem key={todo.id} todo={todo} currentUserId={currentUserId} onToggle={handleToggle} onDelete={handleDelete} isPending={isPending} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showModal} onClose={resetModal} title="New Todo">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
          {canUpload ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes &amp; Attachments</label>
              <RichInput
                value={description}
                onChange={setDescription}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                placeholder="Optional details, files, or links…"
                disabled={isPending}
                rows={3}
              />
            </div>
          ) : (
            <Textarea label="Notes" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} disabled={!canSend} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TodoItem({ todo, currentUserId, onToggle, onDelete, isPending }: {
  todo: Todo; currentUserId: string;
  onToggle: (t: Todo) => void; onDelete: (id: string) => void; isPending: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <button onClick={() => onToggle(todo)} className="shrink-0 text-gray-400 hover:text-indigo-500" disabled={isPending}>
          {isPending ? <Loader2 size={18} className="animate-spin" /> :
           todo.status === 'completed' ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${todo.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {todo.title}
          </p>
          {todo.description && <p className="text-xs text-gray-500 truncate">{todo.description}</p>}
          {todo.users && todo.user_id !== currentUserId && (
            <div className="mt-1 flex items-center gap-1">
              <Avatar name={todo.users.name} src={todo.users.avatar_url} size="sm" />
              <span className="text-xs text-gray-400">{todo.users.name}</span>
            </div>
          )}
        </div>
        {todo.attachment_url && (
          <a href={todo.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline shrink-0">
            Attachment
          </a>
        )}
        {(todo.user_id === currentUserId) && (
          <button onClick={() => onDelete(todo.id)} className="shrink-0 text-gray-300 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        )}
      </CardContent>
    </Card>
  )
}
