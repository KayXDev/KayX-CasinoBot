// ═══════════════════════════════════════════════════════════════
// ⚙️ ADMIN CRYPTO NEWS SETUP COMMAND
// ═══════════════════════════════════════════════════════════════

import { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('admin-crypto-news')
  .setDescription('⚙️ [ADMIN] Configure crypto news & alerts system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('setup-channels')
      .setDescription('Configure news and alerts channels')
      .addChannelOption(option =>
        option
          .setName('news_channel')
          .setDescription('Channel for automatic crypto news')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('alerts_channel')
          .setDescription('Channel for price alerts')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('test-news')
      .setDescription('Test the news generation system')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('test-alert')
      .setDescription('Test the alert system')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Check news & alerts system status')
  );

export async function execute(interaction) {
  // Verificar que solo el owner puede usar este comando
  const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
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

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'setup-channels':
        await handleSetupChannels(interaction);
        break;
      case 'test-news':
        await handleTestNews(interaction);
        break;
      case 'test-alert':
        await handleTestAlert(interaction);
        break;
      case 'status':
        await handleStatus(interaction);
        break;
    }
  } catch (error) {
    console.error('Error in admin crypto news command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('❌ Error')
      .setDescription('Hubo un error al ejecutar el comando.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleSetupChannels(interaction) {
  const newsChannel = interaction.options.getChannel('news_channel');
  const alertsChannel = interaction.options.getChannel('alerts_channel');
  
  try {
    // Leer configuración actual
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    
    // Actualizar canales
    if (!config.crypto) config.crypto = {};
    if (!config.crypto.news_alerts) config.crypto.news_alerts = {};
    if (!config.crypto.news_alerts.channels) config.crypto.news_alerts.channels = {};
    
    config.crypto.news_alerts.channels.news_channel = newsChannel.id;
    config.crypto.news_alerts.channels.alerts_channel = alertsChannel.id;
    config.crypto.news_alerts.enabled = true;
    
    // Guardar configuración
    fs.writeFileSync('./config.yml', yaml.dump(config, { indent: 2 }));
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Canales Configurados')
      .setDescription('El sistema de noticias y alertas crypto ha sido configurado exitosamente')
      .addFields(
        {
          name: '📰 Canal de Noticias',
          value: `${newsChannel} (${newsChannel.id})`,
          inline: true
        },
        {
          name: '🔔 Canal de Alertas',
          value: `${alertsChannel} (${alertsChannel.id})`,
          inline: true
        },
        {
          name: '⚙️ Estado del Sistema',
          value: 'Activado y funcionando',
          inline: false
        }
      )
      .setFooter({ text: 'El sistema generará noticias y alertas automáticamente' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log admin command
    await logAdminCommand(interaction.user, 'admin-crypto-news setup-channels', {
      channels_configured: 2,
      action: 'setup-channels'
    });

  } catch (error) {
    console.error('Error setting up news channels:', error);
    throw error;
  }
}

async function handleTestNews(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    const newsChannelId = config.crypto?.news_alerts?.channels?.news_channel;
    
    if (!newsChannelId || newsChannelId === "PON_AQUI_EL_ID_DEL_CANAL_NOTICIAS") {
      return await interaction.editReply({
        content: '❌ Primero configura los canales con `/admin-crypto-news setup-channels`'
      });
    }
    
    const newsChannel = await interaction.client.channels.fetch(newsChannelId);
    if (!newsChannel) {
      return await interaction.editReply({
        content: '❌ Canal de noticias no encontrado. Reconfigura con `/admin-crypto-news setup-channels`'
      });
    }
    
    // Crear noticia de prueba
    const testNews = new EmbedBuilder()
      .setColor('#1DA1F2')
      .setTitle('📰 CRYPTO NEWS - TEST')
      .setDescription('**🧪 SISTEMA DE PRUEBA ACTIVADO: Esta es una noticia de prueba generada por el administrador**')
      .addFields(
        {
          name: '⚡ Estado del Sistema',
          value: 'El sistema de noticias automáticas está funcionando correctamente',
          inline: false
        },
        {
          name: '🔄 Próximas Características',
          value: 'Las noticias se generarán automáticamente basadas en:\n• Cambios significativos de precio\n• Eventos del mercado\n• Sentimiento general',
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Test News Generation • Admin Panel' });
    
    await newsChannel.send({ embeds: [testNews] });
    
    await interaction.editReply({
      content: `✅ Noticia de prueba enviada exitosamente a ${newsChannel}`
    });

    // Log admin command
    await logAdminCommand(interaction.user, 'admin-crypto-news test-news', {
      news_channel: newsChannel.name,
      action: 'test-news'
    });

  } catch (error) {
    console.error('Error testing news:', error);
    await interaction.editReply({
      content: '❌ Error enviando noticia de prueba. Verifica la configuración.'
    });
  }
}

async function handleTestAlert(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    const alertsChannelId = config.crypto?.news_alerts?.channels?.alerts_channel;
    
    if (!alertsChannelId || alertsChannelId === "PON_AQUI_EL_ID_DEL_CANAL_ALERTAS") {
      return await interaction.editReply({
        content: '❌ Primero configura los canales con `/admin-crypto-news setup-channels`'
      });
    }
    
    const alertsChannel = await interaction.client.channels.fetch(alertsChannelId);
    if (!alertsChannel) {
      return await interaction.editReply({
        content: '❌ Canal de alertas no encontrado. Reconfigura con `/admin-crypto-news setup-channels`'
      });
    }
    
    // Crear alerta de prueba
    const testAlert = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🔔 ALERTA DE PRECIO - TEST')
      .setDescription('**🧪 Esta es una alerta de prueba generada por el administrador**')
      .addFields(
        {
          name: '💰 Ejemplo de Precio',
          value: '$95,847.32',
          inline: true
        },
        {
          name: '📊 Crypto de Prueba',
          value: 'Bitcoin (BTC)',
          inline: true
        },
        {
          name: '📈 Cambio Simulado',
          value: '+12.5% (24h)',
          inline: true
        },
        {
          name: '🎯 Tipo de Alerta',
          value: 'Las alertas reales se dispararán cuando los precios alcancen los objetivos configurados',
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Test Price Alert System • Admin Panel' });
    
    await alertsChannel.send({ embeds: [testAlert] });
    
    await interaction.editReply({
      content: `✅ Alerta de prueba enviada exitosamente a ${alertsChannel}`
    });

    // Log admin command
    await logAdminCommand(interaction.user, 'admin-crypto-news test-alert', {
      alert_channel: alertsChannel.name,
      action: 'test-alert'
    });

  } catch (error) {
    console.error('Error testing alert:', error);
    await interaction.editReply({
      content: '❌ Error enviando alerta de prueba. Verifica la configuración.'
    });
  }
}

async function handleStatus(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
    const newsConfig = config.crypto?.news_alerts;
    
    // Definir variables fuera del bloque if para el logging
    let newsChannel = null;
    let alertsChannel = null;
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('📊 Estado del Sistema News & Alerts')
      .setTimestamp();
    
    if (!newsConfig?.enabled) {
      embed.setDescription('❌ El sistema está **DESHABILITADO**')
        .addFields({
          name: '🔧 Para habilitar',
          value: 'Usa `/admin-crypto-news setup-channels`',
          inline: false
        });
    } else {
      const newsChannelId = newsConfig.channels?.news_channel;
      const alertsChannelId = newsConfig.channels?.alerts_channel;
      
      newsChannel = newsChannelId ? 
        await interaction.client.channels.fetch(newsChannelId).catch(() => null) : null;
      alertsChannel = alertsChannelId ? 
        await interaction.client.channels.fetch(alertsChannelId).catch(() => null) : null;
      
      embed.setDescription('✅ El sistema está **HABILITADO**')
        .addFields(
          {
            name: '📰 Canal de Noticias',
            value: newsChannel ? `${newsChannel} (${newsChannel.id})` : `❌ Canal no encontrado (${newsChannelId})`,
            inline: false
          },
          {
            name: '🔔 Canal de Alertas',
            value: alertsChannel ? `${alertsChannel} (${alertsChannel.id})` : `❌ Canal no encontrado (${alertsChannelId})`,
            inline: false
          },
          {
            name: '⚙️ Configuración Actual',
            value: `🔄 Frecuencia de noticias: **${newsConfig.news_generation?.frequency_minutes || 45} minutos**\n` +
                   `📊 Cambio mínimo para noticia: **${newsConfig.news_generation?.min_price_change_percent || 8}%**\n` +
                   `⏱️ Check de alertas: **${newsConfig.price_alerts?.check_frequency_seconds || 30} segundos**`,
            inline: false
          }
        );
    }

    await interaction.editReply({ embeds: [embed] });

    // Log admin command
    await logAdminCommand(interaction.user, 'admin-crypto-news status', {
      news_channel_configured: !!newsChannel,
      alerts_channel_configured: !!alertsChannel,
      action: 'status'
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    await interaction.editReply({
      content: '❌ Error obteniendo estado del sistema'
    });
  }
}