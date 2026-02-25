import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { notificationService } from '../../../../lib/notificationService'

// POST - Toggle like on post or comment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { postId, commentId, type } = await request.json()
    
    if (!type || (type !== 'post' && type !== 'comment')) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "post" or "comment"' },
        { status: 400 }
      )
    }

    if (type === 'post' && !postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required for post likes' },
        { status: 400 }
      )
    }

    if (type === 'comment' && !commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required for comment likes' },
        { status: 400 }
      )
    }

    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    const connection = await mysql.createConnection(dbConfig)
    const userId = (session.user as any).id

    if (type === 'post') {
      // Check if user already liked this post
      const [existingLike] = await connection.execute(`
        SELECT id FROM user_likes 
        WHERE user_id = ? AND post_id = ? AND type = 'post'
      `, [userId, postId])

      let isLiked = false
      
      if (Array.isArray(existingLike) && existingLike.length > 0) {
        // Unlike - remove like
        await connection.execute(`
          DELETE FROM user_likes 
          WHERE user_id = ? AND post_id = ? AND type = 'post'
        `, [userId, postId])

        // Decrement like count
        await connection.execute(`
          UPDATE blog_posts 
          SET likes = GREATEST(0, likes - 1) 
          WHERE id = ?
        `, [postId])
      } else {
        // Like - add like
        await connection.execute(`
          INSERT INTO user_likes (user_id, post_id, type) 
          VALUES (?, ?, 'post')
        `, [userId, postId])

        // Increment like count
        await connection.execute(`
          UPDATE blog_posts 
          SET likes = likes + 1 
          WHERE id = ?
        `, [postId])
        
        isLiked = true
      }

      // Get updated like count and post info for notifications
      const [postData] = await connection.execute(`
        SELECT likes, title, author_id FROM blog_posts WHERE id = ?
      `, [postId])
      
      const likeCount = Array.isArray(postData) && postData.length > 0 
        ? (postData[0] as any).likes 
        : 0

      // Send notification if user liked the post (not unliked)
      if (isLiked && Array.isArray(postData) && postData.length > 0) {
        const post = (postData[0] as any)
        const postAuthorId = post.author_id
        const postTitle = post.title

        // Don't notify if user likes their own post
        if (postAuthorId !== userId) {
          try {
            // Generate simple slug for notification link
            const slug = postTitle.toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .substring(0, 50)

            await notificationService.notifyNewLike(
              postId.toString(),
              postAuthorId,
              userId,
              postTitle,
              slug
            )
          } catch (error) {
            console.error('Error sending like notification:', error)
            // Don't fail the like action for this
          }
        }
      }

      await connection.end()

      return NextResponse.json({
        success: true,
        isLiked,
        likeCount,
        type: 'post'
      })

    } else if (type === 'comment') {
      // Similar logic for comments
      const [existingLike] = await connection.execute(`
        SELECT id FROM user_likes 
        WHERE user_id = ? AND comment_id = ? AND type = 'comment'
      `, [userId, commentId])

      let isLiked = false
      
      if (Array.isArray(existingLike) && existingLike.length > 0) {
        // Unlike
        await connection.execute(`
          DELETE FROM user_likes 
          WHERE user_id = ? AND comment_id = ? AND type = 'comment'
        `, [userId, commentId])

        await connection.execute(`
          UPDATE blog_comments 
          SET likes = GREATEST(0, likes - 1) 
          WHERE id = ?
        `, [commentId])
      } else {
        // Like
        await connection.execute(`
          INSERT INTO user_likes (user_id, comment_id, type) 
          VALUES (?, ?, 'comment')
        `, [userId, commentId])

        await connection.execute(`
          UPDATE blog_comments 
          SET likes = likes + 1 
          WHERE id = ?
        `, [commentId])
        
        isLiked = true
      }

      // Get updated like count
      const [commentData] = await connection.execute(`
        SELECT likes FROM blog_comments WHERE id = ?
      `, [commentId])
      
      const likeCount = Array.isArray(commentData) && commentData.length > 0 
        ? (commentData[0] as any).likes 
        : 0

      await connection.end()

      return NextResponse.json({
        success: true,
        isLiked,
        likeCount,
        type: 'comment'
      })
    }

  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}