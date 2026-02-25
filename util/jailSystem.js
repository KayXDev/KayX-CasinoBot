// Utilidades para el sistema de cárcel del robbank
import { isUserJailed } from '../commands/robbank.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';

/**
 * Verifica si un usuario puede ejecutar comandos económicos
 * @param {string} userId - ID del usuario
 * @param {object} interaction - Objeto de interacción de Discord
 * @returns {Promise<boolean>} - true si puede ejecutar, false si está en cárcel
 */
export async function checkJailStatus(userId, interaction, config = null) {
  const jailStatus = isUserJailed(userId, interaction.guild, config);
  
  if (jailStatus.isJailed) {
    const jailEmbed = new EmbedBuilder()
      .setTitle('🔒 Restringido - En Prisión')
      .setDescription(`No puedes usar comandos económicos mientras estás en la cárcel por intentar robar un banco.`)
      .setColor(0x95a5a6)
      .addFields({
        name: '⏰ Tiempo Restante',
        value: `${jailStatus.timeLeft} minutos`,
        inline: true
      })
      .setFooter({ text: 'Espera a cumplir tu condena para volver a usar comandos económicos' });
    
    await interaction.reply({ embeds: [jailEmbed], flags: MessageFlags.Ephemeral });
    return false;
  }
  
  return true;
}

/**
 * Lista de comandos que están bloqueados para usuarios en la cárcel
 */
export const BLOCKED_COMMANDS = [
  'balance',
  'deposit', 
  'withdraw',
  'give',
  'rob',
  'blackjack',
  'coinflip',
  'dados',
  'tragamonedas',
  'ruleta',
  'crash',
  'rasca',
  'loteria',
  'daily',
  'weekly',
  'shop'
];