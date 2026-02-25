'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock, 
  Crown,
  Eye, 
  Heart,
  MessageCircle,
  Plus,
  Search,
  Star,
  Tag,
  TrendingUp,
  User,
  Users
} from 'lucide-react'

interface BlogPost {
  id: number
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  author_id: string
  publishDate: string
  readTime: string
  featured: boolean
  pinned?: boolean
  tags: string[]
  views: number
  likes: number
  comments: number
  image?: string
}

// Funciones auxiliares para avatares
const getUserAvatar = (authorId: string, authorName: string) => {
  // Si tenemos el author_id real de Discord, usar avatar por defecto
  if (authorId && authorId !== 'staff' && authorId !== 'admin' && authorId.length > 10) {
    // Usar el avatar por defecto de Discord basado en el discriminator del ID
    const discriminator = parseInt(authorId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`
  }
  // Fallback to UI avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&size=40&background=6366f1&color=ffffff`
}

const getDiscordAvatar = (authorId: string, authorName: string) => {
  // Si tenemos el author_id real de Discord, usar avatar por defecto
  if (authorId && authorId !== 'staff' && authorId !== 'admin' && authorId.length > 10) {
    // Usar el avatar por defecto de Discord basado en el discriminator del ID
    const discriminator = parseInt(authorId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`
  }
  // Fallback to generated avatar con el nombre del autor
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&size=32&background=dc2626&color=ffffff&bold=true`
}

// Componente para las tarjetas de blog reutilizable
function BlogPostCard({ post, index }: { post: BlogPost; index: number }) {
  const router = useRouter()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:shadow-casino-500/25 transition-all duration-300 border border-gray-700/50 flex flex-col h-96 relative"
      onClick={() => router.push(`/blogs/${post.id}`)}
    >
      {/* Badge para posts fijados */}
      {post.pinned && (
        <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-400/30 flex items-center space-x-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
          </svg>
          <span>Fijado</span>
        </div>
      )}

      <div className="h-32 bg-gradient-to-br from-gray-700 to-gray-800 relative overflow-hidden flex-shrink-0">
        {post.image ? (
          <img 
            src={post.image} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-casino-500 to-purple-600">
            <MessageCircle className="w-8 h-8 text-white/50" />
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="bg-casino-500/20 text-casino-400 px-2 py-1 rounded-full text-xs font-medium">
            {post.category}
          </span>
          <span className="text-gray-400 text-xs">{post.readTime}</span>
        </div>
        
        <h3 className="text-base font-bold text-white mb-2 group-hover:text-casino-400 transition-colors line-clamp-2 flex-shrink-0">
          {post.title}
        </h3>
        
        <p className="text-gray-300 text-sm mb-3 line-clamp-2 flex-1">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50 mt-auto">
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-semibold text-white text-sm leading-tight truncate max-w-full">{post.author}</p>
            <span className="text-xs text-gray-400 leading-tight">{post.publishDate}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-400 flex-shrink-0 ml-2">
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3 text-red-400" />
              <span>{post.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3 text-blue-400" />
              <span>{post.comments}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function FeaturedCarousel({ posts }: { posts: BlogPost[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (posts.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % posts.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [posts.length])

  if (posts.length === 0) return null

  const currentPost = posts[currentIndex]

  return (
    <div className="relative">
      <div className="relative h-64 md:h-80 overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.article
              whileHover={{ scale: 1.02 }}
              className="group cursor-pointer h-full"
              onClick={() => router.push(`/blogs/${currentPost.id}`)}
            >
              <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-xl overflow-hidden border border-casino-500/30 hover:border-casino-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-casino-500/20 h-full">
                
                <div className="absolute top-3 left-3 z-20">
                  <div className="bg-gradient-to-r from-casino-500 to-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center space-x-2">
                    <Star className="w-4 h-4" />
                    <span>DESTACADO</span>
                  </div>
                </div>

                {posts.length > 1 && (
                  <div className="absolute top-3 right-3 z-20 flex space-x-1">
                    {posts.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentIndex(index)
                        }}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentIndex 
                            ? 'bg-casino-400 w-6' 
                            : 'bg-white/30 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-col md:flex-row h-full">
                  <div className="md:w-1/2 relative h-48 md:h-full overflow-hidden">
                    {currentPost.image ? (
                      <img 
                        src={currentPost.image} 
                        alt={currentPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-casino-500 via-purple-600 to-pink-600 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>

                  <div className="md:w-1/2 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="bg-casino-500/20 text-casino-400 px-3 py-1 rounded-full text-sm font-semibold">
                          {currentPost.category}
                        </span>
                        <span className="text-gray-400 text-sm flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{currentPost.readTime}</span>
                        </span>
                      </div>
                      
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight group-hover:text-casino-300 transition-colors line-clamp-2">
                        {currentPost.title}
                      </h3>
                      
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                        {currentPost.excerpt}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getUserAvatar(currentPost.author_id, currentPost.author)}
                          alt={currentPost.author}
                          className="w-10 h-10 rounded-full border-2 border-gray-600/50"
                        />
                        <div>
                          <p className="font-semibold text-white text-sm">{currentPost.author}</p>
                          <p className="text-gray-400 text-sm">{currentPost.publishDate}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{currentPost.views}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4 text-red-400" />
                            <span>{currentPost.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{currentPost.comments}</span>
                          </div>
                        </div>
                        <div className="text-casino-400 hover:text-casino-300 transition-colors">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          </motion.div>
        </AnimatePresence>
      </div>

      {posts.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex(prev => (prev - 1 + posts.length) % posts.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % posts.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

export default function BlogPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([])
  const [pinnedPosts, setPinnedPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const isOwner = session?.user && (session.user as any)?.id === '388422519553654786'

  // Static blog posts for fallback
  const staticBlogPosts = [
    {
      id: 1,
      title: 'Mastering Casino Strategies: A Comprehensive Guide',
      excerpt: 'Learn the most effective strategies for maximizing your wins in our Discord casino.',
      content: '',
      category: 'Strategy',
      author: 'KayX',
      author_id: '388422519553654786',
      publishDate: '2024-11-01',
      readTime: '8 min read',
      featured: true,
      tags: ['strategy', 'tips', 'casino'],
      views: 2840,
      likes: 156,
      comments: 23,
      image: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=400&fit=crop'
    },
    {
      id: 2,
      title: 'Community Building: Creating Safe Gaming Spaces',
      excerpt: 'How we maintain a healthy and inclusive environment for all our casino members.',
      content: '',
      category: 'Community',
      author: 'KayX',
      author_id: '388422519553654786',
      publishDate: '2024-10-28',
      readTime: '6 min read',
      featured: false,
      pinned: true,
      tags: ['community', 'safety', 'gaming'],
      views: 1892,
      likes: 94,
      comments: 17,
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop'
    },
    {
      id: 3,
      title: 'The Future of Virtual Casino Gaming',
      excerpt: 'Exploring upcoming features and innovations in Discord-based gaming experiences.',
      content: '',
      category: 'Technology',
      author: 'KayX',
      author_id: '388422519553654786',
      publishDate: '2024-10-25',
      readTime: '10 min read',
      featured: false,
      pinned: false,
      tags: ['technology', 'future', 'gaming'],
      views: 3201,
      likes: 187,
      comments: 45,
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop'
    },
    {
      id: 4,
      title: 'Weekly Tournament Results',
      excerpt: 'See who dominated this weeks casino tournaments and claimed the top prizes.',
      content: '',
      category: 'Results',
      author: 'KayX',
      author_id: '388422519553654786',
      publishDate: '2024-10-20',
      readTime: '4 min read',
      featured: false,
      pinned: false,
      tags: ['tournament', 'results', 'winners'],
      views: 1456,
      likes: 89,
      comments: 12,
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop'
    }
  ]

  useEffect(() => {
    fetchBlogPosts()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/blogs')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.posts) {
          const allPosts = data.posts
          setPosts(allPosts)
          setFeaturedPosts(allPosts.filter((post: any) => post.featured))
          setPinnedPosts(allPosts.filter((post: any) => post.pinned))
        }
      } else {
        // Fallback to static posts
        setPosts(staticBlogPosts)
        setFeaturedPosts(staticBlogPosts.filter(post => post.featured))
        setPinnedPosts([])
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error)
      setPosts(staticBlogPosts)
      setFeaturedPosts(staticBlogPosts.filter(post => post.featured))
      setPinnedPosts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading articles...</p>
        </div>
      </div>
    )
  }

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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-casino-500/20 via-purple-500/20 to-pink-500/20 border border-casino-400/30 backdrop-blur-xl mb-6 group hover:scale-105 transition-all duration-300"
          >
            <BookOpen className="w-4 h-4 text-casino-400 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-casino-300 font-semibold tracking-wide text-sm">Blog del Casino</span>
            <Star className="w-3 h-3 text-purple-400 ml-2 animate-pulse" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black mb-6 relative"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-300 to-purple-300">
              Casino
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
              Blog
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-20"></div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed font-light"
          >
            Descubre <span className="text-casino-400 font-bold">estrategias</span>, 
            <span className="text-purple-400 font-bold"> tips</span> y historias del mundo del casino
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12"
          >
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-center group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center mb-3">
                <BookOpen className="w-8 h-8 text-casino-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{posts.length}</div>
              <div className="text-sm text-gray-400 font-medium">Artículos</div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-center group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{new Set(posts.map(p => p.author)).size}</div>
              <div className="text-sm text-gray-400 font-medium">Autores</div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-center group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center mb-3">
                <Eye className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{posts.reduce((acc: number, p: BlogPost) => acc + p.views, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400 font-medium">Vistas</div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 text-center group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center mb-3">
                <Heart className="w-8 h-8 text-pink-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{posts.reduce((acc: number, p: BlogPost) => acc + p.likes, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400 font-medium">Me Gusta</div>
            </div>
          </motion.div>
            
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl mx-auto relative"
          >
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 text-lg rounded-2xl bg-gray-800/70 backdrop-blur-md border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-500/50 focus:border-casino-500 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Articles Area */}
          <div className="flex-1">
            {/* Action Buttons */}
            {session?.user && (
              <div className="flex flex-wrap items-center justify-between mb-12 p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50">
                <div className="flex items-center space-x-6 mb-4 lg:mb-0">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-casino-400">{posts.length}</div>
                    <div className="text-sm text-gray-400">Articles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">{featuredPosts.length}</div>
                    <div className="text-sm text-gray-400">Featured</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{pinnedPosts.length}</div>
                    <div className="text-sm text-gray-400">Pinned</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/blogs/create')}
                    className="bg-gradient-to-r from-casino-600 to-casino-700 hover:from-casino-700 hover:to-casino-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg shadow-casino-600/25"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Write Article</span>
                  </motion.button>
                  
                  {isOwner && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/admin')}
                      className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 shadow-lg shadow-yellow-600/25"
                    >
                      <Crown className="w-5 h-5" />
                      <span>Admin Panel</span>
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* Featured Articles Carousel */}
            {featuredPosts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-16"
              >
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                  <Star className="w-8 h-8 text-casino-400 mr-3" />
                  Destacados
                  <span className="ml-3 bg-casino-500/20 text-casino-400 px-3 py-1 rounded-full text-sm font-semibold">
                    {featuredPosts.length}
                  </span>
                </h2>
                
                <FeaturedCarousel posts={featuredPosts} />
                
                {/* Espaciado entre destacados y resto */}
                <div className="mb-8"></div>
              </motion.div>
            )}

            {/* Posts Fijados */}
            {filteredPosts.filter(post => post.pinned && !post.featured).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12"
              >
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                  <svg className="w-8 h-8 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
                  </svg>
                  Posts Fijados
                  <span className="ml-3 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredPosts.filter(post => post.pinned && !post.featured).length}
                  </span>
                </h2>
                
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPosts.filter(post => post.pinned && !post.featured).map((post, index) => (
                    <BlogPostCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Articles Grid - Posts Normales */}
            {filteredPosts.filter(post => !post.featured && !post.pinned).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
                  <BookOpen className="w-8 h-8 text-casino-400 mr-3" />
                  Artículos Recientes
                  <span className="ml-3 bg-casino-500/20 text-casino-400 px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredPosts.filter(post => !post.featured && !post.pinned).length}
                  </span>
                </h2>
              
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPosts.filter(post => !post.featured && !post.pinned).map((post, index) => (
                    <BlogPostCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            {/* Categories */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-700/50">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-casino-400" />
                Categories
              </h3>
              <div className="space-y-2">
                {['all', 'Strategy', 'Community', 'Technology'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category
                        ? 'bg-casino-500/20 text-casino-400 font-medium'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {category === 'all' ? 'All Posts' : category}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Posts */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-700/50">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-casino-400" />
                Popular Posts
              </h3>
              <div className="space-y-4">
                {posts.slice(0, 3).map((post, index) => (
                  <div 
                    key={post.id}
                    className="flex items-start space-x-3 cursor-pointer group"
                    onClick={() => router.push(`/blogs/${post.id}`)}
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-casino-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white group-hover:text-casino-400 transition-colors line-clamp-2 text-sm">
                        {post.title}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">{post.readTime}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-gray-400">{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        {!session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-20 bg-gradient-to-r from-casino-600 to-purple-600 rounded-3xl p-12 text-center text-white border border-casino-500/30 shadow-2xl shadow-casino-500/20"
          >
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-casino-200 bg-clip-text text-transparent">Join Our Community</h2>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Ready to share your story and connect with fellow casino enthusiasts?
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/auth/signin')}
              className="bg-white text-casino-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-casino-50 transition-colors shadow-lg"
            >
              Get Started Today
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}