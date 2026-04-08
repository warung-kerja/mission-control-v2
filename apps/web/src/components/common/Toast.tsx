import type { FC } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from './ui'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

// Simple toast store
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]))
}

export const toast = {
  success: (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    toasts = [{ id, type: 'success', title, message, duration }, ...toasts]
    notifyListeners()
    setTimeout(() => toast.dismiss(id), duration)
  },
  error: (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    toasts = [{ id, type: 'error', title, message, duration }, ...toasts]
    notifyListeners()
    setTimeout(() => toast.dismiss(id), duration)
  },
  warning: (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    toasts = [{ id, type: 'warning', title, message, duration }, ...toasts]
    notifyListeners()
    setTimeout(() => toast.dismiss(id), duration)
  },
  info: (title: string, message?: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    toasts = [{ id, type: 'info', title, message, duration }, ...toasts]
    notifyListeners()
    setTimeout(() => toast.dismiss(id), duration)
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  },
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const toastIconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const ToastItem: FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const Icon = toastIcons[toast.type]

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg',
        'transform transition-all duration-300 ease-out',
        'animate-in slide-in-from-right-full',
        toastStyles[toast.type]
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', toastIconColors[toast.type])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.message && (
              <p className="text-sm mt-1 opacity-90">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const ToastContainer: FC = () => {
  const [localToasts, setLocalToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setLocalToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  const handleDismiss = useCallback((id: string) => {
    toast.dismiss(id)
  }, [])

  if (localToasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {localToasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
