import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import url from 'url'

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
        id,
        title,
        author_name,
        category,
        status,
        featured,
        pinned,
        pinned_at,
        likes,
        comments_count,
        views,
        created_at
      FROM blog_posts 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [limit])

    await connection.end()

    return NextResponse.json({
      success: true,
      data: rows
    })

  } catch (error) {
    console.error('Error fetching admin posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}