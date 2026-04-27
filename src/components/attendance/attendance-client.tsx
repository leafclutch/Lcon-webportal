'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
  generateAttendanceCode,
  markAttendance,
  getAllAttendanceLogs,
  exportAttendanceCsv,
} from '@/actions/attendance'
import { statusColor } from '@/lib/utils'
import { Clock, QrCode, CheckCircle2, XCircle, Copy, Download, Users, User as UserIcon } from 'lucide-react'
import type { AttendanceCode, AttendanceLog } from '@/types'
import type { AllLog } from '@/actions/attendance'

interface UserInfo { id: string; name: string; email: string; avatar_url: string | null }

interface AttendanceClientProps {
  logs: AttendanceLog[]
  activeCodes: AttendanceCode[]
  allLogs: AllLog[]
  allUsers: UserInfo[]
  canGenerateCode: boolean
  canViewAll: boolean
  canExport: boolean
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
]

export function AttendanceClient({
  logs,
  activeCodes,
  allLogs: initialAllLogs,
  allUsers,
  canGenerateCode,
  canViewAll,
  canExport,
}: AttendanceClientProps) {
  const [tab, setTab] = useState<'my' | 'all'>('my')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [generatedCode, setGeneratedCode] = useState<{ code: string; type: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  // All-users filters
  const [filterUser, setFilterUser] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [allLogs, setAllLogs] = useState<AllLog[]>(initialAllLogs)
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]))

  const handleMarkAttendance = () => {
    if (!code.trim()) return
    startTransition(async () => {
      const res = await markAttendance(code.trim())
      setResult({ ok: res.success, message: res.success ? 'Attendance marked!' : res.error })
      if (res.success) setCode('')
    })
  }

  const handleGenerate = (type: 'tap_in' | 'tap_out') => {
    startTransition(async () => {
      const res = await generateAttendanceCode(type)
      if (res.success) setGeneratedCode({ code: res.data.code, type })
      else setResult({ ok: false, message: res.error })
    })
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApplyFilters = () => {
    startTransition(async () => {
      const data = await getAllAttendanceLogs({
        userId: filterUser || undefined,
        startDate: filterStart || undefined,
        endDate: filterEnd || undefined,
        status: filterStatus || undefined,
      })
      setAllLogs(data as AllLog[])
    })
  }

  const handleExport = () => {
    startTransition(async () => {
      const res = await exportAttendanceCsv({
        userId: filterUser || undefined,
        startDate: filterStart || undefined,
        endDate: filterEnd || undefined,
        status: filterStatus || undefined,
      })
      if (!res.success) return
      const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.data.filename
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayLog = logs.find(l => l.date === today)

  const userOptions = [
    { value: '', label: 'All Users' },
    ...allUsers.map(u => ({ value: u.id, label: u.name })),
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar (only shown when canViewAll) */}
      {canViewAll && (
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          <button
            onClick={() => setTab('my')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserIcon size={14} />
            My Attendance
          </button>
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={14} />
            All Users
          </button>
        </div>
      )}

      {/* My Attendance Tab */}
      {tab === 'my' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Mark attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock size={16} className="text-indigo-500" />
                  Mark Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayLog && (
                  <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(todayLog.status)}`}>
                        {todayLog.status}
                      </span>
                    </div>
                    {todayLog.tap_in_time && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tap In</span>
                        <span>{new Date(todayLog.tap_in_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {todayLog.tap_out_time && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tap Out</span>
                        <span>{new Date(todayLog.tap_out_time).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                )}
                <Input
                  label="Enter Code"
                  placeholder="Enter attendance code..."
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg tracking-widest"
                />
                {result && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {result.message}
                  </div>
                )}
                <Button onClick={handleMarkAttendance} loading={isPending} className="w-full" disabled={!code}>
                  Submit Code
                </Button>
              </CardContent>
            </Card>

            {/* Generate codes */}
            {canGenerateCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode size={16} className="text-indigo-500" />
                    Generate Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={() => handleGenerate('tap_in')} loading={isPending} variant="outline" className="flex-1">
                      Tap In Code
                    </Button>
                    <Button onClick={() => handleGenerate('tap_out')} loading={isPending} variant="secondary" className="flex-1">
                      Tap Out Code
                    </Button>
                  </div>
                  {generatedCode && (
                    <div className="rounded-xl bg-indigo-50 p-4 text-center">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-400">
                        {generatedCode.type.replace('_', ' ')} Code
                      </p>
                      <p className="font-mono text-3xl font-bold tracking-widest text-indigo-700">
                        {generatedCode.code}
                      </p>
                      <p className="mt-1 text-xs text-indigo-400">Expires in 15 minutes</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-indigo-600" onClick={() => handleCopy(generatedCode.code)}>
                        <Copy size={14} />
                        {copied ? 'Copied!' : 'Copy code'}
                      </Button>
                    </div>
                  )}
                  {activeCodes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Active Codes</p>
                      {activeCodes.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                          <span className="font-mono font-bold text-green-700">{c.code}</span>
                          <Badge variant="success">{c.type.replace('_', ' ')}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* My history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable logs={logs} />
            </CardContent>
          </Card>
        </>
      )}

      {/* All Users Tab */}
      {tab === 'all' && canViewAll && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Select
                  options={userOptions}
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="w-44"
                  label="User"
                />
                <Input
                  label="From"
                  type="date"
                  value={filterStart}
                  onChange={e => setFilterStart(e.target.value)}
                  className="w-36"
                />
                <Input
                  label="To"
                  type="date"
                  value={filterEnd}
                  onChange={e => setFilterEnd(e.target.value)}
                  className="w-36"
                />
                <Select
                  label="Status"
                  options={STATUS_FILTER_OPTIONS}
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-36"
                />
                <div className="flex items-end gap-2">
                  <Button onClick={handleApplyFilters} loading={isPending}>
                    Apply
                  </Button>
                  {canExport && (
                    <Button variant="outline" onClick={handleExport} loading={isPending} className="gap-1.5">
                      <Download size={14} />
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All-user table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                All Attendance Records
                <span className="ml-2 text-sm font-normal text-gray-400">({allLogs.length} records)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left font-medium text-gray-500">User</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Date</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Tap In</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Tap Out</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allLogs.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No records found</td></tr>
                    ) : (
                      allLogs.map(log => {
                        const u = userMap[log.user_id]
                        return (
                        <tr key={log.id}>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <Avatar name={u?.name ?? '?'} src={u?.avatar_url ?? null} size="sm" />
                              <span className="font-medium text-gray-800">{u?.name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="py-2 text-gray-600">{log.date}</td>
                          <td className="py-2 text-gray-600">
                            {log.tap_in_time ? new Date(log.tap_in_time).toLocaleTimeString() : '—'}
                          </td>
                          <td className="py-2 text-gray-600">
                            {log.tap_out_time ? new Date(log.tap_out_time).toLocaleTimeString() : '—'}
                          </td>
                          <td className="py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function AttendanceTable({ logs }: { logs: AttendanceLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left font-medium text-gray-500">Date</th>
            <th className="pb-2 text-left font-medium text-gray-500">Tap In</th>
            <th className="pb-2 text-left font-medium text-gray-500">Tap Out</th>
            <th className="pb-2 text-left font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <tr><td colSpan={4} className="py-6 text-center text-gray-400">No attendance records</td></tr>
          ) : (
            logs.map(log => (
              <tr key={log.id}>
                <td className="py-2 font-medium">{log.date}</td>
                <td className="py-2 text-gray-600">
                  {log.tap_in_time ? new Date(log.tap_in_time).toLocaleTimeString() : '—'}
                </td>
                <td className="py-2 text-gray-600">
                  {log.tap_out_time ? new Date(log.tap_out_time).toLocaleTimeString() : '—'}
                </td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
