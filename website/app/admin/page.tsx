'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { motion } from 'framer-motion'
import { 
  Crown, 
  Users, 
  MessageSquare, 
  Heart, 
  TrendingUp,
  Shield,
  Trash2,
  Star,
  Eye,
  Calendar,
  BarChart,
  Pin,
  Clock,
  Settings,
  Database,
  Activity,
  Globe,
  Edit,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Sparkles,
  MessageCircle
} from 'lucide-react'
import AdminChat from '@/components/ModernAdminChat'

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
}

interface ServerRequest {
  id: number
  server_name: string
  server_description: string
  invite_link: string
  members: number
  category: string
  features: string[]
  submitted_by: string
  submitted_by_id: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
}

interface FeaturedServer {
  id: number
  server_name: string
  server_description: string
  invite_link: string
  members: string
  online_members: string
  category: string
  features: string[]
  verified: boolean
  featured: boolean
  growth: string
  tags: string[]
  level: string
  color: string
  icon: string
  added_by: string
  created_at: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Usar el nuevo sistema de permisos
  const { isAdmin: hasAdminPermissions, isOwner, loading: permissionsLoading } = useUserPermissions()
  
  const [loading, setLoading] = useState(false) // Optimizado para carga rápida
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, totalComments: 0, totalLikes: 0, totalViews: 0 })
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([])
  const [recentComments, setRecentComments] = useState<Comment[]>([])
  const [serverRequests, setServerRequests] = useState<ServerRequest[]>([])
  const [featuredServers, setFeaturedServers] = useState<FeaturedServer[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'servers' | 'manage-servers' | 'verification' | 'chat'>('overview')

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return
    
    if (!session?.user) {
      router.push('/api/auth/signin')
      return
    }

    // Verificar si el usuario tiene permisos de admin (owner o admin del servidor)
    const canAccess = hasAdminPermissions || isOwner
    
    if (!canAccess) {
      router.push('/blogs')
      return
    }

    fetchDashboardData()
  }, [session, status, router, hasAdminPermissions, isOwner, permissionsLoading])

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('/api/admin/stats')
      const statsData = await statsRes.json()
      
      // Fetch recent posts
      const postsRes = await fetch('/api/admin/posts?limit=10')
      const postsData = await postsRes.json()
      
      // Fetch recent comments
      const commentsRes = await fetch('/api/admin/comments?limit=10')
      const commentsData = await commentsRes.json()

      // Fetch server requests
      const serverRequestsRes = await fetch('/api/server-requests')
      const serverRequestsData = await serverRequestsRes.json()

      // Fetch featured servers
      const featuredServersRes = await fetch('/api/featured-servers')
      const featuredServersData = await featuredServersRes.json()

      if (statsData.success) setStats(statsData.data)
      if (postsData.success) setRecentPosts(postsData.data)
      if (commentsData.success) setRecentComments(commentsData.data)
      if (serverRequestsData.success) setServerRequests(serverRequestsData.requests || [])
      if (featuredServersData.success) setFeaturedServers(featuredServersData.servers || [])
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts?limit=10')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecentPosts(data.data)
        }
      }
    } catch (error) {
      console.error('Error refreshing posts:', error)
    }
  }

  const toggleFeaturePost = async (postId: number, currentStatus: boolean) => {
    try {
      // Optimistic update - update UI immediately
      setRecentPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, featured: !currentStatus } : post
      ))
      
      const response = await fetch('/api/admin/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, featured: !currentStatus })
      })
      
      if (!response.ok) {
        // Revert on error
        setRecentPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, featured: currentStatus } : post
        ))
        console.error('Failed to toggle feature status')
      } else {
        // Refresh data to ensure consistency
        await refreshPosts()
      }
    } catch (error) {
      // Revert on error
      setRecentPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, featured: currentStatus } : post
      ))
      console.error('Error toggling feature:', error)
    }
  }

  const togglePinPost = async (postId: number, currentStatus: boolean) => {
    try {
      // Optimistic update - update UI immediately
      setRecentPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, pinned: !currentStatus } : post
      ))
      
      const response = await fetch('/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, pinned: !currentStatus })
      })
      
      if (!response.ok) {
        // Revert on error
        setRecentPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, pinned: currentStatus } : post
        ))
        console.error('Failed to toggle pin status')
      } else {
        // Refresh data to ensure consistency
        await refreshPosts()
      }
    } catch (error) {
      // Revert on error
      setRecentPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, pinned: currentStatus } : post
      ))
      console.error('Error toggling pin:', error)
    }
  }

  const deletePost = async (postId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este post?')) return
    
    try {
      // Optimistic update - remove from UI immediately
      const originalPosts = recentPosts
      setRecentPosts(prev => prev.filter(post => post.id !== postId))
      
      const response = await fetch(`/api/blogs?id=${postId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        // Revert on error
        setRecentPosts(originalPosts)
        console.error('Failed to delete post')
      } else {
        // Refresh data to ensure consistency
        await refreshPosts()
      }
    } catch (error) {
      // Revert on error - refresh to get current state
      await refreshPosts()
      console.error('Error deleting post:', error)
    }
  }

  const deleteComment = async (commentId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return
    
    try {
      // Optimistic update - remove from UI immediately
      const originalComments = recentComments
      setRecentComments(prev => prev.filter(comment => comment.id !== commentId))
      
      const response = await fetch(`/api/admin/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        // Revert on error
        setRecentComments(originalComments)
        console.error('Failed to delete comment')
      }
    } catch (error) {
      // Revert on error
      setRecentComments(recentComments)
      console.error('Error deleting comment:', error)
    }
  }

  const handleServerRequest = async (requestId: number, action: 'approved' | 'rejected') => {
    try {
      // Optimistic update - remove the request immediately
      setServerRequests(prev => prev.filter(request => request.id !== requestId))

      const response = await fetch('/api/server-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: action })
      })

      if (!response.ok) {
        // Revert on error - reload data
        fetchDashboardData()
        console.error('Failed to update server request')
      }
    } catch (error) {
      // Revert on error - reload data
      fetchDashboardData()
      console.error('Error handling server request:', error)
    }
  }

  const updateServerStats = async () => {
    try {
      const response = await fetch('/api/update-server-stats', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`¡Estadísticas actualizadas! ${data.updatedCount} servidores fueron actualizados.`)
      } else {
        alert('Error actualizando estadísticas')
      }
    } catch (error) {
      console.error('Error updating server stats:', error)
      alert('Error actualizando estadísticas')
    }
  }

  const deleteServer = async (serverId: number, serverName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el servidor "${serverName}"?`)) return
    
    try {
      const response = await fetch(`/api/featured-servers?id=${serverId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Optimistic update
        setFeaturedServers(prev => prev.filter(server => server.id !== serverId))
        alert('Servidor eliminado exitosamente')
      } else {
        alert('Error eliminando servidor')
      }
    } catch (error) {
      console.error('Error deleting server:', error)
      alert('Error eliminando servidor')
    }
  }

  const toggleServerStatus = async (serverId: number, currentStatus: boolean, type: 'featured' | 'verified') => {
    try {
      const response = await fetch(`/api/featured-servers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serverId, 
          [type]: !currentStatus 
        })
      })

      if (response.ok) {
        // Optimistic update
        setFeaturedServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, [type]: !currentStatus }
            : server
        ))
      } else {
        alert(`Error actualizando ${type}`)
      }
    } catch (error) {
      console.error(`Error toggling ${type}:`, error)
      alert(`Error actualizando ${type}`)
    }
  }

  // Mostrar loading mientras se cargan los permisos
  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si no tiene permisos
  if (!hasAdminPermissions && !isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-gray-400">No tienes permisos para acceder al panel de administración.</p>
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
              <div className="absolute top-0 left-0 w-96 h-96 bg-casino-500/30 rounded-full filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
            </div>

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-casino-500 via-purple-600 to-pink-600 p-4 rounded-2xl shadow-xl group-hover:shadow-casino-500/25 transition-all duration-300">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                        Panel de Administración
                      </span>
                    </h1>
                    <p className="text-gray-400 text-lg flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-emerald-500" />
                      Control total del sistema • Casino Bot Dashboard
                    </p>
                  </div>
                </div>
                
                <div className="hidden lg:block">
                  <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-xl">
                    <div className="text-right">
                      <p className="text-sm text-gray-400 mb-1">Administrador</p>
                      <p className="text-xl font-bold text-white flex items-center justify-end">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3 animate-pulse"></div>
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1 font-medium">● Sesión activa</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Overview Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-xl p-4 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                      <BarChart className="w-5 h-5 text-blue-400" />
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
                      <Database className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Servidores</p>
                      <p className="text-xl font-bold text-white">{featuredServers.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-600/10 to-orange-600/10 rounded-xl p-4 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Solicitudes</p>
                      <p className="text-xl font-bold text-white">{serverRequests.filter(s => s.status === 'pending').length}</p>
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
                <Settings className="w-5 h-5 mr-3 text-casino-400" />
                Navegación
              </h3>
              
              <nav className="space-y-2">
                {[
                  { id: 'overview', name: 'Resumen', icon: BarChart, color: 'from-blue-500 to-cyan-500', accent: 'blue' },
                  { id: 'posts', name: 'Posts', icon: Edit, color: 'from-emerald-500 to-green-500', accent: 'emerald' },
                  { id: 'comments', name: 'Comentarios', icon: MessageSquare, color: 'from-amber-500 to-orange-500', accent: 'amber' },
                  { id: 'verification', name: 'Verificaciones', icon: CheckCircle, color: 'from-purple-500 to-violet-500', accent: 'purple' },
                  { id: 'servers', name: 'Solicitudes', icon: Shield, color: 'from-red-500 to-pink-500', accent: 'red' },
                  { id: 'manage-servers', name: 'Gestionar Servidores', icon: Database, color: 'from-indigo-500 to-blue-600', accent: 'indigo' },
                  { id: 'chat', name: 'Chat Admins', icon: MessageCircle, color: 'from-casino-500 to-purple-600', accent: 'casino' }
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
                    <span className="text-casino-400 font-bold">{stats.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300 text-sm font-medium">Total Likes</span>
                    <span className="text-pink-400 font-bold">{stats.totalLikes}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
                    <span className="text-gray-300 text-sm font-medium">Uptime</span>
                    <span className="text-emerald-400 font-bold">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Área de Contenido Principal */}
          <div className="lg:col-span-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="casino-card rounded-xl p-6 bg-gradient-to-br from-blue-600/20 to-blue-700/10 border-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Total Posts</p>
                <p className="text-3xl font-bold text-white">{stats.totalPosts}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+12% this month</span>
                </div>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <BarChart className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="casino-card rounded-xl p-6 bg-gradient-to-br from-green-600/20 to-green-700/10 border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-medium">Total Comments</p>
                <p className="text-3xl font-bold text-white">{stats.totalComments}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+8% this month</span>
                </div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="casino-card rounded-xl p-6 bg-gradient-to-br from-red-600/20 to-red-700/10 border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm font-medium">Total Likes</p>
                <p className="text-3xl font-bold text-white">{stats.totalLikes}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+24% this month</span>
                </div>
              </div>
              <div className="bg-red-500/20 p-3 rounded-lg">
                <Heart className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="casino-card rounded-xl p-6 bg-gradient-to-br from-purple-600/20 to-purple-700/10 border-purple-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm font-medium">Total Views</p>
                <p className="text-3xl font-bold text-white">{stats.totalViews}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                  <span className="text-green-400 text-xs">+18% this month</span>
                </div>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Eye className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Posts */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="casino-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                  <BarChart className="w-6 h-6 text-blue-400" />
                </div>
                Recent Posts
              </h2>
              <div className="text-sm text-gray-400">
                Last {recentPosts.length} posts
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentPosts.map((post, index) => (
                <motion.div 
                  key={post.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="bg-gradient-to-r from-gray-800/60 to-gray-700/40 rounded-lg p-4 border border-gray-700/50 hover:border-casino-500/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{post.title}</h3>
                        {post.featured && (
                          <div className="bg-yellow-500/20 p-1 rounded">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          </div>
                        )}
                        {post.pinned && (
                          <div className="bg-blue-500/20 p-1 rounded">
                            <Pin className="w-3 h-3 text-blue-400 fill-current" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        By <span className="text-casino-400">{post.author_name}</span> • {post.category} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      post.status === 'published' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center bg-red-500/10 px-2 py-1 rounded">
                        <Heart className="w-3 h-3 mr-1 text-red-400" />
                        {post.likes}
                      </span>
                      <span className="flex items-center bg-blue-500/10 px-2 py-1 rounded">
                        <MessageSquare className="w-3 h-3 mr-1 text-blue-400" />
                        {post.comments_count}
                      </span>
                      <span className="flex items-center bg-purple-500/10 px-2 py-1 rounded">
                        <Eye className="w-3 h-3 mr-1 text-purple-400" />
                        {post.views}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleFeaturePost(post.id, post.featured)}
                        className={`p-2 rounded-lg transition-all duration-200 relative ${
                          post.featured 
                            ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-500/20 border border-yellow-500/50 shadow-lg shadow-yellow-500/25' 
                            : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/30'
                        }`}
                        title={post.featured ? 'Remove from Featured' : 'Add to Featured'}
                      >
                        <Star className={`w-4 h-4 transition-all duration-200 ${post.featured ? 'fill-current scale-110' : ''}`} />
                        {post.featured && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        )}
                      </button>
                      <button
                        onClick={() => togglePinPost(post.id, post.pinned || false)}
                        className={`p-2 rounded-lg transition-all duration-200 relative ${
                          post.pinned 
                            ? 'text-blue-400 hover:text-blue-300 bg-blue-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/25' 
                            : 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30'
                        }`}
                        title={post.pinned ? 'Unpin Post' : 'Pin Post'}
                      >
                        <Pin className={`w-4 h-4 transition-all duration-200 ${post.pinned ? 'fill-current scale-110' : ''}`} />
                        {post.pinned && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-all duration-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Comments */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="casino-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <div className="bg-green-500/20 p-2 rounded-lg mr-3">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                </div>
                Recent Comments
              </h2>
              <div className="text-sm text-gray-400">
                Last {recentComments.length} comments
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentComments.map((comment, index) => (
                <motion.div 
                  key={comment.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="bg-gradient-to-r from-gray-800/60 to-gray-700/40 rounded-lg p-4 border border-gray-700/50 hover:border-casino-500/30 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <p className="text-sm text-gray-300">
                          <span className="text-casino-400 font-medium">{comment.author_name}</span> commented on
                        </p>
                      </div>
                      <p className="text-blue-300 text-sm font-medium mb-2 truncate">"{comment.post_title}"</p>
                      <div className="bg-gray-900/30 rounded-lg p-3">
                        <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-all duration-200 hover:bg-red-500/10 ml-3"
                      title="Delete Comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(comment.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(comment.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        )}

        {/* Server Requests Tab */}
        {activeTab === 'servers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="casino-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                Solicitudes de Servidores
              </h2>
              <button
                onClick={updateServerStats}
                className="px-4 py-2 bg-casino-500 text-white rounded-lg hover:bg-casino-600 transition-colors text-sm"
              >
                Actualizar Estadísticas
              </button>
            </div>

            <div className="space-y-4">
              {serverRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay solicitudes de servidores pendientes</p>
                </div>
              ) : (
                serverRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      request.status === 'pending' 
                        ? 'bg-yellow-500/10 border-yellow-500/30' 
                        : request.status === 'approved'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-bold text-white">{request.server_name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'pending' 
                              ? 'bg-yellow-500/20 text-yellow-400' 
                              : request.status === 'approved'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {request.status === 'pending' ? 'Pendiente' : 
                             request.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{request.server_description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>👥 {request.members} miembros</span>
                          <span>📂 {request.category}</span>
                          <span>👤 {request.submitted_by}</span>
                          <span>📅 {new Date(request.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          <a 
                            href={request.invite_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-casino-400 hover:text-casino-300 text-sm"
                          >
                            {request.invite_link}
                          </a>
                        </div>
                        {request.features && request.features.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {request.features.map((feature, idx) => (
                              <span key={idx} className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {request.status === 'pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleServerRequest(request.id, 'approved')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleServerRequest(request.id, 'rejected')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="casino-card rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Gestión de Posts</h2>
            <div className="space-y-4">
              {recentPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-bold text-white">{post.title}</h3>
                        {post.featured && <Star className="w-4 h-4 text-yellow-400" />}
                        {post.pinned && <Pin className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>👤 {post.author_name}</span>
                        <span>📂 {post.category}</span>
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments_count}</span>
                        <span>👁️ {post.views}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => togglePinPost(post.id, !!post.pinned)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                        title={post.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePost(post.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="casino-card rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Gestión de Comentarios</h2>
            <div className="space-y-4">
              {recentComments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-300 mb-2">{comment.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>👤 {comment.author_name}</span>
                        <span>📄 {comment.post_title}</span>
                        <span>📅 {new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div className="casino-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl mr-4">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                Gestión de Verificaciones
              </h2>
              <button
                onClick={() => router.push('/admin/verification')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Gestionar Verificaciones</span>
              </button>
            </div>
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sistema de Verificaciones</h3>
              <p className="text-gray-400 mb-6">
                Administra las verificaciones de todos los usuarios registrados en la plataforma
              </p>
              <button
                onClick={() => router.push('/admin/verification')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Ir a Verificaciones</span>
              </button>
            </div>
          </div>
        )}

        {/* Manage Servers Tab */}
        {activeTab === 'manage-servers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header with Actions */}
            <div className="casino-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <div className="bg-gradient-to-r from-casino-500 to-purple-600 p-3 rounded-xl mr-4">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  Gestionar Servidores Destacados
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={updateServerStats}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Actualizar Stats</span>
                  </button>
                  <button
                    onClick={() => router.push('/discovery')}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Ver Discovery</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Total Servidores</p>
                      <p className="text-2xl font-bold text-white">{featuredServers.length}</p>
                    </div>
                    <Database className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Destacados</p>
                      <p className="text-2xl font-bold text-white">{featuredServers.filter(s => s.featured).length}</p>
                    </div>
                    <Star className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">Verificados</p>
                      <p className="text-2xl font-bold text-white">{featuredServers.filter(s => s.verified).length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-200 text-sm">Solicitudes</p>
                      <p className="text-2xl font-bold text-white">{serverRequests.filter(s => s.status === 'pending').length}</p>
                    </div>
                    <Shield className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Servers List */}
            <div className="casino-card rounded-xl p-6">
              <div className="space-y-4">
                {featuredServers.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400 text-lg">No hay servidores destacados</p>
                  </div>
                ) : (
                  featuredServers.map((server, index) => (
                    <motion.div
                      key={server.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-casino-500 to-purple-600 flex items-center justify-center">
                              <Crown className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                                <span>{server.server_name}</span>
                                {server.verified && <CheckCircle className="w-5 h-5 text-green-400" />}
                                {server.featured && <Star className="w-5 h-5 text-yellow-400" />}
                              </h3>
                              <p className="text-gray-400">{server.category} • {server.level}</p>
                            </div>
                          </div>

                          <p className="text-gray-300 mb-4">{server.server_description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-white">{server.members}</p>
                              <p className="text-gray-400 text-sm">Miembros</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-400">{server.online_members || '0'}</p>
                              <p className="text-gray-400 text-sm">Online</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-400">{server.growth || '+0%'}</p>
                              <p className="text-gray-400 text-sm">Crecimiento</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-300 text-sm">{new Date(server.created_at).toLocaleDateString()}</p>
                              <p className="text-gray-400 text-sm">Creado</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {server.features && server.features.length > 0 && server.features.map((feature, idx) => (
                              <span key={idx} className="bg-casino-500/20 text-casino-300 px-3 py-1 rounded-lg text-sm">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => toggleServerStatus(server.id, server.featured, 'featured')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              server.featured 
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                                : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                            }`}
                          >
                            {server.featured ? 'Destacado' : 'No Destacado'}
                          </button>
                          
                          <button
                            onClick={() => toggleServerStatus(server.id, server.verified, 'verified')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              server.verified 
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                            }`}
                          >
                            {server.verified ? 'Verificado' : 'No Verificado'}
                          </button>
                          
                          <a
                            href={server.invite_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium text-center"
                          >
                            <ExternalLink className="w-4 h-4 mx-auto" />
                          </a>
                          
                          <button
                            onClick={() => deleteServer(server.id, server.server_name)}
                            className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions - Only show in overview */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 casino-card rounded-xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-casino-400" />
              Acciones Rápidas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/blogs/create')}
                className="bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Post</span>
              </button>
              <button
                onClick={() => router.push('/blogs')}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3"
              >
                <Eye className="w-5 h-5" />
                <span>Ver Blog</span>
              </button>
              <button
                onClick={() => router.push('/discovery')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3"
              >
                <Globe className="w-5 h-5" />
                <span>Discovery</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AdminChat />
          </motion.div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}