// ═══════════════════════════════════════════════════════════════
// 🔧 ADMIN RESET COOLDOWN COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logAdminCommand } from '../util/selectiveLogging.js';
import yaml from 'js-yaml';
import fs from 'fs';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

export const data = new SlashCommandBuilder()
  .setName('admin-resetcooldown')
  .setDescription('🔧 [ADMIN] Resetea el cooldown de daily/weekly de un usuario')
  .setDefaultMemberPermissions('0')
  .addUserOption(option =>
    option
      .setName('usuario')
      .setDescription('Usuario al que resetear el cooldown')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('tipo')
      .setDescription('Tipo de cooldown a resetear')
      .setRequired(true)
      .addChoices(
        { name: '🎁 Daily (Diario)', value: 'daily' },
        { name: '📦 Weekly (Semanal)', value: 'weekly' },
        { name: '🔄 Both (Ambos)', value: 'both' }
      )
  );

export async function execute(interaction) {
  const adminId = interaction.user.id;
  const targetUser = interaction.options.getUser('usuario');
  const cooldownType = interaction.options.getString('tipo');
  const moneda = config?.casino?.moneda || '💰';

  // Verificar que solo el owner puede usar este comando
  const ownerID = config.ownerID;
  if (interaction.user.id !== ownerID) {
    const noPermEmbed = new EmbedBuilder()
      .setTitle('❌ Access Denied')
      .setColor(0xff0000)
      .setDescription('**You do not have permission to use this command**\n\n🔒 *This command is restricted to the bot owner only*')
      .setFooter({ text: 'Casino Bot • Owner Only Command' })
      .setTimestamp();

    return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
  }

  try {
    const targetUserId = targetUser.id;
    
    // Verificar que el usuario existe en la base de datos
    await addUserIfNotExists(targetUserId);
    
    // Resetear cooldowns según el tipo seleccionado
    let resetTypes = [];
    if (cooldownType === 'both') {
      resetTypes = ['daily', 'weekly'];
    } else {
      resetTypes = [cooldownType];
    }

    for (const type of resetTypes) {
      await resetCooldown(targetUserId, type);
    }

    // Log del comando admin
    await logAdminCommand(interaction.user, 'admin-resetcooldown', {
      target: targetUser.tag,
      action: `Reset ${cooldownType} cooldown${cooldownType === 'both' ? 's' : ''}`,
      additional: `Usuario: ${targetUser.id}`
    });

    // Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Cooldown Reseteado')
      .setDescription(`**Acción completada exitosamente**`)
      .addFields(
        {
          name: '👤 Usuario Afectado',
          value: `\`\`\`${targetUser.tag} (${targetUser.id})\`\`\``,
          inline: false
        },
        {
          name: '🔄 Cooldowns Reseteados', 
          value: getCooldownDescription(cooldownType),
          inline: false
        },
        {
          name: '🔧 Administrador',
          value: `\`\`\`${interaction.user.tag}\`\`\``,
          inline: false
        }
      )
      .setFooter({ 
        text: `${config.server?.name || 'Casino Bot'} • Admin Panel`,
        iconURL: interaction.guild?.iconURL() || undefined
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (error) {
    console.error('Error en admin-resetcooldown:', error);
    
    // Solo responder si la interacción no ha sido ya respondida
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Ocurrió un error al resetear el cooldown. Verifica los logs del servidor.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
}

// Función auxiliar para obtener descripción de los cooldowns
function getCooldownDescription(type) {
  const descriptions = {
    daily: '`🎁 Daily` - El usuario puede reclamar su recompensa diaria inmediatamente',
    weekly: '`📦 Weekly` - El usuario puede reclamar su recompensa semanal inmediatamente', 
    both: '`🎁 Daily + 📦 Weekly` - El usuario puede reclamar ambas recompensas inmediatamente'
  };
  
  return descriptions[type] || 'Cooldown desconocido';
}

// Función para resetear cooldown específico
async function resetCooldown(userId, type) {
  const { pool } = await import('../db.js');
  
  const columnMap = {
    daily: 'last_daily',
    weekly: 'last_weekly'
  };
  
  const timeColumn = columnMap[type];
  
  if (!timeColumn) {
    throw new Error(`Tipo de cooldown inválido: ${type}`);
  }

  // Establecer el timestamp a una fecha muy antigua para permitir reclamación inmediata
  const resetTimestamp = new Date('1970-01-01').toISOString();
  
  await pool.execute(
    `UPDATE users SET ${timeColumn} = ? WHERE user_id = ?`,
    [resetTimestamp, userId]
  );
}

// Función para agregar usuario si no existe (importada del db.js)
async function addUserIfNotExists(userId) {
  const { pool } = await import('../db.js');
  
  await pool.execute(
    'INSERT IGNORE INTO users (user_id, hand, bank, last_daily, last_weekly, daily_streak, weekly_streak) VALUES (?, 0, 0, ?, ?, 0, 0)',
    [userId, new Date('1970-01-01').toISOString(), new Date('1970-01-01').toISOString()]
  );
}