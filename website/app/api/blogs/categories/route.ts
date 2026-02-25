import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
})

// GET - Fetch blog categories with post counts
export async function GET() {
  try {
    const connection = await db
    
    // Get categories with post counts
    const [categories] = await connection.execute(`
      SELECT 
        category,
        COUNT(*) as count
      FROM blog_posts 
      WHERE status = 'published'
      GROUP BY category
      ORDER BY count DESC, category ASC
    `)

    // Get total count for "All Posts"
    const [totalCount] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM blog_posts 
      WHERE status = 'published'
    `)

    // Format response
    const formattedCategories = [
      {
        name: 'All Posts',
        value: 'all',
        count: Array.isArray(totalCount) && totalCount.length > 0 ? (totalCount[0] as any).total : 0
      }
    ]

    if (Array.isArray(categories)) {
      categories.forEach((cat: any) => {
        formattedCategories.push({
          name: cat.category,
          value: cat.category,
          count: cat.count
        })
      })
    }

    return NextResponse.json({ 
      success: true, 
      categories: formattedCategories
    })
  } catch (error) {
    console.error('Error fetching blog categories:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch categories',
      categories: [
        { name: 'All Posts', value: 'all', count: 0 },
        { name: 'General', value: 'General', count: 0 }
      ]
    }, { status: 500 })
  }
}