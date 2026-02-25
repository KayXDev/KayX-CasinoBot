'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowRight,
  BookOpen,
  Calendar,
  Clock, 
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Star,
  User
} from 'lucide-react'
import { BlogPostSkeleton } from '../../components/Skeleton'

interface BlogPost {
  id: number
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  author_id: string
  author_avatar?: string
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

// Cargar posts desde la API

const categories = [
  { id: 'all', name: 'All', color: 'bg-gray-600' },
  { id: 'Estrategia', name: 'Strategy', color: 'bg-red-600' },
  { id: 'Comunidad', name: 'Community', color: 'bg-blue-600' },
  { id: 'Tecnología', name: 'Technology', color: 'bg-purple-600' },
  { id: 'Resultados', name: 'Results', color: 'bg-green-600' },
]

export default function BlogsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false) // Change to false for faster loading

  const isOwner = session?.user && (session.user as any)?.id === '388422519553654786'

  // Cargar posts desde la API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Removed setLoading(true) for faster transitions
        const response = await fetch('/api/blogs')
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.posts) {
            // Formatear las fechas y datos
            const formattedPosts = data.posts.map((post: any) => ({
              ...post,
              publishDate: new Date(post.published_at || post.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              readTime: post.read_time || '5 min',
              tags: Array.isArray(post.tags) ? post.tags : (post.tags ? JSON.parse(post.tags) : []),
              views: post.views || 0,
              likes: post.likes || 0,
              comments: post.comments_count || 0
            }))
            
            setPosts(formattedPosts)
          } else {
            setPosts([])
          }
        } else {
          setPosts([])
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error)
        setPosts([])
      }
      // Removed finally block - we don't need setLoading(false)
    }

    fetchPosts()
  }, [])

  // Filtrar posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredPosts = filteredPosts.filter(post => post.featured)
  const pinnedPosts = filteredPosts.filter(post => post.pinned && !post.featured)
  const regularPosts = filteredPosts.filter(post => !post.featured && !post.pinned)

  const getBadgeIcon = (post: BlogPost) => {
    if (post.featured) return <Star className="w-3 h-3" />
    if (post.pinned) return <ArrowRight className="w-3 h-3 rotate-45" />
    return null
  }

  const getBadgeText = (post: BlogPost) => {
    if (post.featured) return 'Destacado'
    if (post.pinned) return 'Fijado'
    return null
  }

  const getBadgeColor = (post: BlogPost) => {
    if (post.featured) return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
    if (post.pinned) return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
    return ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-white mb-3">
              Casino Blog
            </h1>
            <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
              Discover strategies, news, and updates from the world of casinos
            </p>
            
            {/* Create Post Button */}
            {session?.user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/blogs/create')}
                className="bg-white text-casino-600 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 mx-auto hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Post</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-casino-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Star className="w-8 h-8 text-yellow-400 mr-3" />
              Posts Destacados
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer bg-gray-800/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-casino-500/20 transition-all duration-300 border border-gray-700/50"
                  onClick={() => router.push(`/blogs/${post.id}`)}
                >
                  {/* Image */}
                  <div className="h-48 bg-gradient-to-br from-casino-500 to-purple-600 relative overflow-hidden">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white/50" />
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1 ${getBadgeColor(post)}`}>
                      {getBadgeIcon(post)}
                      <span>{getBadgeText(post)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-casino-500/20 text-casino-400 rounded-full text-sm font-medium">
                        {post.category}
                      </span>
                      <span className="text-gray-400 text-sm">{post.readTime}</span>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center mb-2">
                        {post.author_avatar ? (
                          <img 
                            src={post.author_avatar} 
                            alt={post.author}
                            className="w-6 h-6 rounded-full mr-2 object-cover border border-casino-500/30"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-r from-casino-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <span className="text-casino-400 text-sm font-medium">{post.author || 'Autor desconocido'}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-casino-400 transition-colors">
                        {post.title}
                      </h3>
                    </div>

                    <p className="text-gray-300 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400 text-sm">{post.publishDate}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span>{post.views}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                          <span>{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {/* Pinned Posts */}
        {pinnedPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <ArrowRight className="w-8 h-8 text-blue-400 mr-3 rotate-45" />
              Posts Fijados
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {pinnedPosts.map((post, index) => (
                <PostCard key={post.id} post={post} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Regular Posts */}
        {regularPosts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <BookOpen className="w-8 h-8 text-casino-400 mr-3" />
              Recent Articles
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {posts.length === 0 && loading ? (
                // Mostrar skeletons mientras carga
                [...Array(6)].map((_, index) => (
                  <BlogPostSkeleton key={`skeleton-${index}`} />
                ))
              ) : (
                regularPosts.map((post, index) => (
                  <PostCard key={post.id} post={post} index={index} />
                ))
              )}
            </div>
          </section>
        )}

        {/* No Results */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">Aún no hay posts disponibles</h3>
            <p className="text-gray-500 mb-6">¡Sé el primero en crear un post en nuestro blog!</p>
            {session?.user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/blogs/create')}
                className="bg-gradient-to-r from-casino-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 mx-auto transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                <span>Crear mi primer post</span>
              </motion.button>
            )}
          </div>
        )}
        
        {/* No Filtered Results */}
        {!loading && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No se encontraron posts</h3>
            <p className="text-gray-500">Intenta cambiar los filtros o el término de búsqueda</p>
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      {session?.user && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/blogs/create')}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-casino-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40"
          title="Crear nuevo post"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  )
}

// Componente de tarjeta reutilizable
function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const router = useRouter()

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer bg-gray-800/50 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-casino-500/20 transition-all duration-300 border border-gray-700/50"
      onClick={() => router.push(`/blogs/${post.id}`)}
    >
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-casino-500 to-purple-600 relative overflow-hidden">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/50" />
          </div>
        )}
        
        {/* Badge */}
        {(post.featured || post.pinned) && (
          <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1 ${getBadgeColor(post)}`}>
            {getBadgeIcon(post)}
            <span>{getBadgeText(post)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-casino-500/20 text-casino-400 rounded-full text-xs font-medium">
            {post.category}
          </span>
          <span className="text-gray-400 text-xs">{post.readTime}</span>
        </div>

        <div className="mb-3">
          <div className="flex items-center mb-2">
            {post.author_avatar ? (
              <img 
                src={post.author_avatar} 
                alt={post.author}
                className="w-5 h-5 rounded-full mr-2 object-cover border border-casino-500/30"
              />
            ) : (
              <div className="w-5 h-5 bg-gradient-to-r from-casino-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                <User className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <span className="text-casino-400 text-xs font-medium">{post.author || 'Autor desconocido'}</span>
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-casino-400 transition-colors line-clamp-2">
            {post.title}
          </h3>
        </div>

        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400 text-xs">{post.publishDate}</span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3 text-gray-400" />
              <span>{post.views}</span>
            </div>
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
    </motion.article>
  )
}

function getBadgeIcon(post: BlogPost) {
  if (post.featured) return <Star className="w-3 h-3" />
  if (post.pinned) return <ArrowRight className="w-3 h-3 rotate-45" />
  return null
}

function getBadgeText(post: BlogPost) {
  if (post.featured) return 'Destacado'
  if (post.pinned) return 'Fijado'
  return null
}

function getBadgeColor(post: BlogPost) {
  if (post.featured) return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
  if (post.pinned) return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
  return ''
}