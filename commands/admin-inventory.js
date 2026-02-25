import { SlashCommandBuilder } from '@discordjs/builders';
import {  EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder , MessageFlags } from 'discord.js';
import { getUserHeistEquipment, getUserHeistConsumables } from '../util/heist/heistItems.js';
import { getUserInventoryGrouped, getAllUsersWithAnyItems } from '../db.js';
import { logAdminCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
    .setName('admin-inventory')
    .setDescription('Ver el inventario completo de cualquier usuario (Solo administradores)')
    .setDefaultMemberPermissions('0');

export async function execute(interaction, config) {
    // Verificar permisos de administrador
    if (!interaction.member.permissions.has('Administrator')) {
        return await interaction.reply({
            content: 'No tienes permisos para usar este comando.',
            flags: MessageFlags.Ephemeral
        });
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

        // Crear opciones de usuarios
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
            .setTitle('📦 Seleccionar Usuario para Ver Inventario')
            .setDescription(
                '**Usuarios con items:**\n\n' +
                usersWithItems.slice(0, 10).map(user => 
                    `<@${user.user_id}> - Regulares: ${user.regular_items ? '✅' : '❌'} | Equipment: ${user.equipment_items ? '✅' : '❌'} | Consumibles: ${user.consumable_items ? '✅' : '❌'}`
                ).join('\n') +
                '\n\n**Selecciona un usuario del menú desplegable:**'
            )
            .setColor(0x4CAF50)
            .setFooter({ text: 'Se muestran usuarios con cualquier tipo de item' });

        // Crear select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('admin_select_user_inventory')
            .setPlaceholder('👤 Selecciona un usuario...')
            .addOptions(userOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });

        // Manejar selección
        const collector = response.createMessageComponentCollector({
            time: 300000 // 5 minutos
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return await i.reply({
                    content: '❌ Solo el administrador que ejecutó el comando puede usar esto.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const targetUserId = i.values[0];

            try {
                // Obtener todos los inventarios del usuario
                const regularInventory = await getUserInventoryGrouped(targetUserId);
                const heistEquipment = await getUserHeistEquipment(targetUserId);
                const heistConsumables = await getUserHeistConsumables(targetUserId);

                // Crear embed principal
                const inventoryEmbed = new EmbedBuilder()
                    .setTitle(`📦 Inventario de <@${targetUserId}>`)
                    .setColor(0x4CAF50)
                    .setTimestamp();

                let description = '';
                let hasItems = false;

                // Inventario regular
                if (regularInventory && Object.keys(regularInventory).length > 0) {
                    hasItems = true;
                    description += '**🎒 Inventario Regular:**\n';
                    Object.entries(regularInventory).forEach(([item, quantity]) => {
                        description += `• ${item}: **${quantity}**\n`;
                    });
                    description += '\n';
                }

                // Equipment de heist
                if (heistEquipment && heistEquipment.length > 0) {
                    hasItems = true;
                    description += '**🔧 Equipment de Heist:**\n';
                    heistEquipment.forEach(equipment => {
                        const itemName = config?.heist_tools?.[equipment.item_type]?.name || equipment.item_type;
                        const expiration = equipment.expires_at 
                            ? `Expira: ${new Date(equipment.expires_at).toLocaleString('es-ES')}`
                            : 'Sin expiración';
                        description += `• **${itemName}** - ${expiration}\n`;
                    });
                    description += '\n';
                }

                // Consumibles de heist
                if (heistConsumables && Object.keys(heistConsumables).length > 0) {
                    hasItems = true;
                    description += '**💊 Consumibles de Heist:**\n';
                    Object.entries(heistConsumables).forEach(([itemType, data]) => {
                        if (data.quantity > 0) {
                            const itemName = config?.heist_consumables?.[itemType]?.name || itemType;
                            const expiration = data.expires_at 
                                ? `Expira: ${new Date(data.expires_at).toLocaleString('es-ES')}`
                                : 'Sin expiración';
                            description += `• **${itemName}** x${data.quantity} - ${expiration}\n`;
                        }
                    });
                }

                if (!hasItems) {
                    description = '❌ Este usuario no tiene items en su inventario.';
                    inventoryEmbed.setColor(0xFFB74D);
                }

                inventoryEmbed.setDescription(description);
                
                // Agregar información adicional
                inventoryEmbed.addFields({
                    name: '📝 Información',
                    value: `**Usuario:** <@${targetUserId}>\n**Consultado por:** <@${interaction.user.id}>`,
                    inline: false
                });

                // Log admin inventory check
                await logAdminCommand(interaction.user, 'admin-inventory', {
                    target: `<@${targetUserId}>`,
                    result: hasItems ? 'Inventario consultado' : 'Usuario sin items',
                    additional: `Items encontrados: ${hasItems ? 'Sí' : 'No'}`
                });

                await i.update({
                    embeds: [inventoryEmbed],
                    components: []
                });

            } catch (error) {
                console.error('Error obteniendo inventario:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription(`No se pudo obtener el inventario de <@${targetUserId}>:\n\`\`\`${error.message}\`\`\``)
                    .setColor(0xFF5722);

                await i.update({
                    embeds: [errorEmbed],
                    components: []
                });
            }
        });

        collector.on('end', () => {
            // Collector terminado
        });

    } catch (error) {
        console.error('Error en admin-inventory:', error);
        return await interaction.reply({
            content: `❌ Error al obtener usuarios: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}