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

// DELETE - Borrar notificaciones
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deleteAll = searchParams.get('all') === 'true'
    const onlyRead = searchParams.get('read') === 'true'

    const userId = (session.user as any).id
    const connection = await mysql.createConnection(dbConfig)

    let query = 'DELETE FROM web_notifications WHERE user_id = ?'
    const params = [userId]

    if (!deleteAll && onlyRead) {
      // Solo borrar las leídas
      query += ' AND is_read = TRUE'
    } else if (!deleteAll) {
      // Por defecto, solo borrar las leídas si no se especifica
      query += ' AND is_read = TRUE'
    }
    // Si deleteAll=true, borra todas sin condición adicional

    const [result] = await connection.execute(query, params)
    await connection.end()

    const deletedCount = (result as any).affectedRows

    return NextResponse.json({ 
      success: true,
      deletedCount,
      message: `${deletedCount} notificación${deletedCount !== 1 ? 'es' : ''} eliminada${deletedCount !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('Error al borrar notificaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}