import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { dbConfig, sanitizeParams } from '../../../lib/database'

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener servidores destacados
    const [servers] = await connection.execute(`
      SELECT * FROM featured_servers ORDER BY featured DESC, created_at DESC
    `)

    // Procesar los servidores
    const processedServers = Array.isArray(servers) ? servers.map((server: any) => ({
      ...server,
      features: typeof server.features === 'string' ? JSON.parse(server.features) : server.features,
      tags: typeof server.tags === 'string' ? JSON.parse(server.tags) : server.tags
    })) : []

    await connection.end()

    return NextResponse.json({
      success: true,
      servers: processedServers
    })
  } catch (error) {
    console.error('Error fetching featured servers:', error)
    return NextResponse.json({
      success: false,
      servers: []
    })
  }
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
      serverIcon: data.guild?.icon ? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png?size=128` : ''
    }
  } catch (error) {
    console.error('Error fetching Discord server info:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que el usuario sea el owner
    if (!session?.user || (session.user as any)?.id !== '388422519553654786') {
      return NextResponse.json({ error: 'No autorizado - Solo el owner puede agregar servidores' }, { status: 401 })
    }

    const body = await request.json()
    
    const { 
      serverName, 
      serverDescription, 
      inviteLink, 
      members, 
      onlineMembers,
      category, 
      features,
      image,
      verified,
      featured,
      growth,
      tags,
      level,
      color,
      icon
    } = body

    if (!serverName || !serverDescription || !inviteLink || !category) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // Obtener información actualizada de Discord
    const discordInfo = await getDiscordServerInfo(inviteLink)
    const finalMembers = discordInfo?.memberCount || members || 0
    const finalOnlineMembers = discordInfo?.onlineCount || onlineMembers || 0
    const finalImage = discordInfo?.serverIcon 
      || image 
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(serverName)}&size=128&background=dc2626&color=ffffff`

    const connection = await mysql.createConnection(dbConfig)

    // Insertar servidor destacado
    const [result] = await connection.execute(`
      INSERT INTO featured_servers (
        server_name, 
        server_description, 
        invite_link, 
        members, 
        online_members,
        category, 
        features, 
        image,
        verified,
        featured,
        growth,
        tags,
        level,
        color,
        icon,
        added_by,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, sanitizeParams([
      serverName,
      serverDescription,
      inviteLink,
      finalMembers,
      finalOnlineMembers,
      category,
      JSON.stringify(features || []),
      finalImage,
      verified || false,
      featured || false,
      growth || '+0%',
      JSON.stringify(tags || []),
      level || 'Advanced',
      color || 'from-casino-500 to-purple-500',
      icon || 'Shield',
      (session.user as any)?.id
    ]))

    const insertId = (result as any).insertId

    // Obtener el servidor insertado
    const [insertedServer] = await connection.execute(`
      SELECT * FROM featured_servers WHERE id = ?
    `, sanitizeParams([insertId]))

    await connection.end()

    const serverData = Array.isArray(insertedServer) && insertedServer.length > 0 ? {
      ...insertedServer[0],
      features: JSON.parse((insertedServer[0] as any).features),
      tags: JSON.parse((insertedServer[0] as any).tags)
    } : null

    return NextResponse.json({
      success: true,
      server: serverData
    })
  } catch (error) {
    console.error('Error creating featured server:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que el usuario sea el owner
    if (!session?.user || (session.user as any)?.id !== '388422519553654786') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('id')

    if (!serverId) {
      return NextResponse.json({ error: 'ID de servidor requerido' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Eliminar servidor
    await connection.execute(`
      DELETE FROM featured_servers WHERE id = ?
    `, sanitizeParams([serverId]))

    await connection.end()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting server:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Update complete server information
export async function PUT(request: NextRequest) {
  let connection: any = null;
  
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar autenticación
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    const { 
      id,
      serverName, 
      serverDescription, 
      inviteLink, 
      members, 
      onlineMembers,
      category, 
      features,
      image,
      verified,
      featured,
      growth,
      tags,
      level,
      color,
      icon
    } = body

    // Validación básica
    if (!id || !serverName || !serverDescription || !inviteLink || !category) {
      return NextResponse.json({ 
        error: 'ID, server name, description, invite link, and category are required' 
      }, { status: 400 })
    }

    connection = await mysql.createConnection(dbConfig)

    // Verificar si el servidor existe
    const [servers] = await connection.execute(
      'SELECT id, server_name, added_by FROM featured_servers WHERE id = ?',
      sanitizeParams([id])
    )

    if (!Array.isArray(servers) || servers.length === 0) {
      await connection.end()
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const server = servers[0] as any
    const userId = (session.user as any).id

    // Verificar permisos: solo el owner del servidor o el admin principal pueden editar
    const isServerOwner = server.added_by === userId
    const isMainAdmin = userId === '388422519553654786'

    if (!isServerOwner && !isMainAdmin) {
      await connection.end()
      return NextResponse.json({ error: 'Unauthorized to edit this server' }, { status: 403 })
    }

    // Obtener información actualizada de Discord si es necesario
    const discordInfo = await getDiscordServerInfo(inviteLink)
    const finalMembers = discordInfo?.memberCount || members || 0
    const finalOnlineMembers = discordInfo?.onlineCount || onlineMembers || 0
    const finalImage = discordInfo?.serverIcon 
      || image 
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(serverName)}&size=128&background=dc2626&color=ffffff`

    const updateParams = sanitizeParams([
      serverName,
      serverDescription,
      inviteLink,
      finalMembers,
      finalOnlineMembers,
      category,
      JSON.stringify(features || []),
      finalImage,
      verified || false,
      featured || false,
      growth || '+0%',
      JSON.stringify(tags || []),
      level || 'Advanced',
      color || 'from-casino-500 to-purple-500',
      icon || 'Shield',
      id
    ])

    const [updateResult] = await connection.execute(`
      UPDATE featured_servers SET 
        server_name = ?, 
        server_description = ?, 
        invite_link = ?, 
        members = ?, 
        online_members = ?, 
        category = ?, 
        features = ?, 
        image = ?, 
        verified = ?, 
        featured = ?, 
        growth = ?, 
        tags = ?, 
        level = ?, 
        color = ?, 
        icon = ?, 
        updated_at = NOW()
      WHERE id = ?
    `, updateParams)

    await connection.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Server updated successfully' 
    })
  } catch (error) {
    console.error('Error updating server:', error)
    
    // Ensure connection is closed even on error
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error('Error closing connection:', closeError)
      }
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update server',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que el usuario sea el owner
    if (!session?.user || (session.user as any)?.id !== '388422519553654786') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { serverId, featured, verified } = body

    if (!serverId) {
      return NextResponse.json({ error: 'ID de servidor requerido' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Construir query dinámicamente
    const updates = []
    const values = []
    
    if (typeof featured === 'boolean') {
      updates.push('featured = ?')
      values.push(featured)
    }
    
    if (typeof verified === 'boolean') {
      updates.push('verified = ?')
      values.push(verified)
    }

    if (updates.length === 0) {
      await connection.end()
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    values.push(serverId)

    await connection.execute(`
      UPDATE featured_servers 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, sanitizeParams(values))

    await connection.end()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating server:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}