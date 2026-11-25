import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { IconAlertCircle, IconCheckCircle, IconClose, IconInfo } from './icons/APlayerIcons'

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts)
  const dismissToast = useAppStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-elevated px-4 py-3 flex items-center gap-3 text-xs font-medium pointer-events-auto shadow-2xl"
        >
          {toast.tone === 'success' && <IconCheckCircle size={16} className="text-[#10B981] shrink-0" />}
          {toast.tone === 'error' && <IconAlertCircle size={16} className="text-rose-400 shrink-0" />}
          {toast.tone === 'info' && <IconInfo size={16} className="text-[var(--accent)] shrink-0" />}
          <span className="flex-1 leading-snug">{toast.text}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="opacity-60 hover:opacity-100 transition"
          >
            <IconClose size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
