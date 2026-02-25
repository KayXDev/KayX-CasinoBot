import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
import mysql from 'mysql2/promise'

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: ServerIO
    }
  }
}

// Función para actualizar la actividad del usuario con manejo de deadlock
async function updateUserActivity(userId: string, username: string, userType: string, socketId: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const connection = await mysql.createConnection(dbConfig)
    try {
      // Iniciar transacción
      await connection.beginTransaction()
      
      try {
        // Usar REPLACE en lugar de DELETE + INSERT para evitar deadlocks
        await connection.execute(`
          REPLACE INTO admin_chat_connections (user_id, username, user_type, socket_id, last_activity)
          VALUES (?, ?, ?, ?, NOW())
        `, [userId, username, userType, socketId])

        // Limpiar conexiones obsoletas del mismo usuario (excepto la actual)
        await connection.execute(`
          DELETE FROM admin_chat_connections 
          WHERE user_id = ? AND socket_id != ?
        `, [userId, socketId])

        await connection.commit()
        console.log(`✅ User activity updated for ${username} (${socketId})`)
        break // Éxito, salir del loop
        
      } catch (error: any) {
        await connection.rollback()
        
        if (error.code === 'ER_LOCK_DEADLOCK' && attempt < retries - 1) {
          console.log(`⚠️ Deadlock detected, retrying (attempt ${attempt + 1}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)) // Random delay 50-150ms
          continue
        }
        
        throw error
      }
      
    } finally {
      await connection.end()
    }
  }
}

// Función para desconectar sockets anteriores del mismo usuario (simplificado)
async function disconnectPreviousSockets(io: ServerIO, userId: string, currentSocketId: string) {
  try {
    const sockets = await io.fetchSockets()
    let disconnected = 0
    
    for (const socket of sockets) {
      if (socket.data?.userId === userId && socket.id !== currentSocketId) {
        console.log(`🔌 Disconnecting previous socket ${socket.id} for user ${userId}`)
        socket.disconnect(true) // Forzar desconexión sin evento
        disconnected++
      }
    }
    
    if (disconnected > 0) {
      console.log(`✅ Disconnected ${disconnected} previous socket(s) for user ${userId}`)
    }
  } catch (error) {
    console.error('Error disconnecting previous sockets:', error)
  }
}

// Función para remover conexión del usuario
async function removeUserConnection(socketId: string) {
  const connection = await mysql.createConnection(dbConfig)
  try {
    await connection.execute(`
      DELETE FROM admin_chat_connections 
      WHERE socket_id = ?
    `, [socketId])
  } finally {
    await connection.end()
  }
}

// Configuración del servidor Socket.IO
export function setupSocketIO(res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...')
    
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    // Middleware para autenticación
    io.use(async (socket, next) => {
      try {
        const { userId, username, userType } = socket.handshake.auth
        
        if (!userId || !username || !userType) {
          return next(new Error('Authentication failed'))
        }

        // Verificar que el userType sea válido
        if (!['owner', 'server_admin'].includes(userType)) {
          return next(new Error('Invalid user type'))
        }

        socket.data = { userId, username, userType }
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })

    io.on('connection', async (socket) => {
      const { userId, username, userType } = socket.data
      
      console.log(`✅ Admin chat: ${username} (${userType}) connecting with socket ${socket.id}`)

      try {
        // Unirse a la sala del chat de administradores
        await socket.join('admin-chat')

        // Actualizar actividad del usuario PRIMERO
        await updateUserActivity(userId, username, userType, socket.id)

        // DESPUÉS desconectar sockets anteriores
        await disconnectPreviousSockets(io, userId, socket.id)

        console.log(`🔗 ${username} (${userType}) successfully connected`)

        // Notificar a otros usuarios que alguien se conectó
        socket.to('admin-chat').emit('user-connected', {
          userId,
          username,
          userType,
          timestamp: new Date()
        })

        // Obtener y enviar lista de usuarios conectados
        const connection = await mysql.createConnection(dbConfig)
        try {
          const [activeUsers] = await connection.execute(`
            SELECT DISTINCT user_id, username, user_type, last_activity
            FROM admin_chat_connections 
            WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
          `)
          
          io.to('admin-chat').emit('active-users', activeUsers)
        } catch (error) {
          console.error('Error getting active users:', error)
        } finally {
          await connection.end()
        }
        
      } catch (error) {
        console.error(`❌ Error setting up connection for ${username}:`, error)
        socket.disconnect(true)
        return
      }

      // Manejar nuevo mensaje
      socket.on('send-message', async (data) => {
        console.log(`📝 ${username} (${userType}) attempting to send message`)
        
        try {
          const { message, replyTo } = data
          
          if (!message || message.trim().length === 0) {
            console.log(`❌ Empty message from ${username}`)
            socket.emit('error', { message: 'El mensaje no puede estar vacío' })
            return
          }

          if (message.length > 1000) {
            console.log(`❌ Message too long from ${username}`)
            socket.emit('error', { message: 'El mensaje es demasiado largo (máximo 1000 caracteres)' })
            return
          }

          const connection = await mysql.createConnection(dbConfig)
          
          try {
            // Insertar mensaje en la base de datos
            const [result] = await connection.execute(`
              INSERT INTO admin_chat (user_id, username, avatar_url, message, user_type, reply_to)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, username, null, message.trim(), userType, replyTo || null])

            const messageId = (result as any).insertId
            console.log(`✅ Message ${messageId} inserted for ${username}`)

            // Obtener el mensaje completo
            const [newMessage] = await connection.execute(`
              SELECT 
                id, user_id, username, avatar_url, message, user_type, 
                timestamp, edited_at, is_edited, is_deleted, reply_to
              FROM admin_chat 
              WHERE id = ?
            `, [messageId])

            const messageData = (newMessage as any[])[0]

            // Crear notificaciones según el tipo de usuario
            if (userType === 'server_admin') {
              // Notificar al owner
              await connection.execute(`
                INSERT INTO admin_chat_notifications (user_id, message_id)
                VALUES (?, ?)
              `, [process.env.DISCORD_OWNER_ID, messageId])
              console.log(`📬 Notification sent to owner for message ${messageId}`)
            } else if (userType === 'owner') {
              // Notificar a todos los admins del servidor
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
              console.log(`📬 Notifications sent to ${(admins as any[]).length} admins`)
            }

            // Enviar mensaje a TODOS los usuarios conectados en la sala (incluyendo al remitente)
            io.to('admin-chat').emit('new-message', messageData)
            
            // Enviar confirmación adicional al remitente
            socket.emit('message-sent', { success: true, messageId })
            console.log(`📤 Message sent successfully by ${username}`)
            
          } finally {
            await connection.end()
          }

        } catch (error) {
          console.error(`❌ Error sending message from ${username}:`, error)
          socket.emit('error', { message: 'Error al enviar el mensaje' })
        }
      })

      // Manejar indicador de escritura
      socket.on('typing-start', () => {
        socket.to('admin-chat').emit('user-typing', {
          userId,
          username,
          userType,
          isTyping: true
        })
      })

      socket.on('typing-stop', () => {
        socket.to('admin-chat').emit('user-typing', {
          userId,
          username,
          userType,
          isTyping: false
        })
      })

      // Manejar desconexión
      socket.on('disconnect', async () => {
        console.log(`Admin chat: ${username} (${userType}) disconnected`)
        
        await removeUserConnection(socket.id)
        
        socket.to('admin-chat').emit('user-disconnected', {
          userId,
          username,
          userType,
          timestamp: new Date()
        })

        // Actualizar lista de usuarios activos
        const connection = await mysql.createConnection(dbConfig)
        try {
          const [activeUsers] = await connection.execute(`
            SELECT DISTINCT user_id, username, user_type, last_activity
            FROM admin_chat_connections 
            WHERE last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
          `)
          
          io.to('admin-chat').emit('active-users', activeUsers)
        } catch (error) {
          console.error('Error updating active users on disconnect:', error)
        } finally {
          await connection.end()
        }
      })
    })

    res.socket.server.io = io
    console.log('Socket.IO server configured successfully')
  }
  
  return res.socket.server.io
}