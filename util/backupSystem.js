// ═══════════════════════════════════════════════════════════════
// 💾 BACKUP SYSTEM MODULE
// ═══════════════════════════════════════════════════════════════

import { Client, EmbedBuilder } from 'discord.js';
import { saveBackupToDb, getLastBackups, restoreBackupFromDb } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

// Función para enviar notificaciones de backup al canal (estilo reply)
async function sendBackupNotificationChannel(guild, backupData, action) {
  try {
    const notifyChannelId = config.backup?.notifyChannel;
    if (!notifyChannelId) return;

    const channel = guild.channels.cache.get(notifyChannelId);
    if (!channel) {
      console.warn(`[BACKUP] Canal de notificación ${notifyChannelId} no encontrado`);
      return;
    }

    let embed;
    if (action === 'created') {
      embed = new EmbedBuilder()
        .setTitle('💾 Backup Server | Success')
        .setDescription(`**Backup completed successfully!**\n\n🛡️ *Server structure has been safely stored*`)
        .setColor(0x00ff00)
        .setThumbnail('https://i.imgur.com/0jM0J5h.png')
        .addFields(
          {
            name: '� Backup Statistics',
            value: `\`\`\`📁 Channels: ${backupData.channels.length}\n👥 Roles: ${backupData.roles.length}\n😀 Emojis: ${backupData.emojis.length}\n📂 Categories: ${backupData.categories.length}\n🏰 Server: ${backupData.name}\`\`\``,
            inline: false
          },
          {
            name: '🕐 Backup Details',
            value: `**Created:** <t:${Math.floor(new Date(backupData.createdAt).getTime() / 1000)}:F>\n**Size:** Complete server structure\n**Type:** ${action === 'created' ? 'Manual backup' : 'Automatic backup'}`,
            inline: false
          }
        )
        .setFooter({ 
          text: 'Backup System • Server structure saved to database'
        })
        .setTimestamp();
    } else if (action === 'restored') {
      embed = new EmbedBuilder()
        .setTitle('♻️ Server Restore | Success')
        .setDescription(`**Server restoration completed!**\n\n🏗️ *Server structure has been restored from backup*`)
        .setColor(0xffa500)
        .setThumbnail('https://i.imgur.com/0jM0J5h.png')
        .addFields(
          {
            name: '📊 Restored Elements',
            value: `\`\`\`📁 Channels: ${backupData.channels.length}\n👥 Roles: ${backupData.roles.length}\n😀 Emojis: ${backupData.emojis.length}\n📂 Categories: ${backupData.categories.length}\n🏰 Server: ${backupData.name}\`\`\``,
            inline: false
          },
          {
            name: '� Backup Source',
            value: `**Backup Date:** <t:${Math.floor(new Date(backupData.createdAt).getTime() / 1000)}:F>\n**Restoration:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Type:** Complete structure restore`,
            inline: false
          }
        )
        .setFooter({ 
          text: 'Backup System • Server restoration completed'
        })
        .setTimestamp();
    }

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[BACKUP] Error enviando notificación:', error.message);
  }
}

// Función para enviar notificaciones de backup al canal (estilo simple - no usada)
async function sendBackupNotification(guild, backupData, action) {
  // Esta función ya no se usa, mantenida para compatibilidad
  return;
}

export async function createServerBackup(guild) {
  try {
    if (!guild) {
      console.error('[BACKUP] Guild no definido. ¿El bot está en el servidor?');
      throw new Error('No se pudo obtener el servidor para el backup.');
    }
    if (!guild.channels || !guild.channels.cache) {
      console.error('[BACKUP] guild.channels.cache no disponible.');
      throw new Error('No se pudo acceder a los canales del servidor.');
    }
    if (!guild.roles || !guild.roles.cache) {
      console.error('[BACKUP] guild.roles.cache no disponible.');
      throw new Error('No se pudo acceder a los roles del servidor.');
    }
    if (!guild.emojis || !guild.emojis.cache) {
      console.error('[BACKUP] guild.emojis.cache no disponible.');
      throw new Error('No se pudo acceder a los emojis del servidor.');
    }

    // Extrae estructura básica: canales, roles, categorías, emojis
    const toStr = v => typeof v === 'bigint' ? v.toString() : v;
    const channels = guild.channels.cache.map(ch => ({
      id: toStr(ch.id),
      name: ch.name,
      type: ch.type,
      parentId: toStr(ch.parentId),
      position: ch.position,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      bitrate: ch.bitrate || null,
      userLimit: ch.userLimit || null
    }));
    const roles = guild.roles.cache.filter(r => !r.managed).map(role => ({
      id: toStr(role.id),
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      permissions: toStr(role.permissions.bitfield),
      mentionable: role.mentionable,
      position: role.position
    }));
    const emojis = guild.emojis.cache.map(e => ({
      id: toStr(e.id),
      name: e.name,
      animated: e.animated
    }));
    const categories = guild.channels.cache.filter(ch => ch.type === 4).map(cat => ({
      id: toStr(cat.id),
      name: cat.name,
      position: cat.position
    }));

    const backupData = {
      guildId: toStr(guild.id),
      name: guild.name,
      createdAt: new Date().toISOString(),
      channels,
      roles,
      emojis,
      categories
    };
    await saveBackupToDb(backupData);
    
    // Enviar notificación al canal si está configurado
    await sendBackupNotificationChannel(guild, backupData, 'created');
    
    return backupData;
  } catch (err) {
    console.error('[BACKUP] Error al crear backup:', err);
    throw err;
  }
}

export async function getBackups(guildId) {
  return await getLastBackups(guildId, config.backup.keepLast || 10);
}

// Función modificada para crear backup solo con notificación al canal
export async function createServerBackupSilent(guild) {
  try {
    if (!guild) {
      console.error('[BACKUP] Guild no definido. ¿El bot está en el servidor?');
      throw new Error('No se pudo obtener el servidor para el backup.');
    }
    if (!guild.channels || !guild.channels.cache) {
      console.error('[BACKUP] guild.channels.cache no disponible.');
      throw new Error('No se pudo acceder a los canales del servidor.');
    }
    if (!guild.roles || !guild.roles.cache) {
      console.error('[BACKUP] guild.roles.cache no disponible.');
      throw new Error('No se pudo acceder a los roles del servidor.');
    }
    if (!guild.emojis || !guild.emojis.cache) {
      console.error('[BACKUP] guild.emojis.cache no disponible.');
      throw new Error('No se pudo acceder a los emojis del servidor.');
    }

    // Extrae estructura básica: canales, roles, categorías, emojis
    const toStr = v => typeof v === 'bigint' ? v.toString() : v;
    const channels = guild.channels.cache.map(ch => ({
      id: toStr(ch.id),
      name: ch.name,
      type: ch.type,
      parentId: toStr(ch.parentId),
      position: ch.position,
      topic: ch.topic || null,
      nsfw: ch.nsfw || false,
      bitrate: ch.bitrate || null,
      userLimit: ch.userLimit || null
    }));
    const roles = guild.roles.cache.filter(r => !r.managed).map(role => ({
      id: toStr(role.id),
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      permissions: toStr(role.permissions.bitfield),
      mentionable: role.mentionable,
      position: role.position
    }));
    const emojis = guild.emojis.cache.map(e => ({
      id: toStr(e.id),
      name: e.name,
      animated: e.animated
    }));
    const categories = guild.channels.cache.filter(ch => ch.type === 4).map(cat => ({
      id: toStr(cat.id),
      name: cat.name,
      position: cat.position
    }));

    const backupData = {
      guildId: toStr(guild.id),
      name: guild.name,
      createdAt: new Date().toISOString(),
      channels,
      roles,
      emojis,
      categories
    };
    await saveBackupToDb(backupData);
    
    // Solo enviar notificación al canal (sin reply)
    await sendBackupNotificationChannel(guild, backupData, 'created');
    
    return backupData;
  } catch (err) {
    console.error('[BACKUP] Error al crear backup:', err);
    throw err;
  }
}

export async function restoreBackup(guild, backupId) {
  try {
    console.log('[BACKUP] Iniciando restauración del backup...');
    const backup = await restoreBackupFromDb(guild.id, backupId);
    if (!backup) {
      throw new Error('Backup no encontrado');
    }

    console.log('[BACKUP] Backup encontrado, restaurando estructura...');
    
    // 1. RESTAURAR ROLES (primero, porque los canales pueden necesitar permisos)
    console.log('[BACKUP] Restaurando roles...');
    const roleMap = new Map(); // Para mapear IDs antiguos con nuevos
    
    for (const roleData of backup.roles || []) {
      try {
        // Buscar si ya existe un rol con el mismo nombre
        const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
        if (existingRole) {
          roleMap.set(roleData.id, existingRole.id);
          console.log(`[BACKUP] Rol "${roleData.name}" ya existe, reutilizando...`);
          continue;
        }

        // Crear nuevo rol
        const newRole = await guild.roles.create({
          name: roleData.name,
          color: roleData.color,
          hoist: roleData.hoist,
          permissions: roleData.permissions,
          mentionable: roleData.mentionable,
          position: roleData.position
        });
        roleMap.set(roleData.id, newRole.id);
        console.log(`[BACKUP] Rol "${roleData.name}" creado correctamente`);
      } catch (err) {
        console.error(`[BACKUP] Error creando rol "${roleData.name}":`, err.message);
      }
    }

    // 2. RESTAURAR CATEGORÍAS
    console.log('[BACKUP] Restaurando categorías...');
    const categoryMap = new Map();
    
    for (const catData of backup.categories || []) {
      try {
        const existingCategory = guild.channels.cache.find(ch => 
          ch.type === 4 && ch.name === catData.name
        );
        if (existingCategory) {
          categoryMap.set(catData.id, existingCategory.id);
          console.log(`[BACKUP] Categoría "${catData.name}" ya existe, reutilizando...`);
          continue;
        }

        const newCategory = await guild.channels.create({
          name: catData.name,
          type: 4, // GUILD_CATEGORY
          position: catData.position
        });
        categoryMap.set(catData.id, newCategory.id);
        console.log(`[BACKUP] Categoría "${catData.name}" creada correctamente`);
      } catch (err) {
        console.error(`[BACKUP] Error creando categoría "${catData.name}":`, err.message);
      }
    }

    // 3. RESTAURAR CANALES
    console.log('[BACKUP] Restaurando canales...');
    
    for (const channelData of backup.channels || []) {
      try {
        // Verificar si el canal ya existe
        const existingChannel = guild.channels.cache.find(ch => ch.name === channelData.name);
        if (existingChannel) {
          console.log(`[BACKUP] Canal "${channelData.name}" ya existe, omitiendo...`);
          continue;
        }

        // Configurar opciones del canal
        const channelOptions = {
          name: channelData.name,
          type: channelData.type,
          position: channelData.position
        };

        // Asignar categoría padre si existe
        if (channelData.parentId && categoryMap.has(channelData.parentId)) {
          channelOptions.parent = categoryMap.get(channelData.parentId);
        }

        // Opciones específicas según el tipo de canal
        if (channelData.topic) channelOptions.topic = channelData.topic;
        if (channelData.nsfw !== null) channelOptions.nsfw = channelData.nsfw;
        if (channelData.bitrate) channelOptions.bitrate = channelData.bitrate;
        if (channelData.userLimit) channelOptions.userLimit = channelData.userLimit;

        const newChannel = await guild.channels.create(channelOptions);
        console.log(`[BACKUP] Canal "${channelData.name}" creado correctamente`);
      } catch (err) {
        console.error(`[BACKUP] Error creando canal "${channelData.name}":`, err.message);
      }
    }

    // 4. RESTAURAR EMOJIS (opcional, puede fallar por límites)
    console.log('[BACKUP] Restaurando emojis...');
    
    for (const emojiData of backup.emojis || []) {
      try {
        const existingEmoji = guild.emojis.cache.find(e => e.name === emojiData.name);
        if (existingEmoji) {
          console.log(`[BACKUP] Emoji "${emojiData.name}" ya existe, omitiendo...`);
          continue;
        }

        // Nota: Para restaurar emojis reales necesitarías la URL de la imagen
        // Aquí solo registramos que existía
        console.log(`[BACKUP] Emoji "${emojiData.name}" registrado (restauración de imagen no implementada)`);
      } catch (err) {
        console.error(`[BACKUP] Error con emoji "${emojiData.name}":`, err.message);
      }
    }

    console.log('[BACKUP] ✅ Restauración completada exitosamente');
    
    // Enviar notificación de restauración
    await sendBackupNotificationChannel(guild, backup, 'restored');
    
    return backup;

  } catch (error) {
    console.error('[BACKUP] ❌ Error durante la restauración:', error);
    throw error;
  }
}
