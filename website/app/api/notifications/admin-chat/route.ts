import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'
import { dbConfig } from '@/lib/database'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { message, sender_name, sender_id } = await req.json()

    if (!message || !sender_name) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const userId = (session.user as any).id
    const isOwner = userId === '388422519553654786'

    // Verificar que el usuario sea owner o tenga permisos de admin en Discord
    let isAdmin = false
    
    if (isOwner) {
      isAdmin = true
    } else {
      // Verificar permisos en Discord
      try {
        const GUILD_ID = '1382476289151336460'
        const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN

        if (BOT_TOKEN) {
          const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
            headers: {
              'Authorization': `Bot ${BOT_TOKEN}`,
              'Content-Type': 'application/json'
            }
          })

          if (memberResponse.ok) {
            const memberData = await memberResponse.json()
            const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
              headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json'
              }
            })

            if (rolesResponse.ok) {
              const roles = await rolesResponse.json()
              const memberRoles = roles.filter((role: any) => memberData.roles.includes(role.id))
              
              // Verificar si tiene permisos de administrador
              isAdmin = memberRoles.some((role: any) => {
                const permissions = BigInt(role.permissions)
                return (permissions & BigInt(0x8)) !== BigInt(0) || // ADMINISTRATOR
                       (permissions & BigInt(0x20000000)) !== BigInt(0) || // MANAGE_GUILD
                       (permissions & BigInt(0x10000000)) !== BigInt(0) || // MANAGE_ROLES
                       (permissions & BigInt(0x10)) !== BigInt(0) // MANAGE_CHANNELS
              })
            }
          }
        }
      } catch (discordError) {
        console.error('Error checking Discord permissions:', discordError)
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    // Crear conexión dentro de la función
    const connection = await mysql.createConnection(dbConfig)

    // Obtener todos los administradores del bot (owner + admins de Discord)
    const adminUsers = []
    const ownerId = '388422519553654786'
    
    // Caso 1: Si el owner NO es quien envía, notificar al owner
    if (sender_id !== ownerId) {
      try {
        // Verificar que el usuario que envía sea realmente un administrador
        const GUILD_ID = '1382476289151336460'
        const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN
        
        let isAdminVerified = false
        
        if (BOT_TOKEN) {
          console.log('🔐 Verificando si el sender es realmente admin en Discord...')
          try {
            const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${sender_id}`, {
              headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json'
              }
            })

            if (memberResponse.ok) {
              const memberData = await memberResponse.json()
              const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
                headers: {
                  'Authorization': `Bot ${BOT_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              })

              if (rolesResponse.ok) {
                const roles = await rolesResponse.json()
                const memberRoles = roles.filter((role: any) => memberData.roles.includes(role.id))
                
                // Verificar si tiene permisos de administrador
                const hasAdminPerms = memberRoles.some((role: any) => {
                  const permissions = BigInt(role.permissions)
                  return (permissions & BigInt(0x8)) !== BigInt(0) || // ADMINISTRATOR
                         (permissions & BigInt(0x20000000)) !== BigInt(0) || // MANAGE_GUILD
                         (permissions & BigInt(0x10000000)) !== BigInt(0) || // MANAGE_ROLES
                         (permissions & BigInt(0x10)) !== BigInt(0) // MANAGE_CHANNELS
                })
                
                if (hasAdminPerms) {
                  isAdminVerified = true
                  console.log(`✅ Sender is verified admin: ${sender_id}`)
                } else {
                  console.log(`❌ Sender does not have admin perms: ${sender_id}`)
                }
              }
            }
          } catch (discordError) {
            console.log(`⚠️  Could not verify Discord permissions for sender ${sender_id}:`, discordError instanceof Error ? discordError.message : 'Unknown error')
          }
        }
        
        // Verificación adicional: si está en admin_chat_connections, considerarlo admin válido
        if (!isAdminVerified) {
          const [senderCheck] = await connection.execute(
            'SELECT user_id FROM admin_chat_connections WHERE user_id = ?',
            [sender_id]
          ) as any[]
          
          if (senderCheck.length > 0) {
            isAdminVerified = true
            console.log(`✅ Sender found in admin_chat_connections: ${sender_id}`)
          }
        }
        
        // Solo notificar al owner si se verificó que el sender es admin
        if (isAdminVerified) {
          // Buscar al owner en las conexiones de chat admin o usar datos por defecto
          const [ownerResult] = await connection.execute(
            'SELECT user_id, username FROM admin_chat_connections WHERE user_id = ? ORDER BY last_activity DESC LIMIT 1',
            [ownerId]
          ) as any[]
          
          if (ownerResult.length > 0) {
            adminUsers.push({ discord_id: ownerResult[0].user_id, username: ownerResult[0].username })
          } else {
            // Si no está en chat_connections, usar datos por defecto
            adminUsers.push({ discord_id: ownerId, username: 'Owner' })
          }
          console.log(`✅ Sender verified as admin, will notify owner: ${ownerId}`)
        } else {
          console.log(`❌ Sender ${sender_id} is not verified as admin, no notification will be sent`)
        }
        
      } catch (error) {
        console.error('Error verifying sender admin status:', error)
        // En caso de error, no enviar notificación por seguridad
      }
    }
    
    // Caso 2: Si el owner ES quien envía, notificar a los otros administradores
    if (sender_id === ownerId) {
      try {
        // Buscar usuarios que sean administradores del servidor Discord
        // Obtener usuarios que han usado el chat admin (están en admin_chat_connections)
        const [allUsers] = await connection.execute(
          'SELECT DISTINCT user_id, username FROM admin_chat_connections WHERE user_id != ? ORDER BY last_activity DESC',
          [ownerId]
        ) as any[]
        
        console.log(`🔍 Found ${allUsers.length} users in admin_chat_connections`)
        
        // Verificar cuáles tienen permisos de admin en Discord
        if (allUsers.length > 0) {
          const GUILD_ID = '1382476289151336460'
          const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN
          
          if (BOT_TOKEN) {
            console.log('🔐 Verificando permisos de Discord para cada usuario...')
            for (const user of allUsers) {
              try {
                const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.user_id}`, {
                  headers: {
                    'Authorization': `Bot ${BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                  }
                })

                if (memberResponse.ok) {
                  const memberData = await memberResponse.json()
                  const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
                    headers: {
                      'Authorization': `Bot ${BOT_TOKEN}`,
                      'Content-Type': 'application/json'
                    }
                  })

                  if (rolesResponse.ok) {
                    const roles = await rolesResponse.json()
                    const memberRoles = roles.filter((role: any) => memberData.roles.includes(role.id))
                    
                    // Verificar si tiene permisos de administrador
                    const hasAdminPerms = memberRoles.some((role: any) => {
                      const permissions = BigInt(role.permissions)
                      return (permissions & BigInt(0x8)) !== BigInt(0) || // ADMINISTRATOR
                             (permissions & BigInt(0x20000000)) !== BigInt(0) || // MANAGE_GUILD
                             (permissions & BigInt(0x10000000)) !== BigInt(0) || // MANAGE_ROLES
                             (permissions & BigInt(0x10)) !== BigInt(0) // MANAGE_CHANNELS
                    })
                    
                    if (hasAdminPerms) {
                      adminUsers.push({ discord_id: user.user_id, username: user.username })
                      console.log(`✅ Found admin: ${user.username} (${user.user_id})`)
                    } else {
                      console.log(`❌ No admin perms: ${user.username} (${user.user_id})`)
                    }
                  } else {
                    console.log(`⚠️  Could not fetch roles for guild ${GUILD_ID}`)
                  }
                } else {
                  console.log(`⚠️  User ${user.username} not found in guild ${GUILD_ID}`)
                }
              } catch (userError) {
                console.log(`⚠️  Could not verify admin status for ${user.username}:`, userError instanceof Error ? userError.message : 'Unknown error')
              }
            }
          } else {
            console.log('⚠️  Discord bot token not available, using fallback')
            // Fallback: si no hay bot token, agregar usuarios conocidos en chat_connections como admins
            for (const user of allUsers) {
              adminUsers.push({ discord_id: user.user_id, username: user.username })
              console.log(`➕ Added user (no Discord verification): ${user.username} (${user.user_id})`)
            }
          }
        }
        
        // Si no se encontraron admins verificados, usar fallback con usuarios conocidos
        if (adminUsers.length === 0) {
          console.log('📋 No verified admins found, using known admin IDs as fallback...')
          
          // Lista de IDs conocidos de administradores
          const knownAdminIds = [
            '390873542448644106', // kayxscripts
            // Agrega aquí más IDs de administradores que conozcas
          ]
          
          for (const adminId of knownAdminIds) {
            if (adminId !== sender_id) {
              adminUsers.push({ discord_id: adminId, username: 'Admin' })
              console.log(`➕ Added known admin: ${adminId}`)
            }
          }
        }
        
      } catch (dbError) {
        console.error('Error fetching users for admin notification:', dbError)
      }
    }

    console.log(`📨 Enviando notificaciones de chat admin a ${adminUsers.length} usuarios...`)
    console.log(`📋 Remitente: ${sender_name} (${sender_id})`)
    console.log(`📝 Mensaje: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)

    if (adminUsers.length === 0) {
      await connection.end()
      return NextResponse.json({ 
        success: true, 
        message: 'No hay otros administradores para notificar',
        notifications_sent: 0 
      })
    }

    // Crear notificaciones para cada administrador
    const notifications = []
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

    for (const admin of adminUsers) {
      // Determinar la URL correcta según el tipo de usuario
      const adminUrl = admin.discord_id === '388422519553654786' ? '/admin' : '/server-admin'
      
      notifications.push([
        admin.discord_id,
        sender_id, // actor_id - quien envió el mensaje
        'admin_message', // type
        '💬 Nuevo mensaje en el chat de administradores', // title
        `${sender_name}: ${message.length > 100 ? message.substring(0, 100) + '...' : message}`, // message
        adminUrl, // link - URL correcta según tipo de usuario
        JSON.stringify({
          sender_name,
          sender_id,
          message_preview: message.substring(0, 200),
          chat_type: 'admin'
        }) // metadata
      ])
    }

    // Insertar todas las notificaciones
    await connection.execute(
      `INSERT INTO web_notifications 
       (user_id, actor_id, type, title, message, link, metadata) 
       VALUES ${notifications.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
      notifications.flat()
    )

    await connection.end()

    console.log(`✅ Se enviaron ${notifications.length} notificaciones de chat admin`)

    return NextResponse.json({
      success: true,
      message: 'Notificaciones de chat creadas exitosamente',
      notifications_sent: notifications.length
    })

  } catch (error) {
    console.error('❌ Error creating admin chat notifications:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}