'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Save, 
  X, 
  Image as ImageIcon, 
  Bold, 
  Italic, 
  List, 
  Link,
  Eye,
  Plus,
  Trash2,
  User,
  Sparkles,
  Wand2,
  Feather,
  Target,
  Zap,
  Crown,
  Star,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Palette
} from 'lucide-react'

const getAvailableCategories = (isOwner: boolean) => {
  if (isOwner) {
    return [
      'General',
      'Community', 
      'Industry Insights',
      'Technology',
      'Development',
      'Security',
      'Gaming',
      'Updates',
      'Announcements'
    ]
  } else {
    return [
      'General',
      'Community'
    ]
  }
}

export default function CreateBlogPost() {
  const { data: session } = useSession()
  const router = useRouter()
  const isOwner = session?.user && (session.user as any).id === '388422519553654786'
  const availableCategories = getAvailableCategories(isOwner || false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'General',
    tags: [] as string[],
    status: 'published'
  })
  
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-8">You need to be logged in to create blog posts.</p>
          <button
            onClick={() => router.push('/blogs')}
            className="bg-casino-600 hover:bg-casino-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Back to Blog
          </button>
        </div>
      </div>
    )
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters'
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required'
    } else if (formData.content.length < 100) {
      newErrors.content = 'Content must be at least 100 characters'
    }
    
    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'Excerpt is required'
    } else if (formData.excerpt.length > 500) {
      newErrors.excerpt = 'Excerpt must be less than 500 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Disparar actualización de notificaciones para nuevos posts
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationUpdate', {
            detail: { timestamp: Date.now() }
          }))
        }
        router.push('/blogs')
      } else {
        setErrors({ submit: data.error || 'Failed to create blog post' })
      }
    } catch (error) {
      setErrors({ submit: 'Network error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-casino-950/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-casino-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-casino-500/3 to-purple-500/3 rounded-full blur-3xl animate-ping delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="relative inline-block">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute -inset-4 bg-gradient-to-r from-casino-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl animate-pulse"
            />
            
            <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <motion.div
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="relative"
                >
                  <div className="bg-gradient-to-br from-casino-500 to-purple-600 p-4 rounded-2xl shadow-xl shadow-casino-500/25">
                    <Feather className="w-10 h-10 text-white" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"
                    >
                      <Sparkles className="w-2 h-2 text-gray-900" />
                    </motion.div>
                  </div>
                </motion.div>
                
                <div className="text-left">
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-5xl font-black bg-gradient-to-r from-white via-casino-300 to-purple-400 bg-clip-text text-transparent mb-2"
                  >
                    Create Your Story
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex items-center space-x-3"
                  >
                    {isOwner && (
                      <div className="flex items-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                        <Crown className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-yellow-300 text-sm font-medium">Admin Access</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">Premium Editor Experience</span>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="text-xl text-gray-300 leading-relaxed mb-8 max-w-3xl mx-auto"
              >
                Craft compelling content that resonates with the <span className="text-casino-400 font-semibold">Casino Bot community</span>. 
                Share insights, experiences, and knowledge with our powerful writing tools.
              </motion.p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`group relative overflow-hidden px-8 py-4 rounded-2xl font-semibold transition-all duration-500 ${
                    previewMode 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl shadow-blue-500/25' 
                      : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="relative flex items-center space-x-3">
                    <Eye className="w-5 h-5" />
                    <span>{previewMode ? 'Exit Preview' : 'Preview Mode'}</span>
                  </div>
                </motion.button>
                
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/blogs')}
                  className="group bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-500 border border-gray-500"
                >
                  <div className="flex items-center space-x-3">
                    <X className="w-5 h-5" />
                    <span>Cancel</span>
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="xl:col-span-3">
              <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8">
                {!previewMode ? (
                  <div className="space-y-8">
                    {/* Title */}
                    <div>
                      <label className="block text-lg font-semibold text-white mb-4">
                        Post Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-gray-900/80 text-white px-8 py-6 rounded-2xl border border-gray-600/50 focus:border-casino-400 focus:outline-none focus:ring-2 focus:ring-casino-500/30 text-2xl placeholder-gray-400 transition-all duration-300 font-semibold"
                        placeholder="Your amazing post title goes here..."
                        maxLength={255}
                      />
                      {errors.title && (
                        <p className="text-red-400 text-sm mt-2">{errors.title}</p>
                      )}
                    </div>

                    {/* Excerpt */}
                    <div>
                      <label className="block text-lg font-semibold text-white mb-4">
                        Post Excerpt *
                      </label>
                      <textarea
                        value={formData.excerpt}
                        onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                        className="w-full bg-gray-900/80 text-white px-8 py-6 rounded-2xl border border-gray-600/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none placeholder-gray-400 transition-all duration-300 text-lg leading-relaxed"
                        placeholder="Write a captivating excerpt..."
                        rows={5}
                        maxLength={500}
                      />
                      {errors.excerpt && (
                        <p className="text-red-400 text-sm mt-2">{errors.excerpt}</p>
                      )}
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-lg font-semibold text-white mb-4">
                        Post Content *
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full bg-gray-900/80 text-white px-8 py-8 rounded-2xl border border-gray-600/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder-gray-400 font-mono leading-relaxed transition-all duration-300"
                        placeholder="Write your amazing content here..."
                        rows={20}
                      />
                      {errors.content && (
                        <p className="text-red-400 text-sm mt-2">{errors.content}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-4">{formData.title || 'Untitled Post'}</h1>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-6">
                        <span>By {session.user?.name}</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                      <p className="text-xl text-gray-300 mb-8 italic">{formData.excerpt}</p>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-lg">
                        {formData.content || 'No content yet...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Publish Settings</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-gray-900/80 text-white px-4 py-3 rounded-xl border border-gray-600/50 focus:border-casino-400 focus:outline-none"
                      >
                        {availableCategories.map((category: string) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-gray-900/80 text-white px-4 py-3 rounded-xl border border-gray-600/50 focus:border-green-400 focus:outline-none"
                      >
                        <option value="draft">💾 Save as Draft</option>
                        <option value="published">🚀 Publish Now</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-casino-600 to-casino-700 hover:from-casino-500 hover:to-casino-600 text-white px-6 py-4 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-3"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          {formData.status === 'published' ? (
                            <>
                              <Send className="w-5 h-5" />
                              <span>🚀 Publish Post</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              <span>💾 Save Draft</span>
                            </>
                          )}
                        </>
                      )}
                    </button>

                    {errors.submit && (
                      <p className="text-red-400 text-sm text-center">{errors.submit}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}