import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import mysql from 'mysql2/promise'
import { notificationService } from '../../../lib/notificationService'
import { hasPermission, logAdminAction } from '../../../lib/adminUtils'
import { dbConfig, sanitizeParams } from '../../../lib/database'

// GET - Fetch blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    let query = `
      SELECT 
        bp.id,
        bp.title,
        bp.content,
        bp.excerpt,
        bp.category,
        bp.author_id,
        bp.author_name as author,
        bp.author_avatar,
        bp.status,
        bp.featured,
        bp.pinned,
        bp.pinned_at,
        bp.tags,
        bp.view_count as views,
        bp.read_time,
        bp.created_at,
        bp.updated_at,
        bp.published_at,
        COALESCE(bp.likes, 0) as likes,
        COALESCE(bp.comments_count, 0) as comments_count
      FROM blog_posts bp 
      WHERE bp.status = 'published'
    `
    const params: any[] = []

    if (category && category !== 'all') {
      query += ' AND bp.category = ?'
      params.push(category)
    }

    if (featured === 'true') {
      query += ' AND bp.featured = TRUE'
    }

    query += ' ORDER BY bp.featured DESC, bp.pinned DESC, bp.pinned_at DESC, bp.published_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const connection = await mysql.createConnection(dbConfig)
    const [rows] = await connection.execute(query, sanitizeParams(params))
    await connection.end()
    
    return NextResponse.json({ 
      success: true, 
      posts: rows,
      meta: {
        limit,
        offset,
        hasMore: Array.isArray(rows) && rows.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch blog posts' 
    }, { status: 500 })
  }
}

// POST - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, excerpt, category = 'General', tags = [] } = body

    // Basic validation
    if (!title || !content || !excerpt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title, content, and excerpt are required' 
      }, { status: 400 })
    }

    if (title.length > 255) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title must be less than 255 characters' 
      }, { status: 400 })
    }

    if (excerpt.length > 500) {
      return NextResponse.json({ 
        success: false, 
        error: 'Excerpt must be less than 500 characters' 
      }, { status: 400 })
    }

    // Category validation - restrict some categories to admin only
    const userId = (session.user as any).id
    const isOwner = userId === '388422519553654786'
    const allowedCategories = isOwner 
      ? ['General', 'Community', 'Industry Insights', 'Technology', 'Development', 'Security', 'Gaming', 'Updates', 'Announcements']
      : ['General', 'Community']
    
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ 
        success: false, 
        error: isOwner 
          ? 'Invalid category selected' 
          : 'You can only post in General and Community categories'
      }, { status: 403 })
    }

    // Calculate read time (simple estimation: 200 words per minute)
    const wordCount = content.split(/\s+/).length
    const readTimeMinutes = Math.ceil(wordCount / 200)
    const readTime = `${readTimeMinutes} min read`

    const connection = await mysql.createConnection(dbConfig)
    const [result] = await connection.execute(`
      INSERT INTO blog_posts (
        title, content, excerpt, category, author_id, author_name, author_avatar, 
        status, tags, read_time, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, NOW())
    `, sanitizeParams([
      title,
      content,
      excerpt,
      category,
      userId,
      session.user.name,
      session.user.image,
      JSON.stringify(tags),
      readTime
    ]))
    
    const postId = (result as any).insertId
    
    await connection.end()

    // Generar slug simple para el enlace
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)

    // Enviar notificaciones sobre nuevo post (implementación simplificada)
    try {
      console.log('📮 Enviando notificaciones de blog post...')
      
      // Crear nueva conexión para notificaciones
      const notifConnection = await mysql.createConnection(dbConfig)
      
      // Obtener usuarios que deberían recibir notificaciones
      const [users] = await notifConnection.execute('SELECT user_id FROM users WHERE user_id != ? LIMIT 50', [userId]) as any
      
      let successCount = 0
      for (const user of users) {
        try {
          // Verificar configuración del usuario
          const [settings] = await notifConnection.execute(
            'SELECT blog_notifications FROM notification_settings WHERE user_id = ?',
            [user.user_id]
          ) as any
          
          const shouldNotify = !settings || settings.length === 0 || settings[0].blog_notifications !== false
          
          if (shouldNotify) {
            await notifConnection.execute(`
              INSERT INTO web_notifications 
              (user_id, actor_id, type, title, message, link, metadata) 
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              user.user_id,
              userId,
              'blog_post',
              '📝 Nuevo post publicado',
              `Se publicó un nuevo post: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`,
              `/blogs/${postId}`,
              JSON.stringify({ postId: postId.toString(), authorId: userId })
            ])
            successCount++
          }
        } catch (userError) {
          console.error(`Error enviando notificación a ${user.user_id}:`, userError instanceof Error ? userError.message : 'Error desconocido')
        }
      }
      
      await notifConnection.end()
      console.log(`✅ Se enviaron ${successCount} notificaciones de blog`)
      
    } catch (error) {
      console.error('Error enviando notificaciones de blog post:', error)
      // No fallar la creación del post por esto
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Blog post created successfully',
      postId: postId
    })
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create blog post' 
    }, { status: 500 })
  }
}

// PUT - Update blog post
export async function PUT(request: NextRequest) {
  let connection: any = null;
  
  try {
    console.log('🔄 Starting blog post update...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No session found')
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Update request body:', { id: body.id, title: body.title, category: body.category })
    const { id, title, content, excerpt, category, tags = [], status = 'published' } = body

    // Basic validation
    if (!id || !title || !content || !excerpt) {
      console.log('❌ Missing required fields')
      return NextResponse.json({ 
        success: false, 
        error: 'ID, title, content, and excerpt are required' 
      }, { status: 400 })
    }

    console.log('🔗 Connecting to database...')
    connection = await mysql.createConnection(dbConfig)

    // Check if post exists
    console.log('🔍 Checking if post exists with ID:', id)
    const [posts] = await connection.execute(
      'SELECT id, author_id, author_name, title FROM blog_posts WHERE id = ?',
      sanitizeParams([id])
    )

    if (!Array.isArray(posts) || posts.length === 0) {
      console.log('❌ Post not found with ID:', id)
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 })
    }

    const post = posts[0] as any
    const userId = (session.user as any).id
    console.log('👤 User check - Post author:', post.author_id, 'Current user:', userId)
    
    const isOwner = post.author_id === userId
    const canEditAny = await hasPermission(userId, 'edit_any_post')
    
    console.log('🔐 Permissions - Is owner:', isOwner, 'Can edit any:', canEditAny)

    // Check permissions: either own the post or have admin edit permissions
    if (!isOwner && !canEditAny) {
      console.log('❌ Unauthorized to edit post')
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to edit this post' 
      }, { status: 403 })
    }

    // Calculate read time
    const wordCount = content.split(/\s+/).length
    const readTimeMinutes = Math.ceil(wordCount / 200)
    const readTime = `${readTimeMinutes} min read`

    console.log('💾 Updating post with data:', { 
      title: title.substring(0, 50) + '...', 
      category, 
      status, 
      readTime,
      id 
    })

    const updateParams = sanitizeParams([
      title, content, excerpt, category, 
      JSON.stringify(tags), status, readTime, id
    ])
    
    const [updateResult] = await connection.execute(`
      UPDATE blog_posts SET 
        title = ?, content = ?, excerpt = ?, category = ?, 
        tags = ?, status = ?, read_time = ?, updated_at = NOW()
      WHERE id = ?
    `, updateParams)

    console.log('✅ Update result:', updateResult)

    // Log admin action if it was an admin edit
    if (!isOwner && canEditAny) {
      await logAdminAction(
        userId,
        session.user.name || 'Unknown Admin',
        'edit_post',
        'post',
        id,
        {
          post_title: title,
          original_author: post.author_name,
          changes: { title, category, status }
        }
      )
    }

    await connection.end()
    console.log('🎉 Post updated successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Blog post updated successfully'
    })
  } catch (error) {
    console.error('💥 Error updating blog post:', error)
    
    // Ensure connection is closed even on error
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error('Error closing connection:', closeError)
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update blog post',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// DELETE - Delete blog post (with admin permissions)
export async function DELETE(request: NextRequest) {
  let connection: any = null;
  
  try {
    console.log('🗑️ Starting blog post deletion...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Post ID is required' 
      }, { status: 400 })
    }

    console.log('🔗 Connecting to database for deletion...')
    connection = await mysql.createConnection(dbConfig)

    // Check if post exists and get post details
    const [posts] = await connection.execute(
      'SELECT id, title, author_id, author_name FROM blog_posts WHERE id = ?',
      sanitizeParams([id])
    )

    if (!Array.isArray(posts) || posts.length === 0) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 })
    }

    const post = posts[0] as any
    const userId = (session.user as any).id
    const isOwner = post.author_id === userId
    const canDeleteAny = await hasPermission(userId, 'delete_any_post')

    // Check permissions: either own the post or have admin delete permissions
    if (!isOwner && !canDeleteAny) {
      await connection.end()
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to delete this post' 
      }, { status: 403 })
    }

    // Delete the post
    await connection.execute('DELETE FROM blog_posts WHERE id = ?', sanitizeParams([id]))

    // Log admin action if it was an admin delete
    if (!isOwner && canDeleteAny) {
      await logAdminAction(
        userId,
        session.user.name || 'Unknown Admin',
        'delete_post',
        'post',
        id,
        {
          post_title: post.title,
          original_author: post.author_name,
          reason: 'Admin deletion'
        }
      )
    }

    await connection.end()
    console.log('🗑️ Post deleted successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Blog post deleted successfully'
    })
  } catch (error) {
    console.error('💥 Error deleting blog post:', error)
    
    // Ensure connection is closed even on error
    if (connection) {
      try {
        await connection.end()
      } catch (closeError) {
        console.error('Error closing connection:', closeError)
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete blog post',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}