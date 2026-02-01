import { cn } from '@/lib/utils'
import { SESSION_STATUS } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const info = SESSION_STATUS[status as keyof typeof SESSION_STATUS] || {
    label: status,
    color: 'bg-gray-100 text-gray-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        info.color,
        className
      )}
    >
      {info.label}
    </span>
  )
}
