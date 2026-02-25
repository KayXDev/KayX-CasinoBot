const mysql = require('mysql2/promise');

async function testNotification() {
  let connection = null;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Sin contraseña según .env.local
      database: 'casino_bot' // Usar casino_bot como en .env.local
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Probar la consulta que estaba fallando
    const [users] = await connection.execute(
      'SELECT DISTINCT user_id FROM users WHERE user_id != ?',
      ['388422519553654786'] // ID del owner
    );
    
    console.log('✅ Consulta de usuarios exitosa:', users.length, 'usuarios encontrados');
    
    // Crear una notificación de prueba
    const [result] = await connection.execute(
      `INSERT INTO web_notifications 
       (user_id, actor_id, type, title, message, link, metadata, is_read, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '388422519553654786', // user_id (owner)
        '123456789', // actor_id (test user)
        'blog_post',
        '📝 Prueba de notificación',
        'Esta es una notificación de prueba para verificar que funciona correctamente',
        '/blogs/test',
        JSON.stringify({ postId: 'test', authorId: '123456789' }),
        false,
        new Date()
      ]
    );
    
    console.log('✅ Notificación creada con ID:', result.insertId);
    
    // Verificar que se creó correctamente
    const [notification] = await connection.execute(
      'SELECT * FROM web_notifications WHERE id = ?',
      [result.insertId]
    );
    
    console.log('✅ Notificación verificada:', notification[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testNotification();