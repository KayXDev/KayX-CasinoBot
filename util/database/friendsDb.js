// ═══════════════════════════════════════════════════════════════
// 👥 FRIENDS SYSTEM DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

import { pool } from '../../db.js';

// ═══════════════════════════════════════════════════════════════
// �️ INITIALIZE FRIENDS TABLES
// ═══════════════════════════════════════════════════════════════

/**
 * Crear las tablas del sistema de amigos si no existen
 */
async function ensureFriendsTable() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS friends (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                friend_id VARCHAR(20) NOT NULL,
                status ENUM('pending', 'accepted') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accepted_at TIMESTAMP NULL,
                
                INDEX idx_user_id (user_id),
                INDEX idx_friend_id (friend_id),
                INDEX idx_status (status),
                
                UNIQUE KEY unique_friendship (user_id, friend_id),
                CHECK (user_id != friend_id)
            )
        `);
        
        // Crear vista para amistades aceptadas
        await pool.execute(`
            CREATE OR REPLACE VIEW accepted_friends AS
            SELECT 
                f1.user_id,
                f1.friend_id,
                f1.accepted_at
            FROM friends f1
            WHERE f1.status = 'accepted'
              AND EXISTS (
                SELECT 1 FROM friends f2 
                WHERE f2.user_id = f1.friend_id 
                AND f2.friend_id = f1.user_id 
                AND f2.status = 'accepted'
              )
        `);
        
        // Crear vista para solicitudes pendientes
        await pool.execute(`
            CREATE OR REPLACE VIEW pending_requests AS
            SELECT 
                friend_id as user_id,
                user_id as requester_id,
                created_at
            FROM friends 
            WHERE status = 'pending'
              AND NOT EXISTS (
                SELECT 1 FROM friends f2 
                WHERE f2.user_id = friends.friend_id 
                AND f2.friend_id = friends.user_id
              )
        `);
        
        console.log('✅ Friends tables initialized successfully');
    } catch (error) {
        console.error('❌ Error creating friends tables:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// �📤 FRIEND REQUEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Envía una solicitud de amistad
 * @param {string} senderId - ID del usuario que envía la solicitud
 * @param {string} receiverId - ID del usuario que recibe la solicitud
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendFriendRequest(senderId, receiverId) {
    try {
        // Asegurar que las tablas existen
        await ensureFriendsTable();
        
        // Verificar que no se auto-invite
        if (senderId === receiverId) {
            return { success: false, message: 'No puedes enviarte una solicitud a ti mismo' };
        }

        // Verificar si ya son amigos
        const existingFriendship = await checkFriendshipStatus(senderId, receiverId);
        if (existingFriendship.areFriends) {
            return { success: false, message: 'Ya son amigos' };
        }

        // Verificar si ya hay una solicitud pendiente
        if (existingFriendship.hasPendingRequest) {
            return { success: false, message: 'Ya hay una solicitud pendiente entre ustedes' };
        }

        // Insertar solicitud directamente (sin procedimiento almacenado por compatibilidad)
        await pool.execute(
            'INSERT IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, "pending")',
            [senderId, receiverId]
        );
        
        return { success: true, message: 'Solicitud de amistad enviada correctamente' };
    } catch (error) {
        console.error('Error sending friend request:', error);
        return { success: false, message: 'Error al enviar la solicitud de amistad' };
    }
}

/**
 * Acepta una solicitud de amistad
 * @param {string} accepterId - ID del usuario que acepta
 * @param {string} requesterId - ID del usuario que envió la solicitud
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function acceptFriendRequest(accepterId, requesterId) {
    try {
        // Verificar que existe una solicitud pendiente
        const [rows] = await pool.execute(
            'SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = "pending"',
            [requesterId, accepterId]
        );

        if (rows.length === 0) {
            return { success: false, message: 'No hay solicitud pendiente de este usuario' };
        }

        // Actualizar solicitud a aceptada
        await pool.execute(
            'UPDATE friends SET status = "accepted", accepted_at = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ? AND status = "pending"',
            [requesterId, accepterId]
        );
        
        // Crear la relación bidireccional
        await pool.execute(
            'INSERT INTO friends (user_id, friend_id, status, accepted_at) VALUES (?, ?, "accepted", CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE status = "accepted", accepted_at = CURRENT_TIMESTAMP',
            [accepterId, requesterId]
        );
        
        return { success: true, message: 'Solicitud de amistad aceptada' };
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return { success: false, message: 'Error al aceptar la solicitud de amistad' };
    }
}

/**
 * Rechaza una solicitud de amistad
 * @param {string} rejecterId - ID del usuario que rechaza
 * @param {string} requesterId - ID del usuario que envió la solicitud
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function rejectFriendRequest(rejecterId, requesterId) {
    try {
        const [result] = await pool.execute(
            'DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = "pending"',
            [requesterId, rejecterId]
        );

        if (result.affectedRows === 0) {
            return { success: false, message: 'No hay solicitud pendiente de este usuario' };
        }

        return { success: true, message: 'Solicitud de amistad rechazada' };
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        return { success: false, message: 'Error al rechazar la solicitud de amistad' };
    }
}

// ═══════════════════════════════════════════════════════════════
// 👫 FRIENDSHIP MANAGEMENT FUNCTIONS  
// ═══════════════════════════════════════════════════════════════

/**
 * Elimina una amistad
 * @param {string} userId - ID de uno de los usuarios
 * @param {string} friendId - ID del amigo a eliminar
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function removeFriendship(userId, friendId) {
    try {
        // Verificar que son amigos antes de eliminar
        const friendship = await checkFriendshipStatus(userId, friendId);
        if (!friendship.areFriends) {
            return { success: false, message: 'No son amigos actualmente' };
        }

        // Eliminar ambas direcciones de la amistad
        await pool.execute(
            'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [userId, friendId, friendId, userId]
        );
        
        return { success: true, message: 'Amistad eliminada correctamente' };
    } catch (error) {
        console.error('Error removing friendship:', error);
        return { success: false, message: 'Error al eliminar la amistad' };
    }
}

/**
 * Obtiene la lista de amigos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de amigos con información básica
 */
async function getUserFriends(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT friend_id, accepted_at FROM accepted_friends WHERE user_id = ? ORDER BY accepted_at DESC',
            [userId]
        );
        
        return rows;
    } catch (error) {
        console.error('Error getting user friends:', error);
        return [];
    }
}

/**
 * Obtiene las solicitudes pendientes recibidas por un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de solicitudes pendientes
 */
async function getPendingRequests(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT requester_id, created_at FROM pending_requests WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        return rows;
    } catch (error) {
        console.error('Error getting pending requests:', error);
        return [];
    }
}

/**
 * Obtiene las solicitudes enviadas por un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de solicitudes enviadas
 */
async function getSentRequests(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT friend_id, created_at FROM friends WHERE user_id = ? AND status = "pending" ORDER BY created_at DESC',
            [userId]
        );
        
        return rows;
    } catch (error) {
        console.error('Error getting sent requests:', error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica el estado de amistad entre dos usuarios
 * @param {string} userId1 - ID del primer usuario
 * @param {string} userId2 - ID del segundo usuario
 * @returns {Promise<{areFriends: boolean, hasPendingRequest: boolean, whoSentRequest?: string}>}
 */
async function checkFriendshipStatus(userId1, userId2) {
    try {
        // Verificar si son amigos (ambas direcciones aceptadas)
        const [friendsRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM accepted_friends WHERE user_id = ? AND friend_id = ?',
            [userId1, userId2]
        );
        
        const areFriends = friendsRows[0].count > 0;
        
        // Verificar solicitudes pendientes
        const [pendingRows] = await pool.execute(
            'SELECT user_id FROM friends WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = "pending"',
            [userId1, userId2, userId2, userId1]
        );
        
        const hasPendingRequest = pendingRows.length > 0;
        const whoSentRequest = hasPendingRequest ? pendingRows[0].user_id : null;
        
        return {
            areFriends,
            hasPendingRequest,
            whoSentRequest
        };
    } catch (error) {
        console.error('Error checking friendship status:', error);
        return { areFriends: false, hasPendingRequest: false };
    }
}

/**
 * Obtiene estadísticas de amigos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{totalFriends: number, pendingReceived: number, pendingSent: number}>}
 */
async function getFriendStats(userId) {
    try {
        const [friends] = await pool.execute(
            'SELECT COUNT(*) as count FROM accepted_friends WHERE user_id = ?',
            [userId]
        );
        
        const [pendingReceived] = await pool.execute(
            'SELECT COUNT(*) as count FROM pending_requests WHERE user_id = ?',
            [userId]
        );
        
        const [pendingSent] = await pool.execute(
            'SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND status = "pending"',
            [userId]
        );
        
        return {
            totalFriends: friends[0].count,
            pendingReceived: pendingReceived[0].count,
            pendingSent: pendingSent[0].count
        };
    } catch (error) {
        console.error('Error getting friend stats:', error);
        return { totalFriends: 0, pendingReceived: 0, pendingSent: 0 };
    }
}

// ═══════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
    // Table initialization
    ensureFriendsTable,
    
    // Request management
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    
    // Friendship management
    removeFriendship,
    getUserFriends,
    getPendingRequests,
    getSentRequests,
    
    // Utilities
    checkFriendshipStatus,
    getFriendStats
};