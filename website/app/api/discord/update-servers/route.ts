import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}

async function updateServerStats(serverId: number, inviteLink: string) {
  try {
    // Extraer el código de invitación del enlace
    const inviteCode = inviteLink.split('/').pop()?.split('?')[0]
    
    if (!inviteCode) {
      console.log(`Enlace inválido para servidor ${serverId}`)
      return false
    }

    // Obtener información actualizada del servidor usando la API de Discord
    const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.log(`Error API Discord para servidor ${serverId}: ${response.status}`)
      return false
    }

    const inviteData = await response.json()
    
    const newMemberCount = inviteData.approximate_member_count || 0
    const newOnlineCount = inviteData.approximate_presence_count || 0
    const newIcon = inviteData.guild?.icon 
      ? `https://cdn.discordapp.com/icons/${inviteData.guild.id}/${inviteData.guild.icon}.png?size=256`
      : null

    // Actualizar en la base de datos
    const connection = await mysql.createConnection(dbConfig)
    
    await connection.execute(`
      UPDATE featured_servers 
      SET members = ?, online_members = ?, image = COALESCE(?, image), last_updated = NOW() 
      WHERE id = ?
    `, [newMemberCount.toString(), newOnlineCount, newIcon, serverId])

    await connection.end()

    console.log(`Servidor ${serverId} actualizado: ${newMemberCount} miembros, ${newOnlineCount} online`)
    return true

  } catch (error) {
    console.error(`Error actualizando servidor ${serverId}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que la solicitud viene del sistema interno (opcional: agregar autenticación)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener todos los servidores featured con sus enlaces de invitación
    const [servers] = await connection.execute(`
      SELECT id, name, invite, members, online_members, last_updated
      FROM featured_servers 
      WHERE invite IS NOT NULL AND invite != ''
    `)

    let updatedCount = 0
    let errorCount = 0

    for (const server of servers as any[]) {
      const success = await updateServerStats(server.id, server.invite)
      if (success) {
        updatedCount++
      } else {
        errorCount++
      }
      
      // Pequeña pausa entre actualizaciones para no saturar la API de Discord
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await connection.end()

    return NextResponse.json({
      success: true,
      message: `Actualización completada: ${updatedCount} servidores actualizados, ${errorCount} errores`,
      stats: {
        updated: updatedCount,
        errors: errorCount,
        total: (servers as any[]).length
      }
    })

  } catch (error) {
    console.error('Error en actualización automática:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}