import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// POST - Follow/unfollow user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { targetUserId, action } = await request.json()
    
    if (!targetUserId || !action || (action !== 'follow' && action !== 'unfollow')) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const currentUserId = (session.user as any).id
    
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot follow yourself' },
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

    // Ensure current user has a profile
    try {
      await connection.execute(`
        INSERT INTO user_profiles (
          id, 
          discord_id, 
          display_name, 
          follower_count, 
          following_count, 
          post_count,
          is_verified,
          is_owner
        ) VALUES (?, ?, ?, 0, 0, 0, FALSE, ?)
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          is_owner = VALUES(is_owner)
      `, [
        currentUserId, 
        currentUserId, 
        session.user.name || 'User',
        currentUserId === '388422519553654786'
      ])
    } catch (insertError: any) {
      if (insertError.code !== 'ER_DUP_ENTRY') {
        console.error('Error creating current user profile:', insertError)
      }
      // Continue even if profile creation fails
    }

    // Ensure target user has a profile
    const [existingProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE id = ?
    `, [targetUserId])

    if (!Array.isArray(existingProfile) || existingProfile.length === 0) {
      // Create the target user's profile with all required fields
      try {
        await connection.execute(`
          INSERT INTO user_profiles (
            id, 
            discord_id, 
            display_name, 
            follower_count, 
            following_count, 
            post_count,
            is_verified,
            is_owner
          ) VALUES (?, ?, ?, 0, 0, 0, FALSE, ?)
          ON DUPLICATE KEY UPDATE
            display_name = VALUES(display_name),
            is_owner = VALUES(is_owner)
        `, [
          targetUserId, 
          targetUserId, 
          `User_${targetUserId.slice(-4)}`,
          targetUserId === '388422519553654786'
        ])
      } catch (insertError: any) {
        if (insertError.code !== 'ER_DUP_ENTRY') {
          throw insertError
        }
        // Profile already exists, continue
      }
    }

    // Get the real profile IDs from the database
    const [followerProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [currentUserId])
    
    const [followingProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [targetUserId])

    if (!Array.isArray(followerProfile) || followerProfile.length === 0) {
      throw new Error(`Follower profile not found: ${currentUserId}`)
    }

    if (!Array.isArray(followingProfile) || followingProfile.length === 0) {
      throw new Error(`Following profile not found: ${targetUserId}`)
    }

    const followerProfileId = (followerProfile[0] as any).id
    const followingProfileId = (followingProfile[0] as any).id

    if (action === 'follow') {
      // Add follow relationship
      try {
        await connection.execute(`
          INSERT INTO user_followers (follower_id, following_id) 
          VALUES (?, ?)
        `, [followerProfileId, followingProfileId])
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Already following, ignore
        } else {
          console.error('Error in follow operation:', error)
          throw error
        }
      }
    } else {
      // Remove follow relationship
      await connection.execute(`
        DELETE FROM user_followers 
        WHERE follower_id = ? AND following_id = ?
      `, [followerProfileId, followingProfileId])
    }

    // Get updated follower count
    const [followerCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM user_followers WHERE following_id = ?
    `, [followingProfileId])

    const count = Array.isArray(followerCount) && followerCount.length > 0 
      ? (followerCount[0] as any).count 
      : 0

    await connection.end()

    return NextResponse.json({
      success: true,
      action,
      followerCount: count
    })

  } catch (error) {
    console.error('Error managing follow:', error)
    
    let errorMessage = 'Failed to manage follow'
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        errorMessage = 'User profile not found. Please refresh and try again.'
      } else if (error.message.includes('Duplicate entry')) {
        errorMessage = 'Already following this user'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// GET - Check if current user follows target user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ success: true, isFollowing: false })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID required' },
        { status: 400 }
      )
    }

    const currentUserId = (session.user as any).id

    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    const connection = await mysql.createConnection(dbConfig)

    // Get the real profile IDs from the database
    const [followerProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [currentUserId])
    
    const [followingProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [targetUserId])

    // If either profile doesn't exist, they're not following
    if (!Array.isArray(followerProfile) || followerProfile.length === 0 ||
        !Array.isArray(followingProfile) || followingProfile.length === 0) {
      await connection.end()
      return NextResponse.json({
        success: true,
        isFollowing: false
      })
    }

    const followerProfileId = (followerProfile[0] as any).id
    const followingProfileId = (followingProfile[0] as any).id

    const [followCheck] = await connection.execute(`
      SELECT id FROM user_followers 
      WHERE follower_id = ? AND following_id = ?
    `, [followerProfileId, followingProfileId])

    await connection.end()

    const isFollowing = Array.isArray(followCheck) && followCheck.length > 0

    return NextResponse.json({
      success: true,
      isFollowing
    })

  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check follow status' },
      { status: 500 }
    )
  }
}