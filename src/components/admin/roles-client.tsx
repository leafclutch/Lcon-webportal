'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { createRole, updateRolePermissions, deleteRole } from '@/actions/admin'
import { Plus, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react'

interface Role { id: string; name: string; description: string | null }
interface Permission { id: string; name: string; description: string | null }
interface RolePermission { id: string; role_id: string; permission_id: string }

export function RolesClient({ roles, permissions, rolePermissions }: {
  roles: Role[]; permissions: Permission[]; rolePermissions: RolePermission[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const rolePermMap: Record<string, Set<string>> = {}
  rolePermissions.forEach(rp => {
    if (!rolePermMap[rp.role_id]) rolePermMap[rp.role_id] = new Set()
    rolePermMap[rp.role_id].add(rp.permission_id)
  })

  const handleCreate = () => {
    if (!form.name) { setError('Role name required'); return }
    startTransition(async () => {
      const res = await createRole(form)
      if (res.success) { setShowModal(false); setForm({ name: '', description: '' }) }
      else setError(res.error)
    })
  }

  const handleDelete = () => {
    if (!confirmId) return
    startTransition(async () => { await deleteRole(confirmId); setConfirmId(null) })
  }

  const handlePermissionToggle = (roleId: string, permId: string, currentPerms: Set<string>) => {
    const next = new Set(currentPerms)
    if (next.has(permId)) next.delete(permId)
    else next.add(permId)

    startTransition(async () => {
      await updateRolePermissions(roleId, Array.from(next))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} /> New Role
        </Button>
      </div>

      <div className="space-y-3">
        {roles.map(role => {
          const perms = rolePermMap[role.id] ?? new Set<string>()
          const isExpanded = expandedRole === role.id

          return (
            <Card key={role.id}>
              <CardContent className="p-0">
                <div className="flex w-full items-center justify-between p-4">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                      <Shield size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold capitalize text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500">{perms.size} permission{perms.size !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmId(role.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                      className="rounded p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Permissions
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {permissions.map(perm => (
                        <label key={perm.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={perms.has(perm.id)}
                            onChange={() => handlePermissionToggle(role.id, perm.id, perms)}
                            disabled={isPending}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{perm.name}</p>
                            {perm.description && <p className="text-xs text-gray-400">{perm.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        message="Delete this role? Users assigned to it will lose their permissions."
        isPending={isPending}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Role">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Input label="Role Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. intern, designer, hr" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What can this role do?" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={isPending} className="flex-1">Create Role</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
