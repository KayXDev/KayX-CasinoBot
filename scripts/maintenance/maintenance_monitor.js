// Quick database monitor for maintenance testing
import mysql from 'mysql2/promise';

const monitorMaintenance = async () => {
  console.log('🔍 Monitoring maintenance status in real-time...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  let lastStatus = null;
  let lastMessage = null;
  let lastDuration = null;
  
  const check = async () => {
    try {
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root', 
        password: '',
        database: 'casino_bot'
      });
      
      const [rows] = await connection.execute(
        'SELECT enabled, reason, estimated_duration, start_time FROM bot_maintenance WHERE id = 1'
      );
      
      await connection.end();
      
      if (rows.length > 0) {
        const row = rows[0];
        const currentStatus = row.enabled === 1;
        const currentMessage = row.reason;
        const currentDuration = row.estimated_duration;
        
        if (currentStatus !== lastStatus || currentMessage !== lastMessage || currentDuration !== lastDuration) {
          const timestamp = new Date().toLocaleTimeString();
          const statusIcon = currentStatus ? '🔴' : '🟢';
          const statusText = currentStatus ? 'ACTIVO' : 'INACTIVO';
          
          console.log(`[${timestamp}] ${statusIcon} Estado: ${statusText}`);
          if (currentStatus) {
            console.log(`             Mensaje: "${currentMessage}"`);
            console.log(`             Duración: ${currentDuration} minutos`);
            if (row.start_time) {
              console.log(`             Iniciado: ${new Date(row.start_time).toLocaleString()}`);
            }
          }
          console.log('');
          
          lastStatus = currentStatus;
          lastMessage = currentMessage;
          lastDuration = currentDuration;
        }
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error.message);
    }
  };
  
  // Check immediately and then every 3 seconds
  await check();
  setInterval(check, 3000);
};

monitorMaintenance();