'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Coins,
  TrendingUp,
  Users,
  Trophy,
  ShoppingBag,
  BarChart3,
  Calendar,
  Gift,
  Shield,
  Zap,
  Settings,
  RefreshCw,
  Gamepad2,
  Star,
  Award,
  Target
} from 'lucide-react'
import Image from 'next/image'

interface ExtendedSession {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface UserStats {
  balance: {
    hand: number
    bank: number
    total: number
  }
  crypto: {
    totalValue: number
    totalProfit: number
    holdings: Array<{
      symbol: string
      amount: number
      value: number
    }>
  }
  gaming: {
    totalGamesPlayed: number
    totalWinnings: number
    favoriteGame: string
    winRate: number
  }
  social: {
    friends: number
    referrals: number
  }
  achievements: Array<{
    id: number
    name: string
    description: string
    rarity: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null, status: string }
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserStats = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/user/${session.user.id}/stats`)
      const data = await response.json()
      
      if (data.success) {
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserStats()
    }
  }, [session])

  const refreshStats = () => {
    fetchUserStats()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-casino-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Acceso Requerido</h2>
          <p className="text-gray-400">Necesitas iniciar sesión con Discord para acceder al dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Image
                  src={session.user?.image || '/default-avatar.svg'}
                  alt={session.user?.name || 'User'}
                  width={80}
                  height={80}
                  className="rounded-full border-4 border-white/20 shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
              </div>
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">
                  ¡Bienvenido de vuelta!
                </h1>
                <p className="text-xl text-white/80">
                  {session.user?.name} - Dashboard del Casino Bot
                </p>
              </div>
            </div>
            <button
              onClick={refreshStats}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm border border-white/20"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Stats Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Balance Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <div className="bg-gradient-to-r from-casino-500 to-purple-600 p-3 rounded-xl mr-4">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    Balance General
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-green-400 font-medium">Dinero en Mano</p>
                      <Coins className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      💰 {userStats?.balance.hand?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-blue-400 font-medium">Banco</p>
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      🏦 {userStats?.balance.bank?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-purple-400 font-medium">Total</p>
                      <Trophy className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      💎 {userStats?.balance.total?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Gaming Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-xl mr-4">
                      <Gamepad2 className="w-6 h-6 text-white" />
                    </div>
                    Estadísticas de Juego
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-orange-500/20 rounded-xl p-4 mb-3">
                      <Target className="w-8 h-8 text-orange-400 mx-auto" />
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Juegos Jugados</p>
                    <p className="text-2xl font-bold text-white">{userStats?.gaming.totalGamesPlayed || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-500/20 rounded-xl p-4 mb-3">
                      <TrendingUp className="w-8 h-8 text-green-400 mx-auto" />
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Ganancias Totales</p>
                    <p className="text-2xl font-bold text-white">{userStats?.gaming.totalWinnings?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-500/20 rounded-xl p-4 mb-3">
                      <BarChart3 className="w-8 h-8 text-blue-400 mx-auto" />
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Tasa de Victoria</p>
                    <p className="text-2xl font-bold text-white">{userStats?.gaming.winRate || 0}%</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-500/20 rounded-xl p-4 mb-3">
                      <Star className="w-8 h-8 text-purple-400 mx-auto" />
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Juego Favorito</p>
                    <p className="text-lg font-bold text-white">{userStats?.gaming.favoriteGame || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>

              {/* Crypto Portfolio */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-3 rounded-xl mr-4">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    Portfolio de Cripto
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/10 border border-yellow-500/20 rounded-xl p-6">
                    <p className="text-yellow-400 font-medium mb-2">Valor Total</p>
                    <p className="text-3xl font-bold text-white">
                      ₿ {userStats?.crypto.totalValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-500/20 rounded-xl p-6">
                    <p className="text-green-400 font-medium mb-2">Ganancia Total</p>
                    <p className="text-3xl font-bold text-white">
                      📈 {userStats?.crypto.totalProfit?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                
                {userStats?.crypto.holdings && userStats.crypto.holdings.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white mb-4">Holdings Actuales</h3>
                    {userStats.crypto.holdings.slice(0, 5).map((holding, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-casino-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{holding.symbol.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{holding.symbol}</p>
                            <p className="text-gray-400 text-sm">{holding.amount} tokens</p>
                          </div>
                        </div>
                        <p className="text-green-400 font-semibold">${holding.value?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No tienes holdings de cripto aún</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-casino-400" />
                  Estadísticas Rápidas
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">Amigos</span>
                    </div>
                    <span className="text-white font-semibold">{userStats?.social.friends || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="w-4 h-4 text-green-400" />
                      <span className="text-gray-400">Referencias</span>
                    </div>
                    <span className="text-white font-semibold">{userStats?.social.referrals || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400">Logros</span>
                    </div>
                    <span className="text-white font-semibold">{userStats?.achievements?.length || 0}</span>
                  </div>
                </div>
              </motion.div>

              {/* Recent Achievements */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  Logros Recientes
                </h3>
                {userStats?.achievements && userStats.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.achievements.slice(0, 3).map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 bg-white/5 rounded-lg p-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{achievement.name}</p>
                          <p className="text-gray-400 text-xs">{achievement.rarity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">¡Juega para conseguir logros!</p>
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-casino-400" />
                  Acciones Rápidas
                </h3>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200">
                    <ShoppingBag className="w-4 h-4 inline mr-2" />
                    Ir a la Tienda
                  </button>
                  <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200">
                    <Gamepad2 className="w-4 h-4 inline mr-2" />
                    Jugar Ahora
                  </button>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200">
                    <Users className="w-4 h-4 inline mr-2" />
                    Ver Amigos
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}