import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  port: parseInt(process.env.DB_PORT || '3306')
}

// POST - Marcar notificaciones como leídas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { notificationIds, markAll = false } = await request.json()
    const userId = (session.user as any).id

    const connection = await mysql.createConnection(dbConfig)

    if (markAll) {
      // Marcar todas las notificaciones como leídas
      await connection.execute(
        'UPDATE web_notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      )
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificaciones específicas como leídas
      if (notificationIds.length > 0) {
        const placeholders = notificationIds.map(() => '?').join(',')
        await connection.execute(
          `UPDATE web_notifications SET is_read = TRUE WHERE user_id = ? AND id IN (${placeholders})`,
          [userId, ...notificationIds]
        )
      }
    } else {
      await connection.end()
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    await connection.end()

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error al marcar notificaciones como leídas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}