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
  ArrowUpRight
} from 'lucide-react'

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
  const profileId = params?.id as string
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [loading, setLoading] = useState(false) // Optimizado para carga rápida
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError] = useState('')

  const isOwnProfile = session?.user && profile && (session.user as any).id === profile.discordId

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
      
      if (data.success) {
        setIsFollowing(data.isFollowing)
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

    if (profile.verificationType === 'owner') {
      return (
        <div className="flex items-center space-x-2" title="Verified Owner">
          <img src="/images/Twitter_Verified_Badge.png" alt="Verified" className="w-5 h-5" />
          <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 rounded-full font-bold">OWNER</span>
        </div>
      )
    }

    if (profile.isVerified) {
      return (
        <div className="flex items-center space-x-1" title="Verified User">
          <img src="/images/Twitter_Verified_Badge.png" alt="Verified" className="w-5 h-5" />
        </div>
      )
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
            <p className="text-red-400 mb-6">{error || 'The requested profile could not be found.'}</p>
            <button
              onClick={() => router.push('/blogs')}
              className="bg-casino-600 hover:bg-casino-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
            >
              Back to Blog
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden mb-6"
        >
          {/* Banner */}
          <div className="h-48 bg-gradient-to-r from-casino-600 via-purple-600 to-casino-700 relative">
            {profile.bannerUrl && (
              <img
                src={profile.bannerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/30"></div>
          </div>

          {/* Profile Info */}
          <div className="p-6 -mt-16 relative">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative">
                  <img
                    src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=128&background=random`}
                    alt={profile.displayName}
                    className="w-32 h-32 rounded-full border-4 border-gray-800 bg-gray-800 shadow-xl"
                  />
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
                    {getVerificationBadge()}
                  </div>
                  
                  {profile.customUsername && (
                    <p className="text-gray-400 mb-3 text-lg">@{profile.customUsername}</p>
                  )}
                  
                  {profile.bio && (
                    <p className="text-gray-300 mb-4 max-w-2xl">{profile.bio}</p>
                  )}

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-3 gap-6 sm:gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{profile.followerCount}</div>
                      <div className="text-sm text-gray-400">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{profile.followingCount}</div>
                      <div className="text-sm text-gray-400">Following</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{profile.postCount}</div>
                      <div className="text-sm text-gray-400">Posts</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                {isOwnProfile ? (
                  <button
                    onClick={() => router.push('/profile/settings')}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  session?.user && (
                    <button
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                        isFollowing
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : 'bg-casino-600 hover:bg-casino-700 text-white'
                      }`}
                    >
                      {followLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          {isFollowing ? (
                            <UserMinus className="w-5 h-5" />
                          ) : (
                            <UserPlus className="w-5 h-5" />
                          )}
                          <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {profile.location && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-casino-400" />
                    <span>{profile.location}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-casino-400" />
                  <span>Joined {new Date(profile.joinedDate).toLocaleDateString()}</span>
                </div>

                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-casino-400 hover:text-casino-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Website</span>
                  </a>
                )}

                {profile.twitter && (
                  <a
                    href={`https://twitter.com/${profile.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                    <span>@{profile.twitter}</span>
                  </a>
                )}

                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>@{profile.instagram}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats and Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Casino Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Coins className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">Casino Stats</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Balance</span>
                <span className="text-white font-semibold">1,250,000 💰</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Games Played</span>
                <span className="text-white font-semibold">3,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-green-400 font-semibold">68.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Favorite Game</span>
                <span className="text-casino-400 font-semibold">Blackjack</span>
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">Achievements</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-center">
                <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div className="text-xs text-yellow-400 font-medium">High Roller</div>
              </div>
              <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 text-center">
                <Diamond className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                <div className="text-xs text-purple-400 font-medium">VIP Member</div>
              </div>
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-center">
                <Flame className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div className="text-xs text-red-400 font-medium">Hot Streak</div>
              </div>
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-center">
                <Star className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-xs text-blue-400 font-medium">Lucky Star</div>
              </div>
            </div>
          </motion.div>

          {/* Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Activity className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300">Won 50,000 in Blackjack</div>
                  <div className="text-xs text-gray-500">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300">Published new blog post</div>
                  <div className="text-xs text-gray-500">1 day ago</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300">Unlocked achievement</div>
                  <div className="text-xs text-gray-500">3 days ago</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* User Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Recent Posts</h2>
          
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/blogs/${post.id}`)}
                  className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-white hover:text-casino-400 transition-colors">
                          {post.title}
                        </h3>
                        {post.featured && (
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{post.excerpt}</p>
                      <span className="text-xs text-casino-400 bg-casino-900/50 px-2 py-1 rounded">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{post.view_count}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{post.comments_count}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No posts yet.</p>
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/blogs/create')}
                  className="mt-4 bg-casino-600 hover:bg-casino-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Create Your First Post
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}