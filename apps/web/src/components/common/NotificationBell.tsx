import type { FC } from 'react'
import { useState } from 'react'
import { Bell, Check, CheckCheck, Trash2, Clock, User, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react'
import { useNotifications, type Notification } from '../../hooks/useNotifications'
import { Button, Badge } from './ui'
import { formatDistanceToNow } from 'date-fns'

const notificationIcons = {
  task_assigned: User,
  task_completed: CheckCircle,
  task_due_soon: Clock,
  project_invite: User,
  mention: MessageSquare,
  system: AlertCircle,
}

const notificationColors = {
  task_assigned: 'bg-blue-100 text-blue-600',
  task_completed: 'bg-green-100 text-green-600',
  task_due_soon: 'bg-yellow-100 text-yellow-600',
  project_invite: 'bg-purple-100 text-purple-600',
  mention: 'bg-indigo-100 text-indigo-600',
  system: 'bg-gray-100 text-gray-600',
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const Icon = notificationIcons[notification.type] || AlertCircle
  const colorClass = notificationColors[notification.type] || notificationColors.system

  return (
    <div
      className={`group relative flex items-start gap-3 p-3 rounded-lg transition-colors ${
        notification.read ? 'bg-white' : 'bg-blue-50'
      } hover:bg-gray-50`}
    >
      <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkAsRead(notification.id)}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(notification.id)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
        </Button>
      </div>
    </div>
  )
}

export const NotificationBell: FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
