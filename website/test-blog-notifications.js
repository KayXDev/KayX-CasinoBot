// Script para probar específicamente las notificaciones de blog posts
// Ejecutar: node test-blog-notifications.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot',
  port: 3306
};

async function testBlogNotifications() {
  let connection = null;
  
  try {
    console.log('🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    // Paso 1: Simular creación de un blog post
    console.log('\n📝 Simulando creación de blog post...');
    
    const authorId = '388422519553654786'; // Owner ID
    const testTitle = 'Post de prueba para notificaciones';
    const testContent = 'Este es un post de prueba para verificar que las notificaciones se están enviando correctamente.';
    const testExcerpt = 'Post de prueba para notificaciones';
    
    // Crear el post
    const [postResult] = await connection.execute(`
      INSERT INTO blog_posts (
        title, content, excerpt, category, author_id, author_name, author_avatar, 
        status, tags, read_time, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', '[]', '1 min read', NOW())
    `, [
      testTitle,
      testContent,
      testExcerpt,
      'General',
      authorId,
      'Test Author',
      null
    ]);
    
    const postId = postResult.insertId;
    console.log(`✅ Post creado con ID: ${postId}`);
    
    // Paso 2: Contar notificaciones antes
    const [beforeCount] = await connection.execute('SELECT COUNT(*) as count FROM web_notifications');
    console.log(`📊 Notificaciones antes: ${beforeCount[0].count}`);
    
    // Paso 3: Ejecutar manualmente la lógica de notificaciones
    console.log('\n📮 Ejecutando lógica de notificaciones...');
    
    // Obtener usuarios que deberían recibir notificaciones
    const [targetUsers] = await connection.execute(`
      SELECT user_id FROM users WHERE user_id != ? LIMIT 10
    `, [authorId]);
    
    console.log(`👥 Usuarios que deberían recibir notificación: ${targetUsers.length}`);
    console.log('IDs:', targetUsers.map(u => u.user_id));
    
    // Paso 4: Crear notificaciones manualmente para cada usuario
    let successCount = 0;
    for (const user of targetUsers) {
      try {
        await connection.execute(`
          INSERT INTO web_notifications 
          (user_id, actor_id, type, title, message, link, metadata) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user.user_id,
          authorId,
          'blog_post',
          '📝 Nuevo post publicado',
          `Se publicó un nuevo post: "${testTitle.substring(0, 50)}"`,
          `/blogs/${postId}`,
          JSON.stringify({ postId: postId.toString(), authorId })
        ]);
        successCount++;
        console.log(`✅ Notificación enviada a ${user.user_id}`);
      } catch (error) {
        console.log(`❌ Error enviando a ${user.user_id}:`, error.message);
      }
    }
    
    // Paso 5: Contar notificaciones después
    const [afterCount] = await connection.execute('SELECT COUNT(*) as count FROM web_notifications');
    console.log(`📊 Notificaciones después: ${afterCount[0].count}`);
    console.log(`📈 Notificaciones creadas: ${afterCount[0].count - beforeCount[0].count}`);
    
    // Paso 6: Verificar las notificaciones más recientes
    console.log('\n📬 Notificaciones más recientes:');
    const [recentNotifications] = await connection.execute(`
      SELECT id, user_id, type, title, message, created_at 
      FROM web_notifications 
      WHERE type = 'blog_post'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    recentNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.user_id}] ${notif.title} - ${notif.message}`);
    });
    
    // Paso 7: Probar la función NotificationService directamente
    console.log('\n🔧 Probando NotificationService...');
    
    try {
      // Importar y usar el servicio
      const { notificationService } = require('./lib/notificationService');
      
      console.log('📞 Llamando a notifyNewBlogPost...');
      await notificationService.notifyNewBlogPost(
        postId.toString(),
        'different_author_id', // Diferente al owner para que no se salte
        'Post de prueba via service',
        'test-slug'
      );
      
      console.log('✅ NotificationService ejecutado');
      
      // Verificar si se crearon más notificaciones
      const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM web_notifications');
      console.log(`📊 Notificaciones finales: ${finalCount[0].count}`);
      
    } catch (serviceError) {
      console.log('❌ Error con NotificationService:', serviceError.message);
    }
    
    console.log('\n🎉 Prueba de notificaciones de blog completada!');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testBlogNotifications();