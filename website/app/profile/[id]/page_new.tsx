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
  Clock
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
  const profileId = params.id as string
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [error, setError] = useState('')

  const isOwnProfile = (session?.user as any)?.id === profileId

  useEffect(() => {
    if (profileId) {
      fetchProfile()
    }
  }, [profileId, session])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual API
      const mockProfile: UserProfile = {
        id: profileId,
        discordId: profileId,
        displayName: profileId === '388422519553654786' ? 'Casino Owner' : 'User Profile',
        customUsername: profileId === '388422519553654786' ? 'casino_admin' : 'user_name',
        bio: 'Welcome to my profile! I love gaming and creating amazing content.',
        website: 'https://example.com',
        twitter: 'example',
        instagram: 'example',
        location: 'Discord Server',
        bannerUrl: '',
        avatarUrl: '',
        isVerified: profileId === '388422519553654786',
        isOwner: profileId === '388422519553654786',
        verificationType: profileId === '388422519553654786' ? 'owner' : 'none',
        followerCount: 1250,
        followingCount: 180,
        postCount: 45,
        joinedDate: '2023-01-15',
        lastActive: '2024-11-03'
      }
      
      setProfile(mockProfile)
      // Mock posts would be fetched here too
      setPosts([])
    } catch (error) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!session?.user || !profile) return
    
    setFollowLoading(true)
    try {
      // Simulate API call
      setTimeout(() => {
        setIsFollowing(!isFollowing)
        setProfile(prev => prev ? {
          ...prev,
          followerCount: isFollowing ? prev.followerCount - 1 : prev.followerCount + 1
        } : null)
        setFollowLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Follow error:', error)
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
    
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <div className="casino-card rounded-xl p-8 bg-red-900/20 border border-red-500/30">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="casino-card rounded-2xl overflow-hidden mb-8 shadow-2xl"
        >
          {/* Banner */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-casino-600 via-purple-600 to-casino-700 relative overflow-hidden">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-casino-500/20 via-purple-500/20 to-pink-500/20">
                <div className="absolute inset-0 bg-gray-800/10 opacity-30"></div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
          </div>

          <div className="px-6 pb-6 -mt-20 relative">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-8">
              
              {/* Avatar and Basic Info */}
              <div className="flex flex-col md:flex-row md:items-end space-y-6 md:space-y-0 md:space-x-8">
                <div className="relative">
                  <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-gray-800">
                    <img
                      src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&size=160&background=random`}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {profile.verificationType === 'owner' && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                      OWNER
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-bold text-white">{profile.displayName}</h1>
                      {getVerificationBadge()}
                    </div>
                    
                    {profile.customUsername && (
                      <p className="text-lg text-gray-400 mb-2">@{profile.customUsername}</p>
                    )}
                  </div>
                  
                  {profile.bio && (
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-300 text-lg leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {profile.location && (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {new Date(profile.joinedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex flex-wrap gap-4">
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-casino-400 hover:text-casino-300 transition-colors duration-200"
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
                        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
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
                        className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors duration-200"
                      >
                        <Instagram className="w-4 h-4" />
                        <span>@{profile.instagram}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 mt-6 lg:mt-0">
                {isOwnProfile ? (
                  <button
                    onClick={() => router.push('/profile/settings')}
                    className="bg-gradient-to-r from-casino-500 to-casino-600 hover:from-casino-600 hover:to-casino-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 transform hover:scale-105"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  session?.user && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 transform hover:scale-105 ${
                        isFollowing
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                      }`}
                    >
                      {followLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isFollowing ? (
                        <UserMinus className="w-5 h-5" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      <span>{followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{profile.followerCount.toLocaleString()}</span>
                </div>
                <p className="text-blue-400 font-semibold">Followers</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30 hover:border-green-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-8 h-8 text-green-400" />
                  <span className="text-2xl font-bold text-white">{profile.followingCount.toLocaleString()}</span>
                </div>
                <p className="text-green-400 font-semibold">Following</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                  <span className="text-2xl font-bold text-white">{profile.postCount}</span>
                </div>
                <p className="text-purple-400 font-semibold">Posts</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-400" />
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">Active</div>
                  </div>
                </div>
                <p className="text-orange-400 font-semibold">Status</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Activity & Achievements Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="casino-card rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-casino-400" />
              Recent Activity
            </h2>
            
            <div className="space-y-4">
              {posts.length > 0 ? (
                posts.slice(0, 3).map((post) => (
                  <div key={post.id} className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer"
                    onClick={() => router.push(`/blogs/${post.id}`)}>
                    <h3 className="text-white font-semibold mb-2">{post.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{post.category}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No recent activity</p>
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/blogs/create')}
                      className="mt-4 bg-gradient-to-r from-casino-500 to-casino-600 hover:from-casino-600 hover:to-casino-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300"
                    >
                      Create Your First Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="casino-card rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Trophy className="w-6 h-6 mr-3 text-yellow-400" />
              Achievements
            </h2>
            
            <div className="space-y-4">
              {profile.verificationType === 'owner' && (
                <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Server Owner</h3>
                      <p className="text-gray-400 text-sm">Founder and administrator of Casino Bot</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Community Member</h3>
                    <p className="text-gray-400 text-sm">Active member of the community</p>
                  </div>
                </div>
              </div>

              {profile.postCount > 10 && (
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Active Blogger</h3>
                      <p className="text-gray-400 text-sm">Published {profile.postCount}+ posts</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}