// Script para crear las tablas de notificaciones
// Ejecutar: node create-notifications-tables.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Cambia esto por tu contraseña
  database: 'casino_bot',
  port: 3306
};

async function createTables() {
  let connection = null;
  
  try {
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creando tabla web_notifications...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS web_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(50) NOT NULL COMMENT 'Usuario que RECIBE la notificación',
        actor_id VARCHAR(50) NULL COMMENT 'Usuario que GENERA la acción (NULL para sistema)',
        type ENUM('blog_post', 'changelog', 'review', 'like', 'comment', 'system') NOT NULL,
        title VARCHAR(150) NOT NULL,
        message VARCHAR(300) NOT NULL,
        link VARCHAR(200) NULL COMMENT 'URL donde dirigir al hacer click',
        metadata JSON NULL COMMENT 'Datos adicionales (post_id, comment_id, etc)',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_user_unread (user_id, is_read),
        INDEX idx_created_at (created_at),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('Creando tabla notification_settings...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        user_id VARCHAR(50) PRIMARY KEY,
        blog_notifications BOOLEAN DEFAULT TRUE COMMENT 'Nuevos posts de blog',
        changelog_notifications BOOLEAN DEFAULT TRUE COMMENT 'Actualizaciones del bot',
        review_notifications BOOLEAN DEFAULT TRUE COMMENT 'Nuevas reviews',
        like_notifications BOOLEAN DEFAULT TRUE COMMENT 'Likes en contenido',
        comment_notifications BOOLEAN DEFAULT TRUE COMMENT 'Comentarios en posts',
        system_notifications BOOLEAN DEFAULT TRUE COMMENT 'Notificaciones del sistema',
        email_notifications BOOLEAN DEFAULT FALSE COMMENT 'Enviar por email también',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('Creando notificaciones de prueba...');
    
    // Obtener un usuario de prueba
    const [users] = await connection.execute('SELECT user_id FROM users LIMIT 1');
    
    if (users.length > 0) {
      const testUserId = users[0].user_id;
      
      // Crear algunas notificaciones de prueba
      const testNotifications = [
        {
          type: 'blog_post',
          title: '📝 Nuevo post publicado',
          message: 'Se publicó un nuevo post: "Estrategias avanzadas de Blackjack"',
          link: '/blog/estrategias-blackjack'
        },
        {
          type: 'like',
          title: '❤️ Nuevo like en tu post',
          message: 'A alguien le gustó tu post: "Guía de Casino Bot"',
          link: '/blog/guia-casino-bot'
        },
        {
          type: 'changelog',
          title: '🔄 Nueva actualización disponible',
          message: 'v2.1.0: Sistema de notificaciones y mejoras en el trading',
          link: '/changelog'
        },
        {
          type: 'system',
          title: '🔔 Bienvenido al sistema de notificaciones',
          message: 'Ahora recibirás notificaciones sobre toda la actividad importante',
          link: '/notifications'
        }
      ];
      
      for (const notification of testNotifications) {
        await connection.execute(
          `INSERT INTO web_notifications (user_id, type, title, message, link) 
           VALUES (?, ?, ?, ?, ?)`,
          [testUserId, notification.type, notification.title, notification.message, notification.link]
        );
      }
      
      console.log(`Creadas ${testNotifications.length} notificaciones de prueba para el usuario ${testUserId}`);
    }
    
    // Insertar configuración por defecto para usuarios existentes
    console.log('Insertando configuración por defecto...');
    await connection.execute(`
      INSERT IGNORE INTO notification_settings (user_id) 
      SELECT DISTINCT user_id FROM users
    `);
    
    console.log('✅ Tablas y datos de prueba creados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada.');
    }
  }
}

createTables();