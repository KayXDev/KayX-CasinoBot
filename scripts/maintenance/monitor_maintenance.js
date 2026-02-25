// Monitor maintenance status in real-time
import maintenanceSystem from './util/maintenanceSystem.js';

async function monitorMaintenance() {
  console.log('🔍 Monitoring maintenance status...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  let lastStatus = null;
  
  const check = async () => {
    try {
      await maintenanceSystem.initialize();
      const currentStatus = await maintenanceSystem.isMaintenanceMode();
      
      if (currentStatus !== lastStatus) {
        const timestamp = new Date().toLocaleTimeString();
        if (currentStatus) {
          console.log(`[${timestamp}] 🔴 MAINTENANCE MODE ACTIVATED`);
        } else {
          console.log(`[${timestamp}] 🟢 MAINTENANCE MODE DEACTIVATED`);
        }
        lastStatus = currentStatus;
      } else {
        const timestamp = new Date().toLocaleTimeString();
        const status = currentStatus ? '🔴 ACTIVE' : '🟢 INACTIVE';
        console.log(`[${timestamp}] Status: ${status}`);
      }
    } catch (error) {
      console.error('Error checking status:', error.message);
    }
  };
  
  // Check every 5 seconds
  await check(); // Initial check
  setInterval(check, 5000);
}

monitorMaintenance();