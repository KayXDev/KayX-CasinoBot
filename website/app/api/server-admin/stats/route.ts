import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot'
}

// Verificar si el usuario es admin del servidor (no owner)
async function isServerAdmin(userId: string): Promise<boolean> {
  if (userId === '388422519553654786') return false // Owner no es server admin
  
  try {
    const GUILD_ID = '1382476289151336460'
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

    if (!BOT_TOKEN) return false

    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
    })

    if (!memberResponse.ok) return false

    const memberData = await memberResponse.json()
    const userRoles = memberData.roles || []

    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
    })

    if (!rolesResponse.ok) return false

    const serverRoles = await rolesResponse.json()

    for (const roleId of userRoles) {
      const role = serverRoles.find((r: any) => r.id === roleId)
      if (role) {
        const permissions = BigInt(role.permissions)
        if (permissions & (BigInt(0x8) | BigInt(0x20) | BigInt(0x10000000) | BigInt(0x10) | BigInt(0x2000))) {
          return true
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking server admin status:', error)
    return false
  }
}

// GET - Obtener estadísticas básicas para server admins
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const serverAdmin = await isServerAdmin(userId)
    
    if (!serverAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Acceso denegado - Solo para administradores del servidor' 
      }, { status: 403 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Estadísticas básicas - sin información sensible
    const [statsRows] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as totalPosts,
        (SELECT COUNT(*) FROM blog_comments) as totalComments,
        (SELECT COUNT(*) FROM blog_likes) as totalLikes,
        (SELECT SUM(views) FROM blog_posts) as totalViews
    `)

    const stats = (statsRows as any[])[0]

    // Estadísticas adicionales limitadas para server admins
    const [additionalStats] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM blog_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as postsThisWeek,
        (SELECT COUNT(*) FROM blog_comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as commentsThisWeek,
        (SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND author_id != '388422519553654786') as userPosts,
        (SELECT COUNT(*) FROM blog_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as postsThisMonth,
        (SELECT AVG(views) FROM blog_posts WHERE status = 'published') as avgViews
    `)

    const weeklyStats = (additionalStats as any[])[0]

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      stats: {
        totalPosts: stats.totalPosts,
        totalComments: stats.totalComments,
        totalLikes: stats.totalLikes,
        totalViews: stats.totalViews,
        postsThisWeek: weeklyStats.postsThisWeek,
        commentsThisWeek: weeklyStats.commentsThisWeek,
        userPosts: weeklyStats.userPosts,
        postsThisMonth: weeklyStats.postsThisMonth,
        avgViews: Math.round(weeklyStats.avgViews || 0)
      },
      access_level: 'server_admin',
      permissions: [
        'View basic statistics',
        'Monitor server health',
        'View content metrics',
        'Access community insights'
      ],
      limitations: [
        'No access to user data',
        'No access to financial information',
        'No access to system configuration',
        'Limited to content moderation only'
      ]
    })

  } catch (error) {
    console.error('Error fetching stats for server admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}