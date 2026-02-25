import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { notificationService } from '../../../../lib/notificationService'

// POST - Crear notificaciones de prueba (solo para desarrollo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { type = 'all' } = await request.json().catch(() => ({}))

    const testNotifications = []

    // Crear notificaciones de prueba directamente
    const testData = [
      {
        type: 'blog_post' as const,
        title: '📝 Nuevo post publicado',
        message: 'Se publicó: "Mi nueva estrategia de Blackjack"',
        link: '/blog/nueva-estrategia-blackjack'
      },
      {
        type: 'like' as const,
        title: '❤️ Nuevo like en tu post',
        message: 'A alguien le gustó tu post: "Guía completa de Casino Bot"',
        link: '/blog/guia-casino-bot'
      },
      {
        type: 'comment' as const,
        title: '💬 Nuevo comentario',
        message: 'Comentaron: "¡Excelente guía! Me ayudó mucho a mejorar mis estrategias."',
        link: '/blog/guia-casino-bot#comments'
      },
      {
        type: 'changelog' as const,
        title: '🔄 Nueva actualización',
        message: 'v2.1.0: Nuevas funciones de trading y sistema de notificaciones',
        link: '/changelog/v2-1-0'
      },
      {
        type: 'review' as const,
        title: '⭐ Nueva review recibida',
        message: 'Nueva review de 5 estrellas: "Increíble bot de casino, muy recomendado!"',
        link: '/reviews'
      },
      {
        type: 'system' as const,
        title: '🔔 Bienvenido al sistema de notificaciones',
        message: 'Ahora recibirás notificaciones sobre toda la actividad importante en Casino Bot.',
        link: '/notifications'
      }
    ]

    let createdCount = 0
    
    for (const notification of testData) {
      if (type === 'all' || type === notification.type) {
        const notificationId = await notificationService.createNotification({
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          metadata: { test: true, createdAt: new Date().toISOString() }
        })
        
        if (notificationId) {
          createdCount++
          testNotifications.push(notification.type)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notificaciones de prueba creadas', 
      types: testNotifications 
    })

  } catch (error) {
    console.error('Error creating test notifications:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}