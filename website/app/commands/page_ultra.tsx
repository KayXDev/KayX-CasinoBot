'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Copy, 
  Check, 
  Gamepad2, 
  TrendingUp, 
  Users, 
  Gift, 
  Shield, 
  ShoppingBag, 
  Star,
  Crown,
  Zap,
  Filter,
  Command,
  Terminal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Flame,
  ArrowUpRight,
  BarChart3,
  Lock,
  Rocket,
  Trophy,
  Target
} from 'lucide-react'

const commandCategories = [
  {
    id: 'casino',
    name: 'Casino Games',
    icon: Gamepad2,
    color: 'from-red-500 to-pink-500',
    stats: '15+ Juegos',
    description: 'Juegos emocionantes de casino con gráficos espectaculares',
    commands: [
      {
        name: '/blackjack',
        description: 'Juega una partida de blackjack con cartas visuales',
        usage: '/blackjack <cantidad>',
        example: '/blackjack 1000',
        cooldown: 'Ninguno',
        featured: true
      },
      {
        name: '/coinflip',
        description: 'Lanza una moneda y apuesta al resultado',
        usage: '/coinflip <cantidad> <cara|cruz|borde>',
        example: '/coinflip 500 cara',
        cooldown: 'Ninguno'
      },
      {
        name: '/ruleta',
        description: 'Juega ruleta con múltiples opciones de apuesta',
        usage: '/ruleta <cantidad> <apuesta>',
        example: '/ruleta 2000 rojo',
        cooldown: 'Ninguno'
      },
      {
        name: '/tragamonedas',
        description: 'Prueba tu suerte en las máquinas tragamonedas',
        usage: '/tragamonedas <cantidad>',
        example: '/tragamonedas 1500',
        cooldown: 'Ninguno'
      },
      {
        name: '/dados',
        description: 'Lanza dados y apuesta por el resultado',
        usage: '/dados <cantidad>',
        example: '/dados 800',
        cooldown: 'Ninguno'
      },
      {
        name: '/crash',
        description: 'Apuesta cuándo se va a crashear el multiplicador',
        usage: '/crash <cantidad>',
        example: '/crash 1200',
        cooldown: 'Ninguno'
      }
    ]
  },
  {
    id: 'economy',
    name: 'Economía',
    icon: Gift,
    color: 'from-green-500 to-emerald-500',
    stats: '20+ Comandos',
    description: 'Gestiona tu dinero virtual y obtén recompensas',
    commands: [
      {
        name: '/balance',
        description: 'Verifica tu balance o el de otro usuario',
        usage: '/balance [usuario]',
        example: '/balance @amigo',
        cooldown: 'Ninguno',
        featured: true
      },
      {
        name: '/daily',
        description: 'Reclama tu recompensa diaria',
        usage: '/daily',
        example: '/daily',
        cooldown: '24 horas'
      },
      {
        name: '/weekly',
        description: 'Reclama tu recompensa semanal',
        usage: '/weekly',
        example: '/weekly',
        cooldown: '7 días'
      },
      {
        name: '/give',
        description: 'Transfiere dinero a otro usuario',
        usage: '/give <usuario> <cantidad>',
        example: '/give @amigo 5000',
        cooldown: 'Ninguno'
      },
      {
        name: '/rob',
        description: 'Intenta robar a otro usuario',
        usage: '/rob <usuario>',
        example: '/rob @victim',
        cooldown: '1 hora'
      }
    ]
  },
  {
    id: 'crypto',
    name: 'Crypto Trading',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
    stats: '50+ Cryptos',
    description: 'Opera criptomonedas virtuales con mercados en tiempo real',
    commands: [
      {
        name: '/crypto-market',
        description: 'Ve el mercado de criptomonedas actual',
        usage: '/crypto-market [crypto]',
        example: '/crypto-market BTC',
        cooldown: 'Ninguno',
        featured: true
      },
      {
        name: '/crypto-buy',
        description: 'Compra criptomonedas',
        usage: '/crypto-buy <crypto> <cantidad>',
        example: '/crypto-buy ETH 10',
        cooldown: '30 segundos'
      },
      {
        name: '/crypto-sell',
        description: 'Vende tus criptomonedas',
        usage: '/crypto-sell <crypto> <cantidad>',
        example: '/crypto-sell BTC 5',
        cooldown: '30 segundos'
      },
      {
        name: '/crypto-portfolio',
        description: 'Ve tu portafolio de criptomonedas',
        usage: '/crypto-portfolio',
        example: '/crypto-portfolio',
        cooldown: 'Ninguno'
      }
    ]
  },
  {
    id: 'heists',
    name: 'Bank Heists',
    icon: Shield,
    color: 'from-purple-500 to-violet-500',
    stats: '8 Bancos',
    description: 'Planifica y ejecuta atracos épicos con minijuegos',
    commands: [
      {
        name: '/robbank',
        description: 'Atraca un banco con minijuegos únicos',
        usage: '/robbank',
        example: '/robbank',
        cooldown: '6 horas',
        featured: true
      },
      {
        name: '/heist-inventory',
        description: 'Ve tu inventario de objetos de atraco',
        usage: '/heist-inventory',
        example: '/heist-inventory',
        cooldown: 'Ninguno'
      }
    ]
  },
  {
    id: 'social',
    name: 'Social',
    icon: Users,
    color: 'from-amber-500 to-orange-500',
    stats: '10K+ Users',
    description: 'Conecta con amigos y compite en leaderboards',
    commands: [
      {
        name: '/leaderboard',
        description: 'Ve los jugadores más ricos',
        usage: '/leaderboard [tipo]',
        example: '/leaderboard money',
        cooldown: 'Ninguno',
        featured: true
      },
      {
        name: '/addfriend',
        description: 'Agrega un amigo',
        usage: '/addfriend <usuario>',
        example: '/addfriend @buddy',
        cooldown: 'Ninguno'
      },
      {
        name: '/friends',
        description: 'Ve tu lista de amigos',
        usage: '/friends',
        example: '/friends',
        cooldown: 'Ninguno'
      }
    ]
  },
  {
    id: 'shop',
    name: 'Tienda',
    icon: ShoppingBag,
    color: 'from-indigo-500 to-purple-500',
    stats: '100+ Items',
    description: 'Compra objetos, protecciones y potenciadores',
    commands: [
      {
        name: '/shop',
        description: 'Ve la tienda de objetos',
        usage: '/shop [categoría]',
        example: '/shop protection',
        cooldown: 'Ninguno',
        featured: true
      },
      {
        name: '/inventory',
        description: 'Ve tu inventario de objetos',
        usage: '/inventory',
        example: '/inventory',
        cooldown: 'Ninguno'
      }
    ]
  }
]

export default function CommandsPage() {
  const [selectedCategory, setSelectedCategory] = useState('casino')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCommand(text)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const filteredCategories = commandCategories.filter(category =>
    category.commands.some(cmd =>
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const selectedCategoryData = commandCategories.find(cat => cat.id === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-casino-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="text-center mb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-casino-500/20 via-purple-500/20 to-pink-500/20 border border-casino-400/30 backdrop-blur-xl mb-8 group hover:scale-105 transition-all duration-300"
          >
            <Terminal className="w-5 h-5 text-casino-400 mr-3 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-casino-300 font-semibold tracking-wide">Comandos Disponibles</span>
            <Command className="w-4 h-4 text-purple-400 ml-3 animate-pulse" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl md:text-8xl font-black mb-8 relative"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-300 to-purple-300">
              Comandos
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
              Épicos
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-20"></div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light"
          >
            Descubre todos los <span className="text-casino-400 font-bold">comandos disponibles</span> para 
            crear la <span className="text-purple-400 font-bold">experiencia perfecta</span> en tu servidor
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-2xl mx-auto mb-16"
          >
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Buscar comandos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl text-white text-lg placeholder-gray-400 focus:outline-none focus:border-casino-400/50 focus:shadow-lg focus:shadow-casino-500/20 transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-casino-500/20 text-casino-300 px-3 py-1 rounded-xl text-sm font-medium">
                {commandCategories.reduce((total, cat) => total + cat.commands.length, 0)} comandos
              </div>
            </div>
          </motion.div>
        </div>

        {/* Categories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16"
        >
          {filteredCategories.map((category, index) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`group relative text-left transition-all duration-300 ${
                  isSelected ? 'transform scale-105' : ''
                }`}
              >
                <div className={`relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border transition-all duration-500 h-full ${
                  isSelected 
                    ? 'border-casino-400/70 shadow-2xl shadow-casino-500/20' 
                    : 'border-gray-700/50 hover:border-casino-400/30'
                }`}>
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-casino-500/5 to-purple-500/5 transition-opacity duration-500 rounded-3xl ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                  }`}></div>
                  
                  {/* Icon & Stats */}
                  <div className="relative mb-6 flex items-start justify-between">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 ${
                      isSelected ? 'scale-110' : 'group-hover:scale-105'
                    }`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm text-casino-300 px-3 py-1 rounded-full text-xs font-bold">
                      {category.stats}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-2xl font-bold mb-3 transition-colors ${
                    isSelected ? 'text-casino-300' : 'text-white group-hover:text-casino-300'
                  }`}>
                    {category.name}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed mb-6 text-sm">
                    {category.description}
                  </p>

                  {/* Commands Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm font-medium">
                      {category.commands.length} comandos
                    </span>
                    <ChevronRight className={`w-5 h-5 transition-all duration-300 ${
                      isSelected 
                        ? 'text-casino-400 transform rotate-90' 
                        : 'text-gray-500 group-hover:text-casino-400 group-hover:translate-x-1'
                    }`} />
                  </div>

                  {/* Shimmer Effect */}
                  <div className={`absolute inset-0 transition-opacity duration-500 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Selected Category Commands */}
        {selectedCategoryData && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden"
          >
            {/* Category Header */}
            <div className="p-8 border-b border-gray-700/50 bg-gradient-to-r from-casino-900/20 to-purple-900/20">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${selectedCategoryData.color} flex items-center justify-center shadow-xl`}>
                  <selectedCategoryData.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedCategoryData.name}</h2>
                  <p className="text-gray-300">{selectedCategoryData.description}</p>
                </div>
              </div>
            </div>

            {/* Commands List */}
            <div className="p-8 space-y-4">
              {selectedCategoryData.commands
                .filter(cmd =>
                  cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((command, index) => (
                  <motion.div
                    key={command.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 hover:border-casino-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-casino-500/10 ${
                      command.featured ? 'ring-2 ring-casino-400/30 bg-gradient-to-r from-casino-900/20 to-purple-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <code className={`text-lg font-bold px-4 py-2 rounded-xl ${
                            command.featured
                              ? 'bg-gradient-to-r from-casino-500/20 to-purple-500/20 text-casino-300 border border-casino-400/30'
                              : 'bg-gray-800/70 text-casino-400'
                          }`}>
                            {command.name}
                          </code>
                          {command.featured && (
                            <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/30">
                              <Star className="w-3 h-3" />
                              <span>Popular</span>
                            </div>
                          )}
                          <div className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                            {command.cooldown}
                          </div>
                        </div>
                        
                        <p className="text-gray-300 mb-4 leading-relaxed">{command.description}</p>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-casino-400 font-semibold text-sm">Uso:</span>
                            <code className="ml-3 text-sm bg-gray-800/70 text-gray-300 px-3 py-1 rounded-lg">{command.usage}</code>
                          </div>
                          <div>
                            <span className="text-purple-400 font-semibold text-sm">Ejemplo:</span>
                            <code className="ml-3 text-sm bg-gray-800/70 text-gray-300 px-3 py-1 rounded-lg">{command.example}</code>
                          </div>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => copyToClipboard(command.name)}
                        className="ml-6 p-3 bg-gradient-to-r from-casino-600/80 to-casino-500/80 hover:from-casino-500 hover:to-casino-400 text-white rounded-xl transition-all duration-300 hover:shadow-lg"
                      >
                        {copiedCommand === command.name ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}