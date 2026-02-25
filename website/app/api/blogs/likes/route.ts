import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
})

// POST - Toggle like on a blog post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }

    const connection = await db

    // Check if user already liked this post
    const [existingLikes] = await connection.execute(
      'SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?',
      [postId, (session.user as any).id]
    )

    if (Array.isArray(existingLikes) && existingLikes.length > 0) {
      // Unlike the post
      await connection.execute(
        'DELETE FROM blog_likes WHERE post_id = ? AND user_id = ?',
        [postId, (session.user as any).id]
      )
      
      return NextResponse.json({ 
        success: true, 
        liked: false,
        message: 'Post unliked successfully'
      })
    } else {
      // Like the post
      await connection.execute(
        'INSERT INTO blog_likes (post_id, user_id) VALUES (?, ?)',
        [postId, (session.user as any).id]
      )
      
      // Obtener información del post para la notificación
      const [postData] = await connection.execute(
        'SELECT author_id, title FROM blog_posts WHERE id = ?',
        [postId]
      ) as any
      
      if (postData && postData.length > 0) {
        try {
          const post = postData[0]
          
          // Enviar notificación directamente (implementación simplificada)
          await connection.execute(`
            INSERT INTO web_notifications 
            (user_id, actor_id, type, title, message, link, metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            post.author_id,
            (session.user as any).id,
            'like',
            '❤️ Nuevo like en tu post',
            `Le gustó tu post: "${post.title.substring(0, 50)}${post.title.length > 50 ? '...' : ''}"`,
            `/blogs/${postId}`,
            JSON.stringify({ postId, likerUserId: (session.user as any).id })
          ])
          
          console.log(`✅ Notificación de like enviada a ${post.author_id}`)
        } catch (error) {
          console.error('Error enviando notificación de like:', error)
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        liked: true,
        message: 'Post liked successfully'
      })
    }
  } catch (error) {
    console.error('Error toggling blog like:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to toggle like' 
    }, { status: 500 })
  }
}

// GET - Check if user liked a post
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }

    const connection = await db
    const [likes] = await connection.execute(
      'SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?',
      [postId, (session.user as any).id]
    )

    return NextResponse.json({ 
      success: true, 
      liked: Array.isArray(likes) && likes.length > 0
    })
  } catch (error) {
    console.error('Error checking blog like:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check like status' 
    }, { status: 500 })
  }
}