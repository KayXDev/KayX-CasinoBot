'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star, MessageCircle, ThumbsUp, Calendar, Filter, Plus, Send, Edit, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

interface Review {
  id: number
  user_id: string
  username: string
  avatar: string
  rating: number
  title: string
  content: string
  likes: number
  created_at: string
  user_liked?: boolean
  verified?: boolean
}

export default function ReviewsPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false) // Optimized for fast loading
  const [filter, setFilter] = useState('all') // all, 5, 4, 3, 2, 1
  const [showNewReview, setShowNewReview] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    content: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      if (response.ok) {
        const data = await response.json()
        // Agregar información de likes del usuario si está logueado
        const reviewsWithLikes = data.reviews || []
        if (session) {
          // Aquí podrías hacer una llamada adicional para obtener los likes del usuario
          // Por ahora usaremos false por defecto
          reviewsWithLikes.forEach((review: Review) => {
            review.user_liked = false
          })
        }
        setReviews(reviewsWithLikes)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async () => {
    if (!session || !newReview.title.trim() || !newReview.content.trim()) {
      console.log('Validación fallida:', { 
        session: !!session, 
        title: newReview.title.trim(), 
        content: newReview.content.trim() 
      })
      return
    }

    setSubmitting(true)
    try {
      console.log('Enviando review:', newReview)
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: newReview.rating,
          title: newReview.title.trim(),
          content: newReview.content.trim()
        })
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Review creada:', data)
        
        // Reset form
        setNewReview({ rating: 5, title: '', content: '' })
        setShowNewReview(false)
        
        // Recargar reviews después de un pequeño delay
        setTimeout(() => {
          fetchReviews()
        }, 100)
      } else {
        const errorData = await response.json()
        console.error('Error del servidor:', errorData)
        alert(`Error: ${errorData.message || 'No se pudo crear la review'}`)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const likeReview = async (reviewId: number) => {
    if (!session) return

    try {
      const response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setReviews(reviews.map(review => 
          review.id === reviewId 
            ? { ...review, likes: data.likes, user_liked: data.user_liked }
            : review
        ))
      }
    } catch (error) {
      console.error('Error liking review:', error)
    }
  }

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true
    return review.rating === parseInt(filter)
  })

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading reviews...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
              <h1 className="text-4xl font-bold text-white">
                Casino Bot Reviews
              </h1>
            </div>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-6">
              Share your experience and read what other players think about the bot
            </p>
            
            {/* Create Review Button */}
            {session && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNewReview(true)}
                className="bg-white text-casino-600 px-6 py-3 rounded-xl font-bold flex items-center space-x-2 mx-auto hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Review</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Rating Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-casino-600 to-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All Reviews
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilter(rating.toString())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                  filter === rating.toString()
                    ? 'bg-gradient-to-r from-casino-600 to-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span>{rating}</span>
                <Star className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Stats and Reviews Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sticky top-24">
              <h3 className="text-2xl font-bold text-white mb-6">Estadísticas</h3>
              
              {/* Average Rating */}
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-400">Basado en {reviews.length} reviews</p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-3 mb-6">
                {ratingDistribution.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-white text-sm">{rating}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{count}</span>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Filtrar por</h4>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'Todas las reviews' },
                    { value: '5', label: '5 estrellas' },
                    { value: '4', label: '4 estrellas' },
                    { value: '3', label: '3 estrellas' },
                    { value: '2', label: '2 estrellas' },
                    { value: '1', label: '1 estrella' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        filter === value
                          ? 'bg-gradient-to-r from-casino-600 to-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reviews Content */}
          <div className="lg:col-span-3">
            {/* New Review Button */}
            {session ? (
              <div className="mb-8">
                {!showNewReview ? (
                  <button
                    onClick={() => setShowNewReview(true)}
                    className="bg-gradient-to-r from-casino-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-casino-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Write Review</span>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6"
                  >
                    <h3 className="text-2xl font-bold text-white mb-4">New Review</h3>
                    
                    {/* Rating */}
                    <div className="mb-4">
                      <label className="block text-white font-medium mb-2">Rating</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="transition-colors"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= newReview.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-600 hover:text-gray-400'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <label className="block text-white font-medium mb-2">Title</label>
                      <input
                        type="text"
                        value={newReview.title}
                        onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                        placeholder="Title of your review..."
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-casino-500"
                        maxLength={100}
                      />
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-2">Review</label>
                      <textarea
                        value={newReview.content}
                        onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                        placeholder="Share your experience with the Casino Bot..."
                        rows={4}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-casino-500 resize-none"
                        maxLength={500}
                      />
                      <div className="text-gray-400 text-sm mt-1">
                        {newReview.content.length}/500 characters
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={submitReview}
                        disabled={submitting || !newReview.title.trim() || !newReview.content.trim()}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
                          submitting || !newReview.title.trim() || !newReview.content.trim()
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-700 hover:to-purple-700 text-white'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        <span>{submitting ? 'Sending...' : 'Publish Review'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowNewReview(false)
                          setNewReview({ rating: 5, title: '', content: '' })
                        }}
                        className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="mb-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Do you want to write a review?</h3>
                <p className="text-gray-400 mb-4">Log in to share your experience</p>
                <Link href="/api/auth/signin" className="bg-gradient-to-r from-casino-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-casino-700 hover:to-purple-700 transition-all duration-300 inline-block">
                  Log In
                </Link>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No reviews yet</h3>
                  <p className="text-gray-400">
                    {filter === 'all' 
                      ? 'Sé el primero en escribir una review' 
                      : 'No hay reviews con esta calificación'
                    }
                  </p>
                </div>
              ) : (
                filteredReviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-300"
                  >
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Image
                            src={review.avatar || '/default-avatar.svg'}
                            alt={review.username}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                          {!!review.verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5">
                              <Image
                                src="/images/Twitter_Verified_Badge.png"
                                alt="Verified"
                                width={20}
                                height={20}
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-white">{review.username}</h4>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-gray-400 text-sm">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{review.title}</h3>
                      <p className="text-gray-300 leading-relaxed">{review.content}</p>
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => likeReview(review.id)}
                        disabled={!session}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                          review.user_liked
                            ? 'bg-casino-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        } ${!session ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{review.likes}</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}