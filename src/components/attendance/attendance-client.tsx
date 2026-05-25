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
  clockIn,
  clockOut,
  startBreak,
  endBreak,
} from '@/actions/attendance'
import { statusColor } from '@/lib/utils'
import {
  Clock, QrCode, CheckCircle2, XCircle, Copy, Download,
  Users, User as UserIcon, Wifi, LogIn, LogOut as LogOutIcon,
  Coffee, Play, Timer,
} from 'lucide-react'
import type { AttendanceCode, AttendanceLog, AttendanceBreak } from '@/types'
import type { AllLog, AllLogBreak } from '@/actions/attendance'

interface UserInfo { id: string; name: string; email: string; avatar_url: string | null }

interface AttendanceClientProps {
  logs: AttendanceLog[]
  activeCodes: AttendanceCode[]
  allLogs: AllLog[]
  allUsers: UserInfo[]
  canGenerateCode: boolean
  canViewAll: boolean
  canExport: boolean
  canRemote: boolean
  todayBreaks: AttendanceBreak[]
  activeBreaks: { user_id: string }[]
  allPersonalBreaks: AttendanceBreak[]
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function breakDurationMins(b: AttendanceBreak) {
  const end = b.end_time ? new Date(b.end_time) : new Date()
  return Math.round((end.getTime() - new Date(b.start_time).getTime()) / 60000)
}

function totalBreakMins(breaks: AttendanceBreak[]) {
  return breaks.reduce((sum, b) => sum + breakDurationMins(b), 0)
}

function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcBreakMs(breaks: AllLogBreak[] | AttendanceBreak[]): number {
  return breaks.reduce((sum, b) => {
    if (!b.end_time) return sum
    return sum + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime())
  }, 0)
}

function calcWorkingHours(tapIn: string | null, tapOut: string | null, breaks: AllLogBreak[] | AttendanceBreak[]): string {
  if (!tapIn || !tapOut) return '—'
  const gross = new Date(tapOut).getTime() - new Date(tapIn).getTime()
  return formatDuration(gross - calcBreakMs(breaks))
}

function calcBreakHours(breaks: AllLogBreak[] | AttendanceBreak[]): string {
  const completed = breaks.filter(b => b.end_time)
  if (completed.length === 0) return '—'
  return formatDuration(calcBreakMs(completed))
}

export function AttendanceClient({
  logs,
  activeCodes,
  allLogs: initialAllLogs,
  allUsers,
  canGenerateCode,
  canViewAll,
  canExport,
  canRemote,
  todayBreaks,
  activeBreaks,
  allPersonalBreaks,
}: AttendanceClientProps) {
  const [tab, setTab] = useState<'my' | 'all'>('my')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [generatedCode, setGeneratedCode] = useState<{ code: string; type: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [filterUser, setFilterUser] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [allLogs, setAllLogs] = useState<AllLog[]>(initialAllLogs)
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]))

  const today = new Date().toISOString().slice(0, 10)
  const todayLog = logs.find(l => l.date === today)
  const openBreak = todayBreaks.find(b => b.end_time === null)

  type WorkState = 'not_started' | 'working' | 'on_break' | 'done'
  const workState: WorkState = (() => {
    if (!todayLog?.tap_in_time) return 'not_started'
    if (todayLog.tap_out_time) return 'done'
    if (openBreak) return 'on_break'
    return 'working'
  })()

  const activeBreakSet = new Set(activeBreaks.map(b => b.user_id))

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

  const handleClockIn = () => {
    startTransition(async () => {
      const res = await clockIn()
      setResult({ ok: res.success, message: res.success ? 'Clocked in remotely!' : res.error })
    })
  }

  const handleClockOut = () => {
    startTransition(async () => {
      const res = await clockOut()
      setResult({ ok: res.success, message: res.success ? 'Clocked out!' : res.error })
    })
  }

  const handleStartBreak = () => {
    startTransition(async () => {
      const res = await startBreak()
      setResult({ ok: res.success, message: res.success ? 'Break started.' : res.error })
    })
  }

  const handleEndBreak = () => {
    startTransition(async () => {
      const res = await endBreak()
      setResult({ ok: res.success, message: res.success ? 'Back to work!' : res.error })
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

  const userOptions = [
    { value: '', label: 'All Users' },
    ...allUsers.map(u => ({ value: u.id, label: u.name })),
  ]

  const stateConfig = {
    not_started: { label: 'Not Clocked In', dot: 'bg-gray-300', text: 'text-gray-500' },
    working: { label: 'Working', dot: 'bg-green-400 animate-pulse', text: 'text-green-600' },
    on_break: { label: 'On Break', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600' },
    done: { label: 'Done for the Day', dot: 'bg-blue-400', text: 'text-blue-600' },
  }[workState]

  return (
    <div className="space-y-6">
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

      {tab === 'my' && (
        <>
          {/* Today's Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer size={16} className="text-indigo-500" />
                Today's Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status pill */}
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${stateConfig.dot}`} />
                <span className={`text-sm font-semibold ${stateConfig.text}`}>{stateConfig.label}</span>
              </div>

              {/* Times row */}
              {todayLog && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Clock In</span>
                    <p className="font-medium">{todayLog.tap_in_time ? formatTime(todayLog.tap_in_time) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Clock Out</span>
                    <p className="font-medium">{todayLog.tap_out_time ? formatTime(todayLog.tap_out_time) : '—'}</p>
                  </div>
                  {todayBreaks.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Break Time</span>
                      <p className="font-medium">{totalBreakMins(todayBreaks)} min</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Type</span>
                    <p className="font-medium capitalize">{todayLog.type ?? 'onsite'}</p>
                  </div>
                </div>
              )}

              {/* Break buttons */}
              {(workState === 'working' || workState === 'on_break') && (
                <div className="flex gap-2">
                  {workState === 'working' && (
                    <Button
                      onClick={handleStartBreak}
                      loading={isPending}
                      variant="outline"
                      className="gap-2"
                    >
                      <Coffee size={14} />
                      Start Break
                    </Button>
                  )}
                  {workState === 'on_break' && (
                    <Button
                      onClick={handleEndBreak}
                      loading={isPending}
                      variant="outline"
                      className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Play size={14} />
                      Clock Back In
                    </Button>
                  )}
                </div>
              )}

              {/* Break timeline */}
              {todayBreaks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Breaks Today</p>
                  {todayBreaks.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <Coffee size={12} className="text-amber-400 shrink-0" />
                      <span>Break {i + 1}:</span>
                      <span>{formatTime(b.start_time)}</span>
                      <span className="text-gray-300">→</span>
                      <span>{b.end_time ? formatTime(b.end_time) : <span className="text-amber-500 font-medium">Ongoing</span>}</span>
                      <span className="text-gray-400 text-xs">({breakDurationMins(b)} min)</span>
                    </div>
                  ))}
                </div>
              )}

              {result && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {result.message}
                </div>
              )}
            </CardContent>
          </Card>

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
                <Input
                  label="Enter Code"
                  placeholder="Enter attendance code..."
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg tracking-widest"
                />
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

          {/* Remote attendance */}
          {canRemote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wifi size={16} className="text-indigo-500" />
                  Remote Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">Clock in or out remotely — no code required.</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleClockIn}
                    loading={isPending}
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={!!todayLog?.tap_in_time}
                  >
                    <LogIn size={14} />
                    Clock In
                  </Button>
                  <Button
                    onClick={handleClockOut}
                    loading={isPending}
                    variant="secondary"
                    className="flex-1 gap-2"
                    disabled={!todayLog?.tap_in_time || !!todayLog?.tap_out_time || workState === 'on_break'}
                  >
                    <LogOutIcon size={14} />
                    Clock Out
                  </Button>
                </div>
                {workState === 'on_break' && (
                  <p className="text-xs text-amber-600">End your break before clocking out.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* My history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable logs={logs} breaks={allPersonalBreaks} />
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'all' && canViewAll && (
        <div className="space-y-4">
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
                      <th className="pb-2 text-left font-medium text-gray-500">Clock In</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Clock Out</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Working Hrs</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Break Hrs</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Type</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allLogs.length === 0 ? (
                      <tr><td colSpan={8} className="py-6 text-center text-gray-400">No records found</td></tr>
                    ) : (
                      allLogs.map(log => {
                        const u = userMap[log.user_id]
                        const isOnBreak = activeBreakSet.has(log.user_id) && log.date === today
                        return (
                          <tr key={log.id}>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={u?.name ?? '?'} src={u?.avatar_url ?? null} size="sm" />
                                <div>
                                  <span className="font-medium text-gray-800">{u?.name ?? '—'}</span>
                                  {isOnBreak && (
                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600 font-medium">
                                      <Coffee size={10} />
                                      On Break
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 text-gray-600">{log.date}</td>
                            <td className="py-2 text-gray-600">
                              {log.tap_in_time ? new Date(log.tap_in_time).toLocaleTimeString() : '—'}
                            </td>
                            <td className="py-2 text-gray-600">
                              {log.tap_out_time ? new Date(log.tap_out_time).toLocaleTimeString() : '—'}
                            </td>
                            <td className="py-2 font-mono text-gray-700 text-xs">
                              {calcWorkingHours(log.tap_in_time, log.tap_out_time, log.breaks ?? [])}
                            </td>
                            <td className="py-2 font-mono text-gray-700 text-xs">
                              {calcBreakHours(log.breaks ?? [])}
                            </td>
                            <td className="py-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${log.type === 'remote' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 bg-gray-100'}`}>
                                {log.type === 'remote' ? (
                                  <span className="flex items-center gap-1"><Wifi size={10} />Remote</span>
                                ) : 'Onsite'}
                              </span>
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

function AttendanceTable({ logs, breaks }: { logs: AttendanceLog[]; breaks: AttendanceBreak[] }) {
  const breakMap = breaks.reduce<Record<string, AttendanceBreak[]>>((acc, b) => {
    if (!acc[b.log_id]) acc[b.log_id] = []
    acc[b.log_id].push(b)
    return acc
  }, {})

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left font-medium text-gray-500">Date</th>
            <th className="pb-2 text-left font-medium text-gray-500">Clock In</th>
            <th className="pb-2 text-left font-medium text-gray-500">Clock Out</th>
            <th className="pb-2 text-left font-medium text-gray-500">Working Hrs</th>
            <th className="pb-2 text-left font-medium text-gray-500">Break Hrs</th>
            <th className="pb-2 text-left font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <tr><td colSpan={6} className="py-6 text-center text-gray-400">No attendance records</td></tr>
          ) : (
            logs.map(log => {
              const logBreaks = breakMap[log.id] ?? []
              return (
                <tr key={log.id}>
                  <td className="py-2 font-medium">{log.date}</td>
                  <td className="py-2 text-gray-600">
                    {log.tap_in_time ? new Date(log.tap_in_time).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-2 text-gray-600">
                    {log.tap_out_time ? new Date(log.tap_out_time).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-2 font-mono text-gray-700 text-xs">
                    {calcWorkingHours(log.tap_in_time, log.tap_out_time, logBreaks)}
                  </td>
                  <td className="py-2 font-mono text-gray-700 text-xs">
                    {calcBreakHours(logBreaks)}
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
  )
}
