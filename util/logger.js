import { pool } from '../db.js';

class Logger {
    /**
     * Registra un evento en la base de datos
     * @param {Object} options - Opciones del log
     * @param {string} options.level - Nivel: 'debug', 'info', 'warn', 'error'
     * @param {string} options.category - Categoría: 'command', 'system', 'database', 'error', 'casino', 'crypto', 'admin'
     * @param {string} options.message - Mensaje descriptivo
     * @param {string} [options.command] - Nombre del comando ejecutado
     * @param {string} [options.user_id] - ID del usuario de Discord
     * @param {string} [options.username] - Nombre del usuario de Discord
     * @param {string} [options.server_id] - ID del servidor de Discord
     * @param {string} [options.server_name] - Nombre del servidor de Discord
     * @param {string} [options.channel_id] - ID del canal de Discord
     * @param {string} [options.channel_name] - Nombre del canal de Discord
     * @param {Object} [options.data] - Datos adicionales en formato JSON
     * @param {string} [options.error_stack] - Stack trace del error (si aplica)
     */
    static async log(options) {
        try {
            const {
                level = 'info',
                category = 'system',
                message,
                command = null,
                user_id = null,
                username = null,
                server_id = null,
                server_name = null,
                channel_id = null,
                channel_name = null,
                data = null,
                error_stack = null
            } = options;

            // Validar que el mensaje no esté vacío
            if (!message) {
                console.warn('Logger: Mensaje vacío, no se guardará el log');
                return;
            }

            const query = `
                INSERT INTO bot_logs 
                (level, category, command, user_id, username, server_id, server_name, channel_id, channel_name, message, data, error_stack)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                level,
                category,
                command,
                user_id,
                username,
                server_id,
                server_name,
                channel_id,
                channel_name,
                message,
                data ? JSON.stringify(data) : null,
                error_stack
            ];

            await pool.execute(query, params);
            
            // Solo mostrar en consola para errores y advertencias importantes
            if (level === 'error') {
                console.error(`[ERROR] [${category}] ${message}`);
            } else if (level === 'warn' && category === 'system') {
                console.warn(`[WARN] [${category}] ${message}`);
            }
            // Los logs de info y debug solo van a la base de datos para reducir spam

        } catch (error) {
            console.error('Error al guardar log en base de datos:', error);
        }
    }

    /**
     * Registra un comando ejecutado por un usuario
     */
    static async logCommand(interaction, commandName, success = true, data = null, error = null) {
        const logData = {
            level: success ? 'info' : 'error',
            category: 'command',
            command: commandName,
            message: success 
                ? `Usuario ejecutó comando /${commandName} exitosamente`
                : `Error al ejecutar comando /${commandName}: ${error?.message || 'Error desconocido'}`,
            user_id: interaction.user?.id,
            username: interaction.user?.username,
            server_id: interaction.guild?.id,
            server_name: interaction.guild?.name,
            channel_id: interaction.channel?.id,
            channel_name: interaction.channel?.name,
            data: data,
            error_stack: error ? error.stack : null
        };

        await this.log(logData);
    }

    /**
     * Registra un evento del sistema
     */
    static async logSystem(message, level = 'info', data = null) {
        await this.log({
            level,
            category: 'system',
            message,
            data
        });
    }

    /**
     * Registra un error
     */
    static async logError(message, error = null, category = 'error', data = null) {
        await this.log({
            level: 'error',
            category,
            message,
            data,
            error_stack: error ? error.stack : null
        });
    }

    /**
     * Registra actividad de casino
     */
    static async logCasino(interaction, commandName, result, data = null) {
        await this.log({
            level: 'info',
            category: 'casino',
            command: commandName,
            message: `Juego ${commandName}: ${result}`,
            user_id: interaction.user?.id,
            username: interaction.user?.username,
            server_id: interaction.guild?.id,
            server_name: interaction.guild?.name,
            channel_id: interaction.channel?.id,
            channel_name: interaction.channel?.name,
            data
        });
    }

    /**
     * Registra actividad de crypto
     */
    static async logCrypto(message, level = 'info', data = null) {
        await this.log({
            level,
            category: 'crypto',
            message,
            data
        });
    }
}

export default Logger;