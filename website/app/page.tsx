'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Dice6, TrendingUp, Users, Zap, Shield, Bot, Star, Crown, Trophy, Gift, Sparkles, Play, ArrowRight, Check, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'

export default function HomePage() {
  const [currentStat, setCurrentStat] = useState(0)
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState({
    activeUsers: 10000,
    coinsInCirculation: 50000000,
    formattedUsers: '10K+',
    formattedCoins: '50M+',
    serverGrowth: '+5.2%',
    coinGrowth: '+12.8%'
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Memoizar features para evitar recrearlas en cada render
  const features = useMemo(() => [
    {
      icon: <Dice6 className="h-8 w-8" />,
      title: 'Casino Games',
      description: 'Blackjack, Roulette, Slots, Crash and much more',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: 'Crypto System',
      description: 'Real-time cryptocurrency trading',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Social System',
      description: 'Friends, trading and competitions',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Advanced Security',
      description: 'Anti-fraud system and user protection',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: 'Daily Rewards',
      description: 'Daily and weekly bonuses',
      color: 'from-purple-500 to-violet-500'
    },
    {
      icon: <Bot className="h-8 w-8" />,
      title: 'Smart Bot',
      description: 'Advanced AI for the best experience',
      color: 'from-cyan-500 to-blue-500'
    }
  ], [])

  // Memoizar games para evitar recrearlas en cada render
  const games = useMemo(() => [
    { name: 'Blackjack', icon: '🃏', players: '2.1K+' },
    { name: 'Roulette', icon: '🎰', players: '1.8K+' },
    { name: 'Crash', icon: '🚀', players: '3.2K+' },
    { name: 'Dice', icon: '🎲', players: '1.5K+' },
    { name: 'Slots', icon: '🎰', players: '2.8K+' }
  ], [])

  // Efecto para alternar estadísticas
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Efecto para cargar estadísticas
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true)
        const response = await fetch('/api/stats/real-time')
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.stats) {
            setStats(data.stats)
          }
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 3 * 60 * 1000) // cada 3 minutos
    return () => clearInterval(interval)
  }, [])

  // Efecto para cargar reviews (con debounce)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const fetchReviews = async () => {
      try {
        console.log('🔄 Fetching real reviews from API...')
        const response = await fetch('/api/reviews')
        
        if (response.ok) {
          const data = await response.json()
          console.log('📝 Reviews API response:', data)
          
          if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
            const validReviews = data.reviews
              .filter((review: any) => review && (review.author || review.username) && review.id)
              .slice(0, 3)
              .map((review: any) => ({
                id: review.id,
                author: review.author || review.username || 'User',
                rating: review.rating || 5,
                comment: review.content || review.comment || 'Great experience!',
                avatar: review.avatar || null
              }))
            
            console.log('✅ Using real reviews:', validReviews)
            setReviews(validReviews)
            return
          }
        }
        
        console.log('⚠️ No reviews found or API issue, using minimal fallback')
        // Solo usar fallback si NO hay reviews reales
        setReviews([])
        
      } catch (error) {
        console.log('❌ Reviews API error:', error)
        // En caso de error de red, no mostrar reviews
        setReviews([])
      }
    }

    // Debounce la carga de reviews
    timeoutId = setTimeout(fetchReviews, 100)
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-x-hidden">
      {/* Floating Elements Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-casino-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3] 
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.3, 0.6] 
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center mb-6">
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-20 h-20 bg-gradient-to-r from-casino-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                  <Dice6 className="h-10 w-10 text-white" />
                </div>
              </motion.div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Casino Bot
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The most advanced Discord casino bot with{' '}
              <span className="text-casino-400 font-semibold">crypto trading</span>,{' '}
              <span className="text-purple-400 font-semibold">social features</span> and{' '}
              <span className="text-pink-400 font-semibold">epic games</span>
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <a href="https://discord.gg/GWzUSqqVuq" target="_blank" rel="noopener noreferrer" className="group">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-casino-500 to-casino-600 hover:from-casino-600 hover:to-casino-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>Join Now</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </a>
            
            <Link href="/commands" className="group">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-white font-bold py-4 px-8 rounded-xl border border-gray-600 hover:border-casino-500/50 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <MessageCircle className="h-5 w-5" />
                <span>View Commands</span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Live Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-casino-500/50 transition-all duration-300"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-casino-400 to-purple-400 bg-clip-text text-transparent mb-4">
                {isLoadingStats ? (
                  <span className="animate-pulse">•••</span>
                ) : (
                  stats.formattedUsers
                )}
              </div>
              <div className="text-white text-xl font-semibold mb-2">Active Users</div>
              <div className="text-gray-400">
                {isLoadingStats ? 'Loading...' : `${stats.activeUsers.toLocaleString()} members on server`}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-casino-500/50 transition-all duration-300"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-casino-400 to-purple-400 bg-clip-text text-transparent mb-4">
                {isLoadingStats ? (
                  <span className="animate-pulse">•••</span>
                ) : (
                  stats.formattedCoins
                )}
              </div>
              <div className="text-white text-xl font-semibold mb-2">Coins in Circulation</div>
              <div className="text-gray-400">
                {isLoadingStats ? 'Loading...' : `${stats.coinsInCirculation.toLocaleString()} total coins`}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose <span className="text-casino-400">Casino Bot</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of Discord gaming with our advanced features and secure platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-casino-500/50 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Showcase */}
      <section className="py-24 px-4 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Popular <span className="text-purple-400">Games</span>
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of players in our exciting casino games
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {games.map((game, index) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="text-4xl mb-3">{game.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{game.name}</h3>
                <p className="text-purple-400 text-sm">{game.players} playing</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section - Solo mostrar si hay reviews reales */}
      {reviews.length > 0 && (
        <section className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                What <span className="text-yellow-400">Players</span> Say
              </h2>
              <p className="text-xl text-gray-300">
                Join our amazing community of satisfied players
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {reviews.filter(review => review && review.author && review.id).map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-yellow-500/50 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {review.author ? review.author[0]?.toUpperCase() : '?'}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{review.author || 'Anonymous'}</h4>
                      <div className="flex text-yellow-400">
                        {[...Array(review.rating || 5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">"{review.comment || 'Great experience!'}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 px-4 bg-gradient-to-r from-casino-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to <span className="text-casino-400">Get Started</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of players and start your casino adventure today
            </p>
            
            <Link href="/guides">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-casino-500 via-purple-500 to-pink-500 hover:from-casino-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-6 px-12 rounded-2xl shadow-2xl transition-all duration-300 text-xl"
              >
                Get Started
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}