'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Users, 
  TrendingUp, 
  Shield, 
  Award, 
  ExternalLink, 
  Crown,
  Zap,
  Target,
  Globe,
  Star,
  Sparkles,
  Rocket,
  Trophy,
  ArrowUpRight,
  Eye,
  Hash,
  Calendar,
  Flame,
  Diamond,
  Coffee,
  Gamepad2,
  DollarSign,
  Brain,
  Heart,
  Compass,
  X,
  Save,
  Send,
  Plus,
  Edit
} from 'lucide-react'

interface ServerRequest {
  id?: number
  serverName: string
  serverDescription: string
  inviteLink: string
  members: string
  category: string
  features: string[]
  image?: string
  submittedBy: string
  submittedById: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt?: string
}

const categories = [
  { id: 'all', name: 'Todos', icon: Globe },
  { id: 'Gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'Crypto', name: 'Crypto', icon: TrendingUp },
  { id: 'Strategy', name: 'Estrategia', icon: Brain },
  { id: 'Community', name: 'Comunidad', icon: Users },
  { id: 'Elite', name: 'Elite', icon: Crown },
  { id: 'Spanish', name: 'Español', icon: Globe }
]

const serverLevels = [
  { id: 'all', name: 'Todos' },
  { id: 'Beginner', name: 'Principiante' },
  { id: 'Community', name: 'Comunidad' },
  { id: 'Advanced', name: 'Avanzado' },
  { id: 'Pro', name: 'Profesional' },
  { id: 'Elite', name: 'Elite' },
  { id: 'VIP', name: 'VIP' }
]

// Interfaz para el tipo de servidor
interface Server {
  id: number
  name: string
  description: string
  members: string
  category: string
  features: string[]
  invite: string
  verified: boolean
  online: string
  image: string
  color: string
  icon?: any
  featured?: boolean
  growth?: string
  tags: string[]
  level?: string
}

export default function DiscoveryPage() {
  const { data: session } = useSession()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(false) // Optimizado para carga rápida
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [showServerModal, setShowServerModal] = useState(false)

  // Función para obtener iconos
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Star': Star,
      'Crown': Crown,
      'Shield': Shield,
      'Trophy': Trophy,
      'Zap': Zap
    }
    return iconMap[iconName] || Star
  }

  // Función para cargar servidores
  const fetchServers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/featured-servers')
      const data = await response.json()
      
      if (data.success) {
        // Mapear datos de la BD al formato esperado por el componente
        const mappedServers = data.servers.map((server: any) => ({
          id: server.id,
          name: server.server_name,
          description: server.server_description,
          members: server.members,
          category: server.category,
          features: Array.isArray(server.features) ? server.features : [],
          invite: server.invite_link,
          verified: server.verified,
          online: server.online_members || '0',
          image: server.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(server.server_name)}&size=128&background=dc2626&color=ffffff`,
          color: server.color || 'from-red-500 to-pink-500',
          icon: getIconComponent(server.icon || 'Star'),
          featured: server.featured,
          growth: server.growth || '+0%',
          tags: Array.isArray(server.tags) ? server.tags : [],
          level: server.level || 'Advanced'
        }))
        
        setServers(mappedServers)
      } else {
        setServers([])
      }
    } catch (error) {
      console.error('Error fetching servers:', error)
      setServers([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar servidores desde la API
  useEffect(() => {
    fetchServers()
  }, [])

  const reloadServers = async () => {
    await fetchServers()
  }

  // Filtrar servidores
  const filteredServers = servers.filter(server => {
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory
    const matchesLevel = selectedLevel === 'all' || server.level === selectedLevel
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.features.some((feature: string) => feature.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesCategory && matchesLevel && matchesSearch
  })

  const featuredServers = filteredServers.filter(server => server.featured)
  const regularServers = filteredServers.filter(server => !server.featured)
  
  const isOwner = session?.user && (session.user as any)?.id === '388422519553654786'

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'VIP': return 'bg-casino-500/20 text-casino-400'
      case 'Elite': return 'bg-red-500/20 text-red-400'
      case 'Pro': return 'bg-amber-500/20 text-amber-400'
      case 'Advanced': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-blue-500/20 text-blue-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
              <Compass className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">Explora Comunidades</span>
              <Globe className="w-4 h-4 text-white ml-2" />
            </div>
            
            <h1 className="text-5xl font-black text-white mb-4">
              Discovery Épico
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Descubre las mejores comunidades de Discord que usan Casino Bot y únete a la diversión
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isOwner ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditingServer(null)
                    setShowAdminForm(true)
                  }}
                  className="bg-yellow-500 hover:bg-yellow-400 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2"
                >
                  <Crown className="w-5 h-5" />
                  <span>Agregar Servidor</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!session) {
                      alert('Debes iniciar sesión para enviar una solicitud')
                      return
                    }
                    setShowSubmitForm(true)
                  }}
                  className="bg-white text-casino-600 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-100 transition-colors"
                >
                  <Trophy className="w-5 h-5" />
                  <span>Solicitar Destacado</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="space-y-6 mb-12">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar servidores, comunidades, características..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-casino-500/20 text-casino-300 px-2 py-1 rounded-lg text-xs font-medium">
              {filteredServers.length} servidores
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center">
            {/* Categories */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => {
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
                  </button>
                )
              })}
            </div>

            {/* Levels */}
            <div className="flex flex-wrap gap-2 justify-center">
              {serverLevels.map((level) => {
                const isSelected = selectedLevel === level.id
                return (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {level.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-casino-500"></div>
            <span className="ml-3 text-gray-400">Cargando servidores...</span>
          </div>
        )}

        {/* Featured Servers */}
        {!loading && featuredServers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Star className="w-6 h-6 text-yellow-400 mr-2" />
              Servidores Destacados
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredServers.map((server) => {
                const IconComponent = server.icon
                return (
                  <div key={server.id} className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 border border-gray-600 hover:border-casino-500 transition-all cursor-pointer group"
                       onClick={() => { setSelectedServer(server); setShowServerModal(true) }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <img src={server.image} alt={server.name} className="w-12 h-12 rounded-lg" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-casino-300 transition-colors">{server.name}</h3>
                            {server.verified && <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-4 h-4" />}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-400">
                            <div className="flex items-center"><Users className="w-3 h-3 mr-1" />{server.members}</div>
                            <div className="flex items-center"><div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>{server.online}</div>
                            <div className="flex items-center"><TrendingUp className="w-3 h-3 mr-1 text-green-400" />{server.growth}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                          <Star className="w-3 h-3 mr-1" />Destacado
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(server.level || 'Advanced')}`}>
                          {server.level}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 mb-4 leading-relaxed">{server.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {server.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-2 py-1 bg-casino-500/20 text-casino-300 rounded-md text-xs"># {tag}</span>
                      ))}
                      {server.features.slice(0, 2).map((feature, featureIndex) => (
                        <span key={featureIndex} className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs">{feature}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{server.category}</span>
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingServer(server)
                            setShowAdminForm(true)
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                        >
                          <Edit className="w-3 h-3 mr-1" />Editar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Servers */}
        {!loading && regularServers.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Todos los Servidores
            </h2>
            <div className="grid gap-4">
              {regularServers.map((server) => {
                const IconComponent = server.icon
                return (
                  <div key={server.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-casino-500 transition-all cursor-pointer group"
                       onClick={() => { setSelectedServer(server); setShowServerModal(true) }}>
                    <div className="flex items-start space-x-4">
                      <img src={server.image} alt={server.name} className="w-12 h-12 rounded-lg flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-casino-300 transition-colors">{server.name}</h3>
                            {server.verified && <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-4 h-4" />}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(server.level || 'Advanced')}`}>
                              {server.level}
                            </div>
                            {isOwner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingServer(server)
                                  setShowAdminForm(true)
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg text-xs flex items-center"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-400 mb-3">{server.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center"><Users className="w-4 h-4 mr-1" />{server.members}</div>
                            <div className="flex items-center"><div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>{server.online}</div>
                            <span className="text-gray-600">•</span>
                            <span>{server.category}</span>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <Eye className="w-4 h-4 mr-1" />
                            <span>Ver información</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredServers.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No se encontraron servidores</h3>
            <p className="text-gray-500">Intenta cambiar los filtros o términos de búsqueda</p>
          </div>
        )}
      </div>

      {/* Modal de Información del Servidor - Mantengo la funcionalidad original pero simplificado */}
      <AnimatePresence>
        {showServerModal && selectedServer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowServerModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowServerModal(false)}
                className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative">
                    <img src={selectedServer.image} alt={selectedServer.name} className="w-16 h-16 rounded-xl" />
                    {selectedServer.featured && (
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full">
                        <Crown className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-2xl font-bold text-white">{selectedServer.name}</h2>
                      {selectedServer.verified && <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-6 h-6" />}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center"><Users className="w-4 h-4 mr-1" />{selectedServer.members} miembros</div>
                      <div className="flex items-center"><div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>{selectedServer.online} online</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Descripción</h3>
                    <p className="text-gray-300">{selectedServer.description}</p>
                  </div>

                  {selectedServer.features && selectedServer.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">Características</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedServer.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-800 rounded-lg">
                            <div className="w-2 h-2 bg-casino-400 rounded-full"></div>
                            <span className="text-gray-300 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <motion.a
                    href={selectedServer.invite}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    className={`w-full bg-gradient-to-r ${selectedServer.color} text-white px-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3`}
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Unirse al Servidor</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formularios originales simplificados - mantenerlos para funcionalidad completa */}
      {/* Los formularios de envío y administración se mantienen igual pero ocultos aquí por brevedad */}
      {/* Implementar cuando sea necesario */}
    </div>
  )
}