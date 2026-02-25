// Verificar notificaciones del changelog
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'casino_bot'
  });
  
  const [notifs] = await conn.execute(`
    SELECT type, title, message, user_id, created_at 
    FROM web_notifications 
    WHERE type = 'changelog' 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  console.log('📬 Últimas notificaciones de changelog:');
  notifs.forEach((n, i) => {
    console.log(`${i+1}. [${n.user_id}] ${n.title}`);
    console.log(`   💬 ${n.message}`);
    console.log(`   🕐 ${n.created_at}`);
    console.log('');
  });
  
  await conn.end();
})();