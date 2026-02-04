import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToastStore, type ToastType } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />,
  info: <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />,
  warning: <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      className="fixed bottom-20 left-4 right-4 flex flex-col gap-2 md:bottom-4 md:left-auto md:right-4 md:max-w-md"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg md:rounded-lg',
            bgColors[toast.type]
          )}
        >
          {icons[toast.type]}
          <span className="flex-1 break-words text-sm font-medium text-gray-800">
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full active:bg-black/10"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  )
}
