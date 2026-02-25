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

// GET - Fetch comments for a blog post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }

    const connection = await db
    const [comments] = await connection.execute(`
      SELECT 
        bc.*,
        (SELECT COUNT(*) FROM blog_comment_likes bcl WHERE bcl.comment_id = bc.id) as likes
      FROM blog_comments bc 
      WHERE bc.post_id = ?
      ORDER BY bc.created_at ASC
      LIMIT ? OFFSET ?
    `, [postId, limit, offset])

    return NextResponse.json({ 
      success: true, 
      comments,
      meta: {
        limit,
        offset,
        hasMore: Array.isArray(comments) && comments.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching blog comments:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch comments' 
    }, { status: 500 })
  }
}

// POST - Create new comment
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
    const { postId, content, parentId = null } = body

    if (!postId || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID and content are required' 
      }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment must be less than 1000 characters' 
      }, { status: 400 })
    }

    const connection = await db

    // Verify the post exists
    const [posts] = await connection.execute(
      'SELECT id FROM blog_posts WHERE id = ? AND status = "published"',
      [postId]
    )

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 })
    }

    // If this is a reply, verify the parent comment exists
    if (parentId) {
      const [parentComments] = await connection.execute(
        'SELECT id FROM blog_comments WHERE id = ? AND post_id = ?',
        [parentId, postId]
      )

      if (!Array.isArray(parentComments) || parentComments.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Parent comment not found' 
        }, { status: 404 })
      }
    }

    const [result] = await connection.execute(`
      INSERT INTO blog_comments (
        post_id, author_id, author_name, author_avatar, content, parent_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      postId,
      (session.user as any).id,
      session.user.name,
      session.user.image,
      content,
      parentId
    ])

    // Obtener información del post para la notificación
    const [postData] = await connection.execute(
      'SELECT author_id, title FROM blog_posts WHERE id = ?',
      [postId]
    ) as any
    
    if (postData && postData.length > 0) {
      try {
        const post = postData[0]
        
        // No notificar si el autor comenta en su propio post
        if (post.author_id !== (session.user as any).id) {
          // Enviar notificación directamente (implementación simplificada)
          await connection.execute(`
            INSERT INTO web_notifications 
            (user_id, actor_id, type, title, message, link, metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            post.author_id,
            (session.user as any).id,
            'comment',
            '💬 Nuevo comentario en tu post',
            `Comentó: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            `/blogs/${postId}#comments`,
            JSON.stringify({ postId, commenterUserId: (session.user as any).id })
          ])
          
          console.log(`✅ Notificación de comentario enviada a ${post.author_id}`)
        }
      } catch (error) {
        console.error('Error enviando notificación de comentario:', error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Comment posted successfully',
      commentId: (result as any).insertId
    })
  } catch (error) {
    console.error('Error creating blog comment:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to post comment' 
    }, { status: 500 })
  }
}

// DELETE - Delete comment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment ID is required' 
      }, { status: 400 })
    }

    const connection = await db

    // Check if user owns this comment
    const [comments] = await connection.execute(
      'SELECT author_id FROM blog_comments WHERE id = ?',
      [commentId]
    )

    if (!Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment not found' 
      }, { status: 404 })
    }

    if ((comments[0] as any).author_id !== (session.user as any).id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to delete this comment' 
      }, { status: 403 })
    }

    await connection.execute('DELETE FROM blog_comments WHERE id = ?', [commentId])

    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting blog comment:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete comment' 
    }, { status: 500 })
  }
}