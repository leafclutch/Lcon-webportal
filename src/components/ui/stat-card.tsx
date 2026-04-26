import { cn } from '@/lib/utils'
import { Card } from './card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  color?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue'
  className?: string
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'ring-green-100' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'ring-red-100' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'ring-blue-100' },
}

export function StatCard({ title, value, change, icon: Icon, color = 'indigo', className }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && <p className="mt-1 text-xs text-gray-500">{change}</p>}
        </div>
        <div className={cn('rounded-xl p-3 ring-8', colors.bg, colors.ring)}>
          <Icon className={cn('h-6 w-6', colors.icon)} />
        </div>
      </div>
    </Card>
  )
}
