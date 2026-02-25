import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists } from '../db.js';
import { getUserHeistEquipment, calculateEquipmentBonus, getUserHeistConsumables, useConsumable } from '../util/heist/heistItems.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

// Almacenar cooldowns y intentos diarios
export const robbankCooldowns = new Map();
const dailyAttempts = new Map();
export const jailedUsers = new Map();

// Función para verificar si un usuario está en la cárcel
export function isUserJailed(userId) {
  if (jailedUsers.has(userId)) {
    const jailEnd = jailedUsers.get(userId);
    if (Date.now() < jailEnd) {
      return true;
    } else {
      jailedUsers.delete(userId);
      return false;
    }
  }
  return false;
}

export const data = new SlashCommandBuilder()
  .setName('robbank')
  .setDescription('🏦 Intenta robar un banco - Sistema avanzado con minijuegos')
  .addStringOption(option =>
    option.setName('banco')
      .setDescription('Elige el banco a robar')
      .setRequired(true)
      .addChoices(
        { name: '🏪 Banco Local (Fácil)', value: 'local' },
        { name: '🏛️ Banco Regional (Medio)', value: 'regional' },
        { name: '🏦 Banco Nacional (Difícil)', value: 'national' },
        { name: '🏢 Banco Central (Extremo)', value: 'reserve' }
      ));

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const bankType = interaction.options.getString('banco');
  const moneda = config?.casino?.moneda || '💰';
  
  // Configuración del sistema
  const robbankConfig = config?.robbank || {};
  const cooldownTime = robbankConfig.cooldown || 7200000; // 2 horas
  const minUserMoney = robbankConfig.minUserMoney || 50000;
  const maxDailyAttempts = robbankConfig.maxAttempts || 3;
  const failPenalty = robbankConfig.failPenalty || 0.5;
  const jailTime = robbankConfig.jailTime || 3600000; // 1 hora

  // Verificar si está en la cárcel
  if (jailedUsers.has(userId)) {
    const jailEnd = jailedUsers.get(userId);
    if (Date.now() < jailEnd) {
      const timeLeft = Math.ceil((jailEnd - Date.now()) / 60000);
      const embed = new EmbedBuilder()
        .setTitle('🔒 En Prisión')
        .setDescription(`Estás en la cárcel por intentar robar un banco.\n\n⏰ **Tiempo restante:** ${timeLeft} minutos\n\n💡 *Un administrador puede liberarte usando* \`/admin-jail release @usuario\``)
        .setColor(0x95a5a6)
        .addFields({
          name: '🚫 Restricciones Activas',
          value: 'No puedes usar comandos económicos mientras estés encarcelado',
          inline: false
        });
        // .setThumbnail('https://cdn.discordapp.com/emojis/750050942077476885.png');
      
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      jailedUsers.delete(userId);
    }
  }

  // Verificar cooldown
  if (robbankCooldowns.has(userId)) {
    const cooldownEnd = robbankCooldowns.get(userId);
    if (Date.now() < cooldownEnd) {
      const timeLeft = Math.ceil((cooldownEnd - Date.now()) / 60000);
      const embed = new EmbedBuilder()
        .setTitle('⏰ Cooldown Activo')
        .setDescription(`Debes esperar antes de intentar otro robo.\n\n⏱️ **Tiempo restante:** ${timeLeft} minutos`)
        .setColor(0xf39c12);
      
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }

  // Verificar intentos diarios
  const today = new Date().toDateString();
  const userKey = `${userId}-${today}`;
  const attempts = dailyAttempts.get(userKey) || 0;
  
  if (attempts >= maxDailyAttempts) {
    const embed = new EmbedBuilder()
      .setTitle('🚫 Límite Diario Alcanzado')
      .setDescription(`Has alcanzado el límite de **${maxDailyAttempts} intentos** por día.\n\n🕐 **Reinicio:** Medianoche (00:00)`)
      .setColor(0xe74c3c);
    
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Obtener balance del usuario
  await addUserIfNotExists(userId);
  const balance = await getUserBalances(userId);
  
  if (balance.hand < minUserMoney) {
    const embed = new EmbedBuilder()
      .setTitle('💸 Dinero Insuficiente')
      .setDescription(`Necesitas al menos **${minUserMoney.toLocaleString()} ${moneda}** en mano para intentar robar un banco.\n\n💰 **Tu dinero actual:** ${balance.hand.toLocaleString()} ${moneda}`)
      .setColor(0xe74c3c);
    
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // Obtener configuración del banco
  const bankConfig = robbankConfig.banks?.[bankType];
  if (!bankConfig) {
    return interaction.reply({ content: '❌ Banco no encontrado.', flags: MessageFlags.Ephemeral });
  }

  // Obtener equipment y consumables del usuario
  const userEquipment = await getUserHeistEquipment(userId);
  const userConsumables = await getUserHeistConsumables(userId);
  
  // Calcular bonus de equipamiento
  const equipmentBonus = calculateEquipmentBonus(userEquipment, bankConfig.minigame);

  // Aplicar efectos de consumibles
  let timeMultiplier = 1;
  let difficultyReduction = 0;
  let jailTimeReduction = 0;
  let hasIntelReport = false;
  
  // Verificar disponibilidad de consumibles (SIN consumir aún)
  if (userConsumables.intel_report > 0) {
    hasIntelReport = true;
  }

  // Obtener configuraciones específicas del banco
  const bankPenalty = bankConfig.failPenalty || robbankConfig.failPenalty;
  const bankJailTime = bankConfig.jailTime || robbankConfig.jailTime;
  const bankJailMinutes = Math.round(bankJailTime / 60000);

  // Mostrar información del banco y confirmar
  let bankDescription = `**${bankConfig.description}**\n\n🎯 **Tasa de éxito:** ${Math.round(bankConfig.successRate * 100)}% ${getDifficultyIcon(bankConfig.difficulty)}\n💰 **Recompensa:** ${bankConfig.minReward.toLocaleString()} - ${bankConfig.maxReward.toLocaleString()} ${moneda}\n🎮 **Desafío:** ${getMinigameDescription(bankConfig.minigame)}\n⚠️ **Riesgo:** ${Math.round(bankPenalty * 100)}% dinero + ${bankJailMinutes}min cárcel`;
  
  // Información extra si tiene Intel Report
  if (hasIntelReport) {
    bankDescription += `\n\n📋 **REPORTE DE INTELIGENCIA:**\n🔐 **Nivel de seguridad:** ${getDifficultyDescription(bankConfig.difficulty)}\n🕐 **Tiempo límite:** ${getTimeInfo(bankConfig.minigame, bankConfig.difficulty, timeMultiplier)}\n⚡ **Bonus de equipo:** ${equipmentBonus > 0 ? `+${Math.round(equipmentBonus * 100)}%` : 'Ninguno'}`;
  }

  const infoEmbed = new EmbedBuilder()
    .setTitle(`${bankConfig.emoji} ${bankConfig.name}`)
    .setDescription(bankDescription)
    .setColor(hasIntelReport ? 0x00ff00 : 0xe67e22)
    .addFields(
      {
        name: '📊 Estadísticas',
        value: `🎪 **Intentos hoy:** ${attempts}/${maxDailyAttempts}\n💸 **Dinero actual:** ${balance.hand.toLocaleString()} ${moneda}\n⏰ **Cooldown:** ${cooldownTime / 3600000}h tras el intento`,
        inline: true
      },
      {
        name: '⚠️ Advertencia',
        value: '**Este es un robo de alto riesgo.**\nSi fallas, perderás dinero y irás a la cárcel.\n\n¿Estás seguro de continuar?',
        inline: true
      }
    )
    .setFooter({ text: 'Los robos de banco son actividades de alto riesgo y alta recompensa' });

  const confirmRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_robbery')
        .setLabel('🎯 Iniciar Robo')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_robbery')
        .setLabel('❌ Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

  const response = await interaction.reply({ 
    embeds: [infoEmbed], 
    components: [confirmRow],
    flags: MessageFlags.Ephemeral
  });

  try {
    const confirmation = await response.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 300000, // 5 minutos para todo el proceso del robo
      filter: i => i.user.id === userId
    });

    if (confirmation.customId === 'cancel_robbery') {
      const cancelEmbed = new EmbedBuilder()
        .setTitle('✅ Robo Cancelado')
        .setDescription('Has decidido no continuar con el robo. Decisión sabia.')
        .setColor(0x2ecc71);
      
      return confirmation.update({ embeds: [cancelEmbed], components: [] });
    }

    // Confirmar inicio del minijuego
    const startEmbed = new EmbedBuilder()
      .setTitle('🎮 Iniciando Minijuego')
      .setDescription(`Preparándote para el desafío: **${getMinigameDescription(bankConfig.minigame)}**\n\n⏳ El juego comenzará en un momento...`)
      .setColor(0xf39c12);
    
    await confirmation.update({ embeds: [startEmbed], components: [] });

    // Ahora usar los consumibles (se consumen automáticamente al confirmar)
    if (userConsumables.adrenaline_shot > 0) {
      timeMultiplier = 1.5; // +50% tiempo
      await useConsumable(userId, 'adrenaline_shot');
    }
    if (userConsumables.focus_pills > 0) {
      difficultyReduction = 1; // -1 nivel de dificultad
      await useConsumable(userId, 'focus_pills');
    }
    if (userConsumables.getaway_car > 0) {
      jailTimeReduction = 0.5; // -50% tiempo de cárcel si fallas
      await useConsumable(userId, 'getaway_car');
    }
    if (userConsumables.intel_report > 0) {
      await useConsumable(userId, 'intel_report');
    }

    // Iniciar el minijuego correspondiente
    let gameSuccess = false;
    let bonusMultiplier = 1;

    try {
      switch (bankConfig.minigame) {
        case 'lockpicking':
          ({ success: gameSuccess, bonus: bonusMultiplier } = await playLockpickingGame(interaction, Math.max(1, bankConfig.difficulty - difficultyReduction), equipmentBonus, timeMultiplier));
          break;
        case 'hacking':
          ({ success: gameSuccess, bonus: bonusMultiplier } = await playHackingGame(interaction, Math.max(1, bankConfig.difficulty - difficultyReduction), equipmentBonus, timeMultiplier));
          break;
        case 'stealth':
          ({ success: gameSuccess, bonus: bonusMultiplier } = await playStealthGame(interaction, Math.max(1, bankConfig.difficulty - difficultyReduction), equipmentBonus, timeMultiplier));
          break;
        case 'decode':
          ({ success: gameSuccess, bonus: bonusMultiplier } = await playDecodeGame(interaction, Math.max(1, bankConfig.difficulty - difficultyReduction), equipmentBonus, timeMultiplier));
          break;
        default:
          gameSuccess = Math.random() < bankConfig.successRate;
      }
    } catch (error) {
      console.error('Error en minijuego:', error);
      gameSuccess = false;
    }

    // Nueva lógica clara de éxito
    let robberySuccess = false;
    
    if (gameSuccess) {
      // Si ganas el minijuego: alta probabilidad de éxito en el robo
      const bonusSuccessRate = Math.min(0.95, bankConfig.successRate + 0.3 + (bonusMultiplier * 0.2));
      robberySuccess = Math.random() < bonusSuccessRate;
    } else {
      // Si fallas el minijuego: probabilidad muy baja de éxito (solo suerte)
      const reducedSuccessRate = Math.max(0.05, bankConfig.successRate * 0.3);
      robberySuccess = Math.random() < reducedSuccessRate;
    }

    // Actualizar intentos diarios y cooldown
    dailyAttempts.set(userKey, attempts + 1);
    robbankCooldowns.set(userId, Date.now() + robbankConfig.cooldown);

    await processRobberyResult(interaction, robberySuccess, bankConfig, userId, moneda, robbankConfig, gameSuccess, bonusMultiplier, jailTimeReduction);

  } catch (error) {
    console.error('🚨 Error en robbank:', error);
    
    // Verificar si es realmente un error de timeout o algo más
    const isTimeoutError = error.code === 'InteractionCollectorError' || 
                          error.message?.includes('time') || 
                          error.message?.includes('timeout');
    
    if (isTimeoutError) {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle('⏰ Tiempo Agotado')
        .setDescription('El robo ha sido cancelado por inactividad.')
        .setColor(0x95a5a6);
      
      await interaction.followUp({ embeds: [timeoutEmbed], components: [] });
    } else {
      // Si no es timeout, mostrar error genérico pero log el error real
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error Inesperado')
        .setDescription('Ha ocurrido un error durante el robo. Inténtalo de nuevo.')
        .setColor(0xe74c3c);
      
      await interaction.followUp({ embeds: [errorEmbed], components: [] });
    }
  }
}

function getMinigameDescription(type) {
  switch (type) {
    case 'lockpicking': return '🔓 Forzar cerraduras de seguridad';
    case 'hacking': return '💻 Hackear sistema de seguridad';
    case 'stealth': return '🥷 Evitar cámaras y guardias';
    case 'decode': return '🔢 Descifrar códigos de acceso';
    default: return 'Desafío desconocido';
  }
}

function getDifficultyDescription(difficulty) {
  switch (difficulty) {
    case 1: return 'Básico 🟢 (75% éxito)';
    case 2: return 'Intermedio 🟡 (50% éxito)';
    case 3: return 'Avanzado 🟠 (30% éxito)';
    case 4: return 'Extremo 🔴 (15% éxito)';
    default: return 'Desconocido';
  }
}

function getDifficultyIcon(difficulty) {
  switch (difficulty) {
    case 1: return '🟢';
    case 2: return '🟡';
    case 3: return '🟠';
    case 4: return '🔴';
    default: return '⚪';
  }
}

function getTimeInfo(minigame, difficulty, timeMultiplier) {
  const baseTime = minigame === 'lockpicking' ? Math.max(20, 50 - (difficulty * 5)) :
                   minigame === 'hacking' ? (difficulty <= 1 ? 25 : difficulty <= 2 ? 20 : 15) :
                   minigame === 'stealth' ? 20 :
                   minigame === 'decode' ? (difficulty <= 1 ? 30 : difficulty <= 2 ? 25 : 20) : 20;
  
  const finalTime = Math.round(baseTime * timeMultiplier);
  return `${finalTime}s ${timeMultiplier > 1 ? `(+${Math.round((timeMultiplier - 1) * 100)}% bonus)` : ''}`;
}

async function processRobberyResult(interaction, success, bankConfig, userId, moneda, robbankConfig, gameSuccess, bonusMultiplier, jailTimeReduction = 0) {
  const balance = await getUserBalances(userId);

  if (success) {
    // Robo exitoso con mejor sistema de recompensas
    const baseReward = Math.floor(Math.random() * (bankConfig.maxReward - bankConfig.minReward + 1)) + bankConfig.minReward;
    let rewardMultiplier = 1;
    
    if (gameSuccess) {
      // Ganar el minijuego da mucho mejor recompensa
      rewardMultiplier = 1.5 + (bonusMultiplier * 0.3); // 50% base + equipment bonus
    }
    
    const finalReward = Math.floor(baseReward * rewardMultiplier);
    
    await setUserBalances(userId, balance.hand + finalReward, balance.bank);

    // Log successful bank robbery
    await logGamblingCommand(interaction.user, 'robbank', {
      amount: `${finalReward} ${moneda}`,
      result: `SUCCESS - Robbed ${bankConfig.name}`,
      additional: `Base success rate: ${Math.round(bankConfig.successRate * 100)}% | Game success: ${gameSuccess ? 'Yes' : 'No'} | Bonus multiplier: ${bonusMultiplier.toFixed(2)}x`
    });

    const successEmbed = new EmbedBuilder()
      .setTitle(`🎉 ¡Robo Exitoso! ${bankConfig.emoji}`)
      .setDescription(`**¡Has robado exitosamente el ${bankConfig.name}!**`)
      .setColor(0x2ecc71)
      .addFields(
        {
          name: '💰 Botín Obtenido',
          value: `${finalReward.toLocaleString()} ${moneda}`,
          inline: true
        },
        {
          name: '🎮 Rendimiento',
          value: gameSuccess ? `🌟 Minijuego: ¡Perfecto!\n📈 Recompensa: +${Math.round((rewardMultiplier - 1) * 100)}%` : '⚡ Minijuego: Fallido\n� Recompensa básica',
          inline: true
        },
        {
          name: '📊 Nuevo Balance',
          value: `${(balance.hand + finalReward).toLocaleString()} ${moneda}`,
          inline: true
        }
      )
      .setFooter({ text: 'Recuerda: los robos de banco tienen cooldown de 2 horas' })
      .setTimestamp();

    await interaction.followUp({ embeds: [successEmbed], components: [] });

  } else {
    // Robo fallido con penalizaciones configurables por banco
    const adjustedPenalty = bankConfig.failPenalty || robbankConfig.failPenalty; // Usar config del banco o global
    const penalty = Math.floor(balance.hand * adjustedPenalty);
    
    // Tiempo de cárcel configurable por banco
    const baseJailTime = bankConfig.jailTime || robbankConfig.jailTime; // Usar config del banco o global
    const finalJailTime = Math.round(baseJailTime * (1 - jailTimeReduction));
    const jailEnd = Date.now() + finalJailTime;
    
    await setUserBalances(userId, balance.hand - penalty, balance.bank);
    
    // Log failed bank robbery
    await logGamblingCommand(interaction.user, 'robbank', {
      amount: `${penalty} ${moneda}`,
      result: `FAILED - Caught by police`,
      additional: `Base success rate: ${Math.round(bankConfig.successRate * 100)}% | Penalty: ${penalty} | Jail time: ${Math.round(finalJailTime / 60000)} min`
    });
    jailedUsers.set(userId, jailEnd);

    // Añadir rol de cárcel si está configurado y existe
    const jailRoleId = robbankConfig?.jailRoleId;
    if (jailRoleId && jailRoleId.trim() !== "" && interaction.guild && interaction.member) {
      try {
        // Verificar que el rol existe antes de asignarlo
        const role = await interaction.guild.roles.fetch(jailRoleId);
        if (role) {
          const member = await interaction.guild.members.fetch(userId);
          await member.roles.add(jailRoleId);
        }
      } catch (error) {
        console.log('Jail role not found - continuing without role assignment');
      }
    }

    const failEmbed = new EmbedBuilder()
      .setTitle('🚨 ¡Robo Fallido!')
      .setDescription(`**¡Has sido atrapado por la seguridad del ${bankConfig.name}!**\n\nLa seguridad de alta tecnología te detectó y la policía te arrestó inmediatamente.`)
      .setColor(0xe74c3c)
      .addFields(
        {
          name: '💸 Penalización',
          value: `${penalty.toLocaleString()} ${moneda} (-${Math.round((bankConfig.failPenalty || robbankConfig.failPenalty) * 100)}%)`,
          inline: true
        },
        {
          name: '🔒 Tiempo en Cárcel',
          value: `${Math.ceil(finalJailTime / 60000)} minutos${jailTimeReduction > 0 ? ' (Reducido)' : ''}`,
          inline: true
        },
        {
          name: '⚠️ Nivel de Seguridad',
          value: `Dificultad ${bankConfig.difficulty}/4\n${getDifficultyDescription(bankConfig.difficulty)}`,
          inline: true
        },
        {
          name: '📊 Balance Restante',
          value: `${(balance.hand - penalty).toLocaleString()} ${moneda}`,
          inline: true
        }
      )
      .setFooter({ text: 'La próxima vez planifica mejor tu escape...' })
      .setTimestamp();

    await interaction.followUp({ embeds: [failEmbed], components: [] });
  }
}

// 🔓 LOCKPICKING MINIGAME - Forzar cerraduras de seguridad
async function playLockpickingGame(interaction, difficulty, equipmentBonus = 0, timeMultiplier = 1) {
  // Ajustar dificultad por banco: Local=2, Regional=3, Nacional=4, Central=5
  const numPins = Math.min(2 + difficulty, 5);
  const baseTimeLimit = Math.max(60, 120 - (difficulty * 10)); // Más tiempo generoso: 60-120 segundos
  const timeLimit = Math.round(baseTimeLimit * timeMultiplier); // Aplicar multiplicador de tiempo
  
  const sequence = [];
  for (let i = 0; i < numPins; i++) {
    sequence.push(Math.floor(Math.random() * 3)); // Solo 3 opciones para simplificar
  }

  // Mostrar cerradura
  const lockEmbed = new EmbedBuilder()
    .setTitle('🔓 Forzando Cerradura')
    .setDescription(`**Escucha atentamente el mecanismo...**\n\n� Cerradura de ${numPins} pines\n⏰ Tiempo: ${timeLimit} segundos\n🎧 *Cada pin hace un sonido diferente cuando se coloca correctamente*\n\n**Secuencia a seguir:**`)
    .setColor(0x8b4513);

  // Mostrar la secuencia visual por 3 segundos
  const sequenceText = sequence.map((pin, i) => `Pin ${i+1}: ${['🔊 BAJO', '🔉 MEDIO', '🔈 ALTO'][pin]}`).join('\n');
  
  await interaction.webhook.send({
    embeds: [lockEmbed.setDescription(`**Memoriza la secuencia de sonidos:**\n\n${sequenceText}\n\n*La secuencia se ocultará en 3 segundos...*`)],
    components: []
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Crear botones simplificados
  const pinRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('sound_0')
        .setLabel('🔊 SONIDO BAJO')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('sound_1')
        .setLabel('🔉 SONIDO MEDIO')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('sound_2')
        .setLabel('🔈 SONIDO ALTO')
        .setStyle(ButtonStyle.Danger)
    );

  const lockMessage = await interaction.webhook.send({ 
    embeds: [lockEmbed.setDescription(`**¡Ahora reproduce la secuencia!**\n\nPin actual: **1 de ${numPins}**\n⏰ Tiempo restante: ${timeLimit}s\n\n*Presiona el sonido correcto para cada pin*`)], 
    components: [pinRow] 
  });

  let currentPin = 0;
  const startTime = Date.now();

  try {
    const collector = lockMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: timeLimit * 1000,
      filter: inter => inter.user.id === interaction.user.id && inter.customId.startsWith('sound_')
    });

    return new Promise((resolve) => {
      collector.on('collect', async (buttonInteraction) => {
        const selectedSound = parseInt(buttonInteraction.customId.split('_')[1]);
        
        if (selectedSound === sequence[currentPin]) {
          currentPin++;
          
          if (currentPin >= numPins) {
            // ¡Cerradura abierta!
            const timeBonus = Math.max(0, 1 - ((Date.now() - startTime) / (timeLimit * 1000)));
            await buttonInteraction.update({
              embeds: [new EmbedBuilder()
                .setTitle('🎉 ¡CERRADURA ABIERTA!')
                .setDescription(`¡Perfecta secuencia de sonidos!\n\n✅ Todos los pines en posición\n🎯 Tiempo: ${Math.round((Date.now() - startTime) / 1000)}s\n🏆 ¡Acceso conseguido!`)
                .setColor(0x27ae60)],
              components: []
            });
            collector.stop('success');
            resolve({ success: true, bonus: 1 + (timeBonus * 0.5) + equipmentBonus });
          } else {
            // Pin correcto, continuar
            const progress = '🟢'.repeat(currentPin) + '⚪'.repeat(numPins - currentPin);
            await buttonInteraction.update({
              embeds: [lockEmbed.setDescription(`**¡Pin correcto!**\n\nPin actual: **${currentPin + 1} de ${numPins}**\n${progress}\n⏰ Tiempo: ${Math.max(0, Math.round((timeLimit * 1000 - (Date.now() - startTime)) / 1000))}s\n\n*Continúa con el siguiente pin...*`)],
              components: [pinRow]
            });
          }
        } else {
          // Pin incorrecto
          await buttonInteraction.update({
            embeds: [new EmbedBuilder()
              .setTitle('❌ ¡CERRADURA BLOQUEADA!')
              .setDescription(`Sonido incorrecto en el pin ${currentPin + 1}\n\n🔧 Secuencia esperada: ${['BAJO', 'MEDIO', 'ALTO'][sequence[currentPin]]}\n💥 Ganzúa rota - cerradura bloqueada`)
              .setColor(0xe74c3c)],
            components: []
          });
          collector.stop('failed');
          resolve({ success: false, bonus: 0 });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          resolve({ success: false, bonus: 0 });
        }
      });
    });

  } catch (error) {
    return { success: false, bonus: 0 };
  }
}

// 💻 HACKING MINIGAME - Hackear sistema de seguridad
async function playHackingGame(interaction, difficulty, equipmentBonus = 0, timeMultiplier = 1) {
  // Progresivo por banco: Local=1 etapa, Regional=2, Nacional=3, Central=4
  const totalStages = Math.min(1 + difficulty, 4);
  const baseTimePerStage = difficulty <= 1 ? 60 : difficulty <= 2 ? 45 : 30; // Más tiempo generoso
  const timePerStage = Math.round(baseTimePerStage * timeMultiplier); // Aplicar multiplicador de tiempo
  
  const hackingChallenges = [
    { 
      name: 'Firewall', 
      pattern: ['🟢', '🔴', '🟢'], 
      description: 'Encuentra el patrón de acceso',
      hint: 'Verde-Rojo-Verde' 
    },
    { 
      name: 'Encryption', 
      pattern: ['🔵', '🔵', '🟡'], 
      description: 'Descifra la clave de encriptación',
      hint: 'Azul-Azul-Amarillo'
    },
    { 
      name: 'Database', 
      pattern: ['🟡', '🟢', '🔴'], 
      description: 'Secuencia de acceso a la base de datos',
      hint: 'Amarillo-Verde-Rojo'
    },
    { 
      name: 'Root Access', 
      pattern: ['🔴', '🟡', '🔵', '🟢'], 
      description: 'Código maestro de administrador',
      hint: 'Rojo-Amarillo-Azul-Verde'
    }
  ];

  let completedStages = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < totalStages; i++) {
      const challenge = hackingChallenges[i];
      
      const hackEmbed = new EmbedBuilder()
        .setTitle('💻 Hackeando Sistema de Seguridad')
        .setDescription(`**Etapa ${i + 1}/${totalStages}: ${challenge.name}**\n\n🎯 ${challenge.description}\n⏰ Tiempo: ${timePerStage} segundos\n\n**Patrón detectado:** ${challenge.pattern.join(' → ')}\n\n*Reproduce la secuencia exacta:*`)
        .setColor(0x00ff41);

      // Crear botones de colores
      const colorButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('color_🟢')
            .setLabel('🟢 VERDE')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('color_🔴')
            .setLabel('🔴 ROJO')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('color_🔵')
            .setLabel('🔵 AZUL')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('color_🟡')
            .setLabel('🟡 AMARILLO')
            .setStyle(ButtonStyle.Secondary)
        );

      const hackMessage = await interaction.webhook.send({ embeds: [hackEmbed], components: [colorButtons] });

      const stageSuccess = await new Promise((resolve) => {
        let currentStep = 0;
        const userSequence = [];

        const collector = hackMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: timePerStage * 1000,
          filter: inter => inter.user.id === interaction.user.id && inter.customId.startsWith('color_')
        });

        collector.on('collect', async (buttonInteraction) => {
          const selectedColor = buttonInteraction.customId.split('_')[1];
          userSequence.push(selectedColor);
          
          if (selectedColor === challenge.pattern[currentStep]) {
            currentStep++;
            
            if (currentStep >= challenge.pattern.length) {
              // Secuencia completa y correcta
              await buttonInteraction.update({
                embeds: [new EmbedBuilder()
                  .setTitle(`✅ ${challenge.name} HACKEADO`)
                  .setDescription(`¡Secuencia perfecta!\n\n🎯 Patrón: ${challenge.pattern.join(' → ')}\n✅ Tu entrada: ${userSequence.join(' → ')}\n🚪 Acceso concedido`)
                  .setColor(0x27ae60)],
                components: []
              });
              collector.stop('success');
              resolve(true);
            } else {
              // Paso correcto, continuar
              const progress = '✅'.repeat(currentStep) + '⭕'.repeat(challenge.pattern.length - currentStep);
              await buttonInteraction.update({
                embeds: [hackEmbed.setDescription(`**Paso ${currentStep}/${challenge.pattern.length} ✅**\n\n${progress}\n\nPróximo color: **${challenge.pattern[currentStep]}**\n⏰ Tiempo: ${Math.max(0, Math.round((timePerStage * 1000 - (Date.now() - hackMessage.createdTimestamp)) / 1000))}s`)],
                components: [colorButtons]
              });
            }
          } else {
            // Color incorrecto
            await buttonInteraction.update({
              embeds: [new EmbedBuilder()
                .setTitle(`❌ HACK DETECTADO`)
                .setDescription(`Error en la secuencia\n\n🎯 Esperado: **${challenge.pattern[currentStep]}**\n❌ Recibido: **${selectedColor}**\n🚨 Sistema de seguridad activado`)
                .setColor(0xe74c3c)],
              components: []
            });
            collector.stop('failed');
            resolve(false);
          }
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            resolve(false);
          }
        });
      });

      if (!stageSuccess) {
        break;
      }

      completedStages++;
      
      // Pausa antes de la siguiente etapa
      if (i < totalStages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const successRate = completedStages / totalStages;
    const timeBonus = Math.max(0, 1 - ((Date.now() - startTime) / (timePerStage * 1000 * totalStages)));
    
    // Éxito si completas todas las etapas
    const success = successRate >= 1.0;
    const totalBonus = success ? (1 + (timeBonus * 0.5) + equipmentBonus) : 0;
    
    return { 
      success: success, 
      bonus: totalBonus 
    };

  } catch (error) {
    return { success: false, bonus: 0 };
  }
}

// 🥷 STEALTH MINIGAME - Evitar cámaras y guardias
async function playStealthGame(interaction, difficulty, equipmentBonus = 0, timeMultiplier = 1) {
  // Progresivo por banco: Local=3 zonas, Regional=4, Nacional=5, Central=6
  const totalZones = Math.min(3 + difficulty, 6);
  const maxDetection = difficulty <= 1 ? 2 : difficulty <= 2 ? 3 : 4; // Más tolerancia para bancos fáciles
  
  const stealthZones = [
    { name: 'Entrada Principal', safe: '🚶‍♂️ Caminar Normal', risky: '🏃‍♂️ Correr Rápido' },
    { name: 'Pasillo de Cámaras', safe: '🕳️ Por las Sombras', risky: '💡 Por la Luz' },
    { name: 'Sala de Guardias', safe: '⏰ Esperar Turno', risky: '🎯 Actuar Ahora' },
    { name: 'Detector de Movimiento', safe: '🐌 Muy Lento', risky: '⚡ Movimiento Normal' },
    { name: 'Cámaras Térmicas', safe: '🧊 Ruta Fría', risky: '🔥 Ruta Directa' },
    { name: 'Bóveda Final', safe: '🔇 En Silencio', risky: '📢 Con Prisa' }
  ];

  let currentZone = 0;
  let detectionLevel = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < totalZones; i++) {
      const zone = stealthZones[i];
      
      // Indicador de peligro visual
      const dangerMeter = '🟢'.repeat(Math.max(0, maxDetection - detectionLevel)) + 
                         '🟡'.repeat(Math.min(detectionLevel, maxDetection));
      
      const stealthEmbed = new EmbedBuilder()
        .setTitle(`🥷 Misión Sigilo - Zona ${i + 1}/${totalZones}`)
        .setDescription(`**📍 ${zone.name}**\n\n🚨 Medidor de Alerta: ${dangerMeter}\n⚠️ Detección: ${detectionLevel}/${maxDetection}\n\n**¿Cómo proceder?**\n🟢 Opción Segura: menos riesgo, más tiempo\n🟡 Opción Arriesgada: más riesgo, menos tiempo`)
        .setColor(detectionLevel === 0 ? 0x2ecc71 : detectionLevel < maxDetection - 1 ? 0xf39c12 : 0xe74c3c);

      const choiceRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('stealth_safe')
            .setLabel(zone.safe)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('stealth_risky')
            .setLabel(zone.risky)
            .setStyle(ButtonStyle.Danger)
        );

      const stealthMessage = await interaction.webhook.send({ embeds: [stealthEmbed], components: [choiceRow] });

      const zoneResult = await new Promise((resolve) => {
        const collector = stealthMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: Math.round(60000 * timeMultiplier), // Aplicar multiplicador de tiempo - aumentado a 60 segundos
          filter: inter => inter.user.id === interaction.user.id && inter.customId.startsWith('stealth_'),
          max: 1
        });

        collector.on('collect', async (buttonInteraction) => {
          const choice = buttonInteraction.customId.split('_')[1];
          let success = false;
          let message = '';
          let detectionIncrease = 0;

          if (choice === 'safe') {
            // Opción segura: alta probabilidad de éxito, bajo riesgo
            const successChance = 0.8 + (equipmentBonus * 0.1);
            success = Math.random() < successChance;
            message = success ? 
              '✅ Estrategia perfecta - pasas desapercibido' : 
              '⚠️ Un pequeño error, pero sigues oculto';
            detectionIncrease = success ? 0 : 1;
          } else {
            // Opción arriesgada: menor probabilidad, mayor riesgo/recompensa
            const successChance = 0.5 + (equipmentBonus * 0.15);
            success = Math.random() < successChance;
            message = success ? 
              '🎯 ¡Increíble! Riesgo calculado que funcionó' : 
              '🚨 ¡Te detectaron! Aumenta la alerta considerablemente';
            detectionIncrease = success ? 0 : 2;
          }

          detectionLevel += detectionIncrease;

          if (detectionLevel >= maxDetection) {
            await buttonInteraction.update({
              embeds: [new EmbedBuilder()
                .setTitle('🚨 ¡MISIÓN DE SIGILO FALLIDA!')
                .setDescription(`Has sido detectado demasiadas veces\n\n🔴 Alerta máxima alcanzada\n🚔 Los guardias te han capturado\n📍 Zona fallida: **${zone.name}**`)
                .setColor(0xe74c3c)],
              components: []
            });
            return resolve({ success: false, completed: false });
          }

          const newDangerMeter = '🟢'.repeat(Math.max(0, maxDetection - detectionLevel)) + 
                                '🟡'.repeat(Math.min(detectionLevel, maxDetection));

          await buttonInteraction.update({
            embeds: [new EmbedBuilder()
              .setTitle(success ? `✅ ${zone.name} - SUPERADA` : `⚠️ ${zone.name} - DETECTADO`)
              .setDescription(`${message}\n\n� Nuevo nivel: ${newDangerMeter}\n⚠️ Detección: ${detectionLevel}/${maxDetection}\n\n${i < totalZones - 1 ? '➡️ Avanzando a la siguiente zona...' : '🏆 ¡Infiltración completa!'}`)
              .setColor(success ? 0x27ae60 : 0xf39c12)],
            components: []
          });

          resolve({ success: true, completed: true });
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            resolve({ success: false, completed: false });
          }
        });
      });

      if (!zoneResult.completed || detectionLevel >= maxDetection) {
        break;
      }

      currentZone++;
      
      // Pausa entre zonas
      if (i < totalZones - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const successRate = currentZone / totalZones;
    const stealthBonus = Math.max(0, 1 - (detectionLevel / maxDetection));
    
    // Éxito si completaste todas las zonas sin ser capturado
    const success = (currentZone >= totalZones) && (detectionLevel < maxDetection);
    const totalBonus = success ? (1 + (stealthBonus * 0.4) + equipmentBonus) : 0;
    
    return { 
      success: success, 
      bonus: totalBonus
    };

  } catch (error) {
    return { success: false, bonus: 0 };
  }
}

// 🔢 DECODE MINIGAME - Descifrar códigos de acceso
async function playDecodeGame(interaction, difficulty, equipmentBonus = 0, timeMultiplier = 1) {
  // Progresivo por banco: Local=2 códigos simples, Regional=3, Nacional=4, Central=5
  const totalCodes = Math.min(2 + difficulty, 5);
  const baseTimePerCode = difficulty <= 1 ? 90 : difficulty <= 2 ? 75 : 60; // Más tiempo para bancos fáciles
  const timePerCode = Math.round(baseTimePerCode * timeMultiplier); // Aplicar multiplicador de tiempo
  
  const simpleChallenges = [
    { 
      name: 'Código Numérico', 
      type: 'number',
      words: ['1234', '5678', '9876', '4321'],
      description: 'Secuencia numérica simple'
    },
    { 
      name: 'Código Reverso', 
      type: 'reverse',
      words: ['OPEN', 'BANK', 'SAFE', 'CASH'],
      description: 'Palabra escrita al revés'
    },
    { 
      name: 'Código César', 
      type: 'caesar',
      words: ['GOLD', 'KEYS', 'LOCK', 'DOOR'],
      description: 'Cada letra movida 1 posición'
    },
    { 
      name: 'Código Binario', 
      type: 'binary',
      words: ['A', 'B', 'C', 'D'],
      description: '8 bits por letra'
    },
    { 
      name: 'Código Hexadecimal', 
      type: 'hex',
      words: ['F', 'E', 'D', 'C'],
      description: 'Código en base 16'
    }
  ];

  let correctCodes = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < totalCodes; i++) {
      const challenge = simpleChallenges[i];
      const originalWord = challenge.words[Math.floor(Math.random() * challenge.words.length)];
      let encodedWord = '';
      let hint = '';

      // Generar código según tipo y dificultad
      switch (challenge.type) {
        case 'number':
          encodedWord = originalWord;
          hint = 'Es exactamente lo que ves - números simples';
          break;

        case 'reverse':
          encodedWord = originalWord.split('').reverse().join('');
          hint = 'Lee la palabra al revés';
          break;

        case 'caesar':
          encodedWord = originalWord.split('').map(char => 
            String.fromCharCode(((char.charCodeAt(0) - 65 + 1) % 26) + 65)
          ).join('');
          hint = 'Cada letra retrocede 1 posición (A→Z, B→A, C→B...)';
          break;

        case 'binary':
          encodedWord = originalWord.charCodeAt(0).toString(2).padStart(8, '0');
          hint = 'Convierte de binario a letra ASCII';
          break;

        case 'hex':
          encodedWord = originalWord.charCodeAt(0).toString(16).toUpperCase();
          hint = 'Convierte de hexadecimal a letra ASCII';
          break;
      }

      const decodeEmbed = new EmbedBuilder()
        .setTitle('🔢 Descifrando Código de Acceso')
        .setDescription(`**Código ${i + 1}/${totalCodes}: ${challenge.name}**\n\n🔒 **Código cifrado:**\n\`\`\`${encodedWord}\`\`\`\n\n💡 **Pista:** ${hint}\n⏰ Tiempo: ${timePerCode} segundos`)
        .setColor(0x9b59b6);

      // Crear opciones simplificadas
      const options = [originalWord];
      
      // Agregar opciones incorrectas según el tipo
      const wrongOptions = [];
      if (challenge.type === 'number') {
        wrongOptions.push('0000', '1111', '2222');
      } else if (challenge.type === 'reverse') {
        wrongOptions.push('NEPO', 'KNAS', 'EFSA');
      } else {
        wrongOptions.push('XXXX', 'ZZZZ', 'YYYY');
      }
      
      options.push(...wrongOptions.slice(0, 3));
      options.sort(() => Math.random() - 0.5);

      const optionButtons = new ActionRowBuilder()
        .addComponents(
          ...options.slice(0, 4).map((option, index) =>
            new ButtonBuilder()
              .setCustomId(`decode_${option}`)
              .setLabel(`${index + 1}. ${option}`)
              .setStyle(ButtonStyle.Primary)
          )
        );

      const decodeMessage = await interaction.webhook.send({ embeds: [decodeEmbed], components: [optionButtons] });

      const codeSuccess = await new Promise((resolve) => {
        const collector = decodeMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: timePerCode * 1000,
          filter: inter => inter.user.id === interaction.user.id && inter.customId.startsWith('decode_'),
          max: 1
        });

        collector.on('collect', async (buttonInteraction) => {
          const answer = buttonInteraction.customId.split('_')[1];
          const isCorrect = answer === originalWord;

          await buttonInteraction.update({
            embeds: [new EmbedBuilder()
              .setTitle(isCorrect ? '✅ CÓDIGO DESCIFRADO' : '❌ CÓDIGO INCORRECTO')
              .setDescription(`**${challenge.name}**\n\n🔒 Cifrado: \`${encodedWord}\`\n� Respuesta: **${originalWord}**\n${isCorrect ? '🎯 ¡Sistema desbloqueado!' : '🚫 Acceso denegado - alarma activada'}`)
              .setColor(isCorrect ? 0x27ae60 : 0xe74c3c)],
            components: []
          });

          resolve(isCorrect);
        });

        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            resolve(false);
          }
        });
      });

      if (codeSuccess) {
        correctCodes++;
      } else {
        // Si falla un código, pierde el juego inmediatamente
        break;
      }

      // Pausa antes del siguiente código
      if (i < totalCodes - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    const successRate = correctCodes / totalCodes;
    const timeBonus = Math.max(0, 1 - ((Date.now() - startTime) / (timePerCode * 1000 * totalCodes)));
    
    // Éxito solo si descifras TODOS los códigos
    const success = correctCodes >= totalCodes;
    const totalBonus = success ? (1 + (timeBonus * 0.3) + equipmentBonus) : 0;
    
    return { 
      success: success, 
      bonus: totalBonus
    };

  } catch (error) {
    return { success: false, bonus: 0 };
  }
}