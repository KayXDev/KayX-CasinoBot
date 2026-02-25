import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// GET - Verificar si el usuario tiene permisos de administrador en el servidor Discord
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        isAdmin: false,
        error: 'No authenticated' 
      }, { status: 401 })
    }

    const userId = (session.user as any).id
    const isOwner = userId === '388422519553654786'

    // Si es owner, automáticamente es admin
    if (isOwner) {
      return NextResponse.json({ 
        success: true, 
        isAdmin: true,
        isOwner: true,
        permissions: ['ADMINISTRATOR']
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
          isAdmin: false,
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
          isAdmin: false,
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
      let isAdmin = false
      const adminPermissions = []

      for (const roleId of userRoles) {
        const role = serverRoles.find((r: any) => r.id === roleId)
        if (role) {
          // Verificar permisos de administrador (bit 3 = ADMINISTRATOR)
          const permissions = BigInt(role.permissions)
          const ADMINISTRATOR = BigInt(0x8)
          const MANAGE_GUILD = BigInt(0x20)
          const MANAGE_ROLES = BigInt(0x10000000)
          const MANAGE_CHANNELS = BigInt(0x10)
          
          if (permissions & ADMINISTRATOR) {
            isAdmin = true
            adminPermissions.push('ADMINISTRATOR')
          } else if (permissions & MANAGE_GUILD) {
            isAdmin = true
            adminPermissions.push('MANAGE_GUILD')
          } else if (permissions & MANAGE_ROLES) {
            isAdmin = true
            adminPermissions.push('MANAGE_ROLES')
          } else if (permissions & MANAGE_CHANNELS) {
            isAdmin = true
            adminPermissions.push('MANAGE_CHANNELS')
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        isAdmin,
        isOwner: false,
        permissions: adminPermissions,
        roles: userRoles.length
      })

    } catch (discordError) {
      console.error('Discord API error:', discordError)
      return NextResponse.json({ 
        success: false, 
        isAdmin: false,
        error: 'Discord API error' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error checking admin permissions:', error)
    return NextResponse.json({ 
      success: false, 
      isAdmin: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}