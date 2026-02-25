'use client'

// Función global para refrescar notificaciones
let globalNotificationRefresh: (() => void) | null = null

export function setGlobalNotificationRefresh(refreshFn: () => void) {
  globalNotificationRefresh = refreshFn
}

export function triggerNotificationRefresh() {
  if (globalNotificationRefresh) {
    globalNotificationRefresh()
  }
}

// También podemos usar eventos del navegador para comunicación entre componentes
export function broadcastNotificationUpdate() {
  // Disparar evento personalizado
  window.dispatchEvent(new CustomEvent('notificationUpdate', {
    detail: { timestamp: Date.now() }
  }))
}