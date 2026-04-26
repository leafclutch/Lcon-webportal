'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { issueWarning } from '@/actions/warnings'
import { formatDate } from '@/lib/utils'
import { Plus, AlertTriangle } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface Warning {
  id: string; reason: string; created_at: string;
  user: User; issuer: { id: string; name: string }
}

export function WarningsClient({ warnings, users, canIssue, currentUserId }: {
  warnings: Warning[]; users: User[]; canIssue: boolean; currentUserId: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ user_id: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleIssue = () => {
    if (!form.user_id || !form.reason) { setError('All fields required'); return }
    startTransition(async () => {
      const res = await issueWarning(form)
      if (res.success) { setShowModal(false); setForm({ user_id: '', reason: '' }) }
      else setError(res.error)
    })
  }

  const myWarnings = warnings.filter(w => w.user.id === currentUserId)
  const allWarnings = canIssue ? warnings : myWarnings

  return (
    <div className="space-y-4">
      {canIssue && (
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(true)} className="gap-2" variant="destructive">
            <Plus size={16} /> Issue Warning
          </Button>
        </div>
      )}

      {allWarnings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">No warnings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allWarnings.map(w => (
            <Card key={w.id} className="border-l-4 border-l-red-400">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={w.user.name} src={w.user.avatar_url} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{w.user.name}</p>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Warning
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{w.reason}</p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      Issued by {w.issuer.name} · {formatDate(w.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Issue Warning">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Select
            label="Team Member"
            options={users.map(u => ({ value: u.id, label: u.name }))}
            placeholder="Select user..."
            value={form.user_id}
            onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
          />
          <Textarea
            label="Reason"
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Reason for the warning..."
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleIssue} loading={isPending} className="flex-1">Issue Warning</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
