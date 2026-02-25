import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { addUserIfNotExists } from '../db.js';
import { getUserShopCooldowns, formatTimeRemaining, getItemCooldownConfig } from '../util/database/shopDb.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('cooldowns')
  .setDescription('View your active shop purchase cooldowns');

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  
  await addUserIfNotExists(userId);
  
  try {
    const cooldowns = await getUserShopCooldowns(userId);
    
    if (cooldowns.length === 0) {
      const noCooldownsEmbed = new EmbedBuilder()
        .setTitle('⏰ Your Shop Cooldowns')
        .setDescription('🎉 **Great news!** You don\'t have any active purchase cooldowns.\n\n💰 You can buy any item from the shop right now!')
        .addFields({
          name: '💡 How Cooldowns Work',
          value: '```• Items have different cooldown times based on their power\n• Game-breaking items: 1 week cooldown\n• Ultra rare items: 1 day cooldown\n• Premium items: 4 hours cooldown\n• Standard items: 1 hour cooldown\n• Basic items: 15 minutes cooldown```',
          inline: false
        })
        .setColor(0x27ae60)
        .setFooter({ text: 'Use /shop to browse available items!' })
        .setTimestamp();

      return interaction.reply({ embeds: [noCooldownsEmbed] });
    }

    // Organizar cooldowns por categoría
    const cooldownsByCategory = {};
    
    for (const cooldown of cooldowns) {
      const itemConfig = getItemCooldownConfig(cooldown.item_id);
      const category = itemConfig.category;
      
      if (!cooldownsByCategory[category]) {
        cooldownsByCategory[category] = [];
      }
      
      cooldownsByCategory[category].push({
        ...cooldown,
        config: itemConfig
      });
    }

    const cooldownEmbed = new EmbedBuilder()
      .setTitle('⏰ Your Active Shop Cooldowns')
      .setDescription(`You have **${cooldowns.length}** active cooldown${cooldowns.length > 1 ? 's' : ''}.\n\n*Cooldowns prevent spam and maintain game balance.*`)
      .setColor(0xf39c12)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    // Añadir campos por categoría
    const categoryNames = {
      'basic_upgrades': '🔰 Basic Items',
      'standard': '⚡ Standard Items', 
      'premium': '💎 Premium Items',
      'ultra_rare': '✨ Ultra Rare Items',
      'game_breaking': '🌟 Game Breaking Items'
    };

    for (const [category, items] of Object.entries(cooldownsByCategory)) {
      const categoryName = categoryNames[category] || `📦 ${category.replace('_', ' ')}`;
      let fieldValue = '';
      
      items.forEach((cooldown, index) => {
        const timeLeft = cooldown.expires_at.getTime() - Date.now();
        const timeFormatted = formatTimeRemaining(timeLeft);
        
        // Obtener el nombre del item desde la configuración
        const shopConfig = config?.shop?.categories || {};
        let itemName = cooldown.item_id;
        
        // Buscar el item en todas las categorías
        for (const [catId, catData] of Object.entries(shopConfig)) {
          if (catData.items && catData.items[cooldown.item_id]) {
            itemName = catData.items[cooldown.item_id].name;
            break;
          }
        }
        
        fieldValue += `🔒 **${itemName}**\n`;
        fieldValue += `└ Available <t:${Math.floor(cooldown.expires_at.getTime() / 1000)}:R> (${timeFormatted})\n`;
        
        if (index < items.length - 1) {
          fieldValue += '\n';
        }
      });
      
      cooldownEmbed.addFields({
        name: categoryName,
        value: fieldValue || 'No active cooldowns',
        inline: false
      });
    }

    // Añadir información adicional
    cooldownEmbed.addFields({
      name: '💡 Cooldown Categories',
      value: '```🔰 Basic (15min) → ⚡ Standard (1h) → 💎 Premium (4h) → ✨ Ultra Rare (24h) → 🌟 Game Breaking (1 week)```',
      inline: false
    });

    cooldownEmbed.setFooter({ 
      text: `${cooldowns.length} active cooldown${cooldowns.length > 1 ? 's' : ''} • Times are approximate`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    });

    
  // Log gambling command
  await logGamblingCommand(interaction.user, 'cooldowns', {
    action: 'executed'
  });

  await interaction.reply({ embeds: [cooldownEmbed] });
    
  } catch (error) {
    console.error('Cooldowns command error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('There was an error retrieving your cooldowns. Please try again later.')
      .setColor(0xe74c3c);

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}