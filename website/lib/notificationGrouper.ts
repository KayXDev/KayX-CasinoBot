interface Notification {
  id: number
  type: string
  title: string
  message: string
  actor_name?: string
  created_at: string
  is_read: boolean
  metadata?: any
}

interface GroupedNotification {
  type: string
  count: number
  lastNotification: Notification
  notifications: Notification[]
  summary: string
}

export class NotificationGrouper {
  static group(notifications: Notification[]): GroupedNotification[] {
    const groups: { [key: string]: Notification[] } = {}
    
    notifications.forEach(notification => {
      const key = this.getGroupKey(notification)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(notification)
    })

    return Object.values(groups).map(notifs => {
      const sorted = notifs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      return {
        type: notifs[0].type,
        count: notifs.length,
        lastNotification: sorted[0],
        notifications: sorted,
        summary: this.generateSummary(sorted)
      }
    }).sort((a, b) => 
      new Date(b.lastNotification.created_at).getTime() - 
      new Date(a.lastNotification.created_at).getTime()
    )
  }

  private static getGroupKey(notification: Notification): string {
    const { type, metadata } = notification
    
    // Agrupar likes del mismo post
    if (type === 'like' && metadata?.post_id) {
      return `like_post_${metadata.post_id}`
    }
    
    // Agrupar comentarios del mismo post
    if (type === 'comment' && metadata?.post_id) {
      return `comment_post_${metadata.post_id}`
    }
    
    // Agrupar por tipo para otros casos
    if (type === 'system' || type === 'changelog' || type === 'blog_post') {
      const date = new Date(notification.created_at).toDateString()
      return `${type}_${date}`
    }
    
    // Individual para casos específicos
    return `individual_${notification.id}`
  }

  private static generateSummary(notifications: Notification[]): string {
    const count = notifications.length
    const type = notifications[0].type
    const latest = notifications[0]

    if (count === 1) {
      return latest.message
    }

    switch (type) {
      case 'like':
        if (count === 2) {
          return `${latest.actor_name} y 1 persona más dieron like a tu post`
        }
        return `${latest.actor_name} y ${count - 1} personas más dieron like a tu post`

      case 'comment':
        if (count === 2) {
          return `${latest.actor_name} y 1 persona más comentaron tu post`
        }
        return `${latest.actor_name} y ${count - 1} personas más comentaron tu post`

      case 'system':
        return `${count} notificaciones del sistema`

      case 'blog_post':
        return `${count} nuevos posts del blog`

      case 'changelog':
        return `${count} actualizaciones del bot`

      default:
        return `${count} notificaciones de ${type}`
    }
  }

  static getTimeAgo(dateString: string): string {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'hace un momento'
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)}d`
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 604800)}sem`
    return date.toLocaleDateString()
  }

  static shouldShowAsGroup(notifications: Notification[]): boolean {
    return notifications.length > 1
  }
}