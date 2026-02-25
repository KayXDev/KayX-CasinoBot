'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { notificationWS } from '@/lib/websocket'

interface Notification {
  id: number
  type: 'blog_post' | 'changelog' | 'review' | 'like' | 'comment' | 'system' | 'admin_message'
  title: string
  message: string
  link?: string
  actor_name?: string
  actor_avatar?: string
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Función para obtener notificaciones de la API
  const fetchNotifications = async (options: { unreadOnly?: boolean; limit?: number } = {}) => {
    try {
      const params = new URLSearchParams()
      if (options.unreadOnly) params.set('unread', 'true')
      if (options.limit) params.set('limit', options.limit.toString())

      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        return data.notifications
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
    return []
  }

  // Función para obtener conteo de no leídas
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/count?unread=true')
      if (response.ok) {
        const data = await response.json()
        return data.count
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
    return 0
  }

  // Marcar como leída
  const markAsRead = async (notificationIds: number[]) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        return true
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
    return false
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        return true
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
    return false
  }

  // Eliminar notificaciones
  const deleteNotifications = async (options: { read?: boolean; all?: boolean; ids?: number[] } = {}) => {
    try {
      const params = new URLSearchParams()
      if (options.read) params.set('read', 'true')
      if (options.all) params.set('all', 'true')
      if (options.ids) params.set('ids', options.ids.join(','))

      const response = await fetch(`/api/notifications/delete?${params}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (options.all) {
          setNotifications([])
          setUnreadCount(0)
        } else if (options.read) {
          setNotifications(prev => prev.filter(n => !n.is_read))
        } else if (options.ids) {
          setNotifications(prev => prev.filter(n => !options.ids!.includes(n.id)))
          const unreadDeleted = notifications.filter(n => options.ids!.includes(n.id) && !n.is_read).length
          setUnreadCount(prev => Math.max(0, prev - unreadDeleted))
        }
        return true
      }
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
    return false
  }

  // Inicializar datos
  useEffect(() => {
    if (session?.user) {
      const loadData = async () => {
        setLoading(true)
        const [notifs, count] = await Promise.all([
          fetchNotifications({ limit: 20 }),
          fetchUnreadCount()
        ])
        setNotifications(notifs)
        setUnreadCount(count)
        setLoading(false)
      }
      loadData()
    }
  }, [session])

  // Conectar WebSocket para tiempo real
  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id
      notificationWS.connect(userId)

      const unsubscribe = notificationWS.subscribe((message) => {
        switch (message.type) {
          case 'new_notification':
            setNotifications(prev => [message.data, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Opcional: Mostrar notificación del navegador
            if (Notification.permission === 'granted') {
              new Notification(message.data.title, {
                body: message.data.message,
                icon: '/favicon.ico'
              })
            }
            break

          case 'notification_read':
            setNotifications(prev =>
              prev.map(n => 
                message.data.ids.includes(n.id) ? { ...n, is_read: true } : n
              )
            )
            setUnreadCount(message.data.newCount)
            break

          case 'notification_count':
            setUnreadCount(message.data.count)
            break
        }
      })

      return () => {
        unsubscribe()
        notificationWS.disconnect()
      }
    }
  }, [session])

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshNotifications: () => fetchNotifications({ limit: 20 }).then(setNotifications)
  }
}