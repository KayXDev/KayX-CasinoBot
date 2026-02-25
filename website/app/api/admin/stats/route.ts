import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export async function GET() {
  try {
    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    const connection = await mysql.createConnection(dbConfig)

    // Get total statistics
    const [statsResult] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as totalPosts,
        (SELECT COUNT(*) FROM blog_comments) as totalComments,
        (SELECT COALESCE(SUM(likes), 0) FROM blog_posts) as totalLikes,
        (SELECT COALESCE(SUM(views), 0) FROM blog_posts) as totalViews
    `)

    await connection.end()

    const stats = Array.isArray(statsResult) ? statsResult[0] : {}

    return NextResponse.json({
      success: true,
      data: {
        totalPosts: (stats as any)?.totalPosts || 0,
        totalComments: (stats as any)?.totalComments || 0,
        totalLikes: (stats as any)?.totalLikes || 0,
        totalViews: (stats as any)?.totalViews || 0
      }
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}