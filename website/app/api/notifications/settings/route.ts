import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  port: parseInt(process.env.DB_PORT || '3306')
}

// GET - Obtener configuración de notificaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const connection = await mysql.createConnection(dbConfig)

    const [rows] = await connection.execute(
      'SELECT * FROM notification_settings WHERE user_id = ?',
      [userId]
    )

    await connection.end()

    const settings = (rows as any[])[0] || {
      blog_notifications: true,
      changelog_notifications: true,
      review_notifications: true,
      like_notifications: true,
      comment_notifications: true,
      system_notifications: true,
      email_notifications: false,
      push_notifications: false,
      sound_notifications: true
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Actualizar configuración de notificaciones
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const updates = await request.json()

    // Validar campos permitidos
    const allowedFields = [
      'blog_notifications',
      'changelog_notifications',
      'review_notifications',
      'like_notifications',
      'comment_notifications',
      'system_notifications',
      'email_notifications',
      'push_notifications',
      'sound_notifications'
    ]

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = Boolean(updates[key])
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Insertar o actualizar configuración
    const setClause = Object.keys(filteredUpdates)
      .map(key => `${key} = ?`)
      .join(', ')
    
    const values = Object.values(filteredUpdates)

    await connection.execute(
      `INSERT INTO notification_settings (user_id, ${Object.keys(filteredUpdates).join(', ')})
       VALUES (?, ${Object.keys(filteredUpdates).map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE ${setClause}`,
      [userId, ...values, ...values]
    )

    await connection.end()

    return NextResponse.json({ success: true, updated: filteredUpdates })

  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}