import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// POST - Track post view
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { postId } = await request.json()
    
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
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
    
    // Get user IP for tracking unique views
    const userAgent = request.headers.get('user-agent') || ''
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || '127.0.0.1'
    
    const userId = session?.user ? (session.user as any).id : null

    // Check if this user/IP has already viewed this post recently (within 24 hours)
    const [existingViews] = await connection.execute(`
      SELECT id FROM post_views 
      WHERE post_id = ? 
      AND (
        (user_id IS NOT NULL AND user_id = ?) 
        OR (user_id IS NULL AND ip_address = ?)
      )
      AND viewed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      LIMIT 1
    `, [postId, userId, ip])

    let isNewView = false
    
    // If no recent view found, count this as a new view
    if (Array.isArray(existingViews) && existingViews.length === 0) {
      // Insert view record
      await connection.execute(`
        INSERT INTO post_views (post_id, user_id, ip_address) 
        VALUES (?, ?, ?)
      `, [postId, userId, ip])

      // Increment view count in blog_posts
      await connection.execute(`
        UPDATE blog_posts 
        SET view_count = view_count + 1 
        WHERE id = ?
      `, [postId])
      
      isNewView = true
    }

    // Get updated view count
    const [postData] = await connection.execute(`
      SELECT view_count FROM blog_posts WHERE id = ?
    `, [postId])
    
    await connection.end()

    const viewCount = Array.isArray(postData) && postData.length > 0 
      ? (postData[0] as any).view_count 
      : 0

    return NextResponse.json({
      success: true,
      viewCount,
      isNewView
    })

  } catch (error) {
    console.error('Error tracking view:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track view' },
      { status: 500 }
    )
  }
}