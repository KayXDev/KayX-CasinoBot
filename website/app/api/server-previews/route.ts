import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot'
}

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener previsualizaciones de las últimas 24 horas
    const [previews] = await connection.execute(`
      SELECT * FROM server_previews 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `)

    await connection.end()

    console.log('📊 Previews encontradas:', Array.isArray(previews) ? previews.length : 0)

    const processedPreviews = Array.isArray(previews) ? previews.map((preview: any) => ({
      id: `preview_${preview.id}`,
      name: preview.server_name,
      description: preview.server_description || 'Servidor de Discord',
      members: preview.members || '0',
      online: preview.online_members?.toString() || '0',
      image: preview.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(preview.server_name)}&size=128&background=dc2626&color=ffffff`,
      category: preview.category || 'Gaming',
      invite: preview.invite_link,
      verified: false,
      featured: false,
      features: [],
      level: 'Standard',
      color: 'from-blue-500 to-purple-500',
      tags: [],
      growth: '+5%',
      isPreview: true
    })) : []

    return NextResponse.json({ 
      success: true, 
      previews: processedPreviews 
    })

  } catch (error) {
    console.error('Error fetching previews:', error)
    return NextResponse.json({ 
      success: true, 
      previews: [] 
    })
  }
}