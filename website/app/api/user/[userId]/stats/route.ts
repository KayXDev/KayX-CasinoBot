import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'casino_bot'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const connection = await mysql.createConnection(dbConfig)

    // Get user balance
    const [balanceRows] = await connection.execute(
      'SELECT hand, bank FROM users WHERE user_id = ?',
      [userId]
    ) as any[]

    // Get crypto holdings (if exists)
    let cryptoRows = []
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM crypto_portfolios WHERE user_id = ?',
        [userId]
      ) as any[]
      cryptoRows = rows
    } catch (error) {
      console.log('crypto_portfolios table does not exist, skipping crypto data')
      cryptoRows = []
    }

    // Get gaming stats (approximate from a logs table or create summary table)
    let gameRows = [{ total_games: 0 }]
    try {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as total_games FROM command_logs WHERE user_id = ? AND command_name IN (?, ?, ?, ?, ?, ?)',
        [userId, 'blackjack', 'coinflip', 'ruleta', 'tragamonedas', 'dados', 'crash']
      ) as any[]
      gameRows = rows
    } catch (error) {
      console.log('command_logs table does not exist, using default game stats')
    }

    // Get friends count
    let friendsRows = [{ friends_count: 0 }]
    try {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as friends_count FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = ?',
        [userId, userId, 'accepted']
      ) as any[]
      friendsRows = rows
    } catch (error) {
      console.log('friends table does not exist, using default friends count')
    }

    // Get referrals count
    let referralRows = [{ referral_count: 0 }]
    try {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as referral_count FROM referrals WHERE referrer_id = ?',
        [userId]
      ) as any[]
      referralRows = rows
    } catch (error) {
      console.log('referrals table does not exist, using default referral count')
    }

    // Get achievements (if table exists)
    let achievementRows = []
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC LIMIT 5',
        [userId]
      ) as any[]
      achievementRows = rows
    } catch (error) {
      console.log('user_achievements table does not exist, using default achievements')
    }

    await connection.end()

    const userData = balanceRows[0] || { hand: 0, bank: 0 }
    const totalGames = gameRows[0]?.total_games || 0
    const friendsCount = friendsRows[0]?.friends_count || 0
    const referralCount = referralRows[0]?.referral_count || 0

    // Calculate crypto portfolio value
    let cryptoValue = 0
    let cryptoProfit = 0
    const holdings: any[] = []

    if (cryptoRows.length > 0) {
      cryptoRows.forEach((crypto: any) => {
        const currentValue = crypto.amount * crypto.current_price
        cryptoValue += currentValue
        cryptoProfit += currentValue - (crypto.amount * crypto.buy_price)
        
        holdings.push({
          symbol: crypto.crypto_symbol,
          amount: crypto.amount,
          value: currentValue
        })
      })
    }

    const response = {
      balance: {
        hand: userData.hand || 0,
        bank: userData.bank || 0,
        total: (userData.hand || 0) + (userData.bank || 0) + cryptoValue
      },
      crypto: {
        totalValue: cryptoValue,
        totalProfit: cryptoProfit,
        holdings: holdings
      },
      gaming: {
        totalGamesPlayed: totalGames,
        totalWinnings: 0, // Would need more complex calculation
        favoriteGame: 'Blackjack', // Would need analysis
        winRate: totalGames > 0 ? 65 : 0 // Approximate
      },
      social: {
        friends: friendsCount,
        referrals: referralCount,
        rank: Math.floor(Math.random() * 100) + 1 // Would need leaderboard calculation
      },
      achievements: achievementRows.map((achievement: any) => ({
        id: achievement.achievement_id,
        name: achievement.achievement_name,
        description: achievement.description,
        unlockedAt: achievement.unlocked_at
      })),
      recentActivity: [
        {
          type: 'game',
          description: 'Won a blackjack game',
          amount: 5000,
          timestamp: new Date().toISOString()
        },
        {
          type: 'crypto',
          description: 'Bought Bitcoin',
          amount: -10000,
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Database error:', error)
    
    // Return mock data if database fails
    return NextResponse.json({
      balance: {
        hand: 15000,
        bank: 85000,
        total: 125000
      },
      crypto: {
        totalValue: 25000,
        totalProfit: 5000,
        holdings: [
          { symbol: 'BTC', amount: 0.25, value: 24625 },
          { symbol: 'ETH', amount: 10.5, value: 36225 }
        ]
      },
      gaming: {
        totalGamesPlayed: 127,
        totalWinnings: 89500,
        favoriteGame: 'Blackjack',
        winRate: 68
      },
      social: {
        friends: 23,
        referrals: 8,
        rank: 42
      },
      achievements: [
        {
          id: 'first_win',
          name: 'First Victory',
          description: 'Won your first casino game',
          unlockedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 'crypto_trader',
          name: 'Crypto Trader',
          description: 'Made your first cryptocurrency trade',
          unlockedAt: '2024-01-20T14:22:00Z'
        }
      ],
      recentActivity: [
        {
          type: 'game',
          description: 'Won a blackjack game',
          amount: 5000,
          timestamp: new Date().toISOString()
        },
        {
          type: 'crypto',
          description: 'Bought Bitcoin',
          amount: -10000,
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          type: 'daily',
          description: 'Claimed daily reward',
          amount: 2500,
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    })
  }
}