'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  User, 
  ArrowRight, 
  Star, 
  Search,
  Crown,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Gamepad2,
  Trophy,
  Lightbulb,
  Rocket,
  Brain,
  Eye,
  Heart,
  ExternalLink,
  Play
} from 'lucide-react'
import Link from 'next/link'

const guides = [
  {
    id: 1,
    title: 'Getting Started with Casino Bot',
    description: 'Learn the fundamentals of using Casino Bot in your Discord server. Perfect for beginners to get started.',
    category: 'Beginner',
    readTime: '5 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['basics', 'setup', 'commands'],
    featured: true,
    views: 0,
    slug: 'getting-started-casino-bot',
    likes: 0,
    color: 'from-green-500 to-emerald-500',
    icon: Rocket
  },
  {
    id: 2,
    title: 'Essential Casino Bot Commands',
    description: 'Master the most important commands to get the maximum benefit from Casino Bot in your server.',
    category: 'Commands',
    readTime: '8 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Intermediate',
    tags: ['commands', 'economy', 'games'],
    views: 0,
    likes: 0,
    color: 'from-purple-500 to-violet-500',
    icon: Zap,
    slug: 'essential-casino-commands'
  },
  {
    id: 3,
    title: 'Blackjack Winning Strategies',
    description: 'Learn the best strategies to dominate blackjack and maximize your winnings in Casino Bot.',
    category: 'Games',
    readTime: '12 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Advanced',
    tags: ['blackjack', 'strategy', 'casino'],
    featured: true,
    views: 0,
    likes: 0,
    color: 'from-red-500 to-pink-500',
    icon: Target,
    slug: 'blackjack-winning-strategies'
  },
  {
    id: 4,
    title: 'Advanced Economy System',
    description: 'Explore the advanced features of Casino Bot\'s comprehensive economic system and wealth building.',
    category: 'Economy',
    readTime: '15 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Advanced',
    tags: ['economy', 'banking', 'investment'],
    views: 0,
    likes: 0,
    color: 'from-blue-500 to-cyan-500',
    icon: TrendingUp,
    slug: 'advanced-economy-system'
  },
  {
    id: 5,
    title: 'Lottery and Scratch Card Guide',
    description: 'Master the lottery system and scratch card games to hit the jackpot in Casino Bot.',
    category: 'Games',
    readTime: '10 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['lottery', 'scratch', 'luck'],
    views: 0,
    likes: 0,
    color: 'from-amber-500 to-orange-500',
    icon: Crown,
    slug: 'lottery-and-scratch-cards'
  },
  {
    id: 6,
    title: 'Social Features and Friends System',
    description: 'Build a strong social network and leverage Casino Bot\'s social features to enhance your experience.',
    category: 'Social',
    readTime: '8 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['social', 'friends', 'community'],
    views: 0,
    likes: 0,
    color: 'from-indigo-500 to-purple-500',
    icon: Users,
    slug: 'social-features-friends-system'
  }
]

const categories = [
  { id: 'all', name: 'All', icon: BookOpen },
  { id: 'Beginner', name: 'Beginner', icon: Rocket },
  { id: 'Commands', name: 'Commands', icon: Zap },
  { id: 'Games', name: 'Games', icon: Gamepad2 },
  { id: 'Economy', name: 'Economy', icon: Crown },
  { id: 'Social', name: 'Social', icon: Users }
]

const difficulties = [
  { id: 'all', name: 'All' },
  { id: 'Easy', name: 'Easy' },
  { id: 'Intermediate', name: 'Intermediate' },
  { id: 'Advanced', name: 'Advanced' }
]

export default function GuidesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dynamicStats, setDynamicStats] = useState<{[key: string]: {likes: number, views: number}}>({})

  // Cargar likes y vistas dinámicos del localStorage
  useEffect(() => {
    const stats: {[key: string]: {likes: number, views: number}} = {}
    
    guides.forEach(guide => {
      const likes = parseInt(localStorage.getItem(`guide-likes-${guide.slug}`) || '0')
      const views = parseInt(localStorage.getItem(`guide-views-${guide.slug}`) || '0')
      stats[guide.slug] = { likes, views }
    })
    
    setDynamicStats(stats)
  }, [])

  // Listener para actualizar cuando cambie localStorage o cuando se regrese a la página
  useEffect(() => {
    const updateStats = () => {
      const stats: {[key: string]: {likes: number, views: number}} = {}
      
      guides.forEach(guide => {
        const likes = parseInt(localStorage.getItem(`guide-likes-${guide.slug}`) || '0')
        const views = parseInt(localStorage.getItem(`guide-views-${guide.slug}`) || '0')
        stats[guide.slug] = { likes, views }
      })
      
      setDynamicStats(stats)
    }

    // Actualizar cuando se enfoca la ventana (usuario regresa de otra página)
    const handleFocus = () => updateStats()
    window.addEventListener('focus', handleFocus)

    // Actualizar cada 5 segundos para cambios dinámicos
    const interval = setInterval(updateStats, 5000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  // Combinar datos estáticos con dinámicos
  const guidesWithDynamicStats = guides.map(guide => ({
    ...guide,
    likes: dynamicStats[guide.slug]?.likes || guide.likes,
    views: dynamicStats[guide.slug]?.views || guide.views
  }))

  const filteredGuides = guidesWithDynamicStats.filter(guide => {
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || guide.difficulty === selectedDifficulty
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesCategory && matchesDifficulty && matchesSearch
  })

  const featuredGuides = filteredGuides.filter(guide => guide.featured)
  const regularGuides = filteredGuides.filter(guide => !guide.featured)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-500/20 text-green-400'
      case 'Intermedio': return 'bg-yellow-500/20 text-yellow-400'
      case 'Avanzado': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
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
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
              <Lightbulb className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">Learn and Master</span>
              <Brain className="w-4 h-4 text-white ml-2" />
            </div>
            
            <h1 className="text-4xl font-black text-white mb-3">
              Casino Bot Guides
            </h1>
            
            <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
              Become an absolute expert with our detailed guides and proven strategies
            </p>
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
              placeholder="Looking for guides, strategies, advice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
            />
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

            {/* Difficulty */}
            <div className="flex flex-wrap gap-2 justify-center">
              {difficulties.map((difficulty) => {
                const isSelected = selectedDifficulty === difficulty.id
                return (
                  <button
                    key={difficulty.id}
                    onClick={() => setSelectedDifficulty(difficulty.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {difficulty.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Featured Guides */}
        {featuredGuides.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Star className="w-6 h-6 text-yellow-400 mr-2" />
              Featured Guides
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredGuides.map((guide) => {
                const IconComponent = guide.icon
                return (
                  <Link key={guide.id} href={`/guides/${guide.slug}`}>
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 border border-gray-600 hover:border-casino-500 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${guide.color} flex items-center justify-center`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                            {guide.difficulty}
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-casino-300 transition-colors">
                        {guide.title}
                      </h3>
                      
                      <p className="text-gray-400 mb-4 leading-relaxed">
                        {guide.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {guide.author}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {guide.readTime}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {guide.views.toLocaleString()}
                          </div>
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {guide.likes}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Regular Guides */}
        {regularGuides.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              All Guides
            </h2>
            <div className="grid gap-4">
              {regularGuides.map((guide) => {
                const IconComponent = guide.icon
                return (
                  <Link key={guide.id} href={`/guides/${guide.slug}`}>
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-casino-500 transition-all cursor-pointer group">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${guide.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-casino-300 transition-colors">
                              {guide.title}
                            </h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(guide.difficulty)} flex-shrink-0`}>
                              {guide.difficulty}
                            </div>
                          </div>
                          
                          <p className="text-gray-400 mb-3">
                            {guide.description}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                {guide.author}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {guide.readTime}
                              </div>
                              <span className="text-gray-600">•</span>
                              <span>{new Date(guide.published).toLocaleDateString('es-ES')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                {guide.views.toLocaleString()}
                              </div>
                              <div className="flex items-center">
                                <Heart className="w-4 h-4 mr-1" />
                                {guide.likes}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredGuides.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No se encontraron guías</h3>
            <p className="text-gray-500">
              Intenta cambiar los filtros o términos de búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  )
}