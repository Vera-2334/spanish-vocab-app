"use client"

import { CheckCircle, AlertTriangle, Info, X } from "lucide-react"
import { useToastStore } from "@/stores/toastStore"
import type { ToastType } from "@/stores/toastStore"

const TYPE_CONFIG: Record<ToastType, { bg: string; border: string; icon: typeof CheckCircle }> = {
  success: {
    bg: "bg-[var(--color-secondary)]/10",
    border: "border-[var(--color-secondary)]",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-50",
    border: "border-[var(--color-error)]",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-[var(--color-primary-light)]",
    border: "border-[var(--color-primary)]",
    icon: Info,
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[var(--z-toast)] space-y-2 max-w-sm w-72">
      {toasts.map((toast) => {
        const config = TYPE_CONFIG[toast.type]
        const Icon = config.icon
        return (
          <div
            key={toast.id}
            className={`${config.bg} border-2 ${config.border} rounded-2xl p-3 flex items-start gap-2 shadow-lg animate-in`}
            role="alert"
          >
            <Icon
              size={16}
              className={`shrink-0 mt-0.5 ${
                toast.type === "success"
                  ? "text-[var(--color-secondary)]"
                  : toast.type === "error"
                    ? "text-[var(--color-error)]"
                    : "text-[var(--color-primary)]"
              }`}
            />
            <p className="text-sm text-[var(--color-text-primary)] flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}