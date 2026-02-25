import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { hasPermission, logAdminAction } from '../../../../lib/adminUtils'

// POST - Toggle featured status of a blog post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // Check if user is admin (neeegroo)
    const userId = (session.user as any).id
    if (userId !== '388422519553654786') {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { postId, featured } = body

    if (!postId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
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

    // Get post details
    const [posts] = await connection.execute(
      'SELECT id, title, author_name, featured FROM blog_posts WHERE id = ?',
      [postId]
    )

    if (!Array.isArray(posts) || posts.length === 0) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 })
    }

    const post = posts[0] as any

    // Update the target post (allow multiple featured posts)
    await connection.execute(
      'UPDATE blog_posts SET featured = ? WHERE id = ?',
      [featured, postId]
    )

    // Log admin action
    await logAdminAction(
      (session.user as any).id as string,
      session.user.name || 'Unknown Admin',
      featured ? 'feature_post' : 'unfeature_post',
      'post',
      postId,
      {
        post_title: post.title,
        post_author: post.author_name,
        previous_featured: post.featured
      }
    )

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: `Post ${featured ? 'featured' : 'unfeatured'} successfully`,
      featured
    })
  } catch (error) {
    console.error('Error toggling featured status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update featured status' 
    }, { status: 500 })
  }
}