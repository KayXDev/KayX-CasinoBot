import {  SlashCommandBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserBalances, setUserBalances, addUserIfNotExists, getCurrentMultiplier } from '../db.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

// Almacenar cooldowns de robo en memoria (userId -> timestamp)
const robCooldowns = new Map();

export const data = new SlashCommandBuilder()
  .setName('rob')
  .setDescription('Attempt to rob money from another user\'s hand.')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('User to rob from')
      .setRequired(true)
  );

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const moneda = config?.casino?.moneda || '💰';
  const minRobAmount = config?.rob?.minAmount ?? 10;
  const maxRobAmount = config?.rob?.maxAmount ?? 1000;
  const successRate = config?.rob?.successRate ?? 0.5; // 50% por defecto
  const cooldownTime = config?.rob?.cooldown ?? 300000; // 5 minutos por defecto

  // Verificar que no se robe a sí mismo
  if (userId === target.id) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Rob Failed')
          .setDescription('You can\'t rob yourself!')
          .setColor(0xe74c3c)
      ]
    });
  }

  // Verificar si se permite robar bots
  const allowBots = config?.rob?.allowBots ?? false;
  if (target.bot && !allowBots) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Rob Failed')
          .setDescription('Robbing bots is currently disabled!')
          .setColor(0xe74c3c)
      ]
    });
  }

  // Verificar cooldown
  const now = Date.now();
  const cooldown = config?.rob?.cooldown ?? 300000; // 5 minutos por defecto
  const lastRobTime = robCooldowns.get(userId);
  
  if (lastRobTime && (now - lastRobTime) < cooldown) {
    const timeLeft = cooldown - (now - lastRobTime);
    const minutesLeft = Math.floor(timeLeft / 60000);
    const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
    
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏱️ Rob Cooldown')
          .setDescription(`${interaction.user} must wait **${minutesLeft}m ${secondsLeft}s** before robbing again!`)
          .setColor(0xf39c12)
          .addFields(
            { name: '⏰ Time Remaining', value: `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`, inline: true },
            { name: '🔄 Available', value: `<t:${Math.floor((lastRobTime + cooldown) / 1000)}:R>`, inline: true }
          )
      ]
    });
  }

  // Añadir usuarios si no existen
  await addUserIfNotExists(userId);
  await addUserIfNotExists(target.id);

  // Obtener balances
  const robberBalances = await getUserBalances(userId);
  const victimBalances = await getUserBalances(target.id);

  // Verificar que la víctima tenga dinero en mano
  if (victimBalances.hand < minRobAmount) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Rob Failed')
          .setDescription(`${target.username} doesn't have enough money in hand to rob! (Minimum: ${minRobAmount} ${moneda})`)
          .setColor(0xe74c3c)
      ]
    });
  }

  // Verificar que el ladrón tenga algo de dinero en mano (para evitar cuentas nuevas robando)
  const minRobberAmount = config?.rob?.robberMinAmount ?? 100;
  if (robberBalances.hand < minRobberAmount) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🚫 Rob Failed')
          .setDescription(`You need at least ${minRobberAmount} ${moneda} in hand to attempt a robbery!`)
          .setColor(0xe74c3c)
      ]
    });
  }

  // Calcular cantidad máxima a robar (porcentaje del dinero en mano de la víctima)
  const maxSteal = Math.min(
    Math.floor(victimBalances.hand * (config?.rob?.maxPercentage ?? 0.2)), // 20% máximo por defecto
    maxRobAmount
  );
  const minSteal = Math.max(minRobAmount, Math.floor(maxSteal * 0.1)); // Mínimo 10% del máximo
  
  // Cantidad aleatoria a robar
  const stealAmount = Math.floor(Math.random() * (maxSteal - minSteal + 1)) + minSteal;

  // Determinar si el robo es exitoso
  const isSuccessful = Math.random() < successRate;

  if (isSuccessful) {
    // Robo exitoso - aplicar multiplicador
    const multiplier = await getCurrentMultiplier(userId);
    let finalAmount = stealAmount;
    if (multiplier > 1) {
      finalAmount = Math.floor(stealAmount * multiplier);
    }
    
    const newVictimHand = victimBalances.hand - stealAmount; // Víctima pierde cantidad original
    const newRobberHand = robberBalances.hand + finalAmount; // Ladrón gana con multiplicador

    // Actualizar balances
    await setUserBalances(target.id, newVictimHand, victimBalances.bank);
    await setUserBalances(userId, newRobberHand, robberBalances.bank);

    // Log successful robbery
    await logGamblingCommand(interaction.user, 'rob', {
      amount: `${stealAmount} ${moneda}`,
      target: target.username,
      result: `SUCCESS - Gained: +${finalAmount} ${moneda}`,
      additional: multiplier > 1 ? `${multiplier}x multiplier applied` : undefined
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle('💰 Robbery Success!')
      .setColor(0x2ecc71)
      .setDescription(`🎯 **${interaction.user.username}** successfully robbed **${finalAmount} ${moneda}** from **${target.username}**!${multiplier > 1 ? ` ⚡ **${multiplier}x Multiplier Applied!**` : ''}`)
      .addFields(
        { name: '💸 Amount Stolen', value: `${stealAmount} ${moneda}${multiplier > 1 ? ` → **${finalAmount} ${moneda}**` : ''}`, inline: true },
        { name: '🤑 Robber', value: `${interaction.user.username}`, inline: true },
        { name: '😭 Victim', value: `${target.username}`, inline: true },
        { name: '💰 Robber\'s New Hand', value: `${newRobberHand} ${moneda}`, inline: true },
        { name: '💔 Victim\'s Remaining', value: `${newVictimHand} ${moneda}`, inline: true },
        { name: '📊 Success Rate', value: `${(successRate * 100).toFixed(0)}%`, inline: true },
        { name: '⏱️ Next Rob Available', value: `<t:${Math.floor((Date.now() + cooldown) / 1000)}:R>`, inline: false }
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Crime pays... sometimes! 🔫' })
      .setTimestamp();

    // Establecer cooldown
    robCooldowns.set(userId, Date.now());
    
    await interaction.reply({ embeds: [resultEmbed] });

  } else {
    // Robo fallido - el ladrón pierde dinero como penalización
    const penalty = Math.floor(stealAmount * (config?.rob?.failPenalty ?? 0.5)); // 50% de lo que intentaba robar
    const newRobberHand = Math.max(0, robberBalances.hand - penalty);

    await setUserBalances(userId, newRobberHand, robberBalances.bank);

    // Log failed robbery
    await logGamblingCommand(interaction.user, 'rob', {
      amount: `${stealAmount} ${moneda}`,
      target: target.username,
      result: `FAILED - Lost: -${penalty} ${moneda}`,
      additional: 'Caught and penalized'
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle('🚫 Robbery Failed!')
      .setColor(0xe74c3c)
      .setDescription(`💥 **${interaction.user.username}** tried to rob **${target.username}** but got caught!`)
      .addFields(
        { name: '💸 Penalty Paid', value: `${penalty} ${moneda}`, inline: true },
        { name: '🤡 Failed Robber', value: `${interaction.user.username}`, inline: true },
        { name: '🛡️ Protected Target', value: `${target.username}`, inline: true },
        { name: '💰 Robber\'s Remaining', value: `${newRobberHand} ${moneda}`, inline: true },
        { name: '💪 Target\'s Hand (Safe)', value: `${victimBalances.hand} ${moneda}`, inline: true },
        { name: '📊 Success Rate', value: `${(successRate * 100).toFixed(0)}%`, inline: true },
        { name: '⏱️ Next Rob Available', value: `<t:${Math.floor((Date.now() + cooldown) / 1000)}:R>`, inline: false }
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Crime doesn\'t always pay! 🚨' })
      .setTimestamp();

    // Establecer cooldown
    robCooldowns.set(userId, Date.now());
    
    await interaction.reply({ embeds: [resultEmbed] });
  }
}