// Sistema de logging para comandos en tiempo real
const fs = require('fs').promises;
const path = require('path');

class CommandLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100; // Mantener solo los últimos 100 logs
        this.logFile = path.join(__dirname, '..', 'logs', 'commands.json');
        this.initializeLogFile();
    }

    async initializeLogFile() {
        try {
            const logDir = path.dirname(this.logFile);
            await fs.mkdir(logDir, { recursive: true });
            
            // Cargar logs existentes si existen
            try {
                const data = await fs.readFile(this.logFile, 'utf8');
                this.logs = JSON.parse(data) || [];
            } catch (error) {
                // Archivo no existe, crear nuevo
                this.logs = [];
            }
        } catch (error) {
            console.error('Error initializing log file:', error);
        }
    }

    logCommand(userId, username, commandName, guildId, guildName, args = []) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: `User ${username} (${userId}) executed /${commandName}${args.length > 0 ? ' ' + args.join(' ') : ''}`,
            category: 'Command',
            details: {
                userId,
                username,
                commandName,
                guildId,
                guildName,
                args,
                timestamp: Date.now()
            }
        };

        // Agregar al inicio del array
        this.logs.unshift(logEntry);

        // Mantener solo los últimos logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Guardar logs al archivo de forma asíncrona
        this.saveLogs();

        console.log(`📝 Command logged: ${logEntry.message}`);
    }

    logError(userId, username, commandName, error) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: `Command /${commandName} failed for user ${username}: ${error.message}`,
            category: 'Command',
            details: {
                userId,
                username,
                commandName,
                error: error.message,
                timestamp: Date.now()
            }
        };

        this.logs.unshift(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.saveLogs();
    }

    logSystemEvent(message, level = 'INFO', category = 'System') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            category,
            details: {
                timestamp: Date.now()
            }
        };

        this.logs.unshift(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.saveLogs();
    }

    async saveLogs() {
        try {
            await fs.writeFile(this.logFile, JSON.stringify(this.logs, null, 2));
        } catch (error) {
            console.error('Error saving logs:', error);
        }
    }

    getLogs(limit = 20) {
        return this.logs.slice(0, limit);
    }

    getRecentLogs(minutes = 30) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.logs.filter(log => {
            const logTime = log.details?.timestamp || Date.parse(log.timestamp);
            return logTime > cutoff;
        });
    }
}

// Crear instancia global
const commandLogger = new CommandLogger();

module.exports = commandLogger;