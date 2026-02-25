import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
}

// Verificar permisos de administrador
async function checkAdminPermissions(session: any) {
  if (!session?.user?.id) {
    console.log('❌ No session or user ID')
    return null
  }

  const connection = await mysql.createConnection(dbConfig)
  
  try {
    // Verificar si es owner
    const ownerId = process.env.DISCORD_OWNER_ID
    console.log('🔍 Checking if user is owner:', (session.user as any).id, 'vs', ownerId)
    
    if ((session.user as any).id === ownerId) {
      console.log('👑 User is owner')
      return { type: 'owner', userId: (session.user as any).id }
    }

    console.log('🔍 Checking Discord server admin permissions...')
    console.log('🔧 Environment check:', {
      hasGuildId: !!process.env.DISCORD_GUILD_ID,
      hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
      guildId: process.env.DISCORD_GUILD_ID
    })
    
    // Verificar permisos de servidor
    const response = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/member/${(session.user as any).id}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    })

    console.log('📡 Discord API response status:', response.status)

    if (response.ok) {
      const member = await response.json()
      console.log('👥 Member data:', { permissions: member.permissions, roles: member.roles?.length })
      const hasAdminPerms = member.permissions && (parseInt(member.permissions) & 0x8) === 0x8

      if (hasAdminPerms) {
        console.log('✅ User has server admin permissions')
        return { type: 'server_admin', userId: (session.user as any).id }
      } else {
        console.log('❌ User does not have admin permissions')
      }
    } else {
      console.log('❌ Failed to fetch Discord member data:', response.statusText)
    }

    // Verificación adicional: si el usuario está en admin_chat_connections, significa que ya fue verificado antes
    console.log('🔍 Checking if user exists in admin_chat_connections...')
    const [chatConnectionResult] = await connection.execute(
      'SELECT user_id, user_type FROM admin_chat_connections WHERE user_id = ? ORDER BY last_activity DESC LIMIT 1',
      [(session.user as any).id]
    ) as any[]
    
    if (chatConnectionResult.length > 0) {
      console.log('✅ User found in admin_chat_connections:', chatConnectionResult[0])
      return { 
        type: chatConnectionResult[0].user_type || 'server_admin', 
        userId: (session.user as any).id 
      }
    }

    // Verificación temporal: Usuarios conocidos que pueden acceder al chat
    const knownAdminIds = ['390873542448644106'] // kayxscripts
    if (knownAdminIds.includes((session.user as any).id)) {
      console.log('✅ User is in known admin list:', (session.user as any).id)
      // Insertar en admin_chat_connections para futuras verificaciones
      await connection.execute(
        'INSERT IGNORE INTO admin_chat_connections (user_id, username, user_type, last_activity) VALUES (?, ?, ?, NOW())',
        [(session.user as any).id, (session.user as any).name || 'Usuario', 'server_admin']
      )
      return { type: 'server_admin', userId: (session.user as any).id }
    }

    // Fallback: Verificar con método alternativo de Discord API (roles directamente)
    console.log('🔍 Trying alternative Discord verification method...')
    try {
      const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${(session.user as any).id}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
      })
      
      if (guildResponse.ok) {
        const guildMember = await guildResponse.json()
        console.log('🔍 Guild member found, checking roles...', { roles: guildMember.roles?.length })
        
        if (guildMember.roles && guildMember.roles.length > 0) {
          // Obtener información de los roles para verificar permisos
          const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/roles`, {
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            },
          })
          
          if (rolesResponse.ok) {
            const allRoles = await rolesResponse.json()
            const userRoles = allRoles.filter((role: any) => guildMember.roles.includes(role.id))
            
            // Verificar permisos de administrador en los roles
            const hasAdminRole = userRoles.some((role: any) => {
              const permissions = BigInt(role.permissions)
              return (permissions & BigInt(0x8)) !== BigInt(0) || // ADMINISTRATOR
                     (permissions & BigInt(0x20000000)) !== BigInt(0) || // MANAGE_GUILD
                     (permissions & BigInt(0x10000000)) !== BigInt(0) // MANAGE_ROLES
            })
            
            if (hasAdminRole) {
              console.log('✅ User has admin permissions via roles')
              // Insertar en admin_chat_connections para futuras verificaciones
              await connection.execute(
                'INSERT IGNORE INTO admin_chat_connections (user_id, username, user_type, last_activity) VALUES (?, ?, ?, NOW())',
                [(session.user as any).id, (session.user as any).name || 'Usuario', 'server_admin']
              )
              return { type: 'server_admin', userId: (session.user as any).id }
            }
          }
        }
      }
    } catch (altError) {
      console.log('⚠️ Alternative Discord verification failed:', altError instanceof Error ? altError.message : 'Unknown error')
    }

    console.log('❌ User is not authorized')
    return null
  } finally {
    await connection.end()
  }
}

// GET - Obtener historial de mensajes del chat
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('📋 GET /api/admin/chat - Session user:', (session?.user as any)?.id, session?.user?.name)
    
    const adminPermissions = await checkAdminPermissions(session)
    console.log('📋 Admin permissions result:', adminPermissions)
    
    if (!adminPermissions) {
      console.log('❌ Access denied for user:', (session?.user as any)?.id)
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    console.log('✅ Access granted for user:', adminPermissions.userId, 'type:', adminPermissions.type)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const connection = await mysql.createConnection(dbConfig)

    try {
      // Obtener mensajes del chat
      const [messages] = await connection.execute(`
        SELECT 
          id,
          user_id,
          username,
          avatar_url,
          message,
          user_type,
          timestamp,
          edited_at,
          is_edited,
          is_deleted,
          reply_to
        FROM admin_chat 
        WHERE is_deleted = FALSE
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `, [limit, offset])

      // Obtener usuarios conectados actualmente
      const [activeUsers] = await connection.execute(`
        SELECT DISTINCT user_id, username, user_type, last_activity
        FROM admin_chat_connections 
        WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      `)

      return NextResponse.json({
        messages: (messages as any[]).reverse(), // Mostrar más antiguos primero
        activeUsers,
        total: (messages as any[]).length
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error getting chat messages:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Enviar nuevo mensaje
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminPermissions = await checkAdminPermissions(session)
    
    if (!adminPermissions) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { message, replyTo } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'El mensaje es demasiado largo (máximo 1000 caracteres)' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    try {
      // Insertar nuevo mensaje
      const [result] = await connection.execute(`
        INSERT INTO admin_chat (user_id, username, avatar_url, message, user_type, reply_to)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        (session!.user as any).id,
        session!.user!.name || (session!.user as any).username,
        session!.user!.image,
        message.trim(),
        adminPermissions.type,
        replyTo || null
      ])

      const messageId = (result as any).insertId

      // Obtener el mensaje completo insertado
      const [newMessage] = await connection.execute(`
        SELECT 
          id, user_id, username, avatar_url, message, user_type, 
          timestamp, edited_at, is_edited, is_deleted, reply_to
        FROM admin_chat 
        WHERE id = ?
      `, [messageId])

      // Crear notificaciones para otros usuarios
      if (adminPermissions.type === 'server_admin') {
        // Si es admin del servidor, notificar al owner
        await connection.execute(`
          INSERT INTO admin_chat_notifications (user_id, message_id)
          VALUES (?, ?)
        `, [process.env.DISCORD_OWNER_ID, messageId])
      } else if (adminPermissions.type === 'owner') {
        // Si es owner, notificar a todos los admins conectados
        const [admins] = await connection.execute(`
          SELECT DISTINCT user_id 
          FROM admin_chat_connections 
          WHERE user_type = 'server_admin' 
          AND last_activity > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `)
        
        for (const admin of admins as any[]) {
          await connection.execute(`
            INSERT INTO admin_chat_notifications (user_id, message_id)
            VALUES (?, ?)
          `, [admin.user_id, messageId])
        }
      }

      return NextResponse.json({
        success: true,
        message: (newMessage as any[])[0]
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Editar mensaje
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminPermissions = await checkAdminPermissions(session)
    
    if (!adminPermissions) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { messageId, newMessage } = await request.json()

    if (!newMessage || newMessage.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    try {
      // Verificar que el mensaje pertenece al usuario
      const [existing] = await connection.execute(`
        SELECT id FROM admin_chat 
        WHERE id = ? AND user_id = ? AND is_deleted = FALSE
      `, [messageId, (session!.user as any).id])

      if ((existing as any[]).length === 0) {
        return NextResponse.json({ error: 'Mensaje no encontrado o sin permisos' }, { status: 404 })
      }

      // Actualizar mensaje
      await connection.execute(`
        UPDATE admin_chat 
        SET message = ?, is_edited = TRUE, edited_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newMessage.trim(), messageId])

      return NextResponse.json({ success: true })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error editing chat message:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar mensaje
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminPermissions = await checkAdminPermissions(session)
    
    if (!adminPermissions) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'ID de mensaje requerido' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    try {
      // Verificar permisos (owner puede eliminar cualquier mensaje, admin solo los suyos)
      let whereClause = 'id = ? AND is_deleted = FALSE'
      let params = [messageId]

      if (adminPermissions.type !== 'owner') {
        whereClause += ' AND user_id = ?'
        params.push((session!.user as any).id)
      }

      const [existing] = await connection.execute(`
        SELECT id FROM admin_chat WHERE ${whereClause}
      `, params)

      if ((existing as any[]).length === 0) {
        return NextResponse.json({ error: 'Mensaje no encontrado o sin permisos' }, { status: 404 })
      }

      // Marcar como eliminado
      await connection.execute(`
        UPDATE admin_chat 
        SET is_deleted = TRUE, message = '[Mensaje eliminado]'
        WHERE id = ?
      `, [messageId])

      return NextResponse.json({ success: true })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error deleting chat message:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}