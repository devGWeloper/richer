interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-20 md:items-center md:pb-0">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4 mb-2 md:mx-4 md:mb-0">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2 md:flex-row md:justify-end md:gap-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white active:bg-red-600 md:w-auto md:rounded-md md:py-2"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl border px-4 py-3 text-sm font-medium text-gray-700 active:bg-gray-50 md:order-first md:w-auto md:rounded-md md:py-2"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
