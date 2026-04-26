'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { applyForLeave, reviewLeaveRequest } from '@/actions/leave'
import { formatDate, statusColor } from '@/lib/utils'
import { Plus, CheckCircle2, XCircle, CalendarOff } from 'lucide-react'

interface User { id: string; name: string; avatar_url: string | null }
interface LeaveRequest {
  id: string; reason: string; start_date: string; end_date: string;
  status: string; approved_at: string | null; created_at: string;
  user: User; approver: User | null
}

export function LeaveClient({ requests, canApprove, currentUserId }: {
  requests: LeaveRequest[]; canApprove: boolean; currentUserId: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ reason: '', start_date: '', end_date: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    if (!form.reason || !form.start_date || !form.end_date) { setError('All fields are required'); return }
    startTransition(async () => {
      const res = await applyForLeave(form)
      if (res.success) { setShowModal(false); setForm({ reason: '', start_date: '', end_date: '' }) }
      else setError(res.error)
    })
  }

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    startTransition(async () => { await reviewLeaveRequest(id, status) })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} /> Apply for Leave
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarOff className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">No leave requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={req.user.name} src={req.user.avatar_url} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900">{req.user.name}</p>
                      <p className="text-sm text-gray-500">{req.reason}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(req.start_date)} → {formatDate(req.end_date)}
                      </p>
                      {req.approver && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {req.status === 'approved' ? 'Approved' : 'Rejected'} by {req.approver.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                    {canApprove && req.status === 'pending' && (
                      <>
                        <button onClick={() => handleReview(req.id, 'approved')} disabled={isPending}
                          className="text-green-500 hover:text-green-700 disabled:opacity-50">
                          <CheckCircle2 size={18} />
                        </button>
                        <button onClick={() => handleReview(req.id, 'rejected')} disabled={isPending}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50">
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Apply for Leave">
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <Textarea label="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleApply} loading={isPending} className="flex-1">Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
