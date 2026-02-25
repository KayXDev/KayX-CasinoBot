import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getErrorStats } from '../util/globalErrorHandler.js';
import { getPoolHealth, getPoolStats, getDatabasePerformanceStats } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('system-health')
  .setDescription('🏥 View system health status and error statistics')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand.setName('status')
      .setDescription('View general system status'))
  .addSubcommand(subcommand =>
    subcommand.setName('errors')
      .setDescription('View detailed error statistics'))
  .addSubcommand(subcommand =>
    subcommand.setName('memory')
      .setDescription('View memory usage and system resources'))
  .addSubcommand(subcommand =>
    subcommand.setName('uptime')
      .setDescription('View uptime and performance statistics'))
  .addSubcommand(subcommand =>
    subcommand.setName('database')
      .setDescription('🗄️ View database performance and query optimization'));

export async function execute(interaction, config) {
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

  // Log gambling command
  await logGamblingCommand(interaction.user, 'system-health', {
    action: 'executed'
  });

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'status':
        await handleSystemStatus(interaction);
        break;
      case 'errors':
        await handleErrorStats(interaction);
        break;
      case 'memory':
        await handleMemoryStats(interaction);
        break;
      case 'uptime':
        await handleUptimeStats(interaction);
        break;
      case 'database':
        await handleDatabasePerformance(interaction);
        break;
    }
  } catch (error) {
    console.error('Error en comando system-health:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('⚠️ Error')
      .setColor(0xFF0000)
      .setDescription('An error occurred while obtaining system statistics.');
    
    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

async function handleSystemStatus(interaction) {
  const stats = getErrorStats();
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const poolHealth = getPoolHealth();
  
  const healthStatus = stats.total < 50 && poolHealth.status === 'healthy' ? '🟢 SALUDABLE' : 
                      stats.total < 100 && poolHealth.status !== 'critical' ? '🟡 ADVERTENCIA' : '🔴 CRÍTICO';
  
  const embed = new EmbedBuilder()
    .setTitle('🏥 Estado de Salud del Sistema')
    .setColor(stats.total < 50 ? 0x00AA00 : stats.total < 100 ? 0xFFAA00 : 0xFF0000)
    .setDescription('**Resumen del estado general del bot**')
    .addFields(
      {
        name: '🔋 Estado General',
        value: `\`\`\`${healthStatus}\`\`\``,
        inline: true
      },
      {
        name: '⏰ Uptime',
        value: `\`\`\`${formatUptime(uptime)}\`\`\``,
        inline: true
      },
      {
        name: '💾 Memoria',
        value: `\`\`\`${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\`\`\``,
        inline: true
      },
      {
        name: '🚨 Errores Totales',
        value: `\`\`\`${stats.total} errores\`\`\``,
        inline: true
      },
      {
        name: '⚡ Comandos Fallidos',
        value: `\`\`\`${stats.commands} comandos\`\`\``,
        inline: true
      },
      {
        name: '🤖 Errores Discord',
        value: `\`\`\`${stats.discord} eventos\`\`\``,
        inline: true
      },
      {
        name: '🔌 Pool Database',
        value: `\`\`\`${poolHealth.activeConnections}/${poolHealth.connectionLimit} (${poolHealth.utilizationPercent}%)\`\`\``,
        inline: true
      },
      {
        name: '🚦 Estado DB',
        value: `\`\`\`${poolHealth.status === 'healthy' ? '🟢 SALUDABLE' : 
                        poolHealth.status === 'warning' ? '🟡 ADVERTENCIA' : '🔴 CRÍTICO'}\`\`\``,
        inline: true
      },
      {
        name: '📊 Cola de Queries',
        value: `\`\`\`${poolHealth.queuedRequests} en espera\`\`\``,
        inline: true
      }
    );

  if (stats.systemHealth.lastError) {
    embed.addFields({
      name: '🔍 Último Error',
      value: `\`\`\`yaml
Tipo: ${stats.systemHealth.lastError.type}
Tiempo: ${new Date(stats.systemHealth.lastError.timestamp).toLocaleString()}
Mensaje: ${stats.systemHealth.lastError.error}\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ 
    text: '🏥 Sistema de Diagnóstico • Actualizado automáticamente',
    iconURL: interaction.user.displayAvatarURL()
  })
  .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleErrorStats(interaction) {
  const stats = getErrorStats();
  
  const embed = new EmbedBuilder()
    .setTitle('📊 Estadísticas Detalladas de Errores')
    .setColor(0x3498DB)
    .setDescription('**Desglose completo de errores del sistema**')
    .addFields(
      {
        name: '🎮 Errores por Categoría',
        value: `\`\`\`yaml
Total General: ${stats.total}
├─ Comandos: ${stats.commands}
├─ Interacciones: ${stats.interactions}  
├─ Base de Datos: ${stats.database}
├─ Discord API: ${stats.discord}
├─ Sistema Crypto: ${stats.crypto}
├─ Mantenimiento: ${stats.maintenance}
└─ Sistema: ${stats.system}\`\`\``,
        inline: false
      },
      {
        name: '📈 Tasa de Errores',
        value: calculateErrorRate(stats),
        inline: true
      },
      {
        name: '🎯 Confiabilidad',
        value: calculateReliability(stats),
        inline: true
      }
    );

  if (stats.systemHealth.isHealthy) {
    embed.addFields({
      name: '✅ Estado del Sistema',
      value: '```✅ Sistema funcionando correctamente\n🛡️ Todos los errores están siendo capturados\n🔄 Auto-recovery activo```',
      inline: false
    });
  } else {
    embed.addFields({
      name: '⚠️ Alertas del Sistema',
      value: '```⚠️ Se han detectado múltiples errores\n🔍 Revisar logs para más detalles\n🛠️ Considerar mantenimiento preventivo```',
      inline: false
    });
  }

  embed.setFooter({ text: '📊 Estadísticas actualizadas en tiempo real' })
       .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleMemoryStats(interaction) {
  const memUsage = process.memoryUsage();
  const stats = getErrorStats();
  
  const embed = new EmbedBuilder()
    .setTitle('💾 Estadísticas de Memoria y Recursos')
    .setColor(0x9B59B6)
    .setDescription('**Uso detallado de memoria y recursos del sistema**')
    .addFields(
      {
        name: '📊 Uso de Memoria',
        value: `\`\`\`yaml
Heap Usado: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB
Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB
RSS (Memoria Física): ${Math.round(memUsage.rss / 1024 / 1024)}MB
Memoria Externa: ${Math.round(memUsage.external / 1024 / 1024)}MB\`\`\``,
        inline: false
      },
      {
        name: '⚡ Rendimiento',
        value: `\`\`\`yaml
CPU Usage: ${(process.cpuUsage().user / 1000000).toFixed(2)}s
Versión Node: ${process.version}
Plataforma: ${process.platform}\`\`\``,
        inline: false
      }
    );

  // Alertas de memoria
  const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  if (memMB > 500) {
    embed.addFields({
      name: '⚠️ Alerta de Memoria',
      value: `\`\`\`⚠️ Uso de memoria alto (${memMB}MB)\n💡 Considerar reinicio si supera 800MB\n🔄 Garbage collection recomendado\`\`\``,
      inline: false
    });
  } else {
    embed.addFields({
      name: '✅ Estado de Memoria',
      value: `\`\`\`✅ Uso de memoria normal (${memMB}MB)\n🎯 Sistema operando eficientemente\n📈 Rendimiento óptimo\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ text: '💾 Monitoreo de recursos en tiempo real' })
       .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUptimeStats(interaction) {
  const uptime = process.uptime();
  const stats = getErrorStats();
  const startTime = new Date(Date.now() - (uptime * 1000));
  
  const embed = new EmbedBuilder()
    .setTitle('⏰ Uptime Statistics')
    .setColor(0x1ABC9C)
    .setDescription('**Detailed uptime information**')
    .addFields(
      {
        name: '🕐 Tiempo de Actividad',
        value: `\`\`\`yaml
Uptime Total: ${formatUptime(uptime)}
Iniciado: ${startTime.toLocaleString()}
Reinicio #: ${stats.systemHealth.restarts || 0}\`\`\``,
        inline: false
      },
      {
        name: '📊 Rendimiento por Hora',
        value: calculateHourlyStats(stats, uptime),
        inline: true
      },
      {
        name: '🎯 Disponibilidad',
        value: calculateAvailability(stats),
        inline: true
      }
    );

  // Calcular próximo mantenimiento recomendado
  const hoursRunning = uptime / 3600;
  if (hoursRunning > 168) { // 7 días
    embed.addFields({
      name: '🔧 Recomendación de Mantenimiento',
      value: `\`\`\`⏰ Bot ejecutándose por ${Math.floor(hoursRunning)} horas\n💡 Reinicio recomendado para optimización\n🛠️ Mantenimiento preventivo sugerido\`\`\``,
      inline: false
    });
  }

  embed.setFooter({ text: '⏰ Estadísticas de rendimiento' })
       .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Funciones de utilidad
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function calculateErrorRate(stats) {
  const uptime = process.uptime();
  const errorsPerHour = (stats.total / (uptime / 3600)).toFixed(2);
  
  return `\`\`\`yaml
${errorsPerHour} errores/hora
${(stats.total / uptime * 60).toFixed(2)} errores/minuto\`\`\``;
}

function calculateReliability(stats) {
  const reliability = Math.max(0, 100 - (stats.total / 10));
  const status = reliability > 95 ? '🟢 Excelente' : 
                reliability > 85 ? '🟡 Buena' : '🔴 Necesita atención';
  
  return `\`\`\`yaml
${reliability.toFixed(1)}%
${status}\`\`\``;
}

function calculateHourlyStats(stats, uptime) {
  const hoursRunning = Math.max(1, uptime / 3600);
  const commandsPerHour = (stats.commands / hoursRunning).toFixed(1);
  
  return `\`\`\`yaml
Errores/hora: ${(stats.total / hoursRunning).toFixed(1)}
Cmds fallidos/hora: ${commandsPerHour}\`\`\``;
}

function calculateAvailability(stats) {
  // Asumimos que el bot tiene 99.9% de disponibilidad menos errores críticos
  const availability = Math.max(95, 99.9 - (stats.system * 0.1));
  
  return `\`\`\`yaml
${availability.toFixed(2)}%
🎯 Objetivo: 99.5%\`\`\``;
}

async function handleDatabasePerformance(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    console.log('🔍 Analizando rendimiento de base de datos...');
    const dbStats = await getDatabasePerformanceStats();
    
    // Determinar color del embed basado en rendimiento
    const getPerformanceColor = (performance) => {
      switch (performance) {
        case 'excellent': return 0x00FF00;  // Verde
        case 'good': return 0x90EE90;       // Verde claro
        case 'acceptable': return 0xFFFF00; // Amarillo
        case 'poor': return 0xFF0000;       // Rojo
        default: return 0x808080;           // Gris
      }
    };
    
    const overallPerformance = dbStats.overallHealth;
    const embedColor = overallPerformance === 'healthy' ? 0x00FF00 : 0xFFAA00;
    
    const embed = new EmbedBuilder()
      .setTitle('🗄️ Rendimiento de Base de Datos')
      .setColor(embedColor)
      .setDescription('**Análisis completo de optimización MySQL**')
      .addFields(
        {
          name: '🔌 Estado del Pool',
          value: `\`\`\`yaml
Conexiones: ${dbStats.pool.activeConnections}/${dbStats.pool.connectionLimit}
Utilización: ${dbStats.pool.utilizationPercent}%
Estado: ${dbStats.pool.healthStatus}
Cola: ${dbStats.pool.queuedRequests} queries\`\`\``,
          inline: false
        }
      );
    
    // Añadir performance de cada query crítica
    let queryPerformanceText = '```yaml\n';
    for (const query of dbStats.queries) {
      const performanceEmoji = {
        'excellent': '🟢',
        'good': '🟡', 
        'acceptable': '🟠',
        'poor': '🔴',
        'failed': '❌'
      }[query.performance] || '❓';
      
      queryPerformanceText += `${performanceEmoji} ${query.name}:\n`;
      queryPerformanceText += `   Tiempo: ${query.executionTime}ms\n`;
      queryPerformanceText += `   Índice: ${query.indexUsed || 'NONE'}\n`;
      if (query.rowsExamined) {
        queryPerformanceText += `   Filas: ${query.rowsExamined}\n`;
      }
      queryPerformanceText += '\n';
    }
    queryPerformanceText += '```';
    
    embed.addFields({
      name: '⚡ Rendimiento de Consultas Críticas',
      value: queryPerformanceText,
      inline: false
    });
    
    // Recomendaciones basadas en rendimiento
    let recommendations = '';
    const poorQueries = dbStats.queries.filter(q => q.performance === 'poor' || q.performance === 'failed');
    
    if (poorQueries.length === 0) {
      recommendations = '✅ Todas las consultas están optimizadas\n✅ Los índices están funcionando correctamente';
    } else {
      recommendations = '⚠️ Se detectaron consultas lentas:\n';
      recommendations += '💡 Ejecuta: `node apply-mysql-indexes.js`\n';
      recommendations += '💡 Considera añadir más índices específicos';
    }
    
    embed.addFields({
      name: '💡 Recomendaciones de Optimización',
      value: `\`\`\`${recommendations}\`\`\``,
      inline: false
    });
    
    embed.setFooter({ 
      text: `🗄️ Análisis completado • ${new Date().toLocaleString()}`,
      iconURL: interaction.user.displayAvatarURL()
    });
    
    await interaction.editReply({ embeds: [embed] });
    
    // Log gambling command
    await logGamblingCommand(interaction.user, 'system-health', {
      subcommand: 'database',
      performance: overallPerformance,
      queries_analyzed: dbStats.queries.length
    });
    
  } catch (error) {
    console.error('Error en database performance analysis:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error de Análisis')
      .setColor(0xFF0000)
      .setDescription(`No se pudo analizar el rendimiento de la base de datos.\n\`\`\`${error.message}\`\`\``);
    
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}