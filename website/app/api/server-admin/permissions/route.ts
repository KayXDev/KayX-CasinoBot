import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// GET - Verificar si el usuario es específicamente admin del servidor (no owner)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        isServerAdmin: false,
        error: 'No authenticated' 
      }, { status: 401 })
    }

    const userId = (session.user as any).id
    const isOwner = userId === '388422519553654786'

    // Si es owner, NO es server admin (son paneles diferentes)
    if (isOwner) {
      return NextResponse.json({ 
        success: true, 
        isServerAdmin: false,
        isOwner: true,
        message: 'Owner should use /admin panel'
      })
    }

    // Verificar permisos en Discord usando el bot token
    try {
      const GUILD_ID = '1382476289151336460' // ID de tu servidor Discord
      const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN // Token del bot

      if (!BOT_TOKEN) {
        console.error('Discord bot token not configured')
        return NextResponse.json({ 
          success: false, 
          isServerAdmin: false,
          error: 'Bot token not configured' 
        }, { status: 500 })
      }

      // Obtener información del miembro en el servidor
      const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!memberResponse.ok) {
        // Usuario no está en el servidor
        return NextResponse.json({ 
          success: true, 
          isServerAdmin: false,
          isOwner: false,
          error: 'User not in server'
        })
      }

      const memberData = await memberResponse.json()
      const userRoles = memberData.roles || []

      // Obtener información de los roles del servidor
      const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })

      if (!rolesResponse.ok) {
        throw new Error('Failed to fetch server roles')
      }

      const serverRoles = await rolesResponse.json()

      // Verificar si alguno de los roles del usuario tiene permisos de administrador
      let isServerAdmin = false
      const adminPermissions = []

      for (const roleId of userRoles) {
        const role = serverRoles.find((r: any) => r.id === roleId)
        if (role) {
          // Verificar permisos de administrador (solo algunos permisos limitados)
          const permissions = BigInt(role.permissions)
          const ADMINISTRATOR = BigInt(0x8)
          const MANAGE_GUILD = BigInt(0x20)
          const MANAGE_ROLES = BigInt(0x10000000)
          const MANAGE_CHANNELS = BigInt(0x10)
          const MANAGE_MESSAGES = BigInt(0x2000)
          
          if (permissions & ADMINISTRATOR) {
            isServerAdmin = true
            adminPermissions.push('ADMINISTRATOR')
          } else if (permissions & MANAGE_GUILD) {
            isServerAdmin = true
            adminPermissions.push('MANAGE_GUILD')
          } else if (permissions & MANAGE_ROLES) {
            isServerAdmin = true
            adminPermissions.push('MANAGE_ROLES')
          } else if (permissions & MANAGE_CHANNELS) {
            isServerAdmin = true
            adminPermissions.push('MANAGE_CHANNELS')
          } else if (permissions & MANAGE_MESSAGES) {
            isServerAdmin = true
            adminPermissions.push('MANAGE_MESSAGES')
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        isServerAdmin,
        isOwner: false,
        permissions: adminPermissions,
        roles: userRoles.length,
        access_level: 'server_admin'
      })

    } catch (discordError) {
      console.error('Discord API error:', discordError)
      return NextResponse.json({ 
        success: false, 
        isServerAdmin: false,
        error: 'Discord API error' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error checking server admin permissions:', error)
    return NextResponse.json({ 
      success: false, 
      isServerAdmin: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}