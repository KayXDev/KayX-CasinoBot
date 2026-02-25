import { EmbedBuilder } from 'discord.js';
import yaml from 'js-yaml';
import fs from 'fs';

let config;
let logChannel;
let client;

// Cargar configuración
function loadConfig() {
    try {
        const file = fs.readFileSync('./config.yml', 'utf8');
        config = yaml.load(file);
        return config;
    } catch (error) {
        console.error('Error loading config for logging:', error);
        return null;
    }
}

// Inicializar el sistema de logging
export function initLogging(discordClient) {
    client = discordClient;
    config = loadConfig();
    
    if (config?.logging?.enabled && config?.logging?.channelId) {
        // Obtener el canal de logs
        logChannel = client.channels.cache.get(config.logging.channelId);
        if (!logChannel) {
            console.warn(`⚠️  Canal de logs no encontrado: ${config.logging.channelId}`);
        } else {
            console.log(`📝 Sistema de logging selectivo iniciado en canal: ${logChannel.name}`);
        }
    }
}

// Función principal de logging
export async function logCommand(category, commandName, user, details = {}) {
    // Verificar si el logging está habilitado
    if (!config?.logging?.enabled || !logChannel) {
        return;
    }

    // Verificar si esta categoría está habilitada
    if (!config.logging.categories[category]) {
        return;
    }

    try {
        const isAdmin = category === 'admin';
        
        // Manejar user como ID o como objeto
        let userObj = user;
        if (typeof user === 'string') {
            // Si user es un ID, intentar obtener el usuario del cache
            userObj = client.users.cache.get(user);
            if (!userObj) {
                // Si no está en cache, intentar fetch del usuario
                try {
                    userObj = await client.users.fetch(user);
                } catch (fetchError) {
                    // Si no se puede obtener, crear un objeto temporal con el ID
                    userObj = { 
                        id: user, 
                        username: `User#${user.slice(-4)}`, 
                        discriminator: '0000',
                        displayAvatarURL: () => null 
                    };
                }
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(isAdmin ? 0xe74c3c : 0xf39c12) // Rojo para admin, dorado para gambling (como tus embeds)
            .setTitle(`${isAdmin ? '🛡️' : '🎰'} ${isAdmin ? 'Admin Action' : 'Casino Activity'} | Log`)
            .setDescription(`**${userObj.username}** executed \`/${commandName}\`\n\n${isAdmin ? '⚡ *Administrative command logged*' : '🎲 *Gambling activity recorded*'}`)
            .setImage('https://i.imgur.com/hMwxvcd.png')
            .setTimestamp();
        
        // Solo añadir thumbnail si displayAvatarURL existe y funciona
        if (userObj.displayAvatarURL && typeof userObj.displayAvatarURL === 'function') {
            embed.setThumbnail(userObj.displayAvatarURL({ dynamic: true }));
        }

        // Campo principal con información del usuario
        embed.addFields({
            name: '👤 User Information',
            value: `\`\`\`👤 User: ${userObj.username}#${userObj.discriminator || '0000'}\n🆔 ID: ${userObj.id}\n⏰ Time: ${new Date().toLocaleString('es-ES')}\`\`\``,
            inline: false
        });

        // Campo de detalles de la acción
        let actionDetails = `🎯 **Command:** \`${commandName}\`\n`;
        
        if (details.amount) {
            actionDetails += `💰 **Amount:** ${details.amount}\n`;
        }
        if (details.target) {
            actionDetails += `👥 **Target:** ${details.target}\n`;
        }
        if (details.result) {
            actionDetails += `📊 **Result:** ${details.result}\n`;
        }

        embed.addFields({
            name: '📋 Action Details',
            value: actionDetails,
            inline: false
        });

        // Información adicional si existe
        if (details.additional) {
            embed.addFields({
                name: 'ℹ️ Additional Information',
                value: `\`\`\`${details.additional}\`\`\``,
                inline: false
            });
        }

        // Footer consistente con tu estilo
        embed.setFooter({
            text: `Casino Bot Logger • ${isAdmin ? 'Admin Panel' : 'Gaming Activity'}`,
            iconURL: 'https://i.imgur.com/0jM0J5h.png'
        });

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error enviando log:', error);
    }
}

// Funciones específicas para cada categoría
export async function logAdminCommand(user, commandName, details = {}) {
    await logCommand('admin', commandName, user, details);
}

export async function logGamblingCommand(user, commandName, details = {}) {
    await logCommand('gambling', commandName, user, details);
}

// Función para verificar si el logging está habilitado para una categoría
export function isLoggingEnabled(category) {
    return config?.logging?.enabled && config?.logging?.categories?.[category] && logChannel;
}

// Función helper para manejar respuestas de interacciones de forma segura
export async function safeInteractionUpdate(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(options);
        } else {
            return await interaction.update(options);
        }
    } catch (error) {
        console.error('Error en safeInteractionUpdate:', error);
        // Fallback: intentar con followUp si falla todo
        try {
            return await interaction.followUp({ ...options, flags: MessageFlags.Ephemeral });
        } catch (followUpError) {
            console.error('Error en followUp fallback:', followUpError);
        }
    }
}