// ═══════════════════════════════════════════════════════════════
// 🔍 BACKUP SYSTEM DIAGNOSTIC SCRIPT
// ═══════════════════════════════════════════════════════════════

import { createServerBackupSilent, getBackups, createServerBackup } from '../util/backupSystem.js';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { ensureServerBackupsTable } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

console.log('🔍 INICIANDO DIAGNÓSTICO DEL SISTEMA DE BACKUP...\n');

// Función para diagnosticar el sistema
async function diagnoseBackupSystem() {
  try {
    console.log('1️⃣ Verificando configuración...');
    console.log(`   • Backup habilitado: ${config.backup?.enabled}`);
    console.log(`   • Intervalo (minutos): ${config.backup?.intervalMinutes}`);
    console.log(`   • Mantener últimos: ${config.backup?.keepLast}`);
    console.log(`   • Canal de notificación: ${config.backup?.notifyChannel}`);
    console.log(`   • Guild ID: ${config.guildID}`);
    console.log(`   • Owner ID: ${config.ownerID}\n`);

    console.log('2️⃣ Verificando tablas de la base de datos...');
    await ensureServerBackupsTable();
    console.log('   ✅ Tabla server_backups verificada/creada\n');

    console.log('3️⃣ Probando conexión del bot...');
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    await new Promise((resolve, reject) => {
      client.once('ready', () => {
        console.log(`   ✅ Bot conectado como ${client.user.tag}\n`);
        resolve();
      });

      client.once('error', (error) => {
        console.error('   ❌ Error de conexión:', error);
        reject(error);
      });

      client.login(config.token).catch(reject);
    });

    console.log('4️⃣ Verificando acceso al servidor...');
    const guild = client.guilds.cache.get(config.guildID);
    if (!guild) {
      console.error('   ❌ No se pudo encontrar el servidor con ID:', config.guildID);
      console.log('   📋 Servidores disponibles:');
      client.guilds.cache.forEach(g => {
        console.log(`      • ${g.name} (ID: ${g.id})`);
      });
      throw new Error('Servidor no encontrado');
    }
    console.log(`   ✅ Servidor encontrado: ${guild.name} (${guild.memberCount} miembros)\n`);

    console.log('5️⃣ Verificando permisos del bot en el servidor...');
    const botMember = guild.members.cache.get(client.user.id);
    if (!botMember) {
      console.error('   ❌ El bot no está en el servidor como miembro');
      throw new Error('Bot no es miembro del servidor');
    }
    
    const permissions = botMember.permissions.toArray();
    const requiredPerms = ['ViewChannels', 'ManageChannels', 'ManageRoles'];
    console.log(`   • Permisos del bot: ${permissions.slice(0, 5).join(', ')}...`);
    
    const missingPerms = requiredPerms.filter(perm => !permissions.includes(perm));
    if (missingPerms.length > 0) {
      console.warn(`   ⚠️ Permisos faltantes recomendados: ${missingPerms.join(', ')}`);
    } else {
      console.log('   ✅ Permisos básicos confirmados');
    }

    console.log('6️⃣ Verificando canal de notificaciones...');
    if (config.backup?.notifyChannel) {
      const notifyChannel = guild.channels.cache.get(config.backup.notifyChannel);
      if (!notifyChannel) {
        console.error(`   ❌ Canal de notificación no encontrado: ${config.backup.notifyChannel}`);
        console.log('   📋 Canales disponibles:');
        guild.channels.cache
          .filter(ch => ch.type === 0) // Solo canales de texto
          .first(5)
          .forEach(ch => {
            console.log(`      • #${ch.name} (ID: ${ch.id})`);
          });
      } else {
        console.log(`   ✅ Canal encontrado: #${notifyChannel.name}`);
        
        // Verificar permisos en el canal
        const canSend = notifyChannel.permissionsFor(client.user).has(['SendMessages', 'EmbedLinks']);
        if (canSend) {
          console.log('   ✅ Bot puede enviar mensajes en el canal');
        } else {
          console.error('   ❌ Bot NO puede enviar mensajes en el canal');
        }
      }
    } else {
      console.log('   ⚠️ No hay canal de notificación configurado');
    }

    console.log('\n7️⃣ Probando creación de backup manual...');
    try {
      const backupData = await createServerBackupSilent(guild);
      console.log('   ✅ Backup creado exitosamente');
      console.log(`   📊 Estadísticas: ${backupData.channels?.length} canales, ${backupData.roles?.length} roles`);
    } catch (backupError) {
      console.error('   ❌ Error creando backup:', backupError.message);
      throw backupError;
    }

    console.log('\n8️⃣ Verificando backups existentes...');
    const existingBackups = await getBackups(guild.id);
    console.log(`   📋 Backups encontrados: ${existingBackups.length}`);
    if (existingBackups.length > 0) {
      const latest = existingBackups[0];
      console.log(`   📅 Último backup: ${new Date(latest.createdAt).toLocaleString()}`);
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO EXITOSAMENTE');
    console.log('🎉 El sistema de backup está funcionando correctamente!');

    await client.destroy();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR EN EL DIAGNÓSTICO:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar diagnóstico
diagnoseBackupSystem();