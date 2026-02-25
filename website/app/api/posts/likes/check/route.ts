import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// GET - Check if user has liked a specific post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const userId = searchParams.get('userId')
    
    if (!postId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Post ID and User ID are required' },
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

    // Check if user has liked this post
    const [likeCheck] = await connection.execute(`
      SELECT id FROM user_likes 
      WHERE user_id = ? AND post_id = ? AND type = 'post'
    `, [userId, postId])

    await connection.end()

    const hasLiked = Array.isArray(likeCheck) && likeCheck.length > 0

    return NextResponse.json({
      success: true,
      liked: hasLiked
    })

  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check like status' },
      { status: 500 }
    )
  }
}