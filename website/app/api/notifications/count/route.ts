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

// GET - Contar notificaciones no leídas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const connection = await mysql.createConnection(dbConfig)

    const [rows] = await connection.execute(
      'SELECT COUNT(*) as unread_count FROM web_notifications WHERE user_id = ? AND is_read = FALSE',
      [(session.user as any).id]
    )

    await connection.end()

    const unreadCount = (rows as any)[0].unread_count

    return NextResponse.json({ unreadCount })

  } catch (error) {
    console.error('Error al contar notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}