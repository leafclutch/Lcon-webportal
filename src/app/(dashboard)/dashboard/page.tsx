import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatRelative, statusColor, priorityColor } from '@/lib/utils'
import {
  Users, CheckSquare, CalendarOff, AlertTriangle,
  Clock, FolderOpen, FileText,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  const [
    { count: userCount },
    { count: taskCount },
    { count: leaveCount },
    { count: warningCount },
    { data: rawAnnouncements },
    { data: rawTasks },
    { data: rawUpdates },
    { data: myAttendance },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('warnings').select('*', { count: 'exact', head: true }),
    supabase.from('announcements').select('id, title, content, created_at, created_by').order('created_at', { ascending: false }).limit(3),
    supabase.from('tasks').select('id, title, priority, status, deadline, assigned_to').eq('assigned_to', currentUser?.id ?? '').order('created_at', { ascending: false }).limit(5),
    supabase.from('daily_updates').select('id, user_id, content, created_at').order('created_at', { ascending: false }).limit(4),
    supabase.from('attendance_logs').select('date, status, tap_in_time, tap_out_time').eq('user_id', currentUser?.id ?? '').order('date', { ascending: false }).limit(30),
  ])

  // Resolve users for announcements
  const announcerIds = [...new Set((rawAnnouncements ?? []).map(a => a.created_by))]
  const { data: announcers } = announcerIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', announcerIds)
    : { data: [] }
  const announcerMap = Object.fromEntries((announcers ?? []).map(u => [u.id, u]))

  // Resolve users for updates
  const updaterIds = [...new Set((rawUpdates ?? []).map(u => u.user_id))]
  const { data: updaters } = updaterIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', updaterIds)
    : { data: [] }
  const updaterMap = Object.fromEntries((updaters ?? []).map(u => [u.id, u]))

  const announcements = (rawAnnouncements ?? []).map(a => ({
    ...a,
    author: announcerMap[a.created_by] ?? { name: 'Unknown', avatar_url: null },
  }))
  const updates = (rawUpdates ?? []).map(u => ({
    ...u,
    users: updaterMap[u.user_id] ?? null,
  }))

  const attendanceDays = myAttendance ?? []
  const presentDays = attendanceDays.filter(a => a.status === 'present' || a.status === 'late').length

  return (
    <DashboardShell title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Good morning, {currentUser?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Team Members" value={userCount ?? 0} icon={Users} color="indigo" />
          <StatCard title="Pending Tasks" value={taskCount ?? 0} icon={CheckSquare} color="yellow" />
          <StatCard title="Leave Requests" value={leaveCount ?? 0} icon={CalendarOff} color="blue" />
          <StatCard title="Warnings Issued" value={warningCount ?? 0} icon={AlertTriangle} color="red" />
        </div>

        {/* Attendance heatmap */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock size={16} className="text-indigo-500" />
                Attendance Overview (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-2xl font-bold text-green-600">{presentDays}</span>
                  <span className="ml-1 text-gray-500">Present</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-500">{30 - presentDays}</span>
                  <span className="ml-1 text-gray-500">Absent</span>
                </div>
              </div>
              <AttendanceHeatmap logs={attendanceDays} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Today&apos;s Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {attendanceDays[0]?.date === new Date().toISOString().slice(0, 10) ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(attendanceDays[0].status)}`}>
                      {attendanceDays[0].status}
                    </span>
                  </div>
                  {attendanceDays[0].tap_in_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tap In</span>
                      <span className="font-medium">{new Date(attendanceDays[0].tap_in_time).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {attendanceDays[0].tap_out_time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tap Out</span>
                      <span className="font-medium">{new Date(attendanceDays[0].tap_out_time).toLocaleTimeString()}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">No attendance recorded today</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Three-column feed */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* My Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare size={16} className="text-indigo-500" />
                My Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(rawTasks ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No tasks assigned</p>
              ) : (
                <ul className="space-y-3">
                  {(rawTasks ?? []).map(task => (
                    <li key={task.id} className="flex items-start gap-2">
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        {task.deadline && (
                          <p className="text-xs text-gray-400">Due {formatDate(task.deadline)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen size={16} className="text-indigo-500" />
                Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400">No announcements</p>
              ) : (
                <ul className="space-y-3">
                  {announcements.map(a => (
                    <li key={a.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{a.content}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatRelative(a.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Daily Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText size={16} className="text-indigo-500" />
                Daily Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <p className="text-sm text-gray-400">No updates posted</p>
              ) : (
                <ul className="space-y-3">
                  {updates.map(u => (
                    <li key={u.id} className="flex gap-3">
                      <Avatar name={u.users?.name ?? '?'} src={u.users?.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700">{u.users?.name}</p>
                        <p className="line-clamp-2 text-xs text-gray-500">{u.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

function AttendanceHeatmap({ logs }: { logs: { date: string; status: string }[] }) {
  const statusToColor: Record<string, string> = {
    present:  'bg-green-500',
    late:     'bg-yellow-400',
    absent:   'bg-red-400',
    half_day: 'bg-orange-400',
  }
  const logMap = Object.fromEntries(logs.map(l => [l.date, l.status]))
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map(day => (
        <div
          key={day}
          title={`${day}: ${logMap[day] ?? 'no data'}`}
          className={`h-5 w-5 rounded-sm ${logMap[day] ? statusToColor[logMap[day]] : 'bg-gray-100'}`}
        />
      ))}
      <div className="mt-2 flex w-full items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-green-500" /> Present</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-yellow-400" /> Late</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-red-400" /> Absent</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-gray-100" /> No data</span>
      </div>
    </div>
  )
}
