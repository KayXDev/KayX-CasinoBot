'use client'

interface WebSocketMessage {
  type: 'new_notification' | 'notification_read' | 'notification_count'
  data: any
}

class NotificationWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private listeners: Set<(message: WebSocketMessage) => void> = new Set()

  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return

    try {
      this.ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/notifications/${userId}`)
      
      this.ws.onopen = () => {
        console.log('🔔 Conectado al sistema de notificaciones en tiempo real')
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.listeners.forEach(listener => listener(message))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('🔔 Desconectado del sistema de notificaciones')
        this.attemptReconnect(userId)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to notifications WebSocket:', error)
    }
  }

  private attemptReconnect(userId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect(userId)
      }, Math.pow(2, this.reconnectAttempts) * 1000) // Backoff exponencial
    }
  }

  subscribe(listener: (message: WebSocketMessage) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  disconnect() {
    this.listeners.clear()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const notificationWS = new NotificationWebSocket()