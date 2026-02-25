import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { dbConfig, sanitizeParams } from '../../../../lib/database'

// GET - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = params.id
    
    const connection = await mysql.createConnection(dbConfig)

    // Get user profile
    const [profileRows] = await connection.execute(`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM user_followers WHERE following_id = up.id) as follower_count,
        (SELECT COUNT(*) FROM user_followers WHERE follower_id = up.id) as following_count,
        (SELECT COUNT(*) FROM blog_posts WHERE author_id = up.discord_id AND status = 'published') as post_count
      FROM user_profiles up
      WHERE up.id = ? OR up.discord_id = ? OR up.custom_username = ?
    `, sanitizeParams([profileId, profileId, profileId]))

    if (!Array.isArray(profileRows) || profileRows.length === 0) {
      // Check if this might be a Discord ID that needs a profile created
      const session = await getServerSession(authOptions)
      
      // If the requested profile is the current user's and they don't have one yet, create it
      if (session?.user && (session.user as any).id === profileId) {
        const discordUser = session.user as any
        const profileId_generated = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Create new profile
        await connection.execute(`
          INSERT INTO user_profiles (
            id, discord_id, display_name, avatar_url, 
            is_verified, is_owner, verification_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, sanitizeParams([
          profileId_generated,
          discordUser.id,
          discordUser.name || discordUser.username || 'User',
          discordUser.image || null,
          discordUser.id === '388422519553654786', // You are the owner
          discordUser.id === '388422519553654786',
          discordUser.id === '388422519553654786' ? 'owner' : 'none'
        ]))
        
        // Fetch the newly created profile
        const [newProfileRows] = await connection.execute(`
          SELECT 
            up.*,
            (SELECT COUNT(*) FROM user_followers WHERE following_id = up.id) as follower_count,
            (SELECT COUNT(*) FROM user_followers WHERE follower_id = up.id) as following_count,
            (SELECT COUNT(*) FROM blog_posts WHERE author_id = up.discord_id AND status = 'published') as post_count
          FROM user_profiles up
          WHERE up.discord_id = ?
        `, sanitizeParams([discordUser.id]))
        
        if (!Array.isArray(newProfileRows) || newProfileRows.length === 0) {
          await connection.end()
          return NextResponse.json(
            { success: false, error: 'Failed to create profile' },
            { status: 500 }
          )
        }
        
        // Use the newly created profile
        const profile = newProfileRows[0] as any
        
        // Get user's recent posts
        const [postsRows] = await connection.execute(`
          SELECT 
            id, title, excerpt, category, likes, view_count, 
            comments_count, created_at, featured
          FROM blog_posts 
          WHERE author_id = ? AND status = 'published'
          ORDER BY created_at DESC 
          LIMIT 10
        `, sanitizeParams([profile.discord_id]))

        await connection.end()

        return NextResponse.json({
          success: true,
          profile: {
            id: profile.id,
            discordId: profile.discord_id,
            customUsername: profile.custom_username,
            displayName: profile.display_name,
            bio: profile.bio,
            website: profile.website,
            twitter: profile.twitter,
            instagram: profile.instagram,
            location: profile.location,
            bannerUrl: profile.banner_url,
            avatarUrl: profile.avatar_url,
            isVerified: profile.is_verified,
            isOwner: profile.is_owner,
            verificationType: profile.verification_type,
            followerCount: profile.follower_count,
            followingCount: profile.following_count,
            postCount: profile.post_count,
            joinedDate: profile.joined_date,
            lastActive: profile.last_active
          },
          posts: postsRows
        })
      }
      
      await connection.end()
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profile = profileRows[0] as any

    // Get user's recent posts
    const [postsRows] = await connection.execute(`
      SELECT 
        id, title, excerpt, category, likes, view_count, 
        comments_count, created_at, featured
      FROM blog_posts 
      WHERE author_id = ? AND status = 'published'
      ORDER BY created_at DESC 
      LIMIT 10
    `, sanitizeParams([profile.discord_id]))

    await connection.end()

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        discordId: profile.discord_id,
        customUsername: profile.custom_username,
        displayName: profile.display_name,
        bio: profile.bio,
        website: profile.website,
        twitter: profile.twitter,
        instagram: profile.instagram,
        location: profile.location,
        bannerUrl: profile.banner_url,
        avatarUrl: profile.avatar_url,
        isVerified: profile.is_verified,
        isOwner: profile.is_owner,
        verificationType: profile.verification_type,
        followerCount: profile.follower_count,
        followingCount: profile.following_count,
        postCount: profile.post_count,
        joinedDate: profile.joined_date,
        lastActive: profile.last_active
      },
      posts: postsRows
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}