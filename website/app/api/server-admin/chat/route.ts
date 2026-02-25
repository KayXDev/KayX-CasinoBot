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

// Lista de IDs de administradores autorizados
const authorizedAdmins = [
  process.env.DISCORD_OWNER_ID, // Owner
  '390873542448644106', // kayxscripts - agregar aquí los IDs de los admins autorizados
]

// Verificar permisos de administrador del servidor
async function checkServerAdminPermissions(session: any) {
  if (!session?.user?.id) {
    console.log('❌ No session or user ID found')
    return false
  }

  const userId = (session.user as any).id
  console.log('🔍 Checking permissions for user:', userId)

  // Verificar si es owner
  const ownerId = process.env.DISCORD_OWNER_ID
  if (userId === ownerId) {
    console.log('✅ User is owner')
    return true
  }

  // Verificar si está en la lista de administradores autorizados
  if (authorizedAdmins.includes(userId)) {
    console.log('✅ User is authorized admin')
    return true
  }

  // Como fallback, intentar verificar permisos de Discord
  if (process.env.DISCORD_GUILD_ID && process.env.DISCORD_BOT_TOKEN) {
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      })

      if (response.ok) {
        const member = await response.json()
        
        // Verificar roles de administrador
        if (member.roles && Array.isArray(member.roles)) {
          // Aquí puedes agregar IDs específicos de roles de admin
          const adminRoles = ['ROLE_ID_1', 'ROLE_ID_2'] // Reemplazar con IDs reales
          const hasAdminRole = member.roles.some((roleId: string) => adminRoles.includes(roleId))
          
          if (hasAdminRole) {
            console.log('✅ User has admin role via Discord API')
            return true
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Discord API check failed, using fallback authorization')
    }
  }

  console.log('❌ User not authorized')
  return false
}

// GET - Obtener historial de mensajes del chat
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const hasPermissions = await checkServerAdminPermissions(session)
    
    if (!hasPermissions) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

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

      // Marcar notificaciones como leídas
      await connection.execute(`
        UPDATE admin_chat_notifications 
        SET is_read = TRUE 
        WHERE user_id = ? AND is_read = FALSE
      `, [(session!.user as any).id])

      return NextResponse.json({
        messages: (messages as any[]).reverse(),
        total: (messages as any[]).length
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error getting server admin chat messages:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Enviar nuevo mensaje
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const hasPermissions = await checkServerAdminPermissions(session)
    
    if (!hasPermissions) {
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
      // Determinar tipo de usuario
      const ownerId = process.env.DISCORD_OWNER_ID
      const userType = (session!.user as any).id === ownerId ? 'owner' : 'server_admin'

      // Insertar nuevo mensaje
      const [result] = await connection.execute(`
        INSERT INTO admin_chat (user_id, username, avatar_url, message, user_type, reply_to)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        (session!.user as any).id,
        session!.user!.name || (session!.user as any).username,
        session!.user!.image,
        message.trim(),
        userType,
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

      // Crear notificación para el owner si el mensaje viene de server admin
      if (userType === 'server_admin') {
        await connection.execute(`
          INSERT INTO admin_chat_notifications (user_id, message_id)
          VALUES (?, ?)
        `, [process.env.DISCORD_OWNER_ID, messageId])
      }

      return NextResponse.json({
        success: true,
        message: (newMessage as any[])[0]
      })

    } finally {
      await connection.end()
    }

  } catch (error) {
    console.error('Error sending server admin chat message:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}