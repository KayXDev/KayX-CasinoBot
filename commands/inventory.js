import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { 
  getUserBalances, 
  addUserIfNotExists, 
  getUserInventory, 
  getActiveEffects,
  removeItemFromInventory,
  activateEffect,
  markItemAsUsed,
  hasActiveEffect,
  setUserBalances,
  resetUserCooldowns,
  setGuaranteedWin,
  getUserBankCapacity,
  markItemAsUsedById,
  removeItemFromInventoryById
} from '../db.js';
import { getUserHeistEquipment, getUserHeistConsumables } from '../util/heist/heistItems.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('View your inventory and active effects');

export async function execute(interaction, config) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  const shopConfig = config?.shop?.categories || {};
  
  await addUserIfNotExists(userId);
  const userBalances = await getUserBalances(userId);
  const inventory = await getUserInventory(userId);
  const activeEffects = await getActiveEffects(userId);
  const heistEquipment = await getUserHeistEquipment(userId);
  const heistConsumables = await getUserHeistConsumables(userId);

  if (inventory.length === 0 && activeEffects.length === 0 && heistEquipment.length === 0 && Object.keys(heistConsumables).length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setTitle('🎒 Empty Inventory')
      .setDescription(`**Your inventory is currently empty, ${interaction.user.username}!**\n\n🎰 *Time to start your collection*`)
      .setColor(0x95a5a6)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage('https://i.imgur.com/hMwxvcd.png');

    emptyEmbed.addFields({
      name: '💰 Current Balance',
      value: `\`\`\`💵 Hand: ${userBalances.hand.toLocaleString()} ${moneda}\n🏦 Bank: ${userBalances.bank.toLocaleString()} ${moneda}\n💎 Total: ${(userBalances.hand + userBalances.bank).toLocaleString()} ${moneda}\`\`\``,
      inline: false
    });

    emptyEmbed.addFields({
      name: '🛒 Get Started',
      value: '```🏪 Use /shop to browse premium items\n🎮 Play casino games to earn money\n⚡ Buy multipliers to boost earnings\n🏦 Purchase bank expansions```',
      inline: false
    });

    emptyEmbed.addFields({
      name: '💡 Recommended Items',
      value: '```🏦 Bank Expansion I - Increase storage\n⭐ Lucky Charm - Earnings multiplier\n🛡️ Bodyguard - Robbery protection\n✨ Reset Token - Clear cooldowns```',
      inline: false
    });

    emptyEmbed.setFooter({ 
      text: 'Casino Inventory • Start your collection today!',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    return interaction.reply({
      embeds: [emptyEmbed]
    });
  }

  // Crear embed y botones usando funciones auxiliares con paginación
  const currentPage = 0; // Comenzar en la página 0
  const inventoryEmbed = await createInventoryEmbed(interaction.user, inventory, activeEffects, userBalances, moneda, shopConfig, currentPage, heistEquipment, heistConsumables);
  const components = createInventoryButtons(inventory, shopConfig, currentPage);

  // Log gambling command
  await logGamblingCommand(interaction.user, 'inventory', {
    total_items: inventory.length,
    active_effects: activeEffects.length,
    heist_equipment: heistEquipment.length,
    heist_consumables: heistConsumables.length
  });

  const response = await interaction.reply({
    embeds: [inventoryEmbed],
    components: components
  });

  if (components.length > 0) {
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 180000 // 3 minutos
    });

    let currentPage = 0; // Track current page
    
    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.customId.startsWith('use_')) {
        const dbId = componentInteraction.customId.substring(4); // ID único de la base de datos
        
        // Usar el item directamente desde el inventario usando el ID único
        await useItemFromInventoryById(componentInteraction, dbId, config, shopConfig);
        
        // Refrescar el inventario después de usar el item manteniendo la página actual
        setTimeout(async () => {
          await refreshInventoryDisplay(response, userId, interaction.user, moneda, shopConfig, currentPage);
        }, 1000);
      } 
      else if (componentInteraction.customId.startsWith('delete_')) {
        const dbId = componentInteraction.customId.substring(7); // ID único de la base de datos
        
        try {
          // Obtener información del item antes de eliminarlo
          const inventory = await getUserInventory(userId);
          const inventoryItem = inventory.find(item => item.id == dbId);
          const itemName = inventoryItem ? findItemInConfig(inventoryItem.item_id, shopConfig)?.name || inventoryItem.item_id : 'Unknown Item';
          
          // Eliminar el item del inventario por su ID único
          await removeItemFromInventoryById(dbId);
          
          await componentInteraction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Item Deleted')
                .setDescription(`**${itemName}** has been removed from your inventory.`)
                .setColor(0xe74c3c)
            ],
            flags: 64
          });
          
          // Refrescar el inventario manteniendo la página actual
          setTimeout(async () => {
            await refreshInventoryDisplay(response, userId, interaction.user, moneda, shopConfig, currentPage);
          }, 1000);
          
        } catch (error) {
          console.error('Error deleting item:', error);
          await componentInteraction.reply({
            content: 'Error deleting item. Please try again.',
            flags: 64
          });
        }
      }
      else if (componentInteraction.customId === 'inventory_prev') {
        if (currentPage > 0) {
          currentPage--;
          await updateInventoryPage(componentInteraction, response, userId, interaction.user, moneda, shopConfig, currentPage);
        } else {
          await componentInteraction.reply({
            content: '⚠️ You are already on the first page!',
            flags: 64
          });
        }
      }
      else if (componentInteraction.customId === 'inventory_next') {
        const updatedInventory = await getUserInventory(userId);
        const ITEMS_PER_PAGE = 5;
        const maxPage = Math.max(0, Math.ceil(updatedInventory.length / ITEMS_PER_PAGE) - 1);
        
        if (currentPage < maxPage) {
          currentPage++;
          await updateInventoryPage(componentInteraction, response, userId, interaction.user, moneda, shopConfig, currentPage);
        } else {
          await componentInteraction.reply({
            content: '⚠️ You are already on the last page!',
            flags: 64
          });
        }
      }
    });

    collector.on('end', () => {
      const disabledComponents = components.map(row => {
        const disabledButtons = row.components.map(button => 
          ButtonBuilder.from(button).setDisabled(true)
        );
        return ActionRowBuilder.from(row).setComponents(disabledButtons);
      });
      
      interaction.editReply({ components: disabledComponents }).catch(() => {});
    });
  }
}

function findItemInConfig(itemId, shopConfig) {
  for (const category of Object.values(shopConfig)) {
    if (category.items && category.items[itemId]) {
      return category.items[itemId];
    }
  }
  return null;
}

function getEffectDisplayName(effectType) {
  const effectNames = {
    'coin_multiplier': 'Coin Multiplier',
    'exp_multiplier': 'Experience Multiplier',
    'rob_protection': 'Robbery Protection',
    'anti_rob': 'Anti-Robbery Shield',
    'theft_insurance': 'Theft Insurance',
    'bank_capacity': 'Bank Capacity',
    'vip_discount': 'VIP Discount',
    'custom_currency': 'Custom Currency',
    'name_style': 'Name Style'
  };
  return effectNames[effectType] || effectType;
}

function formatEffectValue(effectType, value) {
  if (effectType.includes('multiplier')) {
    return `${value}x`;
  } else if (effectType.includes('protection') || effectType.includes('insurance')) {
    return `${(value * 100)}%`;
  } else if (effectType.includes('discount')) {
    return `${((1 - value) * 100)}% off`;
  }
  return value.toString();
}

async function createInventoryEmbed(user, inventory, activeEffects, userBalances, moneda, shopConfig, currentPage = 0, heistEquipment = [], heistConsumables = {}) {
  const inventoryEmbed = new EmbedBuilder()
    .setTitle(`🎒 ${user.username}'s Casino Inventory`)
    .setDescription(`**Welcome to Your Personal Collection!**\n\n🎰 *Manage your premium casino items and active effects*`)
    .setColor(0x9b59b6)
    .setThumbnail(user.displayAvatarURL())
    .setImage('https://i.imgur.com/hMwxvcd.png');

  // Balance section mejorado
  inventoryEmbed.addFields({
    name: '💰 Current Balance',
    value: `\`\`\`💵 Hand: ${userBalances.hand.toLocaleString()} ${moneda}\n🏦 Bank: ${userBalances.bank.toLocaleString()} ${moneda}\n💎 Total: ${(userBalances.hand + userBalances.bank).toLocaleString()} ${moneda}\`\`\``,
    inline: false
  });

  // Combinar todos los items para paginación unificada
  const ITEMS_PER_PAGE = 5;
  const allItems = [...inventory]; // Todos los items juntos
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const itemsOnPage = allItems.slice(startIndex, endIndex);

  if (itemsOnPage.length > 0) {
    let itemsText = '';
    itemsOnPage.forEach((item, index) => {
      const itemConfig = findItemInConfig(item.item_id, shopConfig);
      const itemName = itemConfig?.name || item.item_id;
      
      // Emoji por tipo de item
      let itemEmoji = '';
      if (item.item_id.includes('bank') || item.item_id.includes('vault')) {
        itemEmoji = '🏦';
      } else if (item.item_id.includes('lucky') || item.item_id.includes('golden') || item.item_id.includes('fortune')) {
        itemEmoji = '⭐';
      } else if (item.item_id.includes('bodyguard') || item.item_id.includes('insurance')) {
        itemEmoji = '🛡️';
      } else {
        itemEmoji = '✨';
      }
      
      // Determinar status basado en si está usado o no
      const status = item.used_at ? 'PERMANENTLY INSTALLED' : 'READY TO USE';
      const statusEmoji = item.used_at ? '✅' : '🎯';
      const dateLabel = item.used_at ? 'Installed' : 'Acquired';
      const dateValue = item.used_at ? new Date(item.used_at).toLocaleDateString() : new Date(item.purchased_at).toLocaleDateString();
      
      itemsText += `╔══════════════════════════════════════╗\n`;
      itemsText += `║ ${itemEmoji} **${itemName}**\n`;
      itemsText += `║ ${statusEmoji} Status: \`${status}\`\n`;
      itemsText += `║ 📅 ${dateLabel}: ${dateValue}\n`;
      itemsText += `╚══════════════════════════════════════╝`;
      
      if (index < itemsOnPage.length - 1) {
        itemsText += '\n';
      }
    });

    // Título con información de página
    const fieldTitle = allItems.length > ITEMS_PER_PAGE 
      ? `🎒 Your Items (Page ${currentPage + 1}/${totalPages})` 
      : '🎒 Your Items';

    inventoryEmbed.addFields({
      name: fieldTitle,
      value: itemsText,
      inline: false
    });
  }

  // Ya no necesitamos sección separada de items instalados - todo está unificado arriba

  // Agregar efectos activos con diseño mejorado
  if (activeEffects.length > 0) {
    let effectsText = '';
    activeEffects.forEach((effect, index) => {
      const timeLeft = effect.end_time ? Math.ceil((new Date(effect.end_time) - new Date()) / 1000 / 60) : 'Permanent';
      const effectName = getEffectDisplayName(effect.effect_type);
      const effectValue = formatEffectValue(effect.effect_type, effect.effect_value);
      
      // Emoji por tipo de efecto
      let effectEmoji = '';
      if (effect.effect_type.includes('multiplier')) {
        effectEmoji = '⚡';
      } else if (effect.effect_type.includes('protection')) {
        effectEmoji = '🛡️';
      } else if (effect.effect_type.includes('insurance')) {
        effectEmoji = '💼';
      } else {
        effectEmoji = '✨';
      }
      
      effectsText += `╔══════════════════════════════════════╗\n`;
      effectsText += `║ ${effectEmoji} **${effectName}**\n`;
      effectsText += `║ 📊 Value: \`${effectValue}\`\n`;
      effectsText += `║ ⏰ Duration: \`${timeLeft !== 'Permanent' ? `${timeLeft} minutes remaining` : 'PERMANENT EFFECT'}\`\n`;
      effectsText += `╚══════════════════════════════════════╝`;
      
      if (index < activeEffects.length - 1) {
        effectsText += '\n';
      }
    });

    inventoryEmbed.addFields({
      name: '⚡ Active Effects & Boosts',
      value: effectsText,
      inline: false
    });
  }

  // Sección de Heist Equipment
  if (heistEquipment.length > 0) {
    let equipmentText = '';
    heistEquipment.forEach((equipmentItem, index) => {
      const item = equipmentItem.item_type || equipmentItem;
      const expiresAt = equipmentItem.expires_at;
      
      let equipmentName = '';
      let equipmentBonus = '';
      switch (item) {
        case 'lockpick_kit':
          equipmentName = '🔧 Professional Lockpick Kit';
          equipmentBonus = '+15% lockpicking success';
          break;
        case 'hacking_laptop':
          equipmentName = '💻 Advanced Hacking Laptop';
          equipmentBonus = '+20% hacking success';
          break;
        case 'stealth_suit':
          equipmentName = '🥷 Stealth Suit';
          equipmentBonus = '+25% stealth success';
          break;
        case 'decoder_device':
          equipmentName = '🔢 Military Decoder';
          equipmentBonus = '+30% decode success';
          break;
        case 'master_thief_kit':
          equipmentName = '⭐ Master Thief Complete Kit';
          equipmentBonus = '+10% all minigames';
          break;
        default:
          equipmentName = `🔧 ${item}`;
          equipmentBonus = 'Unknown effect';
      }
      
      // Calcular tiempo restante
      let timeText = '';
      if (expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        const minutesLeft = Math.ceil((expires - now) / (1000 * 60));
        
        if (minutesLeft > 0) {
          timeText = ` ⏰ ${minutesLeft}min left`;
        } else {
          timeText = ` ⏰ Expired`;
        }
      }
      
      equipmentText += `${equipmentName}${timeText}\n└ ${equipmentBonus}\n`;
      
      if (index < heistEquipment.length - 1) {
        equipmentText += '\n';
      }
    });

    inventoryEmbed.addFields({
      name: '🔧 Heist Equipment (1 Hour Duration)',
      value: equipmentText,
      inline: false
    });
  }

  // Sección de Heist Consumables
  const consumableEntries = Object.entries(heistConsumables);
  if (consumableEntries.length > 0) {
    let consumablesText = '';
    consumableEntries.forEach(([item, itemData], index) => {
      const quantity = itemData.quantity;
      const expiresAt = itemData.expires_at;
      
      let consumableName = '';
      let consumableEffect = '';
      switch (item) {
        case 'adrenaline_shot':
          consumableName = '💊 Adrenaline Shot';
          consumableEffect = '+50% time limit for next minigame';
          break;
        case 'focus_pills':
          consumableName = '🧠 Focus Enhancement Pills';
          consumableEffect = 'Reduce difficulty by 1 level';
          break;
        case 'intel_report':
          consumableName = '📋 Inside Intel Report';
          consumableEffect = 'Reveal security level before heist';
          break;
        case 'getaway_car':
          consumableName = '🚗 High-Speed Getaway Car';
          consumableEffect = 'Reduce jail time by 50%';
          break;
        case 'fake_id':
          consumableName = '🆔 Fake Identity Papers';
          consumableEffect = 'Skip robbery cooldown once';
          break;
        default:
          consumableName = `💊 ${item}`;
          consumableEffect = 'Unknown effect';
      }
      
      // Calcular tiempo restante
      let timeText = '';
      if (expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        const minutesLeft = Math.ceil((expires - now) / (1000 * 60));
        
        if (minutesLeft > 0) {
          timeText = ` ⏰ ${minutesLeft}min left`;
        } else {
          timeText = ` ⏰ Expired`;
        }
      }
      
      consumablesText += `${consumableName} (x${quantity})${timeText}\n└ ${consumableEffect}\n`;
      
      if (index < consumableEntries.length - 1) {
        consumablesText += '\n';
      }
    });

    inventoryEmbed.addFields({
      name: '💊 Heist Consumables (1 Hour Duration)',
      value: consumablesText,
      inline: false
    });
  }

  // Información adicional del inventario
  const totalItems = inventory.length + heistEquipment.length + consumableEntries.length;
  const availableItems = inventory.filter(item => !item.used_at).length;
  const installedItems = inventory.filter(item => item.used_at).length;
  const activeEffectsCount = activeEffects.length;

  inventoryEmbed.addFields({
    name: '📊 Inventory Statistics',
    value: `\`\`\`📦 Total Items: ${totalItems}\n🎯 Available: ${availableItems}\n✅ Installed: ${installedItems}\n⚡ Active Effects: ${activeEffectsCount}\`\`\``,
    inline: true
  });

  inventoryEmbed.addFields({
    name: '💡 Quick Actions',
    value: '```🛒 /shop - Buy more items\n⚡ /effects - View all effects\n🏦 /balance - Check funds```',
    inline: true
  });

  inventoryEmbed.setFooter({ 
    text: `Casino Inventory • ${totalItems} items total • Last updated`,
    iconURL: user.displayAvatarURL()
  })
  .setTimestamp();

  return inventoryEmbed;
}

function createInventoryButtons(inventory, shopConfig, currentPage = 0) {
  const ITEMS_PER_PAGE = 5;
  const useButtons = [];
  const deleteButtons = [];
  
  // Ahora consideramos TODOS los items para la paginación, pero solo los no usados para botones
  const allItems = [...inventory]; // Para la paginación
  const usableItems = inventory.filter(item => {
    const itemConfig = findItemInConfig(item.item_id, shopConfig);
    return itemConfig && 
           (itemConfig.type === 'temporary' || itemConfig.type === 'consumable' || itemConfig.type === 'permanent') && 
           item.quantity > 0 &&
           !item.used_at; // Solo items que NO han sido usados para botones
  });

  // Calcular items en la página actual (de todos los items)
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const itemsOnPage = allItems.slice(startIndex, endIndex);

  // Crear botones solo para items usables en la página actual
  const usableItemsOnPage = itemsOnPage.filter(item => {
    const itemConfig = findItemInConfig(item.item_id, shopConfig);
    return itemConfig && 
           (itemConfig.type === 'temporary' || itemConfig.type === 'consumable' || itemConfig.type === 'permanent') && 
           item.quantity > 0 &&
           !item.used_at;
  });

  if (usableItemsOnPage.length > 0) {
    usableItemsOnPage.forEach(item => {
      const itemConfig = findItemInConfig(item.item_id, shopConfig);
      const itemName = itemConfig.name.length > 15 ? itemConfig.name.substring(0, 15) + '...' : itemConfig.name;
      
      useButtons.push(
        new ButtonBuilder()
          .setCustomId(`use_${item.id}`) // Usar el ID único de la base de datos
          .setLabel(`Use ${itemName}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎯')
      );
      
      deleteButtons.push(
        new ButtonBuilder()
          .setCustomId(`delete_${item.id}`) // Usar el ID único de la base de datos
          .setLabel(`Del ${itemName}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    });
  }

  const components = [];
  
  // Primera fila: botones de uso (máximo 5 por fila)
  if (useButtons.length > 0) {
    components.push(new ActionRowBuilder().addComponents(useButtons));
  }
  
  // Segunda fila: botones de eliminar (máximo 5 por fila)
  if (deleteButtons.length > 0) {
    components.push(new ActionRowBuilder().addComponents(deleteButtons));
  }

  // Tercera fila: botones de navegación de página (basados en TODOS los items)
  if (allItems.length > ITEMS_PER_PAGE) {
    const navigationButtons = [];
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    
    // Botón Previous
    navigationButtons.push(
      new ButtonBuilder()
        .setCustomId('inventory_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0)
    );
    
    // Indicador de página actual
    navigationButtons.push(
      new ButtonBuilder()
        .setCustomId('page_indicator')
        .setLabel(`📄 ${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    
    // Botón Next
    navigationButtons.push(
      new ButtonBuilder()
        .setCustomId('inventory_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1)
    );
    
    components.push(new ActionRowBuilder().addComponents(navigationButtons));
  }

  return components;
}

async function updateInventoryPage(componentInteraction, response, userId, user, moneda, shopConfig, currentPage) {
  try {
    const updatedInventory = await getUserInventory(userId);
    const updatedActiveEffects = await getActiveEffects(userId);
    const updatedBalances = await getUserBalances(userId);
    
    // Obtener heist items actualizados
    const updatedHeistEquipment = await getUserHeistEquipment(userId);
    const updatedHeistConsumables = await getUserHeistConsumables(userId);
    
    // Recrear el embed para la nueva página
    const updatedEmbed = await createInventoryEmbed(
      user, 
      updatedInventory, 
      updatedActiveEffects, 
      updatedBalances, 
      moneda, 
      shopConfig,
      currentPage,
      updatedHeistEquipment,
      updatedHeistConsumables
    );
    
    // Recrear botones para la nueva página
    const updatedButtons = createInventoryButtons(updatedInventory, shopConfig, currentPage);
    
    // Actualizar el mensaje usando componentInteraction
    await componentInteraction.update({
      embeds: [updatedEmbed],
      components: updatedButtons
    });
    
  } catch (error) {
    console.error('Error updating inventory page:', error);
    await componentInteraction.reply({
      content: 'Error updating page. Please try again.',
      flags: 64
    });
  }
}

async function refreshInventoryDisplay(response, userId, user, moneda, shopConfig, currentPage = 0) {
  try {
    const updatedInventory = await getUserInventory(userId);
    const updatedActiveEffects = await getActiveEffects(userId);
    const updatedBalances = await getUserBalances(userId);
    
    // Asegurarse de que la página actual es válida (basado en TODOS los items)
    const ITEMS_PER_PAGE = 5;
    const maxPage = Math.max(0, Math.ceil(updatedInventory.length / ITEMS_PER_PAGE) - 1);
    const validPage = Math.min(currentPage, maxPage);
    
    // Obtener heist items actualizados
    const updatedHeistEquipment = await getUserHeistEquipment(userId);
    const updatedHeistConsumables = await getUserHeistConsumables(userId);
    
    // Recrear el embed actualizado
    const updatedEmbed = await createInventoryEmbed(
      user, 
      updatedInventory, 
      updatedActiveEffects, 
      updatedBalances, 
      moneda, 
      shopConfig,
      validPage,
      updatedHeistEquipment,
      updatedHeistConsumables
    );
    
    // Recrear botones actualizados
    const updatedButtons = createInventoryButtons(updatedInventory, shopConfig, validPage);
    
    // Actualizar el mensaje original
    await response.edit({
      embeds: [updatedEmbed],
      components: updatedButtons
    });
    
  } catch (error) {
    console.error('Error refreshing inventory:', error);
  }
}

async function useItemFromInventoryById(interaction, dbId, config, shopConfig) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  
  await addUserIfNotExists(userId);
  
  // Obtener el item específico por su ID único de la base de datos
  const inventory = await getUserInventory(userId);
  const inventoryItem = inventory.find(item => item.id == dbId && item.quantity > 0 && !item.used_at);
  
  if (!inventoryItem) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Item Not Found')
          .setDescription(`This item is no longer available in your inventory!`)
          .setColor(0xe74c3c)
      ],
      flags: 64
    });
  }

  // Buscar la configuración del item usando el item_id
  const itemConfig = findItemInConfig(inventoryItem.item_id, shopConfig);
  if (!itemConfig) {
    return interaction.reply({
      content: 'Item configuration not found!',
      flags: 64
    });
  }

  try {
    let resultMessage = '';
    
    // Procesar diferentes tipos de items
    switch (itemConfig.type) {
      case 'temporary':
        if (itemConfig.effect && itemConfig.duration) {
          await activateEffect(
            userId, 
            inventoryItem.item_id, 
            itemConfig.effect.type, 
            itemConfig.effect.value, 
            itemConfig.duration
          );
          
          const durationText = formatDuration(itemConfig.duration);
          resultMessage = `**${itemConfig.name}** activated!\n\n**Effect**: ${getEffectDisplayName(itemConfig.effect.type)} (${formatEffectValue(itemConfig.effect.type, itemConfig.effect.value)})\n**Duration**: ${durationText}`;
        }
        break;

      case 'consumable':
        resultMessage = await processConsumableItem(userId, inventoryItem.item_id, itemConfig, config);
        break;

      case 'permanent':
        resultMessage = await processPermanentItem(userId, inventoryItem.item_id, itemConfig, config);
        break;

      default:
        throw new Error('Unknown item type');
    }

    // Manejar diferentes tipos de items después del uso
    if (itemConfig.type === 'permanent') {
      // Los items permanentes se marcan como usados por su ID único
      await markItemAsUsedById(dbId);
    } else {
      // Temporary y consumable items se eliminan completamente por su ID único
      await removeItemFromInventoryById(dbId);
    }

    // Responder con éxito
    const successEmbed = new EmbedBuilder()
      .setTitle('Item Used Successfully!')
      .setDescription(resultMessage || `**${itemConfig.name}** has been used successfully!`)
      .setColor(0x27ae60)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Check your inventory to see updated effects' });

    await interaction.reply({
      embeds: [successEmbed],
      flags: 64
    });

  } catch (error) {
    console.error('Use item error:', error);
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Error Using Item')
          .setDescription('There was an error using the item. Please try again.')
          .setColor(0xe74c3c)
      ],
      flags: 64
    });
  }
}

async function useItemFromInventory(interaction, itemId, config, shopConfig) {
  const userId = interaction.user.id;
  const moneda = config?.casino?.moneda || '💰';
  
  await addUserIfNotExists(userId);
  
  // Verificar que el usuario tiene el item
  const inventory = await getUserInventory(userId);
  const inventoryItem = inventory.find(item => item.item_id === itemId && item.quantity > 0);
  
  if (!inventoryItem) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Item Not Found')
          .setDescription(`You don't have **${itemId}** in your inventory!`)
          .setColor(0xe74c3c)
      ],
      flags: 64
    });
  }

  // Buscar la configuración del item
  const itemConfig = findItemInConfig(itemId, shopConfig);
  if (!itemConfig) {
    return interaction.reply({
      content: 'Item configuration not found!',
      flags: 64
    });
  }

  // Ya no necesitamos verificar used_at porque los items se eliminan completamente

  // Verificar si ya tiene un efecto similar activo (para temporales)
  if (itemConfig.type === 'temporary' && itemConfig.effect) {
    const hasEffect = await hasActiveEffect(userId, itemConfig.effect.type);
    if (hasEffect) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Effect Already Active')
            .setDescription(`You already have a **${getEffectDisplayName(itemConfig.effect.type)}** effect active!\n\nWait for it to expire before using another.`)
            .setColor(0xe67e22)
        ],
        flags: 64
      });
    }
  }

  try {
    let resultMessage = '';
    
    // Procesar diferentes tipos de items
    switch (itemConfig.type) {
      case 'temporary':
        if (itemConfig.effect && itemConfig.duration) {
          await activateEffect(
            userId, 
            itemId, 
            itemConfig.effect.type, 
            itemConfig.effect.value, 
            itemConfig.duration
          );
          
          const durationText = formatDuration(itemConfig.duration);
          resultMessage = `**${itemConfig.name}** activated!\n\n**Effect**: ${getEffectDisplayName(itemConfig.effect.type)} (${formatEffectValue(itemConfig.effect.type, itemConfig.effect.value)})\n**Duration**: ${durationText}`;
        }
        break;

      case 'consumable':
        resultMessage = await processConsumableItem(userId, itemId, itemConfig, config);
        break;

      case 'permanent':
        resultMessage = await processPermanentItem(userId, itemId, itemConfig, config);
        break;

      default:
        throw new Error('Unknown item type');
    }

    // Manejar diferentes tipos de items después del uso
    if (itemConfig.type === 'permanent') {
      // Los items permanentes se marcan como usados pero NO se eliminan
      // Esto permite que las extensiones bancarias se mantengan para calcular capacidad
      await markItemAsUsed(userId, itemId);
    } else {
      // Temporary y consumable items se eliminan completamente
      await removeItemFromInventory(userId, itemId, 1);
    }

    // Responder con éxito
    const successEmbed = new EmbedBuilder()
      .setTitle('Item Used Successfully!')
      .setDescription(resultMessage || `**${itemConfig.name}** has been used successfully!`)
      .setColor(0x27ae60)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Check your inventory to see updated effects' });

    await interaction.reply({
      embeds: [successEmbed],
      flags: 64
    });

  } catch (error) {
    console.error('Use item error:', error);
    
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Error Using Item')
          .setDescription('There was an error using the item. Please try again.')
          .setColor(0xe74c3c)
      ],
      flags: 64
    });
  }
}

async function processConsumableItem(userId, itemId, itemConfig, config) {
  const moneda = config?.casino?.moneda || '💰';
  
  switch (itemId) {
    case 'reset_token':
      await resetUserCooldowns(userId);
      return `**${itemConfig.name}** used!\n\nAll command cooldowns have been reset! You can now use any command immediately.`;
      
    case 'lucky_ticket':
      await setGuaranteedWin(userId);
      return `**${itemConfig.name}** used!\n\nYour next gambling bet is **guaranteed to win**! Use any game command to claim your guaranteed victory.`;
      
    default:
      return `**${itemConfig.name}** used successfully!`;
  }
}

async function processPermanentItem(userId, itemId, itemConfig, config) {
  const moneda = config?.casino?.moneda || '💰';
  
  switch (itemId) {
    case 'bank_upgrade_1':
      return `**${itemConfig.name}** installed!\n\n✅ Your bank capacity has been permanently increased by **25,000 ${moneda}**!\n\n💡 Check \`/balance\` to see your new capacity limit.`;
      
    case 'bank_upgrade_2':
      return `**${itemConfig.name}** installed!\n\n✅ Your bank capacity has been permanently increased by **100,000 ${moneda}**!\n\n💡 Check \`/balance\` to see your new capacity limit.`;
      
    case 'vault':
      return `**${itemConfig.name}** installed!\n\n✅ Your bank capacity has been permanently increased by **500,000 ${moneda}**!\n\n💡 Check \`/balance\` to see your new capacity limit.`;
      
    default:
      return `**${itemConfig.name}** applied successfully!`;
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