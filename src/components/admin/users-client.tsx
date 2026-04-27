'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { assignRole, approveUser, rejectUser, deleteUser } from '@/actions/admin'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, Trash2, Clock } from 'lucide-react'

interface Role { id: string; name: string }
interface User {
  id: string; name: string; email: string; avatar_url: string | null;
  created_at: string; is_approved: boolean; last_active_at: string | null;
  roles: Role | null
}

interface UsersClientProps {
  users: User[]
  roles: Role[]
  canApprove: boolean
  canDelete: boolean
  currentUserId: string
}

function activityLabel(lastActive: string | null): string {
  if (!lastActive) return 'Never'
  const diff = Date.now() - new Date(lastActive).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Active now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function UsersClient({ users, roles, canApprove, canDelete, currentUserId }: UsersClientProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesApproval =
      approvalFilter === 'all' ||
      (approvalFilter === 'pending' && !u.is_approved) ||
      (approvalFilter === 'approved' && u.is_approved)
    return matchesSearch && matchesApproval
  })

  const pendingCount = users.filter(u => !u.is_approved).length

  const roleOptions = [
    { value: '', label: 'No Role' },
    ...roles.map(r => ({ value: r.id, label: r.name })),
  ]

  const handle = (fn: () => Promise<unknown>) => {
    startTransition(async () => { await fn() })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['all', 'pending', 'approved'] as const).map(v => (
            <button
              key={v}
              onClick={() => setApprovalFilter(v)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors capitalize ${approvalFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v}
              {v === 'pending' && pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">{filtered.length} users</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Last Active</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">No users found</td>
                  </tr>
                ) : (
                  filtered.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50/50 ${!u.is_approved ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar name={u.name} src={u.avatar_url} size="sm" />
                            {u.last_active_at && Date.now() - new Date(u.last_active_at).getTime() < 6 * 60 * 1000 && (
                              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.roles?.id ?? ''}
                          onChange={e => handle(() => assignRole(u.id, e.target.value))}
                          disabled={isPending}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                        >
                          {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_approved ? (
                          <Badge variant="success">Approved</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
                          {activityLabel(u.last_active_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canApprove && !u.is_approved && (
                            <button
                              onClick={() => handle(() => approveUser(u.id))}
                              disabled={isPending}
                              className="rounded p-1 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                              title="Approve user"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {canApprove && u.is_approved && u.id !== currentUserId && (
                            <button
                              onClick={() => handle(() => rejectUser(u.id))}
                              disabled={isPending}
                              className="rounded p-1 text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                              title="Revoke approval"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                          {canDelete && u.id !== currentUserId && (
                            confirmDelete === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { handle(() => deleteUser(u.id)); setConfirmDelete(null) }}
                                  disabled={isPending}
                                  className="rounded px-2 py-0.5 text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="rounded px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(u.id)}
                                className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 size={15} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
