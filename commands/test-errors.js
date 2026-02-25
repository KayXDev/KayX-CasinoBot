import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { handleError, getErrorStats } from '../util/globalErrorHandler.js';
import fs from 'fs';
import yaml from 'js-yaml';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export default {
    data: new SlashCommandBuilder()
        .setName('test-errors')
        .setDescription('🔧 Test the global error handling system (Administrators only)')
        .setDefaultMemberPermissions('0')
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('Tipo de error a simular')
                .setRequired(true)
                .addChoices(
                    { name: '⚡ Error Leve', value: 'leve' },
                    { name: '🔥 Error Crítico', value: 'critico' },
                    { name: '💀 Error Catastrófico', value: 'catastrofico' },
                    { name: '📊 Mostrar Estadísticas', value: 'stats' }
                )
        ),

    async execute(interaction, config) {
        try {
            // Verificar que solo el owner puede usar este comando
            const ownerID = config.ownerID;
            if (interaction.user.id !== ownerID) {
              const noPermEmbed = new EmbedBuilder()
                .setTitle('❌ Access Denied')
                .setColor(0xff0000)
                .setDescription('**You do not have permission to use this command**\n\n🔒 *This command is restricted to the bot owner only*')
                .setFooter({ text: 'Casino Bot • Owner Only Command' })
                .setTimestamp();

              return interaction.reply({ embeds: [noPermEmbed], flags: 64 });
            }

            // Log gambling command
            await logGamblingCommand(interaction.user, 'test-errors', {
              action: 'executed'
            });

            const tipoError = interaction.options.getString('tipo');

            if (tipoError === 'stats') {
                // Mostrar estadísticas del sistema de errores
                const stats = getErrorStats();
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Estadísticas del Sistema de Errores')
                    .addFields(
                        { name: '⚡ Errores Totales', value: stats.total?.toString() || '0', inline: true },
                        { name: '🎮 Errores de Comandos', value: stats.commands?.toString() || '0', inline: true },
                        { name: '🔄 Errores de Interacciones', value: stats.interactions?.toString() || '0', inline: true },
                        { name: '💾 Memoria Usada', value: `${stats.memory} MB`, inline: true },
                        { name: '⏰ Tiempo Activo', value: `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`, inline: true },
                        { name: '🎯 Estado del Sistema', value: stats.systemHealth?.status || 'Activo ✅', inline: true }
                    )
                    .setColor(0x00FF00)
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], flags: 64 });
            }

            // Simular errores
            const embed = new EmbedBuilder()
                .setTitle('🔧 Prueba de Sistema de Errores')
                .setDescription(`Simulando error tipo: **${tipoError}**`)
                .setColor(0xFFAA00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 }); // 64 = ephemeral flag

            // Simular diferentes tipos de errores REALES con retraso
            setTimeout(() => {
                switch (tipoError) {
                    case 'leve':
                        try {
                            throw new Error('🟡 ERROR LEVE simulado para pruebas del sistema - No es grave');
                        } catch (error) {
                            handleError(error, {
                                command: 'test-errors',
                                userId: interaction.user.id,
                                username: interaction.user.tag,
                                severity: 'low',
                                type: 'TEST'
                            });
                        }
                        break;

                    case 'critico':
                        try {
                            // Simular un error más serio
                            const fakeObject = null;
                            fakeObject.nonExistentMethod(); // TypeError real
                        } catch (error) {
                            handleError(error, {
                                command: 'test-errors',
                                userId: interaction.user.id,
                                username: interaction.user.tag,
                                severity: 'critical',
                                type: 'TEST'
                            });
                        }
                        break;

                    case 'catastrofico':
                        try {
                            throw new Error('💀 SISTEMA COMPROMETIDO - Error catastrófico simulado para pruebas');
                        } catch (error) {
                            handleError(error, {
                                command: 'test-errors',
                                userId: interaction.user.id,
                                username: interaction.user.tag,
                                severity: 'catastrophic',
                                type: 'TEST'
                            });
                        }
                        break;
                }
            }, 1000);

        } catch (error) {
            // Este error será manejado por el sistema global
            throw error;
        }
    },
};