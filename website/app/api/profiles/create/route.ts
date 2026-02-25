import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { dbConfig, sanitizeParams } from '../../../../lib/database'

// POST - Create user profile automatically
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const discordUser = session.user as any
    
    // Validar que tenemos la información mínima necesaria
    if (!discordUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 400 }
      )
    }
    
    const connection = await mysql.createConnection(dbConfig)

    // Check if profile already exists
    const [existingRows] = await connection.execute(`
      SELECT id FROM user_profiles WHERE discord_id = ?
    `, [discordUser.id])

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      await connection.end()
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profileId: (existingRows[0] as any).id
      })
    }

    // Create new profile
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Construir URL del avatar de Discord
    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : discordUser.image || null
    
    await connection.execute(`
      INSERT INTO user_profiles (
        id, discord_id, display_name, avatar_url, 
        is_verified, is_owner, verification_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, sanitizeParams([
      profileId,
      discordUser.id,
      discordUser.name || discordUser.username || `User#${discordUser.discriminator || '0000'}`,
      avatarUrl,
      discordUser.id === '388422519553654786', // Owner check
      discordUser.id === '388422519553654786',
      discordUser.id === '388422519553654786' ? 'owner' : 'none'
    ]))

    await connection.end()

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profileId: profileId
    })

  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}