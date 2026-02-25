// Registrar un usuario como admin en el sistema
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function registerAdmin() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Solicitar datos del admin
    console.log('📝 Para registrar un nuevo admin, necesito los siguientes datos:');
    console.log('1. ID de Discord del usuario');
    console.log('2. Nombre de usuario');
    console.log('');
    console.log('💡 Si no tienes el ID, el usuario puede obtenerlo así:');
    console.log('   - Ir a Discord > Configuración > Avanzado > Activar "Modo desarrollador"');
    console.log('   - Click derecho en su perfil > "Copiar ID"');
    console.log('');
    
    // Cambia estos valores por los reales del admin:
    const adminUserId = '390873542448644106'; // ← ID real del admin
    const adminUsername = 'AdminUser'; // ← Cambiar por su nombre real
    
    if (adminUserId === '390873542448644106-OLD-CHECK') { // Esta condición nunca se cumplirá
      console.log('❌ DEBES EDITAR ESTE ARCHIVO PRIMERO');
      console.log('📝 Abre register-admin.js y cambia:');
      console.log('   - adminUserId por el ID de Discord real');
      console.log('   - adminUsername por el nombre real');
      await connection.end();
      return;
    }
    
    // Verificar si ya existe
    const [existing] = await connection.execute(`
      SELECT * FROM admin_chat_connections 
      WHERE user_id = ?
    `, [adminUserId]);
    
    if (existing.length > 0) {
      console.log(`✅ El usuario ${adminUsername} (${adminUserId}) ya está registrado como admin`);
    } else {
      // Registrar como admin
      await connection.execute(`
        INSERT INTO admin_chat_connections 
        (user_id, username, user_type, socket_id, last_activity)
        VALUES (?, ?, 'server_admin', 'registered', NOW())
      `, [adminUserId, adminUsername]);
      
      console.log(`✅ Usuario ${adminUsername} (${adminUserId}) registrado como admin exitosamente!`);
    }
    
    // Mostrar todos los admins registrados
    const [allAdmins] = await connection.execute(`
      SELECT user_id, username, user_type, last_activity 
      FROM admin_chat_connections 
      ORDER BY user_type, last_activity DESC
    `);
    
    console.log('\n👥 Admins registrados:');
    allAdmins.forEach((admin, i) => {
      console.log(`${i+1}. ${admin.username} (${admin.user_type}) - ${admin.user_id}`);
    });
    
    await connection.end();
    
    console.log('\n🎯 Próximos pasos:');
    console.log('1. El usuario admin debe cerrar sesión y volver a iniciarla en la web');
    console.log('2. Ahora debería recibir notificaciones cuando envíes mensajes en el chat');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

registerAdmin();