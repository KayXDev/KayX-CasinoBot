import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// Utility function to ensure user profile exists
export async function ensureUserProfile(userId: string, userData?: { name?: string; image?: string }) {
  try {
    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    const connection = await mysql.createConnection(dbConfig)

    // Check if profile exists
    const [existing] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [userId])

    if (!Array.isArray(existing) || existing.length === 0) {
      // Create new profile with default values
      await connection.execute(`
        INSERT INTO user_profiles (
          id, discord_id, display_name, avatar_url, 
          is_verified, is_owner, verification_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        userId,
        userData?.name || 'User',
        userData?.image || null,
        userId === '388422519553654786', // neeegroo is verified
        userId === '388422519553654786', // neeegroo is owner
        userId === '388422519553654786' ? 'owner' : 'none'
      ])

      console.log(`✅ Created profile for user ${userId}`)
    }

    await connection.end()
    return true

  } catch (error) {
    console.error('Error ensuring user profile:', error)
    return false
  }
}

// GET - Initialize user profile if needed
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const success = await ensureUserProfile(userId, {
      name: session.user.name || undefined,
      image: session.user.image || undefined
    })

    return NextResponse.json({
      success,
      userId,
      message: success ? 'Profile initialized' : 'Failed to initialize profile'
    })

  } catch (error) {
    console.error('Error initializing profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize profile' },
      { status: 500 }
    )
  }
}