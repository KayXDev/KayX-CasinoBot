import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// PUT - Update user profile settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const {
      customUsername,
      displayName,
      bio,
      website,
      twitter,
      instagram,
      location,
      avatarUrl,
      bannerUrl
    } = await request.json()

    // Validation
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Display name is required' },
        { status: 400 }
      )
    }

    if (customUsername && customUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long' },
        { status: 400 }
      )
    }

    if (customUsername && !/^[a-zA-Z0-9_]+$/.test(customUsername)) {
      return NextResponse.json(
        { success: false, error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Bio must be less than 500 characters' },
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

    // Check if custom username is already taken (if provided)
    if (customUsername) {
      const [existingUsername] = await connection.execute(`
        SELECT id FROM user_profiles 
        WHERE custom_username = ? AND discord_id != ?
      `, [customUsername, userId])

      if (Array.isArray(existingUsername) && existingUsername.length > 0) {
        await connection.end()
        return NextResponse.json(
          { success: false, error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }

    // Check if profile exists
    const [existingProfile] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [userId])

    if (Array.isArray(existingProfile) && existingProfile.length > 0) {
      // Update existing profile
      await connection.execute(`
        UPDATE user_profiles SET
          custom_username = ?,
          display_name = ?,
          bio = ?,
          website = ?,
          twitter = ?,
          instagram = ?,
          location = ?,
          avatar_url = ?,
          banner_url = ?,
          updated_at = NOW()
        WHERE discord_id = ?
      `, [
        customUsername || null,
        displayName,
        bio || null,
        website || null,
        twitter || null,
        instagram || null,
        location || null,
        avatarUrl || null,
        bannerUrl || null,
        userId
      ])
    } else {
      // Create new profile
      const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await connection.execute(`
        INSERT INTO user_profiles (
          id, discord_id, custom_username, display_name, bio, 
          website, twitter, instagram, location, avatar_url, banner_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        profileId,
        userId,
        customUsername || null,
        displayName,
        bio || null,
        website || null,
        twitter || null,
        instagram || null,
        location || null,
        avatarUrl || null,
        bannerUrl || null
      ])
    }

    // Also update existing blog posts and comments with new display name
    await connection.execute(`
      UPDATE blog_posts 
      SET author_name = ? 
      WHERE author_id = ?
    `, [displayName, userId])

    await connection.execute(`
      UPDATE blog_comments 
      SET author_name = ? 
      WHERE author_id = ?
    `, [displayName, userId])

    await connection.end()

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}