// Script para probar las notificaciones de posts
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot',
  port: 3306
};

async function testBlogNotification() {
  let connection = null;
  
  try {
    console.log('🧪 Probando notificación de blog post...');
    connection = await mysql.createConnection(dbConfig);
    
    // Obtener un usuario de prueba
    const [users] = await connection.execute('SELECT user_id FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    const testUserId = users[0].user_id;
    console.log(`📋 Usando usuario de prueba: ${testUserId}`);
    
    // Crear una notificación de prueba directamente
    await connection.execute(
      `INSERT INTO web_notifications (user_id, type, title, message, link, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testUserId,
        'blog_post',
        '📝 ¡Nueva notificación de prueba!',
        'Esta es una notificación de prueba para verificar que el sistema funciona correctamente',
        '/blog/test-post',
        JSON.stringify({ test: true, postId: 'test-123' })
      ]
    );
    
    console.log('✅ Notificación de prueba creada exitosamente!');
    console.log('🔔 Ve a la website y revisa la campana de notificaciones');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testBlogNotification();