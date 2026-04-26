'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createProject, updateProjectStatus } from '@/actions/projects'
import { statusColor, formatDate } from '@/lib/utils'
import { Plus, FolderOpen } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface ProjectMember { user_id: string; users: User }
interface Project {
  id: string; name: string; description: string | null; status: string;
  created_at: string; creator: User; project_members: ProjectMember[]
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function ProjectsClient({ projects, allUsers, canManage, currentUserId }: {
  projects: Project[]; allUsers: User[]; canManage: boolean; currentUserId: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    if (!form.name) { setError('Project name required'); return }
    startTransition(async () => {
      const res = await createProject(form)
      if (res.success) { setShowModal(false); setForm({ name: '', description: '' }) }
      else setError(res.error)
    })
  }

  const handleStatusChange = (projectId: string, status: string) => {
    startTransition(async () => {
      await updateProjectStatus(projectId, status as 'active' | 'completed' | 'on_hold' | 'cancelled')
    })
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus size={16} /> New Project
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">No projects yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map(project => (
            <Card key={project.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                    <FolderOpen size={18} className="text-indigo-600" />
                  </div>
                  {canManage ? (
                    <select
                      value={project.status}
                      onChange={e => handleStatusChange(project.id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500 ${statusColor(project.status)}`}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(project.status)}`}>
                      {project.status}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {project.project_members.slice(0, 4).map(m => (
                      <Avatar key={m.user_id} name={m.users.name} src={m.users.avatar_url} size="sm"
                        className="ring-2 ring-white" />
                    ))}
                    {project.project_members.length > 4 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 ring-2 ring-white text-xs font-medium text-gray-600">
                        +{project.project_members.length - 4}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(project.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Project Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">Create Project</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
