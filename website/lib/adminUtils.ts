// utils/adminUtils.ts
// Utility functions for admin permission checking

import mysql from 'mysql2/promise'
import { dbConfig, sanitizeParams } from './database'

interface AdminPermissions {
  manage_posts: boolean
  delete_any_post: boolean
  edit_any_post: boolean
  manage_comments: boolean
  delete_any_comment: boolean
  manage_users: boolean
  manage_admins: boolean
  view_analytics: boolean
  moderate_content: boolean
  featured_posts: boolean
  system_settings: boolean
}

interface AdminUser {
  user_id: string
  username: string
  role: 'owner' | 'admin' | 'moderator'
  permissions: AdminPermissions
}

export async function getAdminPermissions(userId: string): Promise<AdminUser | null> {
  try {
    console.log('🔍 Checking admin permissions for user:', userId)
    const connection = await mysql.createConnection(dbConfig)
    
    const [rows] = await connection.execute(
      'SELECT user_id, username, role, permissions FROM blog_admins WHERE user_id = ?',
      sanitizeParams([userId])
    )
    
    await connection.end()
    
    if (Array.isArray(rows) && rows.length > 0) {
      const admin = rows[0] as any
      return {
        user_id: admin.user_id,
        username: admin.username,
        role: admin.role,
        permissions: typeof admin.permissions === 'string' 
          ? JSON.parse(admin.permissions) 
          : admin.permissions
      }
    }
    
    return null
  } catch (error) {
    console.error('Error checking admin permissions:', error)
    return null
  }
}

export async function hasPermission(userId: string, permission: keyof AdminPermissions): Promise<boolean> {
  const admin = await getAdminPermissions(userId)
  if (!admin) return false
  
  // Owner has all permissions
  if (admin.role === 'owner') return true
  
  // Check specific permission
  return admin.permissions[permission] === true
}

export async function logAdminAction(
  adminId: string,
  adminUsername: string,
  action: string,
  targetType: 'post' | 'comment' | 'user' | 'system',
  targetId?: string,
  details?: any
): Promise<void> {
  try {
    let dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    }

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL)
      dbConfig = {
        host: url.hostname,
        user: url.username || 'root',
        password: url.password || '',
        database: url.pathname.slice(1)
      }
    }

    const connection = await mysql.createConnection(dbConfig)
    
    await connection.execute(
      `INSERT INTO blog_admin_actions 
       (admin_id, admin_username, action, target_type, target_id, details) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername,
        action,
        targetType,
        targetId || null,
        details ? JSON.stringify(details) : null
      ]
    )
    
    await connection.end()
  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}