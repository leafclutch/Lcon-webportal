'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { generateAttendanceCode, markAttendance } from '@/actions/attendance'
import { formatDateTime, statusColor } from '@/lib/utils'
import { Clock, QrCode, CheckCircle2, XCircle, Copy } from 'lucide-react'
import type { AttendanceCode, AttendanceLog } from '@/types'

interface AttendanceClientProps {
  logs: AttendanceLog[]
  activeCodes: AttendanceCode[]
  canGenerateCode: boolean
  canViewAll: boolean
}

export function AttendanceClient({ logs, activeCodes, canGenerateCode }: AttendanceClientProps) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [generatedCode, setGeneratedCode] = useState<{ code: string; type: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

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

  const today = new Date().toISOString().slice(0, 10)
  const todayLog = logs.find(l => l.date === today)

  return (
    <div className="space-y-6">
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

        {/* Generate codes (authorized only) */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-indigo-600"
                    onClick={() => handleCopy(generatedCode.code)}
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy code'}
                  </Button>
                </div>
              )}

              {/* Active codes */}
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

      {/* Attendance log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
