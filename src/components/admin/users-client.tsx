'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { assignRole } from '@/actions/admin'
import { formatDate } from '@/lib/utils'
import { Users } from 'lucide-react'

interface Role { id: string; name: string }
interface User {
  id: string; name: string; email: string; avatar_url: string | null;
  created_at: string; roles: Role | null
}

export function UsersClient({ users, roles }: { users: User[]; roles: Role[] }) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = (userId: string, roleId: string) => {
    startTransition(async () => { await assignRole(userId, roleId) })
  }

  const roleOptions = [
    { value: '', label: 'No Role' },
    ...roles.map(r => ({ value: r.id, label: r.name })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <p className="text-sm text-gray-500">{filtered.length} users</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No users found</td></tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} src={user.avatar_url} size="sm" />
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.roles?.id ?? ''}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={isPending}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                      >
                        {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(user.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
