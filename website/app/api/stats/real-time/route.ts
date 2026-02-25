import { NextRequest, NextResponse } from 'next/server'
import { withCache } from '@/lib/cache'

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'casino_bot',
}

async function statsHandler(request: NextRequest) {
  try {
    let mysql
    try {
      mysql = require('mysql2/promise')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Database module not available',
        users: 10000,
        coins: 50000000 
      })
    }

    console.log('📊 Fetching real-time stats...')

    // 1. Obtener miembros del servidor Discord
    let serverMembers = 10000 // Fallback por defecto
    
    try {
      const guildId = process.env.DISCORD_GUILD_ID || '1382476289151336460'
      const botToken = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN
      
      if (botToken) {
        console.log('🔍 Fetching Discord guild members...')
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const guildData = await response.json()
          serverMembers = guildData.approximate_member_count || guildData.member_count || 10000
          console.log(`✅ Discord members: ${serverMembers}`)
        } else {
          console.log(`⚠️ Discord API failed: ${response.status} ${response.statusText}`)
        }
      } else {
        console.log('⚠️ No Discord bot token available')
      }
    } catch (discordError) {
      console.error('❌ Error fetching Discord members:', discordError)
    }

    // 2. Obtener monedas en circulación desde la base de datos
    let totalCoins = 50000000 // Fallback por defecto
    
    try {
      const connection = await mysql.createConnection(dbConfig)
      
      console.log('💰 Calculating total coins in circulation...')
      
      // Sumar todas las monedas de los usuarios (hand = dinero en mano, bank = dinero en banco)
      const [coinResult] = await connection.execute(`
        SELECT 
          COALESCE(SUM(hand), 0) as total_hand,
          COALESCE(SUM(bank), 0) as total_bank,
          COUNT(*) as total_users
        FROM users 
        WHERE hand > 0 OR bank > 0
      `)
      
      await connection.end()
      
      if (coinResult && coinResult.length > 0) {
        const data = coinResult[0] as any
        console.log('🔍 Raw database result:', data)
        
        // Convertir a números para asegurar la suma correcta
        const totalHand = Number(data.total_hand) || 0
        const totalBank = Number(data.total_bank) || 0
        
        console.log('💵 Total hand money (converted):', totalHand)
        console.log('🏦 Total bank money (converted):', totalBank)
        
        totalCoins = totalHand + totalBank
        console.log(`✅ Total coins in circulation: ${totalCoins}`)
        console.log(`✅ Total coins formatted: ${totalCoins.toLocaleString()}`)
        console.log(`📈 Total users with coins: ${data.total_users}`)
      }
    } catch (dbError) {
      console.error('❌ Error fetching coin data:', dbError)
    }

    // 3. Datos adicionales para las tarjetas
    const stats = {
      // Estadísticas principales
      activeUsers: serverMembers,
      coinsInCirculation: totalCoins,
      
      // Estadísticas formateadas para mostrar
      formattedUsers: formatNumber(serverMembers),
      formattedCoins: formatNumber(Number(totalCoins)), // Asegurar conversión a número
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      serverGrowth: '+5.2%', // Puedes calcularlo comparando con datos anteriores
      coinGrowth: '+12.8%'   // Igual aquí
    }

    console.log('📊 Stats generated:', stats)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('❌ Error generating stats:', error)
    
    // Devolver datos por defecto en caso de error
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        activeUsers: 10000,
        coinsInCirculation: 50000000,
        formattedUsers: '10K+',
        formattedCoins: '50M+',
        lastUpdated: new Date().toISOString(),
        serverGrowth: '+5.2%',
        coinGrowth: '+12.8%'
      }
    })
  }
}

// Función para formatear números grandes
function formatNumber(num: number): string {
  console.log(`🔢 Formatting number: ${num} (type: ${typeof num})`)
  
  if (num >= 1000000000) {
    const formatted = (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B+'
    console.log(`📊 Formatted as billion: ${formatted}`)
    return formatted
  }
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+'
    console.log(`📊 Formatted as million: ${formatted}`)
    return formatted
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+'
    console.log(`📊 Formatted as thousand: ${formatted}`)
    return formatted
  }
  const formatted = num.toString()
  console.log(`📊 Formatted as regular number: ${formatted}`)
  return formatted
}

// Exportar con cache de 2 minutos
export const GET = withCache(statsHandler, 120)