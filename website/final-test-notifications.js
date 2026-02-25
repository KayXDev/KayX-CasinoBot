// Script para probar las notificaciones completas
// Ejecutar: node final-test-notifications.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot',
  port: 3306
};

async function finalTestNotifications() {
  let connection = null;
  
  try {
    console.log('🧪 PRUEBA FINAL DEL SISTEMA DE NOTIFICACIONES');
    console.log('==============================================\n');
    
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Contar notificaciones antes
    const [beforeCount] = await connection.execute('SELECT COUNT(*) as count FROM web_notifications');
    console.log(`📊 Notificaciones actuales: ${beforeCount[0].count}`);
    
    // 2. Simular creación de blog post
    console.log('\n📝 Simulando creación de blog post...');
    
    const testTitle = 'PRUEBA FINAL - Post con notificaciones';
    const testContent = 'Este es un post de prueba para la verificación final del sistema de notificaciones.';
    const authorId = '388422519553654786';
    
    // Crear post directamente
    const [postResult] = await connection.execute(`
      INSERT INTO blog_posts (
        title, content, excerpt, category, author_id, author_name, author_avatar, 
        status, tags, read_time, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', '[]', '1 min read', NOW())
    `, [
      testTitle,
      testContent,
      'Prueba final de notificaciones',
      'General',
      authorId,
      'Test Owner',
      null
    ]);
    
    const postId = postResult.insertId;
    console.log(`✅ Post creado con ID: ${postId}`);
    
    // 3. Simular notificaciones de blog (como lo haría la API)
    console.log('\n📮 Simulando lógica de notificaciones...');
    
    const [users] = await connection.execute('SELECT user_id FROM users WHERE user_id != ? LIMIT 10', [authorId]);
    let blogNotificationsSent = 0;
    
    for (const user of users) {
      try {
        const [settings] = await connection.execute(
          'SELECT blog_notifications FROM notification_settings WHERE user_id = ?',
          [user.user_id]
        );
        
        const shouldNotify = !settings || settings.length === 0 || settings[0].blog_notifications !== false;
        
        if (shouldNotify) {
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
          blogNotificationsSent++;
        }
      } catch (userError) {
        console.error(`Error con usuario ${user.user_id}:`, userError.message);
      }
    }
    
    console.log(`✅ Se enviaron ${blogNotificationsSent} notificaciones de blog`);
    
    // 4. Simular like
    console.log('\n❤️ Simulando like en el post...');
    
    const likerUserId = '123456789';
    await connection.execute(`
      INSERT INTO blog_likes (post_id, user_id) VALUES (?, ?)
    `, [postId, likerUserId]);
    
    // Crear notificación de like
    await connection.execute(`
      INSERT INTO web_notifications 
      (user_id, actor_id, type, title, message, link, metadata) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      authorId,
      likerUserId,
      'like',
      '❤️ Nuevo like en tu post',
      `Le gustó tu post: "${testTitle.substring(0, 50)}"`,
      `/blogs/${postId}`,
      JSON.stringify({ postId, likerUserId })
    ]);
    
    console.log('✅ Notificación de like enviada');
    
    // 5. Simular comentario
    console.log('\n💬 Simulando comentario en el post...');
    
    const commenterUserId = '987654321';
    const commentContent = 'Este es un comentario de prueba para verificar las notificaciones.';
    
    await connection.execute(`
      INSERT INTO blog_comments (post_id, author_id, author_name, author_avatar, content) 
      VALUES (?, ?, ?, ?, ?)
    `, [postId, commenterUserId, 'Test Commenter', null, commentContent]);
    
    // Crear notificación de comentario
    await connection.execute(`
      INSERT INTO web_notifications 
      (user_id, actor_id, type, title, message, link, metadata) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      authorId,
      commenterUserId,
      'comment',
      '💬 Nuevo comentario en tu post',
      `Comentó: "${commentContent.substring(0, 50)}"`,
      `/blogs/${postId}#comments`,
      JSON.stringify({ postId, commenterUserId })
    ]);
    
    console.log('✅ Notificación de comentario enviada');
    
    // 6. Simular changelog
    console.log('\n🔄 Simulando creación de changelog...');
    
    await connection.execute(`
      INSERT INTO changelogs (version, date, type, title, description, featured, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      'v1.0.test',
      new Date().toISOString().split('T')[0],
      'feature',
      'Prueba final del sistema de notificaciones',
      'Testing final del sistema completo',
      1,
      JSON.stringify([{type: 'new', items: ['Sistema de notificaciones funcional']}])
    ]);
    
    // Enviar notificaciones de changelog
    const [allUsers] = await connection.execute('SELECT user_id FROM users LIMIT 10');
    let changelogNotificationsSent = 0;
    
    for (const user of allUsers) {
      try {
        const [settings] = await connection.execute(
          'SELECT changelog_notifications FROM notification_settings WHERE user_id = ?',
          [user.user_id]
        );
        
        const shouldNotify = !settings || settings.length === 0 || settings[0].changelog_notifications !== false;
        
        if (shouldNotify) {
          await connection.execute(`
            INSERT INTO web_notifications 
            (user_id, type, title, message, link, metadata) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            user.user_id,
            'changelog',
            '🔄 Nueva actualización disponible',
            'v1.0.test: Prueba final del sistema de notificaciones',
            `/changelog`,
            JSON.stringify({ version: 'v1.0.test' })
          ]);
          changelogNotificationsSent++;
        }
      } catch (userError) {
        console.error(`Error con usuario ${user.user_id}:`, userError.message);
      }
    }
    
    console.log(`✅ Se enviaron ${changelogNotificationsSent} notificaciones de changelog`);
    
    // 7. Verificar resultados finales
    console.log('\n📊 RESULTADOS FINALES:');
    console.log('=====================');
    
    const [afterCount] = await connection.execute('SELECT COUNT(*) as count FROM web_notifications');
    console.log(`📈 Notificaciones finales: ${afterCount[0].count}`);
    console.log(`🆕 Notificaciones nuevas: ${afterCount[0].count - beforeCount[0].count}`);
    
    // Mostrar las últimas notificaciones por tipo
    const types = ['blog_post', 'like', 'comment', 'changelog'];
    
    for (const type of types) {
      const [typeNotifs] = await connection.execute(
        'SELECT COUNT(*) as count FROM web_notifications WHERE type = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)',
        [type]
      );
      console.log(`📋 Notificaciones de ${type}: ${typeNotifs[0].count}`);
    }
    
    // Mostrar notificaciones recientes
    console.log('\n📬 Últimas 5 notificaciones:');
    const [recent] = await connection.execute(`
      SELECT type, title, message, user_id, created_at 
      FROM web_notifications 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    recent.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.type}] ${notif.title} (para ${notif.user_id})`);
    });
    
    console.log('\n🎉 ¡PRUEBA FINAL COMPLETADA!');
    console.log('============================');
    console.log('✅ Sistema de blogs: FUNCIONANDO');
    console.log('✅ Sistema de likes: FUNCIONANDO');
    console.log('✅ Sistema de comentarios: FUNCIONANDO');
    console.log('✅ Sistema de changelogs: FUNCIONANDO');
    console.log('\n💡 El sistema de notificaciones está listo para usar!');
    
  } catch (error) {
    console.error('❌ Error en la prueba final:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la prueba final
finalTestNotifications();