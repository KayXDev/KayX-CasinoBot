'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { motion } from 'framer-motion'
import AdminChat from '@/components/ModernAdminChat'
import { 
  Shield,
  Users, 
  MessageSquare, 
  Heart, 
  TrendingUp,
  Eye,
  BarChart,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Search,
  Filter,
  MoreVertical,
  Star,
  Pin,
  Sparkles,
  AlertTriangle,
  UserCheck,
  FileText,
  Activity,
  Settings
} from 'lucide-react'

interface BlogPost {
  id: number
  title: string
  author_name: string
  category: string
  status: string
  featured: boolean
  pinned?: boolean
  likes: number
  comments_count: number
  views: number
  created_at: string
}

interface Comment {
  id: number
  content: string
  author_name: string
  post_title: string
  created_at: string
}

interface Stats {
  totalPosts: number
  totalComments: number
  totalLikes: number
  totalViews: number
  postsThisWeek?: number
  commentsThisWeek?: number
  userPosts?: number
  topCategories?: Array<{category: string, count: number}>
  recentActivity?: Array<{type: string, description: string, time: string}>
  serverHealth?: {
    activeUsers: number
    engagement: number
    growth: number
  }
}

export default function ServerAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Verificar permisos - solo admins del servidor (no owner)
  const { isAdmin, isOwner, loading: permissionsLoading } = useUserPermissions()
  
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, totalComments: 0, totalLikes: 0, totalViews: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'moderation' | 'chat'>('overview')

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return
    
    if (!session?.user) {
      router.push('/api/auth/signin')
      return
    }

    // Solo permitir acceso a admins del servidor (NO al owner)
    if (!isAdmin || isOwner) {
      router.push('/blogs')
      return
    }

    fetchDashboardData()
  }, [session, status, router, isAdmin, isOwner, permissionsLoading])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch stats completas usando el endpoint específico para server-admin
      const statsRes = await fetch('/api/server-admin/stats')
      const statsData = await statsRes.json()
      if (statsData.success) {
        setStats(statsData.stats)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while permissions are being loaded
  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si no tiene permisos (solo admins del servidor, NO owner)
  if (!isAdmin || isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Panel de Administradores del Servidor</h2>
          <p className="text-gray-400 mb-4">Este panel es exclusivo para administradores del servidor Discord.</p>
          {isOwner && (
            <p className="text-blue-400">Como owner, tu panel está en <a href="/admin" className="underline hover:text-blue-300">/admin</a></p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Moderno */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl border border-gray-700/30 shadow-2xl">
            {/* Patrón de fondo animado */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
            </div>

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 p-4 rounded-2xl shadow-xl group-hover:shadow-blue-500/25 transition-all duration-300">
                      <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                        Panel de Moderadores
                      </span>
                    </h1>
                    <p className="text-gray-400 text-lg flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-emerald-500" />
                      Gestión del servidor • Control y moderación
                    </p>
                  </div>
                </div>

                {/* Quick Stats Cards en Header */}
                <div className="hidden lg:flex space-x-4">
                  <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Posts</p>
                        <p className="text-xl font-bold text-white">{stats.totalPosts}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-600/10 to-green-600/10 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Comentarios</p>
                        <p className="text-xl font-bold text-white">{stats.totalComments}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-600/10 to-violet-600/10 rounded-xl p-4 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                        <Eye className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Vistas</p>
                        <p className="text-xl font-bold text-white">{stats.totalViews}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Layout con Sidebar + Contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar de Navegación */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl rounded-2xl border border-gray-700/30 p-6 sticky top-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-3 text-blue-400" />
                Navegación
              </h3>
              
              <nav className="space-y-2">
                {[
                  { id: 'overview', name: 'Resumen', icon: BarChart, color: 'from-blue-500 to-cyan-500', accent: 'blue' },
                  { id: 'moderation', name: 'Moderación', icon: UserCheck, color: 'from-purple-500 to-violet-500', accent: 'purple' },
                  { id: 'chat', name: 'Chat Admins', icon: MessageCircle, color: 'from-emerald-500 to-green-500', accent: 'emerald' }
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full relative overflow-hidden p-4 rounded-xl font-medium transition-all duration-300 text-left group ${
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-${tab.accent}-500/25 transform scale-105`
                        : 'text-gray-300 hover:text-white hover:bg-gray-700/30 bg-gray-800/20 hover:border-gray-600/50 border border-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3 relative z-10">
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        activeTab === tab.id 
                          ? 'bg-white/20' 
                          : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                      }`}>
                        <tab.icon className={`w-4 h-4 transition-colors ${
                          activeTab === tab.id 
                            ? 'text-white' 
                            : 'text-gray-400 group-hover:text-gray-300'
                        }`} />
                      </div>
                      <span className="font-medium">{tab.name}</span>
                    </div>
                    
                    {/* Indicador activo */}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r opacity-10 rounded-xl"
                        style={{ 
                          background: `linear-gradient(135deg, var(--${tab.accent}-500), var(--${tab.accent}-600))` 
                        }}
                      />
                    )}
                  </motion.button>
                ))}
              </nav>
              
              {/* Stats Rápidas en Sidebar */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-emerald-400" />
                  Estado del Sistema
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300 text-sm font-medium">Vistas Totales</span>
                    <span className="text-blue-400 font-bold">{stats.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300 text-sm font-medium">Likes Totales</span>
                    <span className="text-emerald-400 font-bold">{stats.totalLikes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300 text-sm font-medium">Engagement</span>
                    <span className="text-purple-400 font-bold">
                      {stats.totalPosts > 0 ? Math.round((stats.totalLikes / stats.totalPosts) * 100) / 100 : '0'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contenido Principal */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="space-y-6">
              {activeTab === 'overview' && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {/* Stats Cards */}
                <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalPosts}</span>
                  </div>
                  <h3 className="text-gray-400 font-medium">Total Posts</h3>
                </div>

                <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-500/20 rounded-xl">
                      <MessageSquare className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalComments}</span>
                  </div>
                  <h3 className="text-gray-400 font-medium">Comentarios</h3>
                </div>

                <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-red-500/20 rounded-xl">
                      <Heart className="h-6 w-6 text-red-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalLikes}</span>
                  </div>
                  <h3 className="text-gray-400 font-medium">Total Likes</h3>
                </div>

                <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-xl">
                      <Eye className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalViews}</span>
                  </div>
                  <h3 className="text-gray-400 font-medium">Total Views</h3>
                </div>
              </motion.div>

              {/* Estadísticas Adicionales */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-xl rounded-2xl border border-green-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-500/20 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-2xl font-bold text-green-400">{stats.postsThisWeek || 0}</span>
                  </div>
                  <h3 className="text-green-300 font-medium">Posts Esta Semana</h3>
                  <p className="text-green-400/70 text-sm mt-2">Últimos 7 días</p>
                </div>

                <div className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 backdrop-blur-xl rounded-2xl border border-orange-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-500/20 rounded-xl">
                      <MessageSquare className="h-6 w-6 text-orange-400" />
                    </div>
                    <span className="text-2xl font-bold text-orange-400">{stats.commentsThisWeek || 0}</span>
                  </div>
                  <h3 className="text-orange-300 font-medium">Comentarios Semanales</h3>
                  <p className="text-orange-400/70 text-sm mt-2">Actividad reciente</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 backdrop-blur-xl rounded-2xl border border-cyan-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-cyan-500/20 rounded-xl">
                      <Users className="h-6 w-6 text-cyan-400" />
                    </div>
                    <span className="text-2xl font-bold text-cyan-400">{stats.userPosts || 0}</span>
                  </div>
                  <h3 className="text-cyan-300 font-medium">Posts de Usuarios</h3>
                  <p className="text-cyan-400/70 text-sm mt-2">Contenido comunitario</p>
                </div>
              </motion.div>

              {/* Salud del Servidor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Sparkles className="h-6 w-6 text-blue-400 mr-2" />
                  Estado del Servidor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {Math.round(((stats.totalLikes || 0) / (stats.totalPosts || 1)) * 100) / 100}
                    </div>
                    <p className="text-gray-400 text-sm">Likes por Post</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {Math.round(((stats.totalComments || 0) / (stats.totalPosts || 1)) * 100) / 100}
                    </div>
                    <p className="text-gray-400 text-sm">Comentarios por Post</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {Math.round(((stats.totalViews || 0) / (stats.totalPosts || 1)) * 100) / 100}
                    </div>
                    <p className="text-gray-400 text-sm">Views por Post</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Herramientas de Moderación</h2>
                <p className="text-gray-400 mb-4">Funcionalidades de moderación avanzadas próximamente.</p>
                <div className="text-sm text-gray-500">
                  <p>Esta sección incluirá:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Gestión de reportes de usuarios</li>
                    <li>• Herramientas de moderación de contenido</li>
                    <li>• Sistema de advertencias y sanciones</li>
                    <li>• Logs de actividad de moderación</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <AdminChat />
            </motion.div>
          )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}