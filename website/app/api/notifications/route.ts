import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

// Configuración de base de datos (deberías mover esto a un archivo de configuración)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  port: parseInt(process.env.DB_PORT || '3306')
}

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const connection = await mysql.createConnection(dbConfig)

    let query = `
      SELECT 
        n.*,
        NULL as actor_name,
        NULL as actor_avatar
      FROM web_notifications n
      WHERE n.user_id = ?
    `

    const params: any[] = [(session.user as any).id]

    if (unreadOnly) {
      query += ' AND n.is_read = FALSE'
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const [rows] = await connection.execute(query, params)
    await connection.end()

    return NextResponse.json({ notifications: rows })

  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nueva notificación (para uso interno/admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Solo admins pueden crear notificaciones manualmente
    if (!session?.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { userId, actorId, type, title, message, link, metadata } = await request.json()

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    const [result] = await connection.execute(
      `INSERT INTO web_notifications 
       (user_id, actor_id, type, title, message, link, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, actorId, type, title, message, link, JSON.stringify(metadata || {})]
    )

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      notificationId: (result as any).insertId 
    })

  } catch (error) {
    console.error('Error al crear notificación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}