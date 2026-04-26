import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function generateCode(length = 6): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function priorityColor(priority: string) {
  const map: Record<string, string> = {
    low: 'text-blue-500 bg-blue-50',
    medium: 'text-yellow-500 bg-yellow-50',
    high: 'text-orange-500 bg-orange-50',
    urgent: 'text-red-500 bg-red-50',
  }
  return map[priority] ?? 'text-gray-500 bg-gray-50'
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    in_progress: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    cancelled: 'text-red-600 bg-red-50',
    approved: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
    present: 'text-green-600 bg-green-50',
    late: 'text-yellow-600 bg-yellow-50',
    absent: 'text-red-600 bg-red-50',
    half_day: 'text-orange-600 bg-orange-50',
    active: 'text-green-600 bg-green-50',
    on_hold: 'text-yellow-600 bg-yellow-50',
  }
  return map[status] ?? 'text-gray-600 bg-gray-50'
}
