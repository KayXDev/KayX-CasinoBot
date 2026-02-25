import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
})

// POST - Toggle like/unlike on a comment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { commentId } = await request.json()

    if (!commentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment ID is required' 
      }, { status: 400 })
    }

    const connection = await db
    const userId = session.user.id

    // Check if comment exists
    const [comments] = await connection.execute(
      'SELECT id FROM blog_comments WHERE id = ?',
      [commentId]
    )

    if (!Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment not found' 
      }, { status: 404 })
    }

    // Check if user has already liked this comment
    const [existingLikes] = await connection.execute(
      'SELECT id FROM blog_comment_likes WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    )

    let liked = false
    let likesCount = 0

    if (Array.isArray(existingLikes) && existingLikes.length > 0) {
      // User has already liked - remove the like (unlike)
      await connection.execute(
        'DELETE FROM blog_comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, userId]
      )
      liked = false
    } else {
      // User hasn't liked - add the like
      await connection.execute(
        'INSERT INTO blog_comment_likes (comment_id, user_id, created_at) VALUES (?, ?, NOW())',
        [commentId, userId]
      )
      liked = true
    }

    // Get updated likes count
    const [likesResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM blog_comment_likes WHERE comment_id = ?',
      [commentId]
    )

    if (Array.isArray(likesResult) && likesResult.length > 0) {
      likesCount = (likesResult[0] as any).count
    }

    return NextResponse.json({ 
      success: true,
      liked,
      likesCount,
      message: liked ? 'Comment liked' : 'Comment unliked'
    })
  } catch (error) {
    console.error('Error toggling comment like:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to toggle like' 
    }, { status: 500 })
  }
}

// GET - Check if user has liked a comment and get likes count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')
    const userId = session?.user?.id

    if (!commentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment ID is required' 
      }, { status: 400 })
    }

    const connection = await db

    // Get likes count
    const [likesResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM blog_comment_likes WHERE comment_id = ?',
      [commentId]
    )

    let likesCount = 0
    if (Array.isArray(likesResult) && likesResult.length > 0) {
      likesCount = (likesResult[0] as any).count
    }

    let liked = false
    if (userId) {
      // Check if current user has liked this comment
      const [userLikeResult] = await connection.execute(
        'SELECT id FROM blog_comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, userId]
      )

      liked = Array.isArray(userLikeResult) && userLikeResult.length > 0
    }

    return NextResponse.json({ 
      success: true,
      liked,
      likesCount
    })
  } catch (error) {
    console.error('Error getting comment like status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get like status' 
    }, { status: 500 })
  }
}