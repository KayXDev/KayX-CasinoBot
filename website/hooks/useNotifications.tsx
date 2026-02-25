'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface NotificationContextType {
  refreshNotifications: () => void
  refreshCount: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [countRefreshTrigger, setCountRefreshTrigger] = useState(0)

  const refreshNotifications = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const refreshCount = () => {
    setCountRefreshTrigger(prev => prev + 1)
  }

  return (
    <NotificationContext.Provider value={{ 
      refreshNotifications, 
      refreshCount 
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationRefresh() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationRefresh must be used within a NotificationProvider')
  }
  return context
}

// Hook para escuchar cambios globales de notificaciones
export function useNotificationListener() {
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  
  const triggerUpdate = () => {
    setLastUpdate(Date.now())
  }
  
  return { lastUpdate, triggerUpdate }
}