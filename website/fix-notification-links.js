const mysql = require('mysql2/promise');

async function fixNotificationLinks() {
  let connection = null;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'casino_bot'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Obtener notificaciones con enlaces incorrectos
    const [notifications] = await connection.execute(`
      SELECT id, link, metadata, type 
      FROM web_notifications 
      WHERE link LIKE '/blog/%' AND type IN ('like', 'comment', 'blog_post')
    `);
    
    console.log(`📋 Encontradas ${notifications.length} notificaciones con enlaces a corregir`);
    
    // Corregir cada notificación
    for (const notification of notifications) {
      let newLink = notification.link;
      
      try {
        const metadata = JSON.parse(notification.metadata || '{}');
        
        if (notification.type === 'like' || notification.type === 'comment') {
          // Para likes y comentarios, usar /blogs/{postId}
          if (metadata.postId) {
            newLink = `/blogs/${metadata.postId}`;
            if (notification.type === 'comment') {
              newLink += '#comments';
            }
          }
        } else if (notification.type === 'blog_post') {
          // Para nuevos posts, usar /blogs/{postId}
          if (metadata.postId) {
            newLink = `/blogs/${metadata.postId}`;
          }
        }
        
        // Actualizar la notificación si el enlace cambió
        if (newLink !== notification.link) {
          await connection.execute(
            'UPDATE web_notifications SET link = ? WHERE id = ?',
            [newLink, notification.id]
          );
          
          console.log(`✅ Corregido enlace de notificación ${notification.id}: ${notification.link} → ${newLink}`);
        }
        
      } catch (error) {
        console.log(`⚠️ No se pudo procesar metadata de notificación ${notification.id}:`, error.message);
      }
    }
    
    console.log('🎉 Enlaces de notificaciones corregidos');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixNotificationLinks();