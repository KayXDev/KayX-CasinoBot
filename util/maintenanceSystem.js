// ═══════════════════════════════════════════════════════════════
// 🛠️ SISTEMA DE MODO MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { EmbedBuilder } from 'discord.js';
import { getMaintenanceStatus, setMaintenanceStatus, isMaintenanceEnabled, disableMaintenance } from '../db.js';

class MaintenanceSystem {
  constructor() {
    this.config = {
      enabled: false,
      reason: '',
      startTime: null,
      estimatedDuration: null,
      activatedBy: null,
      emergencyCommands: ['help', 'maintenance'],
      adminUsers: [],
      notificationChannel: null
    };
    this.autoTimer = null;
    this.periodicCheckInterval = null; // Interval para verificación periódica
    this.client = null; // Cliente de Discord para enviar notificaciones
  }

  // Método para inicializar la configuración desde la base de datos
  async initialize() {
    await this.initializeConfig();
  }
  
  // Establecer el cliente de Discord para notificaciones
  setClient(client) {
    this.client = client;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📁 CONFIGURACIÓN Y PERSISTENCIA
  // ═══════════════════════════════════════════════════════════════

  async initializeConfig() {
    try {
      // Cargar estado de mantenimiento desde la base de datos
      const dbStatus = await getMaintenanceStatus();
      
      this.config = {
        enabled: dbStatus.enabled,
        reason: dbStatus.reason || '',
        startTime: dbStatus.startTime,
        estimatedDuration: dbStatus.estimatedDuration,
        activatedBy: dbStatus.activatedBy,
        emergencyCommands: ['help', 'maintenance'],
        adminUsers: this.getDefaultAdmins(),
        notificationChannel: this.getNotificationChannel()
      };
      
      // Verificar si hay mantenimiento activo al iniciar
      await this.checkExpiredMaintenance();
      
      // Iniciar verificación periódica del estado (cada 30 segundos)
      this.startPeriodicCheck();
    } catch (error) {
      console.error('Error loading maintenance config from database:', error);
      
      // Configuración por defecto en caso de error
      this.config = {
        enabled: false,
        reason: '',
        startTime: null,
        estimatedDuration: null,
        activatedBy: null,
        emergencyCommands: ['help', 'maintenance'],
        adminUsers: this.getDefaultAdmins(),
        notificationChannel: this.getNotificationChannel()
      };
    }
  }

  getDefaultAdmins() {
    try {
      // Intentar cargar admins desde config.yml
      const configPath = './config.yml';
      if (fs.existsSync(configPath)) {
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        
        const admins = [];
        if (config.ownerID) admins.push(config.ownerID);
        if (config.maintenance?.adminUsers) {
          admins.push(...config.maintenance.adminUsers);
        }
        
        return [...new Set(admins)]; // Remover duplicados
      }
    } catch (error) {
      console.warn('Could not load admin users from config.yml:', error.message);
    }
    
    return []; // Retornar array vacío si no se puede cargar
  }

  getNotificationChannel() {
    try {
      // Intentar cargar canal de notificaciones desde config.yml
      const configPath = './config.yml';
      if (fs.existsSync(configPath)) {
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        
        if (config.maintenance?.notificationChannel) {
          return config.maintenance.notificationChannel;
        }
      }
    } catch (error) {
      console.warn('Could not load notification channel from config.yml:', error.message);
    }
    
    return null; // Retornar null si no se puede cargar o no está configurado
  }

  async saveConfig() {
    try {
      await setMaintenanceStatus(
        this.config.enabled,
        this.config.reason,
        this.config.startTime,
        this.config.activatedBy
      );
      return true;
    } catch (error) {
      console.error('Error saving maintenance config to database:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔧 ACTIVACIÓN Y DESACTIVACIÓN DEL MANTENIMIENTO
  // ═══════════════════════════════════════════════════════════════

  async enableMaintenance(reason, durationMinutes, activatedBy) {
    this.config.enabled = true;
    this.config.reason = reason || 'Mantenimiento programado';
    this.config.startTime = new Date().toISOString();
    this.config.estimatedDuration = durationMinutes;
    this.config.activatedBy = activatedBy;
    
    // Configurar auto-desactivación si hay duración
    if (durationMinutes && durationMinutes > 0) {
      this.setupAutoDisable(durationMinutes);
    }
    
    return await this.saveConfig();
  }

  async disableMaintenance() {
    // Cancelar timer automático si existe
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    
    this.config.enabled = false;
    this.config.reason = '';
    this.config.startTime = null;
    this.config.estimatedDuration = null;
    this.config.activatedBy = null;
    
    return await this.saveConfig();
  }

  // Método de limpieza para detener todos los timers
  cleanup() {
    this.stopPeriodicCheck();
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  // Método para refrescar el estado desde la base de datos
  async refreshFromDatabase() {
    try {
      const dbStatus = await getMaintenanceStatus();
      
      const wasEnabled = this.config.enabled;
      
      this.config.enabled = dbStatus.enabled;
      this.config.reason = dbStatus.reason || '';
      this.config.startTime = dbStatus.startTime;
      this.config.estimatedDuration = dbStatus.estimatedDuration;
      this.config.activatedBy = dbStatus.activatedBy;
      
      // Si cambió el estado, logearlo
      if (wasEnabled !== this.config.enabled) {
        console.log(`🔄 Maintenance state refreshed from DB: ${this.config.enabled ? 'ENABLED' : 'DISABLED'}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error refreshing maintenance config from database:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ⏰ SISTEMA DE VERIFICACIÓN PERIÓDICA
  // ═══════════════════════════════════════════════════════════════

  async checkExpiredMaintenance() {
    if (!this.config.enabled || !this.config.startTime || !this.config.estimatedDuration) {
      return false;
    }

    const startTime = new Date(this.config.startTime);
    const endTime = new Date(startTime.getTime() + (this.config.estimatedDuration * 60 * 1000));
    const now = new Date();

    if (now >= endTime) {
      console.log('⏰ Maintenance period expired, auto-disabling...');
      await this.disableMaintenance();
      
      // Enviar notificación si hay canal configurado
      await this.sendAutoDisableNotification();
      
      return true;
    }
    
    return false;
  }

  setupAutoDisable(durationMinutes) {
    // Cancelar timer previo si existe
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
    }
    
    const timeoutMs = durationMinutes * 60 * 1000;
    
    this.autoTimer = setTimeout(async () => {
      console.log(`⏰ Auto-disabling maintenance after ${durationMinutes} minutes`);
      await this.disableMaintenance();
      await this.sendAutoDisableNotification();
    }, timeoutMs);
    
    console.log(`⏱️ Maintenance auto-disable scheduled for ${durationMinutes} minutes`);
  }

  async sendAutoDisableNotification() {
    if (!this.client || !this.config.notificationChannel) return;
    
    try {
      const channel = await this.client.channels.fetch(this.config.notificationChannel);
      if (!channel) return;
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🟢 Mantenimiento Finalizado Automáticamente')
        .setDescription('El período de mantenimiento programado ha concluido.')
        .addFields({ name: '📊 Estado', value: 'Bot operativo nuevamente', inline: true })
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error sending auto-disable notification:', error);
    }
  }

  startPeriodicCheck() {
    // Verificar cada 30 segundos si el mantenimiento expiró
    this.periodicCheckInterval = setInterval(async () => {
      await this.checkExpiredMaintenance();
      await this.refreshFromDatabase();
    }, 30000);
    
    console.log('🔄 Periodic maintenance check started (every 30 seconds)');
  }

  stopPeriodicCheck() {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
      console.log('⏹️ Periodic maintenance check stopped');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔐 SISTEMA DE PERMISOS Y VALIDACIÓN
  // ═══════════════════════════════════════════════════════════════

  async isMaintenanceMode() {
    // Refrescar desde la base de datos para estar seguros
    await this.refreshFromDatabase();
    return this.config.enabled;
  }

  isAdmin(userId) {
    return this.config.adminUsers.includes(userId);
  }

  async addAdmin(userId) {
    if (!this.config.adminUsers.includes(userId)) {
      this.config.adminUsers.push(userId);
      await this.saveConfig();
      return true;
    }
    return false;
  }

  async removeAdmin(userId) {
    const index = this.config.adminUsers.indexOf(userId);
    if (index > -1) {
      this.config.adminUsers.splice(index, 1);
      await this.saveConfig();
      return true;
    }
    return false;
  }

  async canExecuteCommand(commandName, userId) {
    // Si el mantenimiento no está activo, permitir todos los comandos
    if (!await this.isMaintenanceMode()) {
      return { allowed: true };
    }
    
    // Permitir comandos de emergencia
    if (this.config.emergencyCommands.includes(commandName)) {
      return { allowed: true };
    }
    
    // Permitir a administradores ejecutar cualquier comando
    if (this.isAdmin(userId)) {
      return { allowed: true };
    }
    
    // No permitido - devolver embed de mantenimiento
    return {
      allowed: false,
      embed: this.getMaintenanceEmbed()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 💬 SISTEMA DE EMBEDS Y MENSAJES
  // ═══════════════════════════════════════════════════════════════

  getMaintenanceEmbed() {
    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('🛠️ Modo Mantenimiento Activo')
      .setDescription('El bot se encuentra actualmente en mantenimiento.');

    if (this.config.reason) {
      embed.addFields({ name: '📋 Motivo', value: this.config.reason, inline: false });
    }

    if (this.config.startTime) {
      const startTime = new Date(this.config.startTime);
      embed.addFields({ 
        name: '⏰ Iniciado', 
        value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, 
        inline: true 
      });
    }

    if (this.config.estimatedDuration) {
      const startTime = new Date(this.config.startTime);
      const endTime = new Date(startTime.getTime() + (this.config.estimatedDuration * 60 * 1000));
      
      embed.addFields({ 
        name: '⏳ Finalización Estimada', 
        value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, 
        inline: true 
      });

      const remaining = Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / (60 * 1000)));
      if (remaining > 0) {
        embed.addFields({ 
          name: '📊 Tiempo Restante', 
          value: `${remaining} minutos`, 
          inline: true 
        });
      }
    }

    if (this.config.activatedBy) {
      embed.addFields({ 
        name: '👤 Activado por', 
        value: this.config.activatedBy, 
        inline: true 
      });
    }

    embed.addFields({ 
      name: '🆘 Comandos Disponibles', 
      value: this.config.emergencyCommands.map(cmd => `\`${cmd}\``).join(', '), 
      inline: false 
    });

    embed.setFooter({ text: 'Disculpa las molestias. Volveremos pronto.' });
    embed.setTimestamp();

    return embed;
  }

  getStatusEmbed() {
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Estado del Sistema de Mantenimiento');

    if (this.config.enabled) {
      embed.setColor('#FF6B6B');
      embed.setDescription('🔴 **MANTENIMIENTO ACTIVO**');
      
      if (this.config.reason) {
        embed.addFields({ name: '📋 Motivo', value: this.config.reason, inline: false });
      }

      if (this.config.startTime) {
        const startTime = new Date(this.config.startTime);
        embed.addFields({ 
          name: '⏰ Iniciado', 
          value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, 
          inline: true 
        });
      }

      if (this.config.estimatedDuration) {
        const startTime = new Date(this.config.startTime);
        const endTime = new Date(startTime.getTime() + (this.config.estimatedDuration * 60 * 1000));
        
        embed.addFields({ 
          name: '⏳ Finalización Estimada', 
          value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, 
          inline: true 
        });

        const remaining = Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / (60 * 1000)));
        embed.addFields({ 
          name: '📊 Tiempo Restante', 
          value: remaining > 0 ? `${remaining} minutos` : '⏰ **Expirado**', 
          inline: true 
        });
      }

      if (this.config.activatedBy) {
        embed.addFields({ 
          name: '👤 Activado por', 
          value: this.config.activatedBy, 
          inline: true 
        });
      }

    } else {
      embed.setColor('#4ECDC4');
      embed.setDescription('🟢 **BOT OPERATIVO**');
      embed.addFields({ 
        name: '📊 Estado', 
        value: 'Todos los comandos están disponibles', 
        inline: false 
      });
    }

    // Información adicional del sistema
    embed.addFields({ 
      name: '🔧 Administradores', 
      value: this.config.adminUsers.length > 0 ? `${this.config.adminUsers.length} configurados` : 'Ninguno configurado', 
      inline: true 
    });

    embed.addFields({ 
      name: '🆘 Comandos de Emergencia', 
      value: this.config.emergencyCommands.join(', '), 
      inline: true 
    });

    if (this.config.notificationChannel) {
      embed.addFields({ 
        name: '📢 Canal de Notificaciones', 
        value: `<#${this.config.notificationChannel}>`, 
        inline: true 
      });
    }

    embed.setFooter({ text: 'Sistema de Mantenimiento v2.0' });
    embed.setTimestamp();

    return embed;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 ESTADÍSTICAS Y UTILIDADES
  // ═══════════════════════════════════════════════════════════════

  getMaintenanceStats() {
    const stats = {
      enabled: this.config.enabled,
      reason: this.config.reason,
      startTime: this.config.startTime,
      estimatedDuration: this.config.estimatedDuration,
      activatedBy: this.config.activatedBy,
      adminCount: this.config.adminUsers.length,
      emergencyCommandsCount: this.config.emergencyCommands.length,
      hasNotificationChannel: !!this.config.notificationChannel
    };

    if (this.config.enabled && this.config.startTime) {
      const startTime = new Date(this.config.startTime);
      const now = new Date();
      stats.elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (60 * 1000));
      
      if (this.config.estimatedDuration) {
        const endTime = new Date(startTime.getTime() + (this.config.estimatedDuration * 60 * 1000));
        stats.remainingMinutes = Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / (60 * 1000)));
        stats.isExpired = now >= endTime;
      }
    }

    return stats;
  }

  // Método para obtener información completa del sistema
  getSystemInfo() {
    return {
      config: { ...this.config },
      stats: this.getMaintenanceStats(),
      timers: {
        hasAutoTimer: !!this.autoTimer,
        hasPeriodicCheck: !!this.periodicCheckInterval
      }
    };
  }
}

// Crear instancia singleton
const maintenanceSystem = new MaintenanceSystem();

export default maintenanceSystem;