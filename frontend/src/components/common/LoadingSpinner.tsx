import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
}

export default function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', size === 'md' && 'p-8', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-gray-200 border-t-primary',
          sizeClasses[size]
        )}
      />
    </div>
  )
}
