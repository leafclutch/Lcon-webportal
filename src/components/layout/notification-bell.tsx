'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/actions/notifications'
import { formatRelative } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  message:      '💬',
  task:         '✅',
  warning:      '⚠️',
  leave:        '🏖️',
  announcement: '📢',
  reminder:     '🔔',
  system:       '⚙️',
}

interface NotificationBellProps {
  userId: string | undefined
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications(userId)

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMarkRead = (id: string) => {
    markRead(id)
    startTransition(async () => { await markNotificationRead(id) })
  }

  const handleMarkAllRead = () => {
    markAllRead()
    startTransition(async () => { await markAllNotificationsRead() })
  }

  const handleDelete = (id: string) => {
    remove(id)
    startTransition(async () => { await deleteNotification(id) })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="rounded p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                <Bell className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <li
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      !n.is_read ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                    )}
                  >
                    <span className="mt-0.5 text-base">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm leading-snug', !n.is_read ? 'font-medium text-gray-900' : 'text-gray-700')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{formatRelative(n.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="rounded p-0.5 text-gray-300 hover:text-indigo-500 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="rounded p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
