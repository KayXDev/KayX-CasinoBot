// ═══════════════════════════════════════════════════════════════
// 🧹 BACKUP CLEANUP AND TEST SCRIPT
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

async function cleanupAndTestBackups() {
  try {
    console.log('🧹 LIMPIANDO Y PROBANDO SISTEMA DE BACKUP...\n');

    // 1. Mostrar configuración actual
    console.log('📋 Configuración actual:');
    console.log(`   • Habilitado: ${config.backup?.enabled}`);
    console.log(`   • Intervalo: ${config.backup?.intervalMinutes} minutos`);
    console.log(`   • Mantener: ${config.backup?.keepLast} backups`);
    console.log(`   • Canal: ${config.backup?.notifyChannel}\n`);

    // 2. Contar backups existentes
    const [existing] = await pool.execute(
      'SELECT COUNT(*) as count FROM server_backups WHERE guild_id = ?',
      [config.guildID]
    );
    console.log(`📊 Backups existentes: ${existing[0].count}`);

    // 3. Mostrar últimos backups
    const [latest] = await pool.execute(
      'SELECT backup_id, name, created_at FROM server_backups WHERE guild_id = ? ORDER BY created_at DESC LIMIT 5',
      [config.guildID]
    );

    if (latest.length > 0) {
      console.log('\n📅 Últimos 5 backups:');
      latest.forEach((backup, index) => {
        const date = new Date(backup.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${backup.backup_id} - ${date}`);
      });
    }

    // 4. Limpiar backups antiguos según configuración
    const keepLast = config.backup?.keepLast || 10;
    console.log(`\n🧹 Limpiando backups (manteniendo últimos ${keepLast})...`);

    const [cleanup] = await pool.execute(`
      DELETE FROM server_backups 
      WHERE guild_id = ? 
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM server_backups 
          WHERE guild_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        ) as keeper
      )
    `, [config.guildID, config.guildID, keepLast]);

    console.log(`   ✅ ${cleanup.affectedRows} backups antiguos eliminados`);

    // 5. Verificar estado final
    const [final] = await pool.execute(
      'SELECT COUNT(*) as count FROM server_backups WHERE guild_id = ?',
      [config.guildID]
    );
    console.log(`   📊 Backups restantes: ${final[0].count}`);

    console.log('\n✅ LIMPIEZA COMPLETADA EXITOSAMENTE');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar limpieza
cleanupAndTestBackups();