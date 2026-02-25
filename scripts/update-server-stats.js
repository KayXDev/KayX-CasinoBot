#!/usr/bin/env node

// Script para actualizar automáticamente las estadísticas de los servidores
// Se puede ejecutar con cron job o Task Scheduler de Windows

const fetch = require('node-fetch')

async function updateServerStats() {
  try {
    console.log('🔄 Iniciando actualización de estadísticas de servidores...')
    
    const response = await fetch('http://localhost:3000/api/discord/update-servers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'default-key'}`
      }
    })

    const data = await response.json()

    if (data.success) {
      console.log('✅ Actualización completada:', data.message)
      console.log('📊 Estadísticas:', data.stats)
    } else {
      console.error('❌ Error en la actualización:', data.error)
    }

  } catch (error) {
    console.error('💥 Error ejecutando actualización:', error.message)
  }
}

// Ejecutar actualización
updateServerStats()