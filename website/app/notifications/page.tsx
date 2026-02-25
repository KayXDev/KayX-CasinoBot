'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, CheckCheck, Clock, Heart, MessageCircle, FileText, Settings, Filter, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface Notification {
  id: number
  type: 'blog_post' | 'changelog' | 'review' | 'like' | 'comment' | 'system'
  title: string
  message: string
  link?: string
  actor_name?: string
  actor_avatar?: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false) // Change to false for faster loading
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const getIcon = (type: string) => {
    switch (type) {
      case 'blog_post':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'changelog':
        return <Settings className="w-5 h-5 text-green-500" />
      case 'review':
        return <MessageCircle className="w-5 h-5 text-yellow-500" />
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-purple-500" />
      case 'system':
        return <Bell className="w-5 h-5 text-gray-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const unreadParam = filter === 'unread' ? '&unread=true' : ''
      const response = await fetch(`/api/notifications?limit=50${unreadParam}`)
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] })
      })
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteReadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/delete?read=true', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.is_read))
        // Refrescar datos
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const deleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete ALL notifications?')) {
      return
    }

    try {
      const response = await fetch('/api/notifications/delete?all=true', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications([])
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
    }
  }, [session, filter])

  // Redireccionar si no hay sesión
  if (!session) {
    router.push('/api/auth/signin')
    return null
  }

  const filteredNotifications = notifications.filter(n => {
    if (typeFilter === 'all') return true
    return n.type === typeFilter
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
                <Bell className="w-8 h-8 text-casino-400" />
                <span>Notifications</span>
              </h1>
              <p className="text-gray-400 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 bg-casino-600 hover:bg-casino-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all as read</span>
              </button>
            )}
            
            {notifications.some(n => n.is_read) && (
              <button
                onClick={deleteReadNotifications}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete read</span>
              </button>
            )}
            
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete all</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-casino-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-casino-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-casino-400 focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="blog_post">Blog posts</option>
            <option value="changelog">Changelog</option>
            <option value="review">Reviews</option>
            <option value="like">Likes</option>
            <option value="comment">Comments</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-5 h-5 bg-gray-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-gray-400">
              {filter === 'unread' 
                ? 'All your notifications are up to date' 
                : 'Notifications will appear here when there is activity'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gray-800/50 border border-gray-700/50 rounded-lg hover:border-gray-600/50 transition-all ${
                  !notification.is_read ? 'border-l-4 border-l-casino-500 bg-gray-800/70' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-medium ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              {getTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-casino-400 hover:text-casino-300 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-sm mb-3 ${notification.is_read ? 'text-gray-500' : 'text-gray-300'}`}>
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        {notification.type !== 'system' && (
                          <span className="text-xs text-casino-400">
                            {notification.message.includes('by ') ? '' : 'System'}
                          </span>
                        )}
                        
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                            className="text-casino-400 hover:text-casino-300 text-sm font-medium transition-colors"
                          >
                            View more →
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-casino-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}