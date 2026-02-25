import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  charset: 'utf8mb4'
}

// POST - Toggle like en una review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado' },
        { status: 401 }
      )
    }

    const reviewId = params.id
    const userId = (session.user as any).id

    const connection = await mysql.createConnection(dbConfig)

    // Verificar si ya existe el like
    const [existingLike] = await connection.execute(
      'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    )

    let userLiked: boolean
    let newLikes: number

    if ((existingLike as any[]).length > 0) {
      // Ya existe el like, lo eliminamos
      await connection.execute(
        'DELETE FROM review_likes WHERE review_id = ? AND user_id = ?',
        [reviewId, userId]
      )
      
      // Decrementar contador
      await connection.execute(
        'UPDATE reviews SET likes = likes - 1 WHERE id = ?',
        [reviewId]
      )
      
      userLiked = false
    } else {
      // No existe el like, lo creamos
      await connection.execute(
        'INSERT INTO review_likes (review_id, user_id, created_at) VALUES (?, ?, NOW())',
        [reviewId, userId]
      )
      
      // Incrementar contador
      await connection.execute(
        'UPDATE reviews SET likes = likes + 1 WHERE id = ?',
        [reviewId]
      )
      
      userLiked = true
    }

    // Obtener el nuevo número de likes
    const [review] = await connection.execute(
      'SELECT likes FROM reviews WHERE id = ?',
      [reviewId]
    )

    newLikes = (review as any[])[0].likes

    await connection.end()

    return NextResponse.json({
      success: true,
      user_liked: userLiked,
      likes: newLikes
    })

  } catch (error) {
    console.error('Error toggling review like:', error)
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}