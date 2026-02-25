// Script para probar el sistema de notificaciones
// Ejecutar: node test-notifications-system.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot',
  port: 3306
};

async function testNotificationSystem() {
  let connection = null;
  
  try {
    console.log('🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Verificar que las tablas existen
    console.log('\n📋 Verificando tablas...');
    
    const tables = ['web_notifications', 'notification_settings', 'users', 'blog_posts', 'changelogs'];
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Tabla ${table}: ${rows[0].count} registros`);
      } catch (error) {
        console.log(`❌ Error en tabla ${table}:`, error.message);
      }
    }
    
    // 2. Verificar usuarios existentes
    console.log('\n👥 Verificando usuarios...');
    
    // Primero ver qué columnas tiene la tabla users
    const [tableInfo] = await connection.execute('DESCRIBE users');
    console.log('Estructura de la tabla users:', tableInfo.map(col => col.Field));
    
    const [users] = await connection.execute('SELECT user_id FROM users LIMIT 5');
    console.log('Usuarios encontrados:', users);
    
    // 3. Crear un usuario de prueba si no existe
    const testUserId = '123456789';
    const [existingUser] = await connection.execute('SELECT user_id FROM users WHERE user_id = ?', [testUserId]);
    
    if (!existingUser || existingUser.length === 0) {
      console.log('\n➕ Creando usuario de prueba...');
      await connection.execute(`
        INSERT IGNORE INTO users (user_id, balance) 
        VALUES (?, 1000)
      `, [testUserId]);
      console.log('✅ Usuario de prueba creado');
    }
    
    // 4. Probar creación de notificación directamente
    console.log('\n📮 Creando notificación de prueba...');
    await connection.execute(`
      INSERT INTO web_notifications 
      (user_id, type, title, message, metadata, created_at) 
      VALUES (?, 'system', '🧪 Test de notificaciones', 'Esta es una notificación de prueba del sistema', '{"test": true}', NOW())
    `, [testUserId]);
    
    console.log('✅ Notificación de prueba creada');
    
    // 5. Verificar notificaciones creadas
    console.log('\n📬 Verificando notificaciones...');
    const [notifications] = await connection.execute(`
      SELECT id, user_id, type, title, message, is_read, created_at 
      FROM web_notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 3
    `, [testUserId]);
    
    console.log('Notificaciones encontradas:', notifications);
    
    // 6. Probar el servicio de notificaciones
    console.log('\n🔧 Probando NotificationService...');
    
    // Simular importación del servicio
    try {
      // Crear notificación usando el servicio
      await connection.execute(`
        INSERT INTO web_notifications 
        (user_id, type, title, message, metadata, created_at) 
        VALUES (?, 'blog_post', '📝 Nuevo post (via service)', 'Post de prueba creado por el servicio', '{"postId": "test"}', NOW())
      `, [testUserId]);
      
      console.log('✅ Notificación via servicio creada');
    } catch (error) {
      console.log('❌ Error en servicio:', error.message);
    }
    
    // 7. Verificar configuración de notificaciones
    console.log('\n⚙️ Verificando configuración...');
    const [settings] = await connection.execute('SELECT * FROM notification_settings WHERE user_id = ?', [testUserId]);
    
    if (!settings || settings.length === 0) {
      console.log('➕ Creando configuración por defecto...');
      await connection.execute(`
        INSERT INTO notification_settings 
        (user_id, blog_notifications, changelog_notifications, review_notifications, like_notifications, comment_notifications, system_notifications) 
        VALUES (?, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
      `, [testUserId]);
      console.log('✅ Configuración creada');
    } else {
      console.log('Configuración existente:', settings[0]);
    }
    
    console.log('\n🎉 ¡Prueba del sistema de notificaciones completada!');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Crear un post de blog y verificar si se genera la notificación');
    console.log('   2. Crear un changelog y verificar las notificaciones');
    console.log('   3. Dar like a un post y verificar notificaciones');
    console.log('   4. Comentar en un post y verificar notificaciones');
    
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
testNotificationSystem();