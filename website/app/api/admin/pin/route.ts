import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// POST - Toggle pin status on post (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin (neeegroo)
    const userId = (session.user as any).id
    if (userId !== '388422519553654786') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { postId, pinned } = await request.json()
    
    if (!postId || typeof pinned !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Post ID and pinned status are required' },
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

    // Update pin status
    const pinnedAt = pinned ? 'NOW()' : 'NULL'
    await connection.execute(`
      UPDATE blog_posts 
      SET pinned = ?, pinned_at = ${pinned ? 'NOW()' : 'NULL'}
      WHERE id = ?
    `, [pinned, postId])

    // Get updated post data
    const [postData] = await connection.execute(`
      SELECT pinned, pinned_at FROM blog_posts WHERE id = ?
    `, [postId])

    await connection.end()

    const post = Array.isArray(postData) && postData.length > 0 ? postData[0] : null

    return NextResponse.json({
      success: true,
      pinned: post ? (post as any).pinned : pinned,
      pinnedAt: post ? (post as any).pinned_at : null
    })

  } catch (error) {
    console.error('Error toggling pin status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle pin status' },
      { status: 500 }
    )
  }
}