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
    const response = await fetch(`http://localhost:3000/api/server-admin/permissions`, {
      headers: { 'user-id': userId }
    })
    const data = await response.json()
    return data.isServerAdmin || false
  } catch (error) {
    console.error('Error checking server admin status:', error)
    return false
  }
}

// GET - Obtener posts con información limitada para server admins
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

    // Query limitado - solo información básica de posts
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        title, 
        author_name,
        category, 
        status, 
        featured,
        pinned,
        (SELECT COUNT(*) FROM blog_likes WHERE post_id = bp.id) as likes,
        (SELECT COUNT(*) FROM blog_comments WHERE post_id = bp.id) as comments_count,
        views,
        created_at
      FROM blog_posts bp 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset])

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      posts: rows,
      message: 'Solo información básica disponible para server admins'
    })

  } catch (error) {
    console.error('Error fetching posts for server admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

// DELETE - Eliminar posts (con restricciones para server admins)
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

    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ success: false, error: 'ID de post requerido' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Verificar que el post no sea de un owner o admin principal
    const [postRows] = await connection.execute(`
      SELECT author_id, author_name, featured, pinned
      FROM blog_posts 
      WHERE id = ?
    `, [postId])

    const post = (postRows as any[])[0]
    
    if (!post) {
      await connection.end()
      return NextResponse.json({ success: false, error: 'Post no encontrado' }, { status: 404 })
    }

    // Restricción: No eliminar posts featured/pinned
    if (post.featured || post.pinned) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'No puedes eliminar posts destacados o fijados' 
      }, { status: 403 })
    }

    // Restricción: No eliminar posts del owner
    if (post.author_id === '388422519553654786') {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'No puedes eliminar posts del owner' 
      }, { status: 403 })
    }

    // Eliminar el post
    await connection.execute('DELETE FROM blog_posts WHERE id = ?', [postId])
    
    // Eliminar likes y comentarios asociados
    await connection.execute('DELETE FROM blog_likes WHERE post_id = ?', [postId])
    await connection.execute('DELETE FROM blog_comments WHERE post_id = ?', [postId])

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Post eliminado exitosamente',
      restrictions_applied: ['No featured/pinned posts', 'No owner posts']
    })

  } catch (error) {
    console.error('Error deleting post for server admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}