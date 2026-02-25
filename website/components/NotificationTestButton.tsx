'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export function NotificationTestButton() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const createTestNotifications = async () => {
    if (!session?.user) return

    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage('✅ Notificaciones de prueba creadas correctamente!')
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error al crear notificaciones de prueba')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg p-4 shadow-xl">
        <h3 className="text-white font-semibold mb-2">🧪 Test Notificaciones</h3>
        <button
          onClick={createTestNotifications}
          disabled={loading}
          className="bg-casino-600 hover:bg-casino-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors w-full mb-2"
        >
          {loading ? 'Creando...' : 'Crear Notificaciones de Prueba'}
        </button>
        {message && (
          <p className={`text-sm ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}