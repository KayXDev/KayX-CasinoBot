'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, Clock, Heart, MessageCircle, FileText, Settings, ChevronRight, Trash2, Shield } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { setGlobalNotificationRefresh } from '../lib/notificationRefresh'

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

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: number) => void
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'blog_post':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'changelog':
        return <Settings className="w-4 h-4 text-green-500" />
      case 'review':
        return <MessageCircle className="w-4 h-4 text-yellow-500" />
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-purple-500" />
      case 'admin_message':
        return <Shield className="w-4 h-4 text-orange-500" />
      case 'system':
        return <Bell className="w-4 h-4 text-gray-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'hace un momento'
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)}d`
    return date.toLocaleDateString()
  }

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id)
    }
  }

  const content = (
    <div
      onClick={handleClick}
      className={`flex items-start space-x-3 p-3 hover:bg-gray-800/50 transition-colors cursor-pointer border-l-2 ${
        notification.is_read ? 'border-transparent opacity-75' : 'border-casino-500 bg-gray-800/20'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
            {notification.title}
          </p>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">
              {getTimeAgo(notification.created_at)}
            </span>
          </div>
        </div>
        
        <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-300'}`}>
          {notification.message}
        </p>
        
        {notification.message.includes('por ') ? null : (
          <p className="text-xs text-casino-400 mt-1">
            Sistema
          </p>
        )}
      </div>
      
      {!notification.is_read && (
        <div className="w-2 h-2 bg-casino-500 rounded-full flex-shrink-0 mt-2"></div>
      )}
      
      {notification.link && (
        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-2" />
      )}
    </div>
  )

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    )
  }

  return content
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Obtener notificaciones
  const fetchNotifications = async () => {
    if (!session?.user) return
    
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error al obtener notificaciones:', error)
    }
  }

  // Obtener conteo de no leídas
  const fetchUnreadCount = async () => {
    if (!session?.user) return
    
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error al obtener conteo:', error)
    }
  }

  // Marcar notificación como leída
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
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error)
    }
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Borrar notificaciones leídas
  const deleteReadNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/delete?read=true', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Actualizar la lista removiendo las leídas
        setNotifications(prev => prev.filter(n => !n.is_read))
        // Refrescar el conteo
        fetchUnreadCount()
      }
    } catch (error) {
      console.error('Error al borrar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales y configurar polling
  useEffect(() => {
    if (session?.user) {
      fetchNotifications()
      fetchUnreadCount()
      
      // Registrar función de refresh global
      const refreshAll = () => {
        fetchNotifications()
        fetchUnreadCount()
      }
      setGlobalNotificationRefresh(refreshAll)
      
      // Polling más frecuente - cada 10 segundos para mejor experiencia
      const interval = setInterval(() => {
        fetchUnreadCount()
        if (isOpen) {
          fetchNotifications()
        }
      }, 10000) // Reducido de 30 segundos a 10 segundos
      
      // Escuchar eventos de actualización de notificaciones
      const handleNotificationUpdate = () => {
        refreshAll()
      }
      
      window.addEventListener('notificationUpdate', handleNotificationUpdate)
      
      return () => {
        clearInterval(interval)
        window.removeEventListener('notificationUpdate', handleNotificationUpdate)
      }
    }
  }, [session, isOpen])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // No mostrar si no hay sesión
  if (!session?.user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
        className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge de conteo */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-casino-400 hover:text-casino-300 text-sm flex items-center space-x-1 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Marcar todas</span>
                </button>
              )}
              
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={deleteReadNotifications}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1 transition-colors"
                  title="Borrar notificaciones leídas"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
              <Link
                href="/notifications"
                className="text-casino-400 hover:text-casino-300 text-sm flex items-center justify-center space-x-1 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span>Ver todas las notificaciones</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}