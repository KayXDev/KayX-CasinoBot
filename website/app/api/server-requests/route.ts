import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener solo solicitudes pendientes
    const [requests] = await connection.execute(`
      SELECT * FROM server_requests 
      WHERE status = 'pending' 
      ORDER BY submitted_at DESC
    `)

    // Procesar las solicitudes
    const processedRequests = Array.isArray(requests) ? requests.map((request: any) => ({
      ...request,
      features: typeof request.features === 'string' ? JSON.parse(request.features) : request.features
    })) : []

    await connection.end()

    return NextResponse.json({
      success: true,
      requests: processedRequests
    })
  } catch (error) {
    console.error('Error fetching server requests:', error)
    return NextResponse.json({
      success: false,
      requests: []
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar autenticación
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      serverName, 
      serverDescription, 
      inviteLink, 
      members = 'No especificado', 
      onlineMembers = 0,
      serverIcon = null,
      category, 
      features
    } = body

    if (!serverName || !serverDescription || !inviteLink || !category) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Insertar SOLO solicitud para revisión (no publicar automáticamente)
    const [result] = await connection.execute(`
      INSERT INTO server_requests (
        server_name, 
        server_description, 
        invite_link, 
        members, 
        online_members,
        image,
        category,
        features, 
        submitted_by, 
        submitted_by_id, 
        status,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      serverName,
      serverDescription,
      inviteLink,
      members,
      onlineMembers,
      serverIcon || `https://ui-avatars.com/api/?name=${encodeURIComponent(serverName)}&size=128&background=dc2626&color=ffffff`,
      category,
      JSON.stringify(features || []),
      session.user.name || 'Usuario Anónimo',
      (session.user as any)?.id || ''
    ])



    const insertId = (result as any).insertId

    // Obtener la solicitud insertada
    const [insertedRequest] = await connection.execute(`
      SELECT * FROM server_requests WHERE id = ?
    `, [insertId])

    await connection.end()

    const requestData = Array.isArray(insertedRequest) && insertedRequest.length > 0 ? {
      ...insertedRequest[0],
      features: JSON.parse((insertedRequest[0] as any).features)
    } : null

    return NextResponse.json({
      success: true,
      request: requestData
    })
  } catch (error) {
    console.error('Error creating server request:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que el usuario sea el owner
    if (!session?.user || (session.user as any)?.id !== '388422519553654786') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { requestId, status } = await request.json()

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Primero obtener los datos de la solicitud antes de procesarla
    const [requestData] = await connection.execute(`
      SELECT * FROM server_requests WHERE id = ?
    `, [requestId])

    if (!Array.isArray(requestData) || requestData.length === 0) {
      await connection.end()
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const serverData = requestData[0] as any

    // Si se aprueba, mover a featured_servers
    if (status === 'approved') {
      // Detectar imagen automáticamente del enlace de Discord
      let serverImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(serverData.server_name)}&size=128&background=dc2626&color=ffffff`
      
      try {
        const inviteCode = serverData.invite_link?.split('/').pop()?.split('?')[0]
        if (inviteCode && process.env.DISCORD_BOT_TOKEN) {
          const discordResponse = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`, {
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          })

          if (discordResponse.ok) {
            const discordData = await discordResponse.json()
            if (discordData.guild?.icon) {
              serverImage = `https://cdn.discordapp.com/icons/${discordData.guild.id}/${discordData.guild.icon}.png?size=256`
            }
          }
        }
      } catch (error) {
        console.log('No se pudo obtener imagen de Discord, usando placeholder')
      }
      await connection.execute(`
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
      `, [
        serverData.server_name,
        serverData.server_description,
        serverData.invite_link,
        serverData.members,
        serverData.online_members || 0,
        serverData.category,
        serverData.features,
        serverData.image || serverImage,
        false, // verified default
        true, // featured = true for approved servers
        '+5%', // growth default
        '[]', // tags default
        'Standard', // level default
        'from-red-500 to-pink-500', // color default
        'Star', // icon default
        serverData.submitted_by_id
      ])
    }

    // Eliminar la solicitud procesada (tanto aprobada como rechazada)
    await connection.execute(`
      DELETE FROM server_requests WHERE id = ?
    `, [requestId])

    await connection.end()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating server request:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}