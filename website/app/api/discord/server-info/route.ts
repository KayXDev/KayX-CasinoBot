import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteLink } = body

    if (!inviteLink) {
      return NextResponse.json({ error: 'Enlace de invitación requerido' }, { status: 400 })
    }

    // Extraer el código de invitación del enlace
    const inviteCode = inviteLink.split('/').pop()?.split('?')[0]
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Enlace de invitación inválido' }, { status: 400 })
    }

    // Obtener información del servidor usando la API pública de Discord
    const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Invitación no encontrada o expirada' }, { status: 404 })
      }
      throw new Error(`Discord API error: ${response.status}`)
    }

    const inviteData = await response.json()
    
    // Extraer información relevante
    const serverInfo = {
      name: inviteData.guild?.name || 'Servidor desconocido',
      memberCount: inviteData.approximate_member_count || 0,
      onlineCount: inviteData.approximate_presence_count || 0,
      icon: inviteData.guild?.icon 
        ? `https://cdn.discordapp.com/icons/${inviteData.guild.id}/${inviteData.guild.icon}.png?size=256`
        : null,
      banner: inviteData.guild?.banner
        ? `https://cdn.discordapp.com/banners/${inviteData.guild.id}/${inviteData.guild.banner}.png?size=512`
        : null,
      description: inviteData.guild?.description || '',
      verificationLevel: inviteData.guild?.verification_level || 0,
      features: inviteData.guild?.features || []
    }

    return NextResponse.json({ 
      success: true, 
      serverInfo 
    })

  } catch (error) {
    console.error('Error fetching Discord server info:', error)
    return NextResponse.json({ 
      error: 'Error al obtener información del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}