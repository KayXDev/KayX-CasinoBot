import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { hasPermission, logAdminAction } from '../../../../lib/adminUtils'

// GET - Get recent comments for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    const connection = await mysql.createConnection(dbConfig)

    const [rows] = await connection.execute(`
      SELECT 
        bc.id,
        bc.content,
        bc.author_name,
        bc.created_at,
        bp.title as post_title
      FROM blog_comments bc
      LEFT JOIN blog_posts bp ON bc.post_id = bp.id
      ORDER BY bc.created_at DESC 
      LIMIT ?
    `, [limit])

    await connection.end()

    return NextResponse.json({
      success: true,
      data: rows
    })

  } catch (error) {
    console.error('Error fetching admin comments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// DELETE - Delete comment (admin can delete any comment)
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

    // Database connection
    let dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL)
      dbConfig = {
        host: url.hostname,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1)
      }
    }

    const connection = await mysql.createConnection(dbConfig)

    // Check if comment exists and get comment details
    const [comments] = await connection.execute(
      'SELECT id, author_id, author_name, content, post_id FROM blog_comments WHERE id = ?',
      [commentId]
    )

    if (!Array.isArray(comments) || comments.length === 0) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Comment not found' 
      }, { status: 404 })
    }

    const comment = comments[0] as any
    const isOwner = comment.author_id === (session.user as any).id
    const canDeleteAny = await hasPermission((session.user as any).id as string, 'delete_any_comment')

    // Check permissions: either own the comment or have admin delete permissions
    if (!isOwner && !canDeleteAny) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to delete this comment' 
      }, { status: 403 })
    }

    // Delete the comment
    await connection.execute('DELETE FROM blog_comments WHERE id = ?', [commentId])

    // Log admin action if it was an admin delete
    if (!isOwner && canDeleteAny) {
      await logAdminAction(
        (session.user as any).id as string,
        session.user.name || 'Unknown Admin',
        'delete_comment',
        'comment',
        commentId,
        {
          comment_content: comment.content.substring(0, 100) + '...',
          original_author: comment.author_name,
          post_id: comment.post_id,
          reason: 'Admin moderation'
        }
      )
    }

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete comment' 
    }, { status: 500 })
  }
}