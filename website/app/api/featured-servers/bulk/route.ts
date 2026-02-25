import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que sea owner
    const userProfile = (session.user as any)?.profile || {}
    const isOwner = userProfile.role === 'owner'

    if (!isOwner) {
      return NextResponse.json({ error: 'Solo el owner puede eliminar todos los servidores' }, { status: 403 })
    }

    const body = await request.json()
    const { type } = body // 'all', 'preview', 'featured'

    const connection = await mysql.createConnection(dbConfig)

    if (type === 'all') {
      // Eliminar todos los servidores
      await connection.execute('DELETE FROM featured_servers')
      await connection.execute('DELETE FROM server_requests')
    } else if (type === 'preview') {
      // Eliminar solo servidores temporales/preview
      await connection.execute('DELETE FROM featured_servers WHERE level = "Preview" OR featured = FALSE')
    } else if (type === 'featured') {
      // Eliminar solo servidores destacados
      await connection.execute('DELETE FROM featured_servers WHERE featured = TRUE')
    }

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: `Servidores eliminados correctamente (${type})` 
    })

  } catch (error) {
    console.error('Error deleting servers:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}