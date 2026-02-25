import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// Database configuration will be set up in the function

// GET - Fetch specific blog post by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id

    // Parse DATABASE_URL if available
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
    
    const [rows] = await connection.execute(`
      SELECT 
        bp.*,
        bp.view_count as views,
        bp.featured,
        bp.pinned,
        bp.pinned_at,
        (SELECT COUNT(*) FROM user_likes ul WHERE ul.post_id = bp.id AND ul.type = 'post') as likes,
        (SELECT COUNT(*) FROM blog_comments bc WHERE bc.post_id = bp.id) as comments_count
      FROM blog_posts bp 
      WHERE bp.id = ? AND bp.status = 'published'
    `, [postId])
    
    await connection.end()
    
    if (Array.isArray(rows) && rows.length > 0) {
      // Parse tags from JSON string
      const post = {
        ...rows[0],
        tags: typeof (rows[0] as any).tags === 'string' ? JSON.parse((rows[0] as any).tags || '[]') : ((rows[0] as any).tags || [])
      }
      
      // Increment view count
      const viewConnection = await mysql.createConnection(dbConfig)
      await viewConnection.execute(
        'UPDATE blog_posts SET views = views + 1 WHERE id = ?',
        [postId]
      )
      await viewConnection.end()
      
      return NextResponse.json({ 
        success: true, 
        post: {
          ...post,
          views: (post as any).views + 1
        }
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch blog post' 
    }, { status: 500 })
  }
}