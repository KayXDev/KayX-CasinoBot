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

      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
              <Terminal className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">Comandos Disponibles</span>
              <Command className="w-4 h-4 text-white ml-2" />
            </div>
            
            <h1 className="text-5xl font-black text-white mb-4">
              Comandos Casino Bot
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Descubre todos los comandos disponibles para crear la experiencia perfecta en tu servidor
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-12">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar comandos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-casino-500/20 text-casino-300 px-2 py-1 rounded-lg text-xs font-medium">
            {commandCategories.reduce((total, cat) => total + cat.commands.length, 0)} comandos
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {commandCategories.map((category) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-casino-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{category.name}</span>
                <span className="text-xs opacity-75">({category.commands.length})</span>
              </button>
            )
          })}
        </div>

        {/* Commands Display */}
        {selectedCategoryData && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 mb-6">
              <selectedCategoryData.icon className={`w-8 h-8 text-white p-1.5 rounded-lg bg-gradient-to-r ${selectedCategoryData.color}`} />
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCategoryData.name}</h2>
                <p className="text-gray-400 text-sm">{selectedCategoryData.description}</p>
              </div>
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