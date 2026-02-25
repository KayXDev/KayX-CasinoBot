import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot'
}

// GET - Get all users with profiles for verification management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).id !== '388422519553654786') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const connection = await mysql.createConnection(dbConfig)

    // Get all users who have logged in and created profiles
    const [users] = await connection.execute(`
      SELECT 
        discord_id,
        display_name,
        avatar_url,
        is_verified,
        is_owner,
        created_at
      FROM user_profiles 
      ORDER BY created_at DESC
    `)

    await connection.end()

    return NextResponse.json({
      success: true,
      users
    })

  } catch (error) {
    console.error('Error fetching users for verification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Toggle verification status for a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).id !== '388422519553654786') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { userId, verified } = await request.json()
    
    if (!userId || typeof verified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const connection = await mysql.createConnection(dbConfig)

    // Update verification status
    await connection.execute(`
      UPDATE user_profiles 
      SET is_verified = ?, verification_type = ?
      WHERE discord_id = ?
    `, [verified, verified ? 'admin' : 'none', userId])

    // Get updated user info
    const [updatedUser] = await connection.execute(`
      SELECT discord_id, display_name, is_verified 
      FROM user_profiles 
      WHERE discord_id = ?
    `, [userId])

    await connection.end()

    return NextResponse.json({
      success: true,
      message: `User ${verified ? 'verified' : 'unverified'} successfully`,
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating verification status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update verification status' },
      { status: 500 }
    )
  }
}