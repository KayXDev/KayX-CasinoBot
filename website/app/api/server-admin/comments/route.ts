import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot'
}

// Verificar si el usuario es admin del servidor (no owner)
async function isServerAdmin(userId: string): Promise<boolean> {
  if (userId === '388422519553654786') return false // Owner no es server admin
  
  try {
    const GUILD_ID = '1382476289151336460'
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

    if (!BOT_TOKEN) return false

    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
    })

    if (!memberResponse.ok) return false

    const memberData = await memberResponse.json()
    const userRoles = memberData.roles || []

    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
    })

    if (!rolesResponse.ok) return false

    const serverRoles = await rolesResponse.json()

    for (const roleId of userRoles) {
      const role = serverRoles.find((r: any) => r.id === roleId)
      if (role) {
        const permissions = BigInt(role.permissions)
        if (permissions & (BigInt(0x8) | BigInt(0x20) | BigInt(0x10000000) | BigInt(0x10) | BigInt(0x2000))) {
          return true
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking server admin status:', error)
    return false
  }
}

// GET - Obtener comentarios con información limitada para server admins
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const serverAdmin = await isServerAdmin(userId)
    
    if (!serverAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Acceso denegado - Solo para administradores del servidor' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    const connection = await mysql.createConnection(dbConfig)

    // Query limitado - solo comentarios básicos con información del post
    const [rows] = await connection.execute(`
      SELECT 
        bc.id,
        bc.content,
        bc.author_name,
        bc.created_at,
        bp.title as post_title,
        bp.author_name as post_author
      FROM blog_comments bc
      JOIN blog_posts bp ON bc.post_id = bp.id
      ORDER BY bc.created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset])

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      comments: rows,
      message: 'Gestión limitada de comentarios para server admins'
    })

  } catch (error) {
    console.error('Error fetching comments for server admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// DELETE - Eliminar comentarios (con restricciones para server admins)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const serverAdmin = await isServerAdmin(userId)
    
    if (!serverAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Acceso denegado - Solo para administradores del servidor' 
      }, { status: 403 })
    }

    const { commentId } = await request.json()

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'ID de comentario requerido' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Verificar información del comentario antes de eliminar
    const [commentRows] = await connection.execute(`
      SELECT 
        bc.author_id,
        bc.content,
        bp.author_id as post_author_id,
        bp.featured,
        bp.pinned
      FROM blog_comments bc
      JOIN blog_posts bp ON bc.post_id = bp.id
      WHERE bc.id = ?
    `, [commentId])

    const comment = (commentRows as any[])[0]
    
    if (!comment) {
      await connection.end()
      return NextResponse.json({ success: false, error: 'Comentario no encontrado' }, { status: 404 })
    }

    // Restricción: No eliminar comentarios del owner
    if (comment.author_id === '388422519553654786') {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'No puedes eliminar comentarios del owner' 
      }, { status: 403 })
    }

    // Restricción: No eliminar comentarios en posts featured/pinned del owner
    if ((comment.featured || comment.pinned) && comment.post_author_id === '388422519553654786') {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'No puedes eliminar comentarios en posts destacados del owner' 
      }, { status: 403 })
    }

    // Eliminar el comentario
    await connection.execute('DELETE FROM blog_comments WHERE id = ?', [commentId])

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Comentario eliminado exitosamente',
      restrictions_applied: ['No owner comments', 'No owner featured/pinned post comments']
    })

  } catch (error) {
    console.error('Error deleting comment for server admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}