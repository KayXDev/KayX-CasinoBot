const mysql = require('mysql2/promise');

async function cleanupBackupRequests() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'casino_bot'
  });

  try {
    console.log('🧹 Limpiando solicitudes de backup pendientes...');
    
    // Eliminar solicitudes pendientes
    const deleteResult = await connection.execute(`
      DELETE FROM backup_requests WHERE status = 'pending'
    `);
    
    console.log(`✅ ${deleteResult[0].affectedRows} solicitud(es) pendiente(s) eliminada(s)`);
    
    // Mostrar backups existentes
    const [backups] = await connection.execute(`
      SELECT backup_id, guild_id, name, created_at 
      FROM server_backups 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Últimos 5 backups:');
    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.backup_id} | ${backup.name} | ${backup.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

cleanupBackupRequests();