import { SlashCommandBuilder } from '@discordjs/builders';
import {  ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder , MessageFlags } from 'discord.js';
import { getUserHeistEquipment, getUserHeistConsumables, removeUserHeistEquipment, removeUserHeistConsumables } from '../util/heist/heistItems.js';
import { getAllUsersWithAnyItems, getUserInventoryGrouped, removeAllItemFromInventory, clearUserInventory } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
    .setName('admin-removeitems')
    .setDescription('Eliminar items específicos del inventario de usuarios (Solo administradores)')
    .setDefaultMemberPermissions('0');

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

    try {
        // Obtener todos los usuarios con cualquier tipo de items
        const usersWithItems = await getAllUsersWithAnyItems();

        if (usersWithItems.length === 0) {
            return await interaction.reply({
                content: '❌ No hay usuarios con items.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Crear opciones de usuarios para el select menu
        const userOptions = usersWithItems.slice(0, 25).map(user => {
            const regularCount = user.regular_items ? user.regular_items.split(',').length : 0;
            const equipmentCount = user.equipment_items ? user.equipment_items.split(',').length : 0;
            const consumableCount = user.consumable_items ? user.consumable_items.split(',').length : 0;
            const totalItems = regularCount + equipmentCount + consumableCount;
            
            return {
                label: `Usuario ${user.user_id}`,
                description: `Total items: ${totalItems} (Regulares: ${regularCount} | Heist: ${equipmentCount + consumableCount})`,
                value: user.user_id,
            };
        });

        // Crear embed inicial
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Seleccionar Usuario para Eliminar Items')
            .setDescription(
                '**Usuarios con items:**\n\n' +
                usersWithItems.slice(0, 10).map(user => 
                    `<@${user.user_id}> - Regulares: ${user.regular_items ? '✅' : '❌'} | Equipment: ${user.equipment_items ? '✅' : '❌'} | Consumibles: ${user.consumable_items ? '✅' : '❌'}`
                ).join('\n') +
                '\n\n**Selecciona un usuario del menú desplegable:**'
            )
            .setColor(0xff6b35)
            .setFooter({ text: 'Se muestran usuarios con cualquier tipo de item' });

        // Crear select menu para usuarios
        const userSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('admin_select_user_remove')
            .setPlaceholder('🎯 Selecciona un usuario...')
            .addOptions(userOptions);

        const userRow = new ActionRowBuilder().addComponents(userSelectMenu);

        const response = await interaction.reply({
            embeds: [embed],
            components: [userRow],
            flags: MessageFlags.Ephemeral
        });

        // Manejar selección de usuario
        const userCollector = response.createMessageComponentCollector({
            time: 300000 // 5 minutos
        });

        userCollector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({
                    content: '❌ Solo el administrador que ejecutó el comando puede usar esto.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (i.customId === 'admin_select_user_remove') {
                const targetUserId = i.values[0];
                
                try {
                    // Obtener items del usuario seleccionado
                    const regularInventory = await getUserInventoryGrouped(targetUserId);
                    const userEquipment = await getUserHeistEquipment(targetUserId);
                    const userConsumables = await getUserHeistConsumables(targetUserId);

                    // Verificar si tiene items
                    if ((!regularInventory || Object.keys(regularInventory).length === 0) &&
                        (!userEquipment || userEquipment.length === 0) && 
                        (!userConsumables || Object.keys(userConsumables).length === 0)) {
                        const noItemsEmbed = new EmbedBuilder()
                            .setTitle('❌ Sin Items')
                            .setDescription(`El usuario <@${targetUserId}> no tiene items.`)
                            .setColor(0xFFB74D);

                        return await i.update({
                            embeds: [noItemsEmbed],
                            components: []
                        });
                    }

                    // Crear lista de items disponibles para eliminar
                    const itemOptions = [];

                    // Agregar items regulares
                    if (regularInventory && Object.keys(regularInventory).length > 0) {
                        Object.entries(regularInventory).forEach(([itemId, data]) => {
                            itemOptions.push({
                                label: `🎒 ${itemId} (x${data.quantity})`,
                                description: `Item regular - Comprado: ${new Date(data.last_purchase).toLocaleDateString('es-ES')}`,
                                value: `regular_${itemId}`,
                            });
                        });
                    }

                    // Agregar equipment
                    if (userEquipment && userEquipment.length > 0) {
                        userEquipment.forEach(equipment => {
                            const itemName = config?.heist_tools?.[equipment.item_type]?.name || equipment.item_type;
                            const expirationText = equipment.expires_at 
                                ? new Date(equipment.expires_at).toLocaleString('es-ES')
                                : 'Nunca';
                            
                            itemOptions.push({
                                label: `🔧 ${itemName}`,
                                description: `Equipment - Expira: ${expirationText}`,
                                value: `equipment_${equipment.item_type}`,
                            });
                        });
                    }

                    // Agregar consumibles
                    if (userConsumables && Object.keys(userConsumables).length > 0) {
                            Object.entries(userConsumables).forEach(([itemType, data]) => {
                                if (data.quantity > 0) {
                                    const itemName = config?.heist_consumables?.[itemType]?.name || itemType;
                                    const expirationText = data.expires_at 
                                        ? new Date(data.expires_at).toLocaleString('es-ES')
                                        : 'Nunca';                                itemOptions.push({
                                    label: `💊 ${itemName} (x${data.quantity})`,
                                    description: `Consumible - Expira: ${expirationText}`,
                                    value: `consumable_${itemType}`,
                                });
                            }
                        });
                    }

                    // Agregar opciones especiales al final
                    if (regularInventory && Object.keys(regularInventory).length > 0) {
                        itemOptions.push({
                            label: '🗑️ Eliminar TODOS los Items Regulares',
                            description: 'Elimina todo el inventario regular',
                            value: 'all_regular',
                        });
                    }

                    if (userEquipment && userEquipment.length > 0) {
                        itemOptions.push({
                            label: '🗑️ Eliminar TODO el Equipment',
                            description: 'Elimina todas las herramientas de heist',
                            value: 'all_equipment',
                        });
                    }

                    if (userConsumables && Object.keys(userConsumables).length > 0) {
                        itemOptions.push({
                            label: '🗑️ Eliminar TODOS los Consumibles',
                            description: 'Elimina todos los consumibles de heist',
                            value: 'all_consumables',
                        });
                    }

                    // Limitar a 25 opciones (límite de Discord)
                    if (itemOptions.length > 25) {
                        itemOptions.splice(25);
                    }

                    // Crear embed informativo
                    const itemEmbed = new EmbedBuilder()
                        .setTitle(`🛠️ Eliminar Items de <@${targetUserId}>`)
                        .setDescription(
                            '**Selecciona el item específico que quieres eliminar:**\n\n' +
                            `**Items regulares:** ${Object.keys(regularInventory || {}).length || 0}\n` +
                            `**Equipment disponible:** ${userEquipment?.length || 0}\n` +
                            `**Consumibles disponibles:** ${Object.keys(userConsumables || {}).length || 0}\n\n` +
                            '⚠️ **Los cambios son permanentes e irreversibles**'
                        )
                        .setColor(0xff6b35)
                        .setFooter({ text: 'Selecciona un item del menú desplegable' });

                    // Crear select menu para items
                    const itemSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`admin_remove_items_${targetUserId}`)
                        .setPlaceholder('🎯 Selecciona un item para eliminar...')
                        .addOptions(itemOptions);

                    const itemRow = new ActionRowBuilder().addComponents(itemSelectMenu);

                    await i.update({
                        embeds: [itemEmbed],
                        components: [itemRow]
                    });

                } catch (error) {
                    console.error('Error obteniendo items del usuario:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription(`Error al obtener items del usuario: ${error.message}`)
                        .setColor(0xFF5722);

                    await i.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            }

            // Manejar eliminación de items
            if (i.customId.startsWith('admin_remove_items_')) {
                const targetUserId = i.customId.replace('admin_remove_items_', '');
                const selectedValue = i.values[0];
                let success = false;
                let message = '';

                try {
                    if (selectedValue === 'all_regular') {
                        await clearUserInventory(targetUserId);
                        message = `✅ **Todos los items regulares** eliminados para <@${targetUserId}>`;
                        success = true;
                        
                    } else if (selectedValue === 'all_equipment') {
                        await removeUserHeistEquipment(targetUserId);
                        message = `✅ **Todo el equipment de heist** eliminado para <@${targetUserId}>`;
                        success = true;
                        
                    } else if (selectedValue === 'all_consumables') {
                        await removeUserHeistConsumables(targetUserId);
                        message = `✅ **Todos los consumibles de heist** eliminados para <@${targetUserId}>`;
                        success = true;
                        
                    } else if (selectedValue.startsWith('regular_')) {
                        const itemId = selectedValue.replace('regular_', '');
                        await removeAllItemFromInventory(targetUserId, itemId);
                        message = `✅ **${itemId}** (Item regular) eliminado del inventario de <@${targetUserId}>`;
                        success = true;
                        
                    } else if (selectedValue.startsWith('equipment_')) {
                        const itemType = selectedValue.replace('equipment_', '');
                        await removeUserHeistEquipment(targetUserId, itemType);
                        const itemName = config?.heist_tools?.[itemType]?.name || itemType;
                        message = `✅ **${itemName}** (Equipment) eliminado del inventario de <@${targetUserId}>`;
                        success = true;
                        
                    } else if (selectedValue.startsWith('consumable_')) {
                        const itemType = selectedValue.replace('consumable_', '');
                        await removeUserHeistConsumables(targetUserId, itemType);
                        const itemName = config?.heist_consumables?.[itemType]?.name || itemType;
                        message = `✅ **${itemName}** (Consumible) eliminado del inventario de <@${targetUserId}>`;
                        success = true;
                    }

                    // Log the admin action
                    if (success) {
                        await logAdminCommand(interaction.user, 'admin-removeitems', {
                            target: `<@${targetUserId}>`,
                            result: 'Items removed',
                            additional: message
                        });
                    }

                    // Crear embed de resultado
                    const resultEmbed = new EmbedBuilder()
                        .setTitle(success ? '✅ Item Eliminado Exitosamente' : '❌ Error al Eliminar')
                        .setDescription(message)
                        .setColor(success ? 0x00ff00 : 0xff0000)
                        .setTimestamp();

                    if (success) {
                        resultEmbed.setFooter({ text: 'Acción completada por administrador' });
                    }

                    await i.update({
                        embeds: [resultEmbed],
                        components: []
                    });

                } catch (error) {
                    console.error('Error eliminando item:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('❌ Error del Sistema')
                        .setDescription(`Hubo un error técnico al eliminar el item:\n\`\`\`${error.message}\`\`\``)
                        .setColor(0xff0000)
                        .setTimestamp();

                    await i.update({
                        embeds: [errorEmbed],
                        components: []
                    });
                }
            }
        });

        userCollector.on('end', () => {
            // Collector terminado automáticamente
        });

    } catch (error) {
        console.error('Error en admin-removeitems:', error);
        return await interaction.reply({
            content: `❌ Error al obtener usuarios con items: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}