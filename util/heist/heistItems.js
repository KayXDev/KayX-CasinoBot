// Funciones para manejar items de robo
import mysql from 'mysql2/promise';
import fs from 'fs';
import jsYaml from 'js-yaml';

// Leer configuración
const configFile = fs.readFileSync('./config.yml', 'utf8');
const config = jsYaml.load(configFile);

// Crear conexión a la base de datos
async function getConnection() {
    return await mysql.createConnection({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database
    });
}

// Obtener equipamiento activo del usuario
export async function getUserHeistEquipment(userId) {
    const connection = await getConnection();
    try {
        // Primero limpiar items expirados
        await connection.execute(
            'UPDATE user_heist_equipment SET is_active = FALSE WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
        
        const [rows] = await connection.execute(
            'SELECT item_type, expires_at FROM user_heist_equipment WHERE user_id = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())',
            [userId]
        );
        return rows.map(row => ({
            item_type: row.item_type,
            expires_at: row.expires_at
        }));
    } finally {
        await connection.end();
    }
}

// Obtener consumibles del usuario
export async function getUserHeistConsumables(userId) {
    const connection = await getConnection();
    try {
        // Primero limpiar items expirados
        await connection.execute(
            'UPDATE user_heist_consumables SET quantity = 0 WHERE expires_at IS NOT NULL AND expires_at < NOW()'
        );
        
        const [rows] = await connection.execute(
            'SELECT item_type, quantity, expires_at FROM user_heist_consumables WHERE user_id = ? AND quantity > 0 AND (expires_at IS NULL OR expires_at > NOW())',
            [userId]
        );
        const consumables = {};
        rows.forEach(row => {
            consumables[row.item_type] = {
                quantity: row.quantity,
                expires_at: row.expires_at
            };
        });
        return consumables;
    } finally {
        await connection.end();
    }
}

// Calcular bonus total de equipamiento
export function calculateEquipmentBonus(equipment, minigameType) {
    let totalBonus = 0;
    
    equipment.forEach(equipmentItem => {
        const itemType = equipmentItem.item_type || equipmentItem;
        switch (itemType) {
            case 'lockpick_kit':
                if (minigameType === 'lockpicking') totalBonus += 0.15;
                break;
            case 'hacking_laptop':
                if (minigameType === 'hacking') totalBonus += 0.20;
                break;
            case 'stealth_suit':
                if (minigameType === 'stealth') totalBonus += 0.25;
                break;
            case 'decoder_device':
                if (minigameType === 'decode') totalBonus += 0.30;
                break;
            case 'master_thief_kit':
                totalBonus += 0.10; // Bonus universal
                break;
        }
    });
    
    return totalBonus;
}

// Usar consumible
export async function useConsumable(userId, itemType) {
    const connection = await getConnection();
    try {
        const [result] = await connection.execute(
            'UPDATE user_heist_consumables SET quantity = quantity - 1 WHERE user_id = ? AND item_type = ? AND quantity > 0',
            [userId, itemType]
        );
        return result.affectedRows > 0;
    } finally {
        await connection.end();
    }
}

// Registrar uso de items en un robo
export async function recordHeistItemUsage(userId, bankType, itemsUsed, success, bonusApplied) {
    const connection = await getConnection();
    try {
        await connection.execute(
            'INSERT INTO heist_item_usage (user_id, bank_type, items_used, success, bonus_applied) VALUES (?, ?, ?, ?, ?)',
            [userId, bankType, JSON.stringify(itemsUsed), success, bonusApplied]
        );
    } finally {
        await connection.end();
    }
}

// Comprar item de equipamiento
export async function purchaseHeistEquipment(userId, itemType, cost) {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        
        // Insertar o actualizar equipamiento con expiración de 1 hora
        await connection.execute(
            `INSERT INTO user_heist_equipment (user_id, item_type, is_active, expires_at) 
             VALUES (?, ?, TRUE, DATE_ADD(NOW(), INTERVAL 1 HOUR)) 
             ON DUPLICATE KEY UPDATE 
                is_active = TRUE, 
                purchase_date = CURRENT_TIMESTAMP,
                expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
            [userId, itemType]
        );
        
        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
}

// Comprar consumible
export async function purchaseHeistConsumable(userId, itemType, quantity = 1) {
    const connection = await getConnection();
    try {
        await connection.execute(
            `INSERT INTO user_heist_consumables (user_id, item_type, quantity, expires_at) 
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR)) 
             ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                expires_at = GREATEST(expires_at, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
            [userId, itemType, quantity]
        );
        return true;
    } finally {
        await connection.end();
    }
}

// Obtener descripción del item
export function getItemDescription(itemType) {
    const descriptions = {
        // Equipamiento
        'lockpick_kit': '🔧 Kit Profesional de Ganzúas - +15% éxito en forzado de cerraduras',
        'hacking_laptop': '💻 Laptop de Hackeo Avanzado - +20% éxito en hackeo de sistemas',
        'stealth_suit': '🥷 Traje de Sigilo - +25% éxito en misiones de infiltración',
        'decoder_device': '🔢 Decodificador Militar - +30% éxito en descifrado de códigos',
        'master_thief_kit': '👑 Kit Maestro Ladrón - +10% éxito en TODOS los tipos de robo',
        
        // Consumibles
        'adrenaline_shot': '💉 Inyección de Adrenalina - +50% tiempo límite en minijuegos',
        'focus_pills': '💊 Pastillas de Concentración - Reduce dificultad en 1 nivel',
        'intel_report': '📋 Reporte de Inteligencia - Muestra seguridad del banco antes del robo',
        'getaway_car': '🚗 Auto de Escape - Reduce tiempo de cárcel en 50%',
        'fake_id': '🪪 Documentos Falsos - Omite el cooldown de robo una vez'
    };
    
    return descriptions[itemType] || 'Item desconocido';
}

// Aplicar efectos de consumibles
export function applyConsumableEffects(consumables, bankConfig) {
    const effects = {
        timeMultiplier: 1,
        difficultyReduction: 0,
        showIntel: false,
        jailReduction: 0,
        skipCooldown: false
    };
    
    if (consumables.adrenaline_shot > 0) {
        effects.timeMultiplier = 1.5;
    }
    
    if (consumables.focus_pills > 0) {
        effects.difficultyReduction = 1;
    }
    
    if (consumables.intel_report > 0) {
        effects.showIntel = true;
    }
    
    if (consumables.getaway_car > 0) {
        effects.jailReduction = 0.5;
    }
    
    if (consumables.fake_id > 0) {
        effects.skipCooldown = true;
    }
    
    return effects;
}

// FUNCIONES ADMIN - Eliminar items de usuarios
export async function removeUserHeistEquipment(userId, itemType = null) {
    const connection = await getConnection();
    try {
        if (itemType) {
            // Eliminar item específico
            await connection.execute(
                'DELETE FROM user_heist_equipment WHERE user_id = ? AND item_type = ?',
                [userId, itemType]
            );
        } else {
            // Eliminar todo el equipment
            await connection.execute(
                'DELETE FROM user_heist_equipment WHERE user_id = ?',
                [userId]
            );
        }
        return true;
    } finally {
        await connection.end();
    }
}

export async function removeUserHeistConsumables(userId, itemType = null) {
    const connection = await getConnection();
    try {
        if (itemType) {
            // Eliminar consumible específico
            await connection.execute(
                'DELETE FROM user_heist_consumables WHERE user_id = ? AND item_type = ?',
                [userId, itemType]
            );
        } else {
            // Eliminar todos los consumibles
            await connection.execute(
                'DELETE FROM user_heist_consumables WHERE user_id = ?',
                [userId]
            );
        }
        return true;
    } finally {
        await connection.end();
    }
}

export async function getAllUsersWithHeistItems() {
    const connection = await getConnection();
    try {
        // Obtener usuarios con equipment
        const [equipmentUsers] = await connection.execute(`
            SELECT DISTINCT u.user_id, 
                   GROUP_CONCAT(DISTINCT u.item_type) as equipment_items,
                   NULL as consumable_items
            FROM user_heist_equipment u 
            WHERE u.is_active = TRUE AND (u.expires_at IS NULL OR u.expires_at > NOW())
            GROUP BY u.user_id
        `);
        
        // Obtener usuarios con consumibles
        const [consumableUsers] = await connection.execute(`
            SELECT DISTINCT u.user_id,
                   NULL as equipment_items,
                   GROUP_CONCAT(CONCAT(u.item_type, '(', u.quantity, ')')) as consumable_items
            FROM user_heist_consumables u 
            WHERE u.quantity > 0 AND (u.expires_at IS NULL OR u.expires_at > NOW())
            GROUP BY u.user_id
        `);
        
        // Combinar resultados
        const userMap = new Map();
        
        equipmentUsers.forEach(user => {
            userMap.set(user.user_id, {
                user_id: user.user_id,
                equipment_items: user.equipment_items,
                consumable_items: null
            });
        });
        
        consumableUsers.forEach(user => {
            if (userMap.has(user.user_id)) {
                userMap.get(user.user_id).consumable_items = user.consumable_items;
            } else {
                userMap.set(user.user_id, {
                    user_id: user.user_id,
                    equipment_items: null,
                    consumable_items: user.consumable_items
                });
            }
        });
        
        return Array.from(userMap.values());
    } finally {
        await connection.end();
    }
}