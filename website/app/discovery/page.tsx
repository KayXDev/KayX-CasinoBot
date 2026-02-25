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
  { id: 'all', name: 'All', icon: Globe },
  { id: 'Gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'Crypto', name: 'Crypto', icon: TrendingUp },
  { id: 'Strategy', name: 'Strategy', icon: Brain },
  { id: 'Community', name: 'Community', icon: Users },
  { id: 'Elite', name: 'Elite', icon: Crown }
]

const serverLevels = [
  { id: 'all', name: 'All' },
  { id: 'Beginner', name: 'Beginner' },
  { id: 'Community', name: 'Community' },
  { id: 'Advanced', name: 'Advanced' },
  { id: 'Pro', name: 'Professional' },
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
  const [loading, setLoading] = useState(false) // Optimized for fast loading
  const [editingServer, setEditingServer] = useState<Server | null>(null)
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [showServerModal, setShowServerModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const SERVERS_PER_PAGE = 6

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
        // Map database data to format expected by component
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
  
  // Paginación
  const totalPages = Math.ceil(regularServers.length / SERVERS_PER_PAGE)
  const startIndex = (currentPage - 1) * SERVERS_PER_PAGE
  const endIndex = startIndex + SERVERS_PER_PAGE
  const paginatedServers = regularServers.slice(startIndex, endIndex)
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedLevel, searchTerm])
  
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

  // Formulario de envío de usuario
  const SubmitServerForm = () => {
    const [formData, setFormData] = useState({
      serverName: '',
      serverDescription: '',
      inviteLink: '',
      category: 'Gaming'
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDetecting, setIsDetecting] = useState(false)
    const [detectedInfo, setDetectedInfo] = useState<any>(null)

    const detectServerInfo = async () => {
      if (!formData.inviteLink) {
        alert('Please enter the invite link first')
        return
      }

      setIsDetecting(true)
      try {
        const response = await fetch('/api/discord/server-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteLink: formData.inviteLink })
        })

        const data = await response.json()

        if (data.success && data.serverInfo) {
          const info = data.serverInfo
          setDetectedInfo(info)
          
          // Auto-llenar campos
          setFormData(prev => ({
            ...prev,
            serverName: info.name || prev.serverName,
            serverDescription: info.description || prev.serverDescription
          }))

          alert(`Information detected! Server: ${info.name}, Members: ${info.memberCount}, Online: ${info.onlineCount}${info.icon ? ', Image: ✅' : ', Image: ❌'}`)
        } else {
          alert(data.error || 'Could not detect server information')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Error detecting server information')
      } finally {
        setIsDetecting(false)
      }
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (!session?.user) {
        alert('You must log in to submit a request')
        return
      }

      setIsSubmitting(true)
      
      try {
        const response = await fetch('/api/server-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            members: detectedInfo ? `${detectedInfo.memberCount}` : 'Not specified',
            onlineMembers: detectedInfo ? detectedInfo.onlineCount : 0,
            serverIcon: detectedInfo ? detectedInfo.icon : null,
            features: []
          })
        })

        const data = await response.json()

        if (response.ok) {
          alert('Request sent successfully! It will be reviewed by our team.')
          setShowSubmitForm(false)
          setFormData({
            serverName: '',
            serverDescription: '',
            inviteLink: '',
            category: 'Gaming'
          })
          setDetectedInfo(null)
        } else {
          alert(data.error || 'Error sending request')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Error sending request. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Request Server</h3>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="text-gray-400 hover:text-white"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Request your server to appear on Discovery. Our team will review your request.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Server Name</label>
                <input
                  type="text"
                  value={formData.serverName}
                  onChange={(e) => setFormData(prev => ({ ...prev, serverName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Invitation Link</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={formData.inviteLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, inviteLink: e.target.value }))}
                    placeholder="https://discord.gg/example"
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={detectServerInfo}
                    disabled={isDetecting || isSubmitting || !formData.inviteLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isDetecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Auto-Detect</span>
                      </>
                    )}
                  </button>
                </div>
                {detectedInfo && (
                  <div className="mt-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {detectedInfo.icon && (
                        <img 
                          src={detectedInfo.icon} 
                          alt="Server icon" 
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex items-center space-x-2 text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Information detected: {detectedInfo.memberCount} members • {detectedInfo.onlineCount} online{detectedInfo.icon ? ' • Image ✅' : ''}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Description</label>
                <textarea
                  rows={3}
                  value={formData.serverDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, serverDescription: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none resize-none"
                  placeholder="Describe what makes your server unique..."
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="Gaming">Gaming</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Strategy">Strategy</option>
                    <option value="Community">Community</option>
                    <option value="Elite">Elite</option>
                  </select>
                </div>
              </div>

              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-casino-500 to-purple-500 text-white rounded-lg hover:from-casino-400 hover:to-purple-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  // Formulario de administración
  const AdminServerForm = () => {
    const [formData, setFormData] = useState({
      serverName: '',
      serverDescription: '',
      inviteLink: '',
      category: 'Gaming',
      features: [] as string[],
      tags: [] as string[],
      level: 'Advanced',
      verified: false,
      featured: true,
      color: 'from-casino-500 to-purple-500'
    })

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      
      try {
        const isEditing = editingServer !== null
        const url = '/api/featured-servers'
        const method = isEditing ? 'PUT' : 'POST'
        
        const requestBody = isEditing 
          ? { ...formData, id: editingServer.id }
          : formData
        
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(isEditing ? 'Error updating server' : 'Error adding server')
        }

        setShowAdminForm(false)
        setEditingServer(null)
        alert(isEditing ? 'Server updated successfully!' : 'Server added successfully!')
        await reloadServers()
        
      } catch (error) {
        console.error('Error:', error)
        alert('Error processing request.')
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingServer ? 'Edit Server' : 'Add Server'}
              </h3>
              <button
                onClick={() => {
                  setShowAdminForm(false)
                  setEditingServer(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Server Name</label>
                  <input
                    type="text"
                    value={formData.serverName}
                    onChange={(e) => setFormData(prev => ({ ...prev, serverName: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  >
                    <option value="Gaming">Gaming</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Community">Community</option>
                    <option value="Strategy">Strategy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Invitation Link</label>
                <input
                  type="url"
                  value={formData.inviteLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, inviteLink: e.target.value }))}
                  placeholder="https://discord.gg/example"
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Descripción</label>
                <textarea
                  value={formData.serverDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, serverDescription: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  >
                    <option value="Elite">Elite</option>
                    <option value="Pro">Pro</option>
                    <option value="Advanced">Advanced</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div className="flex items-center space-x-4 mt-6">
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={(e) => setFormData(prev => ({ ...prev, verified: e.target.checked }))}
                      className="mr-2"
                    />
                    Verified
                  </label>
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="mr-2"
                    />
                    Featured
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminForm(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingServer ? 'Actualizar' : 'Agregar'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
              <Compass className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">Explore Communities</span>
              <Globe className="w-4 h-4 text-white ml-2" />
            </div>
            
            <h1 className="text-4xl font-black text-white mb-3">
              Epic Discovery
            </h1>
            
            <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
              Discover the best Discord communities using Casino Bot and join the fun
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
                  <span>Add Server</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!session) {
                      alert('You must log in to submit a request')
                      return
                    }
                    setShowSubmitForm(true)
                  }}
                  className="bg-white text-casino-600 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Request Server</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-10">
        {/* Search & Filters */}
        <div className="space-y-6 mb-12">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search servers, communities, features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-casino-500/20 text-casino-300 px-2 py-1 rounded-lg text-xs font-medium">
              {filteredServers.length} servers
            </div>
          </div>

          {/* Filters - Compact Design */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon
                const isSelected = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'bg-casino-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{category.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Separator */}
            <div className="hidden lg:block w-px h-6 bg-gray-600"></div>

            {/* Levels */}
            <div className="flex flex-wrap gap-2">
              {serverLevels.map((level) => {
                const isSelected = selectedLevel === level.id
                return (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
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
            <span className="ml-3 text-gray-400">Loading servers...</span>
          </div>
        )}

        {/* Featured Servers */}
        {!loading && featuredServers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Star className="w-6 h-6 text-yellow-400 mr-2" />
              Featured Servers
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredServers.map((server) => {
                const IconComponent = server.icon
                return (
                  <div key={server.id} className="bg-gradient-to-br from-casino-600/10 via-purple-600/10 to-gray-800/50 backdrop-blur-sm border border-casino-500/30 rounded-xl p-6 hover:border-casino-400/50 transition-all cursor-pointer group relative overflow-hidden"
                       onClick={() => { setSelectedServer(server); setShowServerModal(true) }}>
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500/20 to-transparent px-4 py-2 rounded-bl-xl">
                      <div className="flex items-center space-x-1 text-yellow-400 text-xs font-bold">
                        <Star className="w-3 h-3" />
                        <span>FEATURED</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="relative flex-shrink-0">
                        <img src={server.image} alt={server.name} className="w-16 h-16 rounded-xl object-cover border-2 border-casino-500/30" />
                        {!!server.verified && (
                          <div className="absolute -top-1 -right-1">
                            <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white group-hover:text-casino-300 transition-colors mb-2">{server.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{server.members}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>{server.online}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>{server.growth}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{server.category}</span>
                          <span className="text-gray-600">•</span>
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getLevelColor(server.level || 'Advanced')}`}>
                            {server.level}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 mb-4 leading-relaxed">{server.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {server.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-2 py-1 bg-casino-500/20 text-casino-300 rounded-md text-xs"># {tag}</span>
                      ))}
                      {server.features.slice(0, 2).map((feature, featureIndex) => (
                        <span 
                          key={featureIndex} 
                          className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs"
                        >
                          {feature}
                        </span>
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
                          <Edit className="w-3 h-3 mr-1" />Edit
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
              All Servers
            </h2>
            <div className="grid gap-4">
              {paginatedServers.map((server) => {
                const IconComponent = server.icon
                return (
                  <div key={server.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-casino-500/50 hover:bg-gray-800/70 transition-all cursor-pointer group"
                       onClick={() => { setSelectedServer(server); setShowServerModal(true) }}>
                    <div className="flex items-start space-x-4">
                      <div className="relative flex-shrink-0">
                        <img src={server.image} alt={server.name} className="w-14 h-14 rounded-xl object-cover" />
                        <div className="absolute -top-1 -right-1">
                          {!!server.verified && <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-5 h-5" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-casino-300 transition-colors mb-1">{server.name}</h3>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-gray-500">{server.category}</span>
                              <span className="text-gray-600">•</span>
                              <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getLevelColor(server.level || 'Advanced')}`}>
                                {server.level}
                              </div>
                            </div>
                          </div>
                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingServer(server)
                                setShowAdminForm(true)
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center space-x-1"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                        
                        <p className="text-gray-400 mb-4 leading-relaxed line-clamp-2">{server.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{server.members}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span>{server.online}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-400 group-hover:text-casino-400 transition-colors">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">See more</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === 1
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        currentPage === page
                          ? 'bg-casino-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === totalPages
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Server Count Info */}
            <div className="text-center mt-4 text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, regularServers.length)} of {regularServers.length} servers
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredServers.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No servers found</h3>
            <p className="text-gray-500">Try changing the filters or search terms</p>
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
                    <div className="flex items-center space-x-3 mb-4">
                      <h2 className="text-2xl font-bold text-white">{selectedServer.name}</h2>
                      {!!selectedServer.verified && <img src="/images/Twitter_Verified_Badge.png" alt="Verificado" className="w-6 h-6" />}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center"><Users className="w-4 h-4 mr-1" />{selectedServer.members} members</div>
                      <div className="flex items-center"><div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>{selectedServer.online} online</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                    <p className="text-gray-300">{selectedServer.description}</p>
                  </div>

                  {selectedServer.features && selectedServer.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">Features</h3>
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
                    <span>Join Server</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formularios */}
      <AnimatePresence>
        {showSubmitForm && <SubmitServerForm />}
        {showAdminForm && <AdminServerForm />}
      </AnimatePresence>
    </div>
  )
}