import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { dbConfig, sanitizeParams } from '../../../lib/database'

export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener changelogs
    const [changelogs] = await connection.execute(`
      SELECT * FROM changelogs ORDER BY date DESC, created_at DESC
    `)

    // Parsear el campo changes de JSON string a objeto y normalizar formato
    const processedChangelogs = Array.isArray(changelogs) ? changelogs.map((changelog: any) => {
      let parsedChanges;
      try {
        parsedChanges = typeof changelog.changes === 'string' ? JSON.parse(changelog.changes) : changelog.changes;
      } catch (e) {
        console.error(`Error parsing changes for changelog ${changelog.id}:`, e);
        parsedChanges = { new: [], improved: [], fixed: [] };
      }
      
      // Normalizar formato: convertir objeto plano a array de objetos
      let normalizedChanges;
      if (Array.isArray(parsedChanges)) {
        // Ya está en el formato correcto
        normalizedChanges = parsedChanges;
      } else if (parsedChanges && typeof parsedChanges === 'object') {
        // Convertir formato objeto a array
        normalizedChanges = [
          { type: 'new', items: parsedChanges.new || [] },
          { type: 'improved', items: parsedChanges.improved || [] },
          { type: 'fixed', items: parsedChanges.fixed || [] }
        ];
      } else {
        // Fallback
        normalizedChanges = [
          { type: 'new', items: [] },
          { type: 'improved', items: [] },
          { type: 'fixed', items: [] }
        ];
      }
      
      return {
        ...changelog,
        changes: normalizedChanges
      };
    }) : []

    await connection.end()

    return NextResponse.json({
      success: true,
      changelogs: processedChangelogs
    })
  } catch (error) {
    console.error('❌ Error fetching changelogs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      changelogs: []
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar que el usuario sea el owner
    if (!session?.user || (session.user as any)?.id !== '388422519553654786') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { version, date, type, title, description, featured, changes } = body

    if (!version || !title || !description || !changes) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Insertar changelog
    const [result] = await connection.execute(`
      INSERT INTO changelogs (version, date, type, title, description, featured, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [version, date, type, title, description, featured, JSON.stringify(changes)])

    const insertId = (result as any).insertId

    // Obtener el changelog insertado
    const [insertedChangelog] = await connection.execute(`
      SELECT * FROM changelogs WHERE id = ?
    `, [insertId])

    await connection.end()

    // Enviar notificaciones sobre el nuevo changelog (implementación simplificada)
    try {
      console.log('📮 Enviando notificaciones de changelog...')
      
      // Crear nueva conexión para notificaciones
      const notifConnection = await mysql.createConnection(dbConfig)
      
      // Obtener usuarios que deberían recibir notificaciones
      const [users] = await notifConnection.execute('SELECT user_id FROM users LIMIT 100') as any
      
      let successCount = 0
      for (const user of users) {
        try {
          // Verificar configuración del usuario
          const [settings] = await notifConnection.execute(
            'SELECT changelog_notifications FROM notification_settings WHERE user_id = ?',
            [user.user_id]
          ) as any
          
          const shouldNotify = !settings || settings.length === 0 || settings[0].changelog_notifications !== false
          
          if (shouldNotify) {
            await notifConnection.execute(`
              INSERT INTO web_notifications 
              (user_id, type, title, message, link, metadata) 
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              user.user_id,
              'changelog',
              '🔄 Nueva actualización disponible',
              `${version}: ${title}`,
              `/changelog`,
              JSON.stringify({ version, insertId })
            ])
            successCount++
          }
        } catch (userError) {
          console.error(`Error enviando notificación a ${user.user_id}:`, userError instanceof Error ? userError.message : 'Error desconocido')
        }
      }
      
      await notifConnection.end()
      console.log(`✅ Se enviaron ${successCount} notificaciones de changelog`)
      
    } catch (error) {
      console.error('Error enviando notificaciones de changelog:', error)
      // No fallar la creación del changelog por esto
    }

    const changelog = Array.isArray(insertedChangelog) && insertedChangelog.length > 0 ? {
      ...insertedChangelog[0],
      changes: JSON.parse((insertedChangelog[0] as any).changes)
    } : null

    return NextResponse.json({
      success: true,
      changelog
    })
  } catch (error) {
    console.error('Error creating changelog:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}