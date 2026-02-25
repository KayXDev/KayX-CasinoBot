import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getUserBalances, addUserIfNotExists, setUserBalances, addItemToInventory, getUserInventory } from '../db.js';
import { purchaseHeistEquipment, purchaseHeistConsumable } from '../util/heist/heistItems.js';
import { 
  canPurchaseItem, 
  getItemCooldownTimeLeft, 
  setPurchaseCooldown, 
  getItemCooldownConfig, 
  formatTimeRemaining 
} from '../util/database/shopDb.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Browse and purchase items from the casino shop');

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  const shopConfig = config?.shop?.categories || {};
  
  await addUserIfNotExists(userId);
  const userBalances = await getUserBalances(userId);

  if (Object.keys(shopConfig).length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Shop Unavailable')
          .setDescription('The shop is currently empty. Please check back later!')
          .setColor(0xe74c3c)
      ]
    });
  }

  const mainEmbed = new EmbedBuilder()
    .setTitle('🏪 Casino Shop | Premium Items')
    .setDescription(`**Welcome to the Casino Shop, ${interaction.user.username}!**\n\n🎰 *Your one-stop destination for premium casino items*`)
    .setColor(0xf39c12)
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .setImage('https://i.imgur.com/hMwxvcd.png');

  // Balance section más atractivo
  mainEmbed.addFields({
    name: '💰 Your Current Balance',
    value: `\`\`\`💵 Hand: ${userBalances.hand.toLocaleString()} ${moneda}\n🏦 Bank: ${userBalances.bank.toLocaleString()} ${moneda}\n💎 Total: ${(userBalances.hand + userBalances.bank).toLocaleString()} ${moneda}\`\`\``,
    inline: false
  });

  // Categories más llamativas
  let categoriesText = '';
  Object.entries(shopConfig).forEach(([key, category]) => {
    const itemCount = Object.keys(category.items || {}).length;
    categoriesText += `${category.emoji} **${category.name}**\n`;
    categoriesText += `   └ \`${itemCount} items available\`\n\n`;
  });

  mainEmbed.addFields({
    name: '🛒 Shop Categories',
    value: categoriesText,
    inline: false
  });

  mainEmbed.addFields({
    name: '📋 Instructions',
    value: '```• Use the dropdown menu below to select a category\n• Browse items and click purchase buttons\n• Items are added to your inventory automatically```',
    inline: false
  });

  mainEmbed.setFooter({ 
    text: `${Object.keys(shopConfig).length} categories • Premium quality items`,
    iconURL: interaction.user.displayAvatarURL()
  });
  
  mainEmbed.setTimestamp();

  const categoryOptions = Object.entries(shopConfig).map(([key, category]) => ({
    label: category.name.replace(/🏦|⚡|🛡️|✨|🎭/g, '').trim(),
    description: `Browse ${category.name.toLowerCase().replace(/🏦|⚡|🛡️|✨|🎭/g, '').trim()}`,
    value: key,
    emoji: category.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('shop_category')
    .setPlaceholder('Select a category to browse')
    .addOptions(categoryOptions);

  const actionRow = new ActionRowBuilder().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: [actionRow]
  });

  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    time: 180000  // Reducido a 3 minutos para evitar timeouts
  });

  collector.on('collect', async (componentInteraction) => {
    try {
      if (componentInteraction.isStringSelectMenu()) {
        const categoryId = componentInteraction.values[0];
        const category = shopConfig[categoryId];
        
        if (!category) {
          return componentInteraction.update({
            content: 'Category not found!',
            embeds: [],
            components: []
          });
        }

        // Obtener balances actualizados antes de mostrar la categoría
        const updatedBalances = await getUserBalances(userId);
        await showCategory(componentInteraction, category, categoryId, updatedBalances, moneda, config, userId);
      } 
      else if (componentInteraction.isButton()) {
        if (componentInteraction.customId === 'back_main') {
          // Obtener balances actualizados para la vista principal
          const updatedBalances = await getUserBalances(userId);
          
          // Crear el mismo embed completo que en el comando /shop
          const updatedMainEmbed = new EmbedBuilder()
            .setTitle('🏪 Casino Shop | Premium Items')
            .setDescription(`**Welcome to the Casino Shop, ${componentInteraction.user.username}!**\n\n🎰 *Your one-stop destination for premium casino items*`)
            .setColor(0xf39c12)
            .setThumbnail('https://i.imgur.com/0jM0J5h.png')
            .setImage('https://i.imgur.com/hMwxvcd.png');

          // Balance section más atractivo
          updatedMainEmbed.addFields({
            name: '💰 Your Current Balance',
            value: `\`\`\`💵 Hand: ${updatedBalances.hand.toLocaleString()} ${moneda}\n🏦 Bank: ${updatedBalances.bank.toLocaleString()} ${moneda}\n💎 Total: ${(updatedBalances.hand + updatedBalances.bank).toLocaleString()} ${moneda}\`\`\``,
            inline: false
          });

          // Categories más llamativas
          let categoriesText = '';
          Object.entries(shopConfig).forEach(([key, category]) => {
            const itemCount = Object.keys(category.items || {}).length;
            categoriesText += `${category.emoji} **${category.name}**\n`;
            categoriesText += `   └ \`${itemCount} items available\`\n\n`;
          });

          updatedMainEmbed.addFields({
            name: '🛒 Shop Categories',
            value: categoriesText,
            inline: false
          });

          updatedMainEmbed.addFields({
            name: '📋 Instructions',
            value: '```• Use the dropdown menu below to select a category\n• Browse items and click purchase buttons\n• Items are added to your inventory automatically```',
            inline: false
          });

          updatedMainEmbed.setFooter({ 
            text: `${Object.keys(shopConfig).length} categories • Premium quality items`,
            iconURL: componentInteraction.user.displayAvatarURL()
          });
          
          updatedMainEmbed.setTimestamp();

          await componentInteraction.update({
            embeds: [updatedMainEmbed],
            components: [actionRow]
          });
        } 
        else if (componentInteraction.customId.startsWith('buy_')) {
          // Parse customId more carefully to handle categories with underscores
          const customId = componentInteraction.customId;
          const buyPrefix = 'buy_';
          const idPart = customId.substring(buyPrefix.length);
          
          // Find the correct category by checking all available categories
          let categoryId = null;
          let itemId = null;
          
          for (const catId of Object.keys(shopConfig)) {
            if (idPart.startsWith(catId + '_')) {
              categoryId = catId;
              itemId = idPart.substring(catId.length + 1);
              break;
            }
          }
          

          
          await handlePurchase(componentInteraction, categoryId, itemId, config, moneda);
        }
      }
    } catch (error) {
      // Si hay un error, intentar responder si aún no se ha respondido
      try {
        if (!componentInteraction.replied && !componentInteraction.deferred) {
          await componentInteraction.reply({
            content: '❌ An error occurred. Please try the shop command again.',
            flags: MessageFlags.Ephemeral
          });
        } else if (componentInteraction.deferred && !componentInteraction.replied) {
          await componentInteraction.editReply({
            content: '❌ An error occurred. Please try the shop command again.',
            embeds: [],
            components: []
          });
        }
      } catch (replyError) {
        console.error('Could not send error reply:', replyError);
      }
    }
  });

  collector.on('end', () => {
    try {
      const disabledMenu = selectMenu.setDisabled(true);
      const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
      interaction.editReply({ components: [disabledRow] }).catch((error) => {
        console.error('Error disabling shop menu:', error);
      });
    } catch (error) {
      console.error('Error in shop collector end:', error);
    }
  });
}

async function showCategory(interaction, category, categoryId, userBalances, moneda, config, userId) {
  const items = Object.entries(category.items || {});
  
  if (items.length === 0) {
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle(category.name)
          .setDescription('This category is currently empty!')
          .setColor(0xe74c3c)
      ]
    });
  }

  const categoryEmbed = new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.name} | Casino Shop`)
    .setDescription(`**💰 Your Balance**\n\`\`\`💵 Hand: ${userBalances.hand.toLocaleString()} ${moneda}\n🏦 Bank: ${userBalances.bank.toLocaleString()} ${moneda}\`\`\``)
    .setColor(0x3498db)
    .setThumbnail('https://i.imgur.com/0jM0J5h.png');

  // Crear una descripción más atractiva para cada item
  let itemsDescription = '';
  
  // Obtener información de cooldowns para todos los items
  const cooldownInfoPromises = items.map(async ([itemId]) => {
    const canPurchaseNow = await canPurchaseItem(userId, itemId);
    const timeLeft = canPurchaseNow ? 0 : await getItemCooldownTimeLeft(userId, itemId);
    const config = getItemCooldownConfig(itemId);
    return { canPurchaseNow, timeLeft, config };
  });
  
  const cooldownInfos = await Promise.all(cooldownInfoPromises);
  
  items.forEach(([itemId, item], index) => {
    const canAfford = userBalances.hand >= item.price;
    const cooldownInfo = cooldownInfos[index];
    
    let statusIcon = '';
    let statusText = '';
    
    if (!canAfford) {
      statusIcon = '❌';
      statusText = 'Insufficient funds';
    } else if (!cooldownInfo.canPurchaseNow) {
      statusIcon = '⏰';
      statusText = `Cooldown: ${formatTimeRemaining(cooldownInfo.timeLeft)}`;
    } else {
      statusIcon = '✅';
      statusText = 'Available';
    }
    
    // Determinar emoji por tipo
    let typeIcon = '';
    let typeText = '';
    if (item.type === 'permanent') {
      typeIcon = '🛡️';
      typeText = 'PERMANENT';
    } else if (item.type === 'temporary') {
      typeIcon = '⏰';
      typeText = `TEMPORARY (${formatDuration(item.duration)})`;
    } else {
      typeIcon = '🎯';
      typeText = 'CONSUMABLE';
    }
    
    itemsDescription += `${statusIcon} **${item.name}** - \`${item.price.toLocaleString()} ${moneda}\`\n`;
    itemsDescription += `└ ${item.description}\n`;
    itemsDescription += `└ ${typeIcon} ${typeText} • **${statusText}**\n`;
    
    if (index < items.length - 1) {
      itemsDescription += '\n';
    }
  });

  // Dividir en campos si excede el límite de 1024 caracteres
  if (itemsDescription.length <= 1024) {
    categoryEmbed.addFields({
      name: '🛒 Available Items',
      value: itemsDescription,
      inline: false
    });
  } else {
    // Dividir en múltiples campos
    const chunks = [];
    let currentChunk = '';
    const itemLines = itemsDescription.split('\n');
    
    for (const line of itemLines) {
      if ((currentChunk + line + '\n').length > 1024) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    chunks.forEach((chunk, index) => {
      categoryEmbed.addFields({
        name: index === 0 ? '🛒 Available Items' : '🛒 More Items',
        value: chunk,
        inline: false
      });
    });
  }

  // Agregar información adicional
  categoryEmbed.addFields({
    name: '💡 How to Purchase',
    value: '```• Click the buttons below to buy items\n• Green buttons = You can afford\n• Gray buttons = Insufficient funds```',
    inline: false
  });

  categoryEmbed.setFooter({ 
    text: `${items.length} items available • Select an item to purchase`,
    iconURL: 'https://i.imgur.com/hMwxvcd.png'
  });

  categoryEmbed.setTimestamp();

  const buttons = [];
  const rows = [];

  // Verificar cooldowns para todos los items de una vez
  const cooldownPromises = items.map(([itemId]) => canPurchaseItem(userId, itemId));
  const cooldownResults = await Promise.all(cooldownPromises);

  items.forEach(([itemId, item], index) => {
    const canAfford = userBalances.hand >= item.price;
    const canPurchaseNow = cooldownResults[index];
    const canBuy = canAfford && canPurchaseNow;
    
    // Emojis por tipo de item
    let itemEmoji = '';
    if (itemId.includes('bank') || itemId.includes('vault')) {
      itemEmoji = '🏦';
    } else if (itemId.includes('lucky') || itemId.includes('golden') || itemId.includes('fortune')) {
      itemEmoji = '⭐';
    } else if (itemId.includes('bodyguard') || itemId.includes('insurance')) {
      itemEmoji = '🛡️';
    } else {
      itemEmoji = '✨';
    }
    
    // Determinar el estado del botón
    let buttonLabel = '';
    let buttonStyle = ButtonStyle.Secondary;
    
    if (!canAfford) {
      buttonLabel = `❌ ${item.name} | ${item.price.toLocaleString()} ${moneda}`;
      buttonStyle = ButtonStyle.Secondary;
    } else if (!canPurchaseNow) {
      buttonLabel = `⏰ ${item.name} | ON COOLDOWN`;
      buttonStyle = ButtonStyle.Secondary;
    } else {
      buttonLabel = `💰 ${item.name} | ${item.price.toLocaleString()} ${moneda}`;
      buttonStyle = ButtonStyle.Success;
    }
    
    const button = new ButtonBuilder()
      .setCustomId(`buy_${categoryId}_${itemId}`)
      .setLabel(buttonLabel)
      .setStyle(buttonStyle)
      .setEmoji(itemEmoji)
      .setDisabled(!canBuy);

    buttons.push(button);

    if (buttons.length === 2 || index === items.length - 1) {
      rows.push(new ActionRowBuilder().addComponents([...buttons]));
      buttons.length = 0;
    }
  });

  const backButton = new ButtonBuilder()
    .setCustomId('back_main')
    .setLabel('🏪 Back to Shop Categories')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🔙');

  rows.push(new ActionRowBuilder().addComponents(backButton));

  await interaction.update({
    embeds: [categoryEmbed],
    components: rows
  });
}

async function handlePurchase(interaction, categoryId, itemId, config, moneda) {
  const userId = interaction.user.id;
  
  const item = config?.shop?.categories?.[categoryId]?.items?.[itemId];

  if (!item) {
    console.log('Item not found - Debug info:', {
      categoryId,
      itemId,
      categoryExists: !!config?.shop?.categories?.[categoryId],
      availableItems: config?.shop?.categories?.[categoryId] ? Object.keys(config?.shop?.categories?.[categoryId]?.items || {}) : 'Category not found'
    });
    return interaction.update({
      content: `Item not found! Category: ${categoryId}, Item: ${itemId}`,
      embeds: [],
      components: []
    });
  }

  // 🛒 VERIFICAR COOLDOWN DE COMPRA
  const canPurchase = await canPurchaseItem(userId, itemId);
  if (!canPurchase) {
    const timeLeft = await getItemCooldownTimeLeft(userId, itemId);
    const cooldownConfig = getItemCooldownConfig(itemId);
    
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏰ Purchase Cooldown Active')
          .setDescription(`You must wait before purchasing **${item.name}** again!\n\n` +
            `⏱️ **Time remaining**: ${formatTimeRemaining(timeLeft)}\n` +
            `📋 **Cooldown category**: ${cooldownConfig.category.replace('_', ' ').toUpperCase()}\n\n` +
            `💡 This cooldown prevents spam and maintains game balance.`)
          .addFields({
            name: '🔄 When you can purchase again',
            value: `<t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>`,
            inline: false
          })
          .setColor(0xf39c12)
          .setFooter({ text: 'Cooldowns are based on item power level' })
      ],
      components: []
    });
  }

  // Verificar duplicados solo para items temporales y consumibles
  // Los items permanentes (extensiones bancarias) se pueden stackear ilimitadamente
  if (item.type !== 'permanent') {
    const inventory = await getUserInventory(userId);
    const hasUnusedItem = inventory.some(inventoryItem => 
      inventoryItem.item_id === itemId && 
      inventoryItem.quantity > 0 && 
      !inventoryItem.used_at // Solo contar items que NO han sido usados
    );
    
    if (hasUnusedItem) {
      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('Item Already Owned')
            .setDescription(`You already own **${item.name}**!\n\nYou can only have one unused item of each type. Use it first before buying another.`)
            .setColor(0xe67e22)
        ],
        components: []
      });
    }
  }

  const userBalances = await getUserBalances(userId);

  if (userBalances.hand < item.price) {
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Insufficient Funds')
          .setDescription(`You need ${item.price.toLocaleString()} ${moneda} but only have ${userBalances.hand.toLocaleString()} ${moneda} in hand!`)
          .setColor(0xe74c3c)
      ],
      components: []
    });
  }

  try {
    const newHandBalance = userBalances.hand - item.price;
    await setUserBalances(userId, newHandBalance, userBalances.bank);
    
    // Detectar si es item de heist y usar funciones específicas
    if (categoryId === 'heist_tools' || categoryId === 'heist_consumables') {
      if (item.type === 'equipment') {
        await purchaseHeistEquipment(userId, itemId, item.price);
      } else if (item.type === 'consumable') {
        await purchaseHeistConsumable(userId, itemId, 1);
      }
    } else {
      // Items normales del casino
      await addItemToInventory(userId, itemId, 1);
    }

    // 🛒 ESTABLECER COOLDOWN DESPUÉS DE LA COMPRA
    const cooldownConfig = getItemCooldownConfig(itemId);
    await setPurchaseCooldown(userId, itemId, cooldownConfig.cooldown);
    

    
    const nextPurchaseTime = Date.now() + cooldownConfig.cooldown;
    const cooldownFormatted = formatTimeRemaining(cooldownConfig.cooldown);

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Purchase Successful!')
      .setDescription(`You have successfully purchased **${item.name}**!\n\n💡 **Tip**: Navigate back and re-enter the category to see updated prices and balances.`)
      .addFields(
        { name: '🛒 Item', value: item.name, inline: true },
        { name: '💰 Price Paid', value: `${item.price.toLocaleString()} ${moneda}`, inline: true },
        { name: '💵 Remaining Balance', value: `${newHandBalance.toLocaleString()} ${moneda}`, inline: true },
        { 
          name: '⏰ Next Purchase Available', 
          value: `<t:${Math.floor(nextPurchaseTime / 1000)}:R> (${cooldownFormatted})`, 
          inline: false 
        }
      )
      .setColor(0x27ae60)
      .setFooter({ 
        text: `Item added to your inventory! | Cooldown: ${cooldownConfig.category.replace('_', ' ')} tier` 
      });

    await interaction.update({
      embeds: [successEmbed],
      components: []
    });

    // Log gambling command
    await logGamblingCommand(interaction.user, 'shop', {
      item_purchased: item.name,
      price_paid: item.price,
      category: item.category,
      remaining_balance: newHandBalance
    });

  } catch (error) {
    console.error('Purchase error:', error);
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('Purchase Failed')
          .setDescription('There was an error processing your purchase. Please try again.')
          .setColor(0xe74c3c)
      ],
      components: []
    });
  }
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}