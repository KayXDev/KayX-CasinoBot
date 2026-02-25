import { useState, useEffect, useCallback, useMemo } from 'react'

interface Stats {
  activeUsers: number
  coinsInCirculation: number
  formattedUsers: string
  formattedCoins: string
  serverGrowth: string
  coinGrowth: string
}

// Cache para evitar fetch innecesarios
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutos
let statsCache: { data: Stats; timestamp: number } | null = null

export function useOptimizedStats() {
  const [stats, setStats] = useState<Stats>({
    activeUsers: 10000,
    coinsInCirculation: 50000000,
    formattedUsers: '10K+',
    formattedCoins: '50M+',
    serverGrowth: '+5.2%',
    coinGrowth: '+12.8%'
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const fetchStats = useCallback(async () => {
    // Verificar cache primero
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_DURATION) {
      setStats(statsCache.data)
      setIsLoadingStats(false)
      return
    }

    try {
      setIsLoadingStats(true)
      const response = await fetch('/api/stats/real-time')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.stats) {
          setStats(data.stats)
          // Actualizar cache
          statsCache = {
            data: data.stats,
            timestamp: Date.now()
          }
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    
    // Reducir frecuencia de actualizaciones a 3 minutos
    const interval = setInterval(fetchStats, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return useMemo(() => ({ 
    stats, 
    isLoadingStats, 
    refreshStats: fetchStats 
  }), [stats, isLoadingStats, fetchStats])
}