const mysql = require('mysql2/promise');

async function notifyChangelogUpdate() {
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
    
    // Obtener todos los usuarios para notificar
    const [users] = await connection.execute(
      'SELECT DISTINCT user_id FROM users'
    );
    
    console.log(`📨 Notificando a ${users.length} usuarios sobre el changelog v1.0.2`);
    
    // Crear notificaciones para todos los usuarios
    for (const user of users) {
      await connection.execute(
        `INSERT INTO web_notifications 
         (user_id, actor_id, type, title, message, link, metadata, is_read, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.user_id,
          '388422519553654786', // Sistema/Owner
          'changelog',
          '📝 Nueva Actualización v1.0.2',
          'Sistema de notificaciones y optimización de rendimiento implementados. ¡Descubre las mejoras!',
          '/changelog',
          JSON.stringify({ 
            version: '1.0.2',
            type: 'minor',
            featured: true 
          }),
          false,
          new Date()
        ]
      );
    }
    
    console.log('🎉 Notificaciones de changelog enviadas exitosamente!');
    console.log('🔔 Los usuarios recibirán una notificación sobre la nueva versión v1.0.2');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

notifyChangelogUpdate();