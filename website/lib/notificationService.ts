import mysql from 'mysql2/promise'

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  port: parseInt(process.env.DB_PORT || '3306')
}

export interface NotificationData {
  userId: string
  actorId?: string
  type: 'blog_post' | 'changelog' | 'review' | 'like' | 'comment' | 'system'
  title: string
  message: string
  link?: string
  metadata?: any
}

class NotificationService {
  private async getConnection() {
    return await mysql.createConnection(dbConfig)
  }

  async createNotification(data: NotificationData): Promise<number | null> {
    let connection = null
    try {
      connection = await this.getConnection()
      
      // Verificar preferencias del usuario
      const [settings] = await connection.execute(
        'SELECT * FROM notification_settings WHERE user_id = ?',
        [data.userId]
      ) as any
      
      // Si no hay configuración, crear con valores por defecto
      if (!settings || settings.length === 0) {
        await connection.execute(
          'INSERT IGNORE INTO notification_settings (user_id) VALUES (?)',
          [data.userId]
        )
      } else {
        // Verificar si el usuario tiene habilitado este tipo de notificaciones
        const userSettings = settings[0]
        const settingKey = `${data.type}_notifications`
        if (userSettings[settingKey] === false) {
          // Usuario ha deshabilitado este tipo de notificaciones
          return null
        }
      }

      // Crear la notificación
      const [result] = await connection.execute(
        `INSERT INTO web_notifications 
         (user_id, actor_id, type, title, message, link, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.actorId || null,
          data.type,
          data.title,
          data.message,
          data.link || null,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      )

      return (result as any).insertId
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  // Crear notificación para múltiples usuarios
  async createBulkNotifications(userIds: string[], data: Omit<NotificationData, 'userId'>): Promise<number> {
    let successCount = 0
    
    for (const userId of userIds) {
      const notificationId = await this.createNotification({
        ...data,
        userId
      })
      
      if (notificationId) {
        successCount++
      }
    }
    
    return successCount
  }

  // Limpiar notificaciones antiguas (más de 30 días)
  async cleanOldNotifications(): Promise<number> {
    let connection = null
    try {
      connection = await this.getConnection()
      
      const [result] = await connection.execute(
        'DELETE FROM web_notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      )
      
      return (result as any).affectedRows
    } catch (error) {
      console.error('Error cleaning old notifications:', error)
      return 0
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  // Notificar sobre nuevo post de blog
  async notifyNewBlogPost(postId: string, authorId: string, postTitle: string, postSlug: string) {
    let connection = null
    try {
      connection = await this.getConnection()
      
      // Obtener todos los usuarios que tienen habilitadas las notificaciones de blog
      // Simplificada para evitar problemas de collation
      const [users] = await connection.execute(`
        SELECT user_id FROM users WHERE user_id != ? LIMIT 50
      `, [authorId]) as any

      console.log(`📝 Enviando notificación de blog a ${Array.isArray(users) ? users.length : 0} usuarios`)

      if (users && Array.isArray(users) && users.length > 0) {
        let successCount = 0
        
        // Procesar cada usuario individualmente
        for (const user of users) {
          try {
            // Verificar preferencias del usuario
            const [settings] = await connection.execute(
              'SELECT blog_notifications FROM notification_settings WHERE user_id = ?',
              [user.user_id]
            ) as any
            
            // Si no hay configuración o está habilitada, crear notificación
            const shouldNotify = !settings || settings.length === 0 || settings[0].blog_notifications !== false
            
            if (shouldNotify) {
              const notificationId = await this.createNotification({
                userId: user.user_id,
                actorId: authorId,
                type: 'blog_post',
                title: '📝 Nuevo post publicado',
                message: `Se publicó un nuevo post: "${postTitle.substring(0, 50)}${postTitle.length > 50 ? '...' : ''}"`,
                link: `/blogs/${postId}`,
                metadata: { postId, authorId }
              })
              
              if (notificationId) {
                successCount++
              }
            }
          } catch (userError) {
            console.error(`Error procesando usuario ${user.user_id}:`, userError instanceof Error ? userError.message : 'Error desconocido')
          }
        }
        
        console.log(`✅ Se enviaron ${successCount} notificaciones de blog`)
      } else {
        console.log('ℹ️ No hay usuarios para notificar sobre el blog post')
      }
    } catch (error) {
      console.error('Error notifying new blog post:', error)
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  // Notificar sobre nuevo like
  async notifyNewLike(postId: string, postAuthorId: string, likerUserId: string, postTitle: string, postSlug: string) {
    // No notificar si el usuario likea su propio post
    if (postAuthorId === likerUserId) {
      return
    }

    await this.createNotification({
      userId: postAuthorId,
      actorId: likerUserId,
      type: 'like',
      title: '❤️ Nuevo like en tu post',
      message: `Le gustó tu post: "${postTitle.substring(0, 50)}${postTitle.length > 50 ? '...' : ''}"`,
      link: `/blogs/${postId}`, // Corregido: usar /blogs/{id} en lugar de /blog/{slug}
      metadata: { postId, likerUserId }
    })
  }

  // Notificar sobre nuevo comentario
  async notifyNewComment(postId: string, postAuthorId: string, commenterUserId: string, commentText: string, postTitle: string, postSlug: string) {
    // No notificar si el autor comenta en su propio post
    if (postAuthorId === commenterUserId) {
      return
    }

    await this.createNotification({
      userId: postAuthorId,
      actorId: commenterUserId,
      type: 'comment',
      title: '💬 Nuevo comentario en tu post',
      message: `Comentó: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      link: `/blogs/${postId}#comments`, // Corregido: usar /blogs/{id} en lugar de /blog/{slug}
      metadata: { postId, commenterUserId }
    })
  }

  // Notificar sobre nueva review
  async notifyNewReview(reviewerId: string, rating: number, reviewText?: string) {
    // Notificar a admins sobre nueva review
    let connection = null
    try {
      connection = await this.getConnection()
      
      // Notificar solo al owner (simplificado)
      const ownerIds = ['388422519553654786'] // ID del owner

      if (ownerIds && ownerIds.length > 0) {
        
        await this.createBulkNotifications(ownerIds, {
          actorId: reviewerId,
          type: 'review',
          title: '⭐ Nueva review recibida',
          message: `Nueva review de ${rating} estrella${rating !== 1 ? 's' : ''}${reviewText ? `: "${reviewText.substring(0, 50)}${reviewText.length > 50 ? '...' : ''}"` : ''}`,
          link: '/admin/reviews',
          metadata: { reviewerId, rating }
        })
      }
    } catch (error) {
      console.error('Error notifying new review:', error)
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  // Notificar sobre changelog
  async notifyChangelog(version: string, title: string, changelogSlug: string) {
    let connection = null
    try {
      connection = await this.getConnection()
      
      // Obtener todos los usuarios (simplificado para evitar problemas de collation)
      const [users] = await connection.execute(`
        SELECT user_id FROM users LIMIT 100
      `) as any

      console.log(`🔄 Enviando notificación de changelog a ${Array.isArray(users) ? users.length : 0} usuarios`)

      if (users && Array.isArray(users) && users.length > 0) {
        let successCount = 0
        
        // Procesar cada usuario individualmente
        for (const user of users) {
          try {
            // Verificar preferencias del usuario
            const [settings] = await connection.execute(
              'SELECT changelog_notifications FROM notification_settings WHERE user_id = ?',
              [user.user_id]
            ) as any
            
            // Si no hay configuración o está habilitada, crear notificación
            const shouldNotify = !settings || settings.length === 0 || settings[0].changelog_notifications !== false
            
            if (shouldNotify) {
              const notificationId = await this.createNotification({
                userId: user.user_id,
                type: 'changelog',
                title: '🔄 Nueva actualización disponible',
                message: `${version}: ${title}`,
                link: `/changelog`,
                metadata: { version, changelogSlug }
              })
              
              if (notificationId) {
                successCount++
              }
            }
          } catch (userError) {
            console.error(`Error procesando usuario ${user.user_id}:`, userError instanceof Error ? userError.message : 'Error desconocido')
          }
        }
        
        console.log(`✅ Se enviaron ${successCount} notificaciones de changelog`)
      } else {
        console.log('ℹ️ No hay usuarios para notificar sobre el changelog')
      }
    } catch (error) {
      console.error('Error notifying changelog:', error)
    } finally {
      if (connection) {
        await connection.end()
      }
    }
  }

  // Notificar mensaje del sistema
  async notifySystem(userIds: string[], title: string, message: string, link?: string) {
    await this.createBulkNotifications(userIds, {
      type: 'system',
      title: `🔔 ${title}`,
      message,
      link,
      metadata: { systemNotification: true }
    })
  }
}

// Instancia singleton
export const notificationService = new NotificationService()

// Funciones de conveniencia para usar en API routes
export const notify = {
  newBlogPost: (postId: string, authorId: string, postTitle: string, postSlug: string) =>
    notificationService.notifyNewBlogPost(postId, authorId, postTitle, postSlug),
  
  newLike: (postId: string, postAuthorId: string, likerUserId: string, postTitle: string, postSlug: string) =>
    notificationService.notifyNewLike(postId, postAuthorId, likerUserId, postTitle, postSlug),
  
  newComment: (postId: string, postAuthorId: string, commenterUserId: string, commentText: string, postTitle: string, postSlug: string) =>
    notificationService.notifyNewComment(postId, postAuthorId, commenterUserId, commentText, postTitle, postSlug),
  
  newReview: (reviewerId: string, rating: number, reviewText?: string) =>
    notificationService.notifyNewReview(reviewerId, rating, reviewText),
  
  changelog: (version: string, title: string, changelogSlug: string) =>
    notificationService.notifyChangelog(version, title, changelogSlug),
  
  system: (userIds: string[], title: string, message: string, link?: string) =>
    notificationService.notifySystem(userIds, title, message, link)
}