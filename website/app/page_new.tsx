'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  Gamepad2, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  Gift,
  BarChart3,
  Crown,
  Sparkles,
  Lock,
  Star,
  ArrowRight,
  CheckCircle,
  Flame,
  Diamond,
  Target,
  Rocket,
  Trophy,
  PlayCircle,
  ArrowUpRight,
  Eye,
  Heart,
  MessageCircle,
  Coins,
  ChevronRight
} from 'lucide-react'

const features = [
  {
    icon: Gamepad2,
    title: 'Casino Games',
    description: 'Blackjack, Roulette, Slots, Dice y más juegos emocionantes para jugar con amigos.',
    color: 'from-red-500 to-pink-500',
    stats: '15+ Juegos'
  },
  {
    icon: TrendingUp,
    title: 'Crypto Trading',
    description: 'Opera criptomonedas virtuales con simulación de mercado en tiempo real.',
    color: 'from-green-500 to-emerald-500',
    stats: '50+ Cryptos'
  },
  {
    icon: Users,
    title: 'Social Features',
    description: 'Agrega amigos, compite en leaderboards y participa en eventos comunitarios.',
    color: 'from-blue-500 to-cyan-500',
    stats: '10K+ Usuarios'
  },
  {
    icon: Shield,
    title: 'Bank Heists',
    description: 'Planifica y ejecuta atracos audaces con minijuegos únicos y emocionantes.',
    color: 'from-purple-500 to-violet-500',
    stats: '8 Bancos'
  },
  {
    icon: Gift,
    title: 'Rewards System',
    description: 'Recompensas diarias, bonos semanales y sistema de logros para mantenerte activo.',
    color: 'from-amber-500 to-orange-500',
    stats: '100+ Rewards'
  },
  {
    icon: Zap,
    title: 'Real-time Events',
    description: 'Eventos dinámicos que afectan la economía del juego y crean oportunidades únicas.',
    color: 'from-indigo-500 to-purple-500',
    stats: 'Live 24/7'
  }
]

const stats = [
  { label: 'Jugadores Activos', value: '10,847', icon: Users },
  { label: 'Juegos Jugados', value: '2.4M', icon: Gamepad2 },
  { label: 'Dinero Ganado', value: '$124M', icon: Coins },
  { label: 'Eventos Completados', value: '58,392', icon: Trophy }
]

const testimonials = [
  {
    name: 'Gaming Master',
    avatar: 'https://ui-avatars.com/api/?name=Gaming+Master&size=48&background=6366f1&color=ffffff',
    text: 'El mejor bot de casino que he usado. Los gráficos son increíbles y la experiencia es súper fluida.',
    verified: true,
    rating: 5
  },
  {
    name: 'Crypto King',
    avatar: 'https://ui-avatars.com/api/?name=Crypto+King&size=48&background=10b981&color=ffffff',
    text: 'Me encanta el sistema de trading. Es muy realista y he aprendido mucho sobre criptomonedas.',
    verified: false,
    rating: 5
  },
  {
    name: 'Casino Expert',
    avatar: 'https://ui-avatars.com/api/?name=Casino+Expert&size=48&background=f59e0b&color=ffffff',
    text: 'Los heists son adictivos y el sistema de recompensas me mantiene jugando todos los días.',
    verified: true,
    rating: 4
  }
]

export default function HomePage() {
  const { data: session } = useSession()
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-casino-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section Ultra Modern */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="text-center">
            {/* Badge animado */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-casino-500/20 via-purple-500/20 to-pink-500/20 border border-casino-400/30 backdrop-blur-xl mb-8 group hover:scale-105 transition-all duration-300"
            >
              <Rocket className="w-5 h-5 text-casino-400 mr-3 group-hover:translate-y-[-2px] transition-transform duration-300" />
              <span className="text-casino-300 font-semibold tracking-wide">La Plataforma Gaming #1</span>
              <Sparkles className="w-4 h-4 text-purple-400 ml-3 animate-pulse" />
            </motion.div>

            {/* Título espectacular */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl md:text-8xl font-black mb-8 relative"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-300 to-purple-300">
                Casino Bot
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
                Discord
              </span>
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-20"></div>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light"
            >
              La experiencia de casino más <span className="text-casino-400 font-bold">avanzada</span> y 
              <span className="text-purple-400 font-bold"> emocionante</span> directamente en tu servidor de Discord
            </motion.p>

            {/* Action Buttons Espectaculares */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16"
            >
              {session ? (
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative overflow-hidden bg-gradient-to-r from-casino-600 via-casino-500 to-purple-600 hover:from-casino-500 hover:via-casino-400 hover:to-purple-500 text-white px-12 py-5 rounded-3xl font-bold text-xl transition-all duration-300 flex items-center space-x-4 shadow-2xl shadow-casino-600/25"
                  >
                    <div className="absolute inset-0 bg-white/10 transform -skew-x-12 group-hover:animate-pulse"></div>
                    <PlayCircle className="w-7 h-7 relative z-10" />
                    <span className="relative z-10">Ir al Dashboard</span>
                    <ArrowUpRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                  </motion.button>
                </Link>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => signIn('discord')}
                  className="group relative overflow-hidden bg-gradient-to-r from-casino-600 via-casino-500 to-purple-600 hover:from-casino-500 hover:via-casino-400 hover:to-purple-500 text-white px-12 py-5 rounded-3xl font-bold text-xl transition-all duration-300 flex items-center space-x-4 shadow-2xl shadow-casino-600/25"
                >
                  <div className="absolute inset-0 bg-white/10 transform -skew-x-12 group-hover:animate-pulse"></div>
                  <svg className="w-7 h-7 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.201 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.2 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38z"/>
                  </svg>
                  <span className="relative z-10">Comenzar Ahora</span>
                  <ArrowUpRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                </motion.button>
              )}
              
              <Link href="/commands">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-xl border border-gray-600/50 hover:border-casino-400/50 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-3 hover:shadow-lg hover:shadow-casino-500/20"
                >
                  <span>Ver Comandos</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats animadas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => {
                const IconComponent = stat.icon
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="group text-center bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-casino-500/10"
                  >
                    <IconComponent className="w-8 h-8 text-casino-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-3xl font-black text-white mb-2 group-hover:text-casino-300 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-400 font-medium">
                      {stat.label}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-5xl font-black text-white mb-6 flex items-center justify-center"
          >
            <Flame className="w-12 h-12 text-orange-400 mr-4" />
            Características Épicas
            <Sparkles className="w-8 h-8 text-purple-400 ml-4 animate-pulse" />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Descubre todo lo que hace único a Casino Bot y por qué miles de jugadores lo eligen cada día
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative"
              >
                <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-casino-500/20 h-full">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-casino-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                  
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-casino-300 px-3 py-1 rounded-full text-xs font-bold">
                      {feature.stats}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-casino-300 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed mb-6">
                    {feature.description}
                  </p>

                  {/* Action Button */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center justify-between"
                  >
                    <div className={`bg-gradient-to-r ${feature.color} text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 group-hover:shadow-lg transition-all duration-300`}>
                      <span>Explorar</span>
                      <ArrowUpRight className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                    </div>
                  </motion.div>

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black text-white mb-6 flex items-center justify-center"
          >
            <Star className="w-12 h-12 text-yellow-400 mr-4" />
            Lo Que Dicen Los Jugadores
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 text-center"
            >
              <div className="flex justify-center mb-6">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed italic">
                "{testimonials[currentTestimonial].text}"
              </p>
              
              <div className="flex items-center justify-center space-x-4">
                <img
                  src={testimonials[currentTestimonial].avatar}
                  alt={testimonials[currentTestimonial].name}
                  className="w-12 h-12 rounded-full border-2 border-casino-400/50"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{testimonials[currentTestimonial].name}</span>
                    {testimonials[currentTestimonial].verified && (
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <span className="text-sm text-gray-400">Jugador Verificado</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Dots Indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-casino-400 w-8' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA Final */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-casino-900/50 via-purple-900/50 to-casino-900/50 backdrop-blur-xl rounded-3xl p-12 border border-casino-500/30 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-casino-500/10 to-purple-500/10 animate-pulse"></div>
          
          <div className="relative z-10">
            <h3 className="text-4xl font-black text-white mb-6">
              ¿Listo Para La Aventura?
            </h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Únete a miles de jugadores y vive la experiencia de casino más emocionante en Discord
            </p>
            
            {!session && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => signIn('discord')}
                className="group relative overflow-hidden bg-gradient-to-r from-casino-600 via-casino-500 to-purple-600 hover:from-casino-500 hover:via-casino-400 hover:to-purple-500 text-white px-12 py-5 rounded-3xl font-bold text-xl transition-all duration-300 flex items-center space-x-4 shadow-2xl shadow-casino-600/25 mx-auto"
              >
                <div className="absolute inset-0 bg-white/10 transform -skew-x-12 group-hover:animate-pulse"></div>
                <Crown className="w-7 h-7 relative z-10" />
                <span className="relative z-10">Comenzar Gratis</span>
                <Rocket className="w-6 h-6 relative z-10 group-hover:translate-y-[-2px] transition-transform duration-300" />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}