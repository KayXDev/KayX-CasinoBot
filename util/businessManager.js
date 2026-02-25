// ═══════════════════════════════════════════════════════════════
// 💼 BUSINESS MANAGER - Gestión de Negocios y Empleados
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BusinessManager {
  constructor() {
    this.config = null;
    this.loadConfig();
    this.startBusinessOperations();
  }

  // ═══════════════════════════════════════════════════════════════
  // 📁 CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config.yml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const fullConfig = yaml.load(configFile);
      this.config = fullConfig.economy?.businesses || {};
      console.log('✅ Business Manager configurado correctamente');
    } catch (error) {
      console.error('❌ Error cargando configuración de negocios:', error);
      this.config = { enabled: false };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 👥 GESTIÓN DE EMPLEADOS
  // ═══════════════════════════════════════════════════════════════

  async hireEmployee(userId, propertyId, employeeType) {
    try {
      // Verificar que la propiedad pertenezca al usuario
      const [properties] = await pool.execute(`
        SELECT * FROM user_properties 
        WHERE id = ? AND user_id = ? AND is_active = 1
      `, [propertyId, userId]);

      if (properties.length === 0) {
        throw new Error('Propiedad no encontrada');
      }

      const property = properties[0];

      // Verificar configuración del empleado
      const employeeConfig = this.config.employee_types?.[employeeType];
      if (!employeeConfig) {
        throw new Error('Tipo de empleado no válido');
      }

      // Verificar límite de empleados para esta propiedad
      const [currentEmployees] = await pool.execute(`
        SELECT COUNT(*) as count 
        FROM property_employees 
        WHERE property_id = ? AND is_active = 1
      `, [propertyId]);

      const maxEmployees = this.getMaxEmployeesForProperty(property);
      if (currentEmployees[0].count >= maxEmployees) {
        throw new Error(`Esta propiedad ya tiene el máximo de empleados (${maxEmployees})`);
      }

      // Verificar balance del usuario
      const [userBalance] = await pool.execute(
        'SELECT hand FROM users WHERE user_id = ?',
        [userId]
      );

      if (userBalance.length === 0 || userBalance[0].hand < employeeConfig.hiring_cost) {
        throw new Error('Fondos insuficientes para contratar empleado');
      }

      // Contratar empleado
      await pool.query('START TRANSACTION');

      try {
        // Descontar costo de contratación
        await pool.execute(
          'UPDATE users SET hand = hand - ? WHERE user_id = ?',
          [employeeConfig.hiring_cost, userId]
        );

        // Crear empleado
        const employeeName = this.generateEmployeeName(employeeType);
        const [result] = await pool.execute(`
          INSERT INTO property_employees 
          (property_id, employee_type, employee_name, efficiency, salary) 
          VALUES (?, ?, ?, ?, ?)
        `, [
          propertyId, employeeType, employeeName,
          employeeConfig.base_efficiency, employeeConfig.salary
        ]);

        await pool.query('COMMIT');

        console.log(`✅ Usuario ${userId} contrató ${employeeName} (${employeeType}) para propiedad ${propertyId}`);
        return {
          success: true,
          employeeId: result.insertId,
          employeeName,
          cost: employeeConfig.hiring_cost
        };

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Error contratando empleado:', error);
      throw error;
    }
  }

  async fireEmployee(userId, employeeId) {
    try {
      // Verificar que el empleado pertenezca a una propiedad del usuario
      const [employees] = await pool.execute(`
        SELECT pe.*, up.user_id 
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE pe.id = ? AND up.user_id = ? AND pe.is_active = 1
      `, [employeeId, userId]);

      if (employees.length === 0) {
        throw new Error('Empleado no encontrado');
      }

      // Calcular costo de despido (2 semanas de salario)
      const employee = employees[0];
      const severancePay = employee.salary * 2;

      // Despedir empleado
      await pool.execute(`
        UPDATE property_employees 
        SET is_active = 0, fire_date = NOW()
        WHERE id = ?
      `, [employeeId]);

      // Descontar indemnización
      await pool.execute(
        'UPDATE users SET hand = hand - ? WHERE user_id = ?',
        [severancePay, userId]
      );

      console.log(`✅ Usuario ${userId} despidió empleado ${employeeId}`);
      return {
        success: true,
        severancePay
      };

    } catch (error) {
      console.error('❌ Error despidiendo empleado:', error);
      throw error;
    }
  }

  async getPropertyEmployees(userId, propertyId) {
    try {
      // Verificar que la propiedad pertenezca al usuario
      const [properties] = await pool.execute(`
        SELECT * FROM user_properties 
        WHERE id = ? AND user_id = ? AND is_active = 1
      `, [propertyId, userId]);

      if (properties.length === 0) {
        throw new Error('Propiedad no encontrada');
      }

      // Obtener empleados
      const [employees] = await pool.execute(`
        SELECT *, 
               DATEDIFF(NOW(), hire_date) as days_employed,
               (salary * 7) as weekly_cost
        FROM property_employees 
        WHERE property_id = ? AND is_active = 1
        ORDER BY hire_date DESC
      `, [propertyId]);

      return employees.map(emp => ({
        ...emp,
        displayName: this.getEmployeeDisplayName(emp.employee_type),
        emoji: this.getEmployeeEmoji(emp.employee_type),
        efficiency_display: `${(emp.efficiency * 100).toFixed(1)}%`
      }));

    } catch (error) {
      console.error('❌ Error obteniendo empleados de propiedad:', error);
      return [];
    }
  }

  async upgradeEmployee(userId, employeeId) {
    try {
      // Verificar empleado
      const [employees] = await pool.execute(`
        SELECT pe.*, up.user_id 
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE pe.id = ? AND up.user_id = ? AND pe.is_active = 1
      `, [employeeId, userId]);

      if (employees.length === 0) {
        throw new Error('Empleado no encontrado');
      }

      const employee = employees[0];
      
      // Verificar si puede ser mejorado
      if (employee.efficiency >= 1.5) { // Máximo 150% eficiencia
        throw new Error('Empleado ya está al máximo nivel');
      }

      // Calcular costo de mejora
      const upgradeCost = employee.salary * 5; // 5 semanas de salario

      // Verificar balance
      const [userBalance] = await pool.execute(
        'SELECT hand FROM users WHERE user_id = ?',
        [userId]
      );

      if (userBalance.length === 0 || userBalance[0].hand < upgradeCost) {
        throw new Error('Fondos insuficientes para mejorar empleado');
      }

      // Realizar mejora
      await pool.query('START TRANSACTION');

      try {
        // Descontar dinero
        await pool.execute(
          'UPDATE users SET hand = hand - ? WHERE user_id = ?',
          [upgradeCost, userId]
        );

        // Mejorar empleado (10% más eficiencia)
        await pool.execute(`
          UPDATE property_employees 
          SET efficiency = LEAST(efficiency + 0.1, 1.5)
          WHERE id = ?
        `, [employeeId]);

        await pool.query('COMMIT');

        console.log(`✅ Usuario ${userId} mejoró empleado ${employeeId}`);
        return {
          success: true,
          cost: upgradeCost,
          newEfficiency: Math.min(employee.efficiency + 0.1, 1.5)
        };

      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Error mejorando empleado:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🏢 OPERACIONES DE NEGOCIO
  // ═══════════════════════════════════════════════════════════════

  async processBusinessOperations() {
    try {
      // Procesar pagos de salarios semanales
      await this.processSalaryPayments();
      
      // Procesar bonificaciones por eficiencia
      await this.processEfficiencyBonuses();
      
      // Procesar eventos aleatorios de negocio
      await this.processBusinessEvents();
      
    } catch (error) {
      console.error('❌ Error procesando operaciones de negocio:', error);
    }
  }

  async processSalaryPayments() {
    try {
      // Obtener empleados que necesitan cobrar (cada 7 días)
      const [employeesToPay] = await pool.execute(`
        SELECT pe.*, up.user_id
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE pe.is_active = 1 
        AND DATEDIFF(NOW(), COALESCE(pe.last_salary_payment, pe.hire_date)) >= 7
      `);

      for (const employee of employeesToPay) {
        try {
          // Verificar si el usuario tiene fondos
          const [userBalance] = await pool.execute(
            'SELECT hand FROM users WHERE user_id = ?',
            [employee.user_id]
          );

          if (userBalance.length > 0 && userBalance[0].hand >= employee.salary) {
            // Pagar salario
            await pool.execute(
              'UPDATE users SET hand = hand - ? WHERE user_id = ?',
              [employee.salary, employee.user_id]
            );

            // Actualizar fecha de último pago
            await pool.execute(
              'UPDATE property_employees SET last_salary_payment = NOW() WHERE id = ?',
              [employee.id]
            );

            console.log(`💰 Pagado salario de ${employee.salary} a empleado ${employee.id}`);
          } else {
            // Usuario no tiene fondos, despedir empleado automáticamente
            await pool.execute(
              'UPDATE property_employees SET is_active = 0, fire_date = NOW() WHERE id = ?',
              [employee.id]
            );

            console.log(`🚫 Empleado ${employee.id} despedido por falta de fondos`);
          }
        } catch (error) {
          console.error(`❌ Error procesando salario para empleado ${employee.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error procesando pagos de salarios:', error);
    }
  }

  async processEfficiencyBonuses() {
    try {
      // Los empleados con alta eficiencia pueden generar bonos aleatorios
      const [efficientEmployees] = await pool.execute(`
        SELECT pe.*, up.user_id
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE pe.is_active = 1 AND pe.efficiency >= 1.2
        AND RAND() < 0.1
      `); // 10% chance para empleados muy eficientes

      for (const employee of efficientEmployees) {
        const bonus = Math.round(employee.salary * 0.5); // 50% del salario como bonus
        
        await pool.execute(
          'UPDATE users SET hand = hand + ? WHERE user_id = ?',
          [bonus, employee.user_id]
        );

        console.log(`🎉 Bonus de eficiencia de ${bonus} para usuario ${employee.user_id}`);
      }

    } catch (error) {
      console.error('❌ Error procesando bonos de eficiencia:', error);
    }
  }

  async processBusinessEvents() {
    try {
      // Eventos aleatorios que afectan las propiedades
      const events = [
        { name: 'Boom Económico', probability: 0.05, effect: 1.5, duration: 24 },
        { name: 'Crisis Local', probability: 0.03, effect: 0.7, duration: 12 },
        { name: 'Festival de la Ciudad', probability: 0.08, effect: 1.3, duration: 6 }
      ];

      for (const event of events) {
        if (Math.random() < event.probability) {
          // Crear evento en la base de datos
          await pool.execute(`
            INSERT INTO property_market_events 
            (event_name, effect_multiplier, start_time, end_time, is_active)
            VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR), 1)
          `, [event.name, event.effect, event.duration]);

          console.log(`📅 Evento iniciado: ${event.name} (${event.effect}x por ${event.duration}h)`);
        }
      }

    } catch (error) {
      console.error('❌ Error procesando eventos de negocio:', error);
    }
  }

  startBusinessOperations() {
    if (!this.config.enabled) return;

    // Procesar operaciones cada hora
    setInterval(async () => {
      try {
        await this.processBusinessOperations();
      } catch (error) {
        console.error('❌ Error en operaciones automáticas de negocio:', error);
      }
    }, 3600000); // 1 hora

    console.log('💼 Sistema automático de operaciones de negocio iniciado');
  }

  // ═══════════════════════════════════════════════════════════════
  // 🧮 UTILIDADES Y CÁLCULOS
  // ═══════════════════════════════════════════════════════════════

  getMaxEmployeesForProperty(property) {
    const baseMax = {
      casino: { small: 2, medium: 4, large: 8 },
      hotel: { motel: 1, hotel_3star: 3, hotel_5star: 6, resort: 10 },
      restaurant: { cafeteria: 1, restaurant: 3, bistro: 5 },
      store: { kiosk: 1, boutique: 2, mall: 6 }
    };

    const base = baseMax[property.property_type]?.[property.property_subtype] || 2;
    return base + Math.floor(property.current_level / 2); // +1 empleado cada 2 niveles
  }

  getEmployeeDisplayName(employeeType) {
    const names = {
      manager: 'Gerente',
      security: 'Seguridad',
      cleaner: 'Limpieza',
      waiter: 'Mesero',
      chef: 'Chef',
      receptionist: 'Recepcionista',
      maintenance: 'Mantenimiento'
    };
    
    return names[employeeType] || employeeType;
  }

  getEmployeeEmoji(employeeType) {
    const emojis = {
      manager: '👔',
      security: '👮',
      cleaner: '🧹',
      waiter: '👨‍🍳',
      chef: '👨‍🍳',
      receptionist: '👩‍💼',
      maintenance: '🔧'
    };
    
    return emojis[employeeType] || '👤';
  }

  generateEmployeeName(employeeType) {
    const firstNames = [
      'Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Miguel', 'Isabel',
      'Francisco', 'Elena', 'Juan', 'Lucía', 'Antonio', 'Rosa', 'Manuel', 'Pilar'
    ];
    
    const lastNames = [
      'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez',
      'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz'
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 📊 ESTADÍSTICAS DE NEGOCIO
  // ═══════════════════════════════════════════════════════════════

  async getBusinessStats(userId) {
    try {
      const [employeeStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_employees,
          SUM(salary) as weekly_salary_cost,
          AVG(efficiency) as avg_efficiency
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE up.user_id = ? AND pe.is_active = 1
      `, [userId]);

      const [salaryHistory] = await pool.execute(`
        SELECT SUM(salary) as total_salaries_paid
        FROM property_employees pe
        JOIN user_properties up ON pe.property_id = up.id
        WHERE up.user_id = ? AND pe.last_salary_payment IS NOT NULL
      `, [userId]);

      return {
        ...employeeStats[0],
        total_salaries_paid: salaryHistory[0].total_salaries_paid || 0,
        avg_efficiency_percentage: ((employeeStats[0].avg_efficiency || 1) * 100).toFixed(1)
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de negocio:', error);
      return null;
    }
  }
}

export default new BusinessManager();