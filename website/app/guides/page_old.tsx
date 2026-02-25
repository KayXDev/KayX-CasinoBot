'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Clock, 
  User, 
  ArrowRight, 
  Star, 
  Search,
  Filter,
  Crown,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Gamepad2,
  Gift,
  Sparkles,
  Flame,
  ArrowUpRight,
  CheckCircle,
  Trophy,
  Lightbulb,
  Rocket,
  Brain,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Play
} from 'lucide-react'
import Link from 'next/link'

const guides = [
  {
    id: 1,
    title: 'Empezando con Casino Bot',
    description: 'Aprende los fundamentos de usar Casino Bot en tu servidor de Discord. Perfecto para principiantes.',
    category: 'Principiante',
    readTime: '5 min',
    author: 'KayX Dev',
    published: '2024-10-15',
    difficulty: 'Fácil',
    tags: ['básicos', 'configuración', 'comandos'],
    featured: true,
    views: 15420,
    slug: 'empezando-con-casino-bot',
    likes: 892,
    color: 'from-green-500 to-emerald-500',
    icon: Rocket
  },
  {
    id: 2,
    title: 'Comandos Esenciales de Casino Bot',
    description: 'Domina los comandos más importantes para sacar el máximo provecho de Casino Bot.',
    category: 'Comandos',
    readTime: '8 min',
    author: 'KayX Dev',
    published: '2024-10-20',
    difficulty: 'Intermedio',
    tags: ['comandos', 'economía', 'juegos'],
    views: 12890,
    likes: 743,
    color: 'from-purple-500 to-violet-500',
    icon: Zap,
    slug: 'comandos-esenciales'
  },
  {
    id: 3,
    title: 'Estrategias Ganadoras en Blackjack',
    description: 'Aprende las mejores estrategias para dominar el blackjack y maximizar tus ganancias.',
    category: 'Juegos',
    readTime: '12 min',
    author: 'Pro Gambler',
    published: '2024-10-25',
    difficulty: 'Avanzado',
    tags: ['blackjack', 'estrategia', 'casino'],
    featured: true,
    views: 8750,
    likes: 567,
    color: 'from-red-500 to-pink-500',
    icon: Target,
    slug: 'estrategias-blackjack'
  },
  {
    id: 4,
    title: 'Sistema de Economía Avanzada',
    description: 'Explora las características avanzadas del sistema económico de Casino Bot.',
    category: 'Economía',
    readTime: '15 min',
    author: 'Crypto Master',
    published: '2024-10-28',
    difficulty: 'Avanzado',
    tags: ['economía', 'trading', 'inversión'],
    views: 6420,
    likes: 398,
    color: 'from-blue-500 to-cyan-500',
    icon: TrendingUp,
    slug: 'economia-avanzada'
  },
  {
    id: 5,
    title: 'Optimización de la Economía Personal',
    description: 'Maximiza tus ganancias y gestiona tu dinero virtual como un experto financiero.',
    category: 'Economía',
    readTime: '10 min',
    author: 'Money Expert',
    published: '2024-09-15',
    difficulty: 'Intermedio',
    tags: ['economía', 'gestión', 'dinero'],
    views: 11300,
    likes: 789,
    color: 'from-amber-500 to-orange-500',
    icon: Crown
  },
  {
    id: 6,
    title: 'Sistema Social y Amistades',
    description: 'Cómo construir una red social sólida y aprovechar las características sociales del bot.',
    category: 'Social',
    readTime: '8 min',
    author: 'Social Butterfly',
    published: '2024-09-10',
    difficulty: 'Fácil',
    tags: ['social', 'amigos', 'comunidad'],
    views: 8650,
    likes: 432,
    color: 'from-indigo-500 to-purple-500',
    icon: Users
  }
]

const categories = [
  { id: 'all', name: 'Todas', icon: BookOpen, color: 'from-gray-500 to-gray-600' },
  { id: 'Principiante', name: 'Principiante', icon: Rocket, color: 'from-green-500 to-emerald-500' },
  { id: 'Gaming', name: 'Gaming', icon: Gamepad2, color: 'from-red-500 to-pink-500' },
  { id: 'Trading', name: 'Trading', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
  { id: 'Atracos', name: 'Atracos', icon: Shield, color: 'from-purple-500 to-violet-500' },
  { id: 'Economía', name: 'Economía', icon: Crown, color: 'from-amber-500 to-orange-500' },
  { id: 'Social', name: 'Social', icon: Users, color: 'from-indigo-500 to-purple-500' }
]

const difficulties = [
  { id: 'all', name: 'Todos', color: 'from-gray-500 to-gray-600' },
  { id: 'Fácil', name: 'Fácil', color: 'from-green-500 to-emerald-500' },
  { id: 'Intermedio', name: 'Intermedio', color: 'from-yellow-500 to-orange-500' },
  { id: 'Avanzado', name: 'Avanzado', color: 'from-red-500 to-pink-500' }
]

export default function GuidesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredGuides = guides.filter(guide => {
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || guide.difficulty === selectedDifficulty
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesCategory && matchesDifficulty && matchesSearch
  })

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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="text-center mb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-casino-500/20 via-purple-500/20 to-pink-500/20 border border-casino-400/30 backdrop-blur-xl mb-8 group hover:scale-105 transition-all duration-300"
          >
            <Lightbulb className="w-5 h-5 text-casino-400 mr-3 group-hover:animate-bounce transition-transform duration-300" />
            <span className="text-casino-300 font-semibold tracking-wide">Aprende y Domina</span>
            <Brain className="w-4 h-4 text-purple-400 ml-3 animate-pulse" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl md:text-8xl font-black mb-8 relative"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-300 to-purple-300">
              Guías
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
              Maestras
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-20"></div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light"
          >
            Conviértete en un <span className="text-casino-400 font-bold">experto absoluto</span> con nuestras
            <span className="text-purple-400 font-bold"> guías detalladas</span> y estrategias probadas
          </motion.p>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto space-y-6 mb-16"
          >
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Buscar guías, estrategias, consejos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl text-white text-lg placeholder-gray-400 focus:outline-none focus:border-casino-400/50 focus:shadow-lg focus:shadow-casino-500/20 transition-all duration-300"
              />
            </div>

            {/* Category Filter */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon
                const isSelected = selectedCategory === category.id
                return (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-600/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:block">{category.name}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Difficulty Filter */}
            <div className="flex justify-center space-x-3">
              {difficulties.map((difficulty) => {
                const isSelected = selectedDifficulty === difficulty.id
                return (
                  <motion.button
                    key={difficulty.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDifficulty(difficulty.id)}
                    className={`px-6 py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-r ${difficulty.color} text-white shadow-lg`
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-600/50'
                    }`}
                  >
                    {difficulty.name}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Featured Guides */}
        <div className="mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-white mb-8 flex items-center"
          >
            <Star className="w-8 h-8 text-yellow-400 mr-3" />
            Guías Destacadas
            <Sparkles className="w-6 h-6 text-purple-400 ml-3 animate-pulse" />
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8">
            {filteredGuides.filter(guide => guide.featured).map((guide, index) => {
              const IconComponent = guide.icon
              return (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-casino-500/20 h-full ring-2 ring-casino-400/30">
                    {/* Featured Badge */}
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/30 flex items-center space-x-1">
                      <Crown className="w-3 h-3" />
                      <span>Destacada</span>
                    </div>

                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${guide.color} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 mb-6`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-casino-300 transition-colors">
                      {guide.title}
                    </h3>

                    <p className="text-gray-400 leading-relaxed mb-6">
                      {guide.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{guide.readTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{guide.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span>{guide.likes}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        guide.difficulty === 'Fácil' ? 'bg-green-500/20 text-green-400' :
                        guide.difficulty === 'Intermedio' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {guide.difficulty}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {guide.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-3 py-1 bg-gray-800/60 text-gray-300 rounded-full text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      className={`w-full bg-gradient-to-r ${guide.color} text-white px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg group-hover:shadow-xl`}
                    >
                      <Play className="w-5 h-5" />
                      <span>Leer Guía</span>
                      <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                    </motion.button>

                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse rounded-3xl"></div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* All Guides Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-4xl font-bold text-white mb-8 flex items-center">
            <BookOpen className="w-8 h-8 text-casino-400 mr-3" />
            Todas las Guías
            <span className="ml-4 text-lg font-normal text-gray-400">
              ({filteredGuides.length} guías)
            </span>
          </h2>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGuides.map((guide, index) => {
              const IconComponent = guide.icon
              return (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative"
                >
                  <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-500 hover:shadow-xl hover:shadow-casino-500/10 h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${guide.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      {guide.featured && (
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-400/30">
                          ⭐ TOP
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-casino-300 transition-colors">
                      {guide.title}
                    </h3>

                    <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
                      {guide.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{guide.readTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{guide.views.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        guide.difficulty === 'Fácil' ? 'bg-green-500/20 text-green-400' :
                        guide.difficulty === 'Intermedio' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {guide.difficulty}
                      </div>
                    </div>

                    {/* Action */}
                    <Link href={`/guides/${guide.slug || guide.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-full bg-gradient-to-r from-gray-800/80 to-gray-700/80 hover:from-casino-500/80 hover:to-casino-400/80 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Leer Ahora</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </motion.div>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}