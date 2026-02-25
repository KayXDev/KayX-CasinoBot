import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  charset: 'utf8mb4'
}

// GET - Obtener todas las reviews
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user ? (session.user as any).id : null
    
    const connection = await mysql.createConnection(dbConfig)
    
    // Obtener reviews con información del usuario y likes
    let query = `
      SELECT 
        r.id,
        r.user_id,
        r.rating,
        r.title,
        r.content,
        r.created_at,
        r.likes,
        COALESCE(u.custom_username, u.display_name, 'Usuario') as username,
        u.avatar_url as avatar,
        u.is_verified as verified
    `
    
    // Si el usuario está logueado, verificar si ha dado like a cada review
    if (currentUserId) {
      query += `,
        CASE 
          WHEN rl.user_id IS NOT NULL THEN 1 
          ELSE 0 
        END as user_liked
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      LEFT JOIN review_likes rl ON r.id = rl.review_id AND rl.user_id = ?
      ORDER BY r.created_at DESC`
      
      const [rows] = await connection.execute(query, [currentUserId])
      await connection.end()
      
      return NextResponse.json({ 
        success: true, 
        reviews: rows 
      })
    } else {
      query += `
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      ORDER BY r.created_at DESC`
      
      const [rows] = await connection.execute(query)
      await connection.end()
      
      // Agregar user_liked como false para usuarios no logueados
      const reviewsWithLikes = (rows as any[]).map(review => ({
        ...review,
        user_liked: false
      }))
      
      return NextResponse.json({ 
        success: true, 
        reviews: reviewsWithLikes 
      })
    }
    
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva review
export async function POST(request: NextRequest) {
  let connection
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado' },
        { status: 401 }
      )
    }

    // Leer el body una sola vez y guardarlo
    const body = await request.json()
    const { rating, title, content } = body
    
    // Validaciones
    if (!rating || !title || !content) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos son obligatorios' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'La calificación debe estar entre 1 y 5' },
        { status: 400 }
      )
    }

    if (title.length > 100 || content.length > 500) {
      return NextResponse.json(
        { success: false, message: 'Título o contenido demasiado largo' },
        { status: 400 }
      )
    }

    connection = await mysql.createConnection(dbConfig)
    
    const userId = (session.user as any).id

    // Verificar si el usuario ya tiene una review
    const [existingReview] = await connection.execute(
      'SELECT id FROM reviews WHERE user_id = ?',
      [userId]
    )

    if ((existingReview as any[]).length > 0) {
      await connection.end()
      return NextResponse.json(
        { success: false, message: 'Ya tienes una review publicada' },
        { status: 400 }
      )
    }

    // Crear la review
    const [result] = await connection.execute(
      'INSERT INTO reviews (user_id, rating, title, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, rating, title, content]
    )

    const reviewId = (result as any).insertId

    // Obtener la review creada con información del usuario
    const [newReview] = await connection.execute(`
      SELECT 
        r.id,
        r.user_id,
        r.rating,
        r.title,
        r.content,
        r.created_at,
        r.likes,
        COALESCE(u.custom_username, u.display_name, 'Usuario') as username,
        u.avatar_url as avatar,
        u.is_verified as verified
      FROM reviews r
      LEFT JOIN user_profiles u ON r.user_id = u.discord_id
      WHERE r.id = ?
    `, [reviewId])

    await connection.end()

    return NextResponse.json({
      success: true,
      message: 'Review creada exitosamente',
      review: (newReview as any[])[0]
    })

  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    if (connection) {
      try {
        await connection.end()
      } catch (e) {
        console.error('Error closing connection:', e)
      }
    }
  }
}