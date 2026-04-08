import type { FC } from 'react'
import { usePresence, type PresenceStatus } from '../../hooks/usePresence'
import { cn } from './ui'

interface PresenceIndicatorProps {
  userId: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
}

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

export const PresenceIndicator: FC<PresenceIndicatorProps> = ({
  userId,
  size = 'md',
  showLabel = false,
  className,
}) => {
  const { getUserStatus } = usePresence()
  const status = getUserStatus(userId)

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full ring-2 ring-white',
          statusColors[status],
          sizeClasses[size]
        )}
        title={statusLabels[status]}
      />
      {showLabel && (
        <span className="text-xs text-gray-500">{statusLabels[status]}</span>
      )}
    </div>
  )
}

interface OnlineUsersBadgeProps {
  className?: string
}

export const OnlineUsersBadge: FC<OnlineUsersBadgeProps> = ({ className }) => {
  const { onlineCount } = usePresence()

  if (onlineCount === 0) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-green-50 text-green-700 text-xs font-medium',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      {onlineCount} online
    </div>
  )
}
