'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CheckCircle,
  MapPin,
  Calendar,
  ExternalLink,
  Twitter,
  Instagram,
  Users,
  Heart,
  Eye,
  MessageCircle,
  UserPlus,
  UserMinus,
  Settings,
  Star,
  Trophy,
  Zap,
  TrendingUp,
  Award,
  Target,
  Crown,
  Shield,
  Flame,
  Diamond,
  Sparkles,
  Coins,
  Activity,
  Clock,
  BarChart3,
  Gift,
  Gamepad2,
  DollarSign,
  ArrowUpRight,
  Globe,
  Edit
} from 'lucide-react'
import Image from 'next/image'

interface UserProfile {
  id: string
  discordId: string
  customUsername?: string
  displayName: string
  bio?: string
  website?: string
  twitter?: string
  instagram?: string
  location?: string
  bannerUrl?: string
  avatarUrl?: string
  isVerified: boolean
  isOwner: boolean
  verificationType: 'none' | 'verified' | 'owner'
  followerCount: number
  followingCount: number
  postCount: number
  joinedDate: string
  lastActive: string
}

interface UserPost {
  id: number
  title: string
  excerpt: string
  category: string
  likes: number
  view_count: number
  comments_count: number
  created_at: string
  featured: boolean
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = session?.user && (session.user as any).id === profileId

  useEffect(() => {
    if (profileId) {
      fetchProfile()
    }
  }, [profileId, session])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/profiles/${profileId}`)
      const data = await response.json()
      
      if (data.success) {
        setProfile(data.profile)
        setPosts(data.posts || [])
        // Check follow status after profile is loaded
        if (session?.user) {
          checkFollowStatusWithProfile(data.profile)
        }
      } else {
        setError(data.error || 'Profile not found')
      }
    } catch (error) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!profile || !session?.user) return
    
    try {
      const response = await fetch(`/api/profiles/follow?targetUserId=${profile.discordId}`)
      const data = await response.json()
      
      console.log('Follow status check:', data)
      if (data.success) {
        setIsFollowing(data.isFollowing)
        console.log('Set isFollowing to:', data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const checkFollowStatusWithProfile = async (profileData: any) => {
    if (!profileData || !session?.user) return
    
    try {
      const response = await fetch(`/api/profiles/follow?targetUserId=${profileData.discordId}`)
      const data = await response.json()
      
      console.log('Follow status check:', data)
      if (data.success) {
        setIsFollowing(data.isFollowing)
        console.log('Set isFollowing to:', data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const toggleFollow = async () => {
    if (!profile || !session?.user) return
    
    setFollowLoading(true)
    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const response = await fetch('/api/profiles/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetUserId: profile.discordId, 
          action 
        })
      })
      
      const data = await response.json()
      
      console.log('Toggle follow response:', data)
      if (data.success) {
        const newFollowState = !isFollowing
        setIsFollowing(newFollowState)
        console.log('Updated follow state to:', newFollowState)
        setProfile(prev => prev ? {
          ...prev,
          followerCount: data.followerCount
        } : null)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const getVerificationBadge = () => {
    if (!profile) return null

    if (profile.isOwner) {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">
            OWNER
          </span>
        </div>
      )
    }

    if (profile.isVerified) {
      return <CheckCircle className="w-5 h-5 text-blue-400" />
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Perfil no encontrado</h2>
          <p className="text-gray-400 mb-6">{error || 'Este perfil no existe o no está disponible.'}</p>
          <button
            onClick={() => router.back()}
            className="bg-gradient-to-r from-casino-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Profile Image and Basic Info */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Image
                  src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=120&background=6366f1&color=ffffff`}
                  alt={profile.displayName}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white/20 shadow-2xl"
                />
                {profile.isOwner && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-full border-4 border-white shadow-lg">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-white">
                    {profile.displayName}
                  </h1>
                  {getVerificationBadge()}
                </div>
                
                {profile.bio && (
                  <p className="text-lg text-white/80 mb-4 max-w-2xl">
                    {profile.bio}
                  </p>
                )}
                
                <div className="flex items-center gap-6 text-white/70">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Se unió {new Date(profile.joinedDate).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 lg:ml-auto">
              {!isOwnProfile && session?.user && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isFollowing
                      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                      : 'bg-white text-casino-600 hover:bg-gray-100'
                  } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : isFollowing ? (
                    <UserMinus className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>{followLoading ? 'Cargando...' : isFollowing ? 'Dejar de seguir' : 'Seguir'}</span>
                </button>
              )}
              
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/profile/settings')}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 border border-white/20"
                >
                  <Settings className="w-4 h-4" />
                  <span>Editar Perfil</span>
                </button>
              )}
              
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-white/20"
                >
                  <Globe className="w-4 h-4" />
                  <span>Sitio Web</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-casino-400" />
                Estadísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Seguidores</span>
                  </div>
                  <span className="text-white font-semibold">{profile.followerCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-gray-400">Siguiendo</span>
                  </div>
                  <span className="text-white font-semibold">{profile.followingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Posts</span>
                  </div>
                  <span className="text-white font-semibold">{profile.postCount}</span>
                </div>
              </div>
            </motion.div>

            {/* Social Links */}
            {(profile.twitter || profile.instagram) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-4">Redes Sociales</h3>
                <div className="space-y-3">
                  {profile.twitter && (
                    <a
                      href={`https://twitter.com/${profile.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                      <Twitter className="w-5 h-5 text-blue-400" />
                      <span className="text-white">@{profile.twitter}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                    </a>
                  )}
                  {profile.instagram && (
                    <a
                      href={`https://instagram.com/${profile.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                    >
                      <Instagram className="w-5 h-5 text-purple-400" />
                      <span className="text-white">@{profile.instagram}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <div className="bg-gradient-to-r from-casino-500 to-purple-600 p-3 rounded-xl mr-4">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  Posts Recientes
                </h2>
                {posts.length > 0 && (
                  <span className="text-gray-400 text-sm">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </span>
                )}
              </div>

              {posts.length > 0 ? (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-6 cursor-pointer hover:bg-white/10 transition-all duration-200"
                      onClick={() => router.push(`/blogs/${post.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            post.category === 'tech' ? 'bg-blue-500/20 text-blue-400' :
                            post.category === 'gaming' ? 'bg-green-500/20 text-green-400' :
                            post.category === 'lifestyle' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {post.category}
                          </span>
                          {post.featured && (
                            <Star className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">
                          {new Date(post.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-white mb-2 hover:text-casino-400 transition-colors">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-300 mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{post.view_count}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments_count}</span>
                          </span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-casino-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Edit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Sin posts aún</h3>
                  <p className="text-gray-400 mb-6">
                    {isOwnProfile 
                      ? 'Aún no has creado ningún post. ¡Crea tu primer post!' 
                      : `${profile.displayName} aún no ha publicado nada.`
                    }
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/blogs/create')}
                      className="bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      Crear Primer Post
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}