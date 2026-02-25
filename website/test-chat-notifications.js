import fetch from 'node-fetch'

const testChatNotification = async () => {
  console.log('🧪 Probando notificaciones de chat admin...')
  
  try {
    const response = await fetch('http://localhost:3000/api/notifications/admin-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // En un caso real, esto vendría de la sesión autenticada
        'Cookie': 'next-auth.session-token=test-session'
      },
      body: JSON.stringify({
        message: 'Este es un mensaje de prueba del chat de administradores',
        sender_name: 'Administrador Test',
        sender_id: 'test-admin-id'
      })
    })

    const data = await response.json()
    console.log('📊 Respuesta del API:', data)

    if (data.success) {
      console.log(`✅ Se enviaron ${data.notifications_sent} notificaciones exitosamente`)
    } else {
      console.error('❌ Error:', data.error)
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  }
}

testChatNotification()