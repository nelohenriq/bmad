import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  BellOff,
  X,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationItem {
  id: string
  type: 'error' | 'warning' | 'success' | 'info'
  title: string
  message: string
  timestamp: Date
  feedId?: string
  feedName?: string
  read: boolean
  actionable?: boolean
}

export interface FeedNotificationsProps {
  className?: string
  maxVisible?: number
}

export function FeedNotifications({
  className,
  maxVisible = 5,
}: FeedNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showAll, setShowAll] = useState(false)

  // Mock notifications for now
  useEffect(() => {
    const mockNotifications: NotificationItem[] = [
      {
        id: '1',
        type: 'error',
        title: 'Feed Fetch Failed',
        message: 'TechCrunch feed timed out after 3 retries',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        feedId: 'feed-1',
        feedName: 'TechCrunch',
        read: false,
        actionable: true,
      },
      {
        id: '2',
        type: 'success',
        title: 'Feed Recovered',
        message: 'Wired feed is now working again',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        feedId: 'feed-2',
        feedName: 'Wired',
        read: true,
        actionable: false,
      },
      {
        id: '3',
        type: 'warning',
        title: 'Feed Health Declining',
        message: 'Ars Technica feed health score dropped to 65%',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        feedId: 'feed-3',
        feedName: 'Ars Technica',
        read: false,
        actionable: true,
      },
    ]

    setNotifications(mockNotifications)
  }, [])

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getNotificationStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const visibleNotifications = showAll
    ? notifications
    : notifications.slice(0, maxVisible)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>Feed Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <BellOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No notifications</p>
          </div>
        ) : (
          <>
            {visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border relative',
                  getNotificationStyle(notification.type),
                  !notification.read && 'ring-1 ring-blue-300'
                )}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      {notification.feedName && (
                        <p className="text-xs text-gray-600 mb-1">
                          {notification.feedName}
                        </p>
                      )}
                      <p className="text-sm text-gray-700">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {notification.actionable && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                      >
                        Take Action
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {notifications.length > maxVisible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full text-xs"
              >
                {showAll
                  ? 'Show Less'
                  : `Show ${notifications.length - maxVisible} More`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
