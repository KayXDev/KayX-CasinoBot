import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}

// Función para obtener miembros online de Discord
async function getDiscordServerInfo(inviteUrl: string) {
  try {
    // Extraer código de invitación
    const inviteCode = inviteUrl.split('/').pop()?.split('?')[0]
    if (!inviteCode) return null

    const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`)
    
    if (!response.ok) return null
    
    const data = await response.json()
    return {
      memberCount: data.approximate_member_count || 0,
      onlineCount: data.approximate_presence_count || 0,
      serverName: data.guild?.name || '',
      serverIcon: data.guild?.icon || ''
    }
  } catch (error) {
    console.error('Error fetching Discord server info:', error)
    return null
  }
}

export async function POST() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener todos los servidores con sus invite links
    const [servers] = await connection.execute(`
      SELECT id, invite_link FROM featured_servers WHERE invite_link IS NOT NULL
    `)

    let updatedCount = 0
    
    if (Array.isArray(servers)) {
      for (const server of servers) {
        const discordInfo = await getDiscordServerInfo((server as any).invite_link)
        
        if (discordInfo) {
          // Actualizar estadísticas del servidor
          await connection.execute(`
            UPDATE featured_servers 
            SET members = ?, online_members = ?
            WHERE id = ?
          `, [discordInfo.memberCount, discordInfo.onlineCount, (server as any).id])
          
          updatedCount++
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    await connection.end()

    return NextResponse.json({
      success: true,
      message: `${updatedCount} servidores actualizados`,
      updatedCount
    })
  } catch (error) {
    console.error('Error updating server stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Error actualizando estadísticas de servidores'
    }, { status: 500 })
  }
}