'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { broadcastNotificationUpdate } from '../../../lib/notificationRefresh'
import { BlogPostPageSkeleton } from '../../../components/Skeleton'

// Extended session type with ID
interface ExtendedSession {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
}
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  CheckCircle2,
  Clock, 
  User, 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share2,
  Edit,
  Trash2,
  Star,
  Shield,
  Crown,
  Pin
} from 'lucide-react'

interface BlogPost {
  id: number
  title: string
  content: string
  excerpt: string
  category: string
  author_name: string
  author_avatar?: string
  author_id: string
  published_at: string
  read_time: string
  tags: string[]
  views: number
  likes: number
  comments_count: number
  created_at: string
  updated_at: string
  featured?: boolean
  pinned?: boolean
  pinned_at?: string
}

interface Comment {
  id: number
  content: string
  author_name: string
  author_avatar?: string
  author_id: string
  created_at: string
  likes: number
  parent_id?: number
  userLiked?: boolean
}

export default function BlogPostPage() {
  const { data: session } = useSession() as { data: ExtendedSession | null }
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<BlogPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false) // Cambiar a false para carga más rápida
  const [error, setError] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminActions, setAdminActions] = useState({
    canEdit: false,
    canDelete: false,
    canFeature: false,
    canModerate: false
  })

  useEffect(() => {
    if (postId) {
      fetchPost()
      fetchComments()
      if (session?.user) {
        checkAdminPermissions()
      }
    }
  }, [postId, session])

  // Check like status after post is loaded
  useEffect(() => {
    if (post && session?.user) {
      checkLikeStatus()
    }
  }, [post, session])

  const checkAdminPermissions = async () => {
    if (!session?.user?.id) return
    
    try {
      // Check if user is neeegroo (owner) or has admin permissions
      const isOwner = session.user.id === '388422519553654786'
      
      if (isOwner) {
        setIsAdmin(true)
        setAdminActions({
          canEdit: true,
          canDelete: true,
          canFeature: true,
          canModerate: true
        })
      }
    } catch (error) {
      console.error('Error checking admin permissions:', error)
    }
  }

  const toggleFeaturePost = async () => {
    if (!post || !adminActions.canFeature) return
    
    try {
      const response = await fetch('/api/admin/feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId: post.id, 
          featured: !post.featured 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPost(prev => prev ? { ...prev, featured: data.featured } : null)
      }
    } catch (error) {
      console.error('Error toggling featured status:', error)
    }
  }

  const togglePinPost = async () => {
    if (!post || !adminActions.canFeature) return
    
    try {
      const response = await fetch('/api/admin/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId: post.id, 
          pinned: !post.pinned 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPost(prev => prev ? { 
          ...prev, 
          pinned: data.pinned,
          pinned_at: data.pinnedAt 
        } : null)
      }
    } catch (error) {
      console.error('Error toggling pin status:', error)
    }
  }

  const deletePost = async () => {
    if (!post || !adminActions.canDelete) return
    
    const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.')
    if (!confirmed) return
    
    try {
      const response = await fetch(`/api/blogs?id=${post.id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        router.push('/blogs')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const deleteComment = async (commentId: number) => {
    const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este comentario?')
    if (!confirmed) return
    
    try {
      const response = await fetch(`/api/admin/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        fetchComments() // Refresh comments
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const toggleCommentLike = async (commentId: number) => {
    if (!session?.user) return
    
    try {
      const response = await fetch('/api/blogs/comments/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update comment in local state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                likes: data.likesCount,
                userLiked: data.liked 
              }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error toggling comment like:', error)
    }
  }

  const trackView = async (postId: number) => {
    try {
      const response = await fetch('/api/posts/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      })
      
      const data = await response.json()
      
      if (data.success && data.isNewView) {
        // Update post view count if it's a new view
        setPost(prev => prev ? { 
          ...prev, 
          views: data.viewCount || prev.views 
        } : null)
      }
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }



  const fetchPost = async () => {
    try {
      setLoading(true)
      console.log('Fetching post with ID:', postId)
      
      const response = await fetch(`/api/blogs/${postId}`)
      console.log('API response status:', response.status)
      
      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.success && data.post) {
        setPost(data.post)
        
        // Track view after successful post load
        trackView(data.post.id)
      } else {
        setError(data.error || 'Blog post not found')
      }
    } catch (error) {
      console.error('Error fetching blog post:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/blogs/comments?postId=${postId}`)
      const data = await response.json()
      
      if (data.success) {
        // Enhance comments with like status for current user
        const enhancedComments = await Promise.all(
          data.comments.map(async (comment: Comment) => {
            if (session?.user?.id) {
              try {
                const likeResponse = await fetch(`/api/blogs/comments/likes?commentId=${comment.id}`)
                const likeData = await likeResponse.json()
                if (likeData.success) {
                  return {
                    ...comment,
                    userLiked: likeData.liked,
                    likes: likeData.likesCount
                  }
                }
              } catch (error) {
                console.error('Error fetching comment like status:', error)
              }
            }
            return comment
          })
        )
        setComments(enhancedComments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const checkLikeStatus = async () => {
    if (!session?.user || !post) return
    
    try {
      const response = await fetch(`/api/posts/likes/check?postId=${post.id}&userId=${(session.user as any).id}`)
      const data = await response.json()
      
      if (data.success) {
        setIsLiked(data.liked)
      }
    } catch (error) {
      console.error('Error checking like status:', error)
    }
  }

  const toggleLike = async () => {
    if (!session?.user || !post) return
    
    try {
      const response = await fetch('/api/posts/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId: post.id, 
          type: 'post' 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsLiked(data.isLiked)
        setPost(prev => prev ? { 
          ...prev, 
          likes: data.likeCount 
        } : null)
        
        // Disparar actualización de notificaciones
        broadcastNotificationUpdate()
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const submitComment = async () => {
    if (!session?.user || !newComment.trim()) return
    
    try {
      setSubmittingComment(true)
      const response = await fetch('/api/blogs/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId: parseInt(postId), 
          content: newComment.trim() 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNewComment('')
        fetchComments() // Refresh comments
        // Update post comments count
        setPost(prev => prev ? {
          ...prev,
          comments_count: prev.comments_count + 1
        } : null)
        
        // Disparar actualización de notificaciones
        broadcastNotificationUpdate()
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComment(false)
    }
  }



  if (loading || !post) {
    return <BlogPostPageSkeleton />
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <div className="casino-card rounded-xl p-8 bg-red-900/20 border border-red-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Post Not Found</h2>
            <p className="text-red-400 mb-6">{error || 'The requested blog post could not be found.'}</p>
            <button
              onClick={() => router.push('/blogs')}
              className="bg-casino-600 hover:bg-casino-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Blog</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push('/blogs')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Blog</span>
        </motion.button>

        {/* Article */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="casino-card rounded-xl p-8 mb-8"
        >
          {/* Header */}
          <header className="mb-8">
            {/* Category */}
            <span className="bg-casino-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-4 inline-block">
              {post.category}
            </span>
            
            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>
            
            {/* Meta Info */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-6">
              <div className="flex items-center space-x-6">
                <div 
                  className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  onClick={() => router.push(`/profile/${post.author_id}`)}
                >
                  {post.author_avatar && (
                    <div className="relative">
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        className="w-10 h-10 rounded-full"
                      />
                      {/* Owner crown badge */}
                      {post.author_id === '388422519553654786' && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                          <Crown className="w-3 h-3 text-black fill-current" />
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white flex items-center space-x-2">
                      <span>{post.author_name}</span>
                      {/* Verification badges */}
                      {post.author_id === '388422519553654786' ? (
                        <div className="flex items-center space-x-1 text-yellow-400" title="Owner">
                          <Crown className="w-4 h-4 fill-current" />
                        </div>
                      ) : (
                        // Add verification check for other users here if needed
                        null
                      )}
                    </div>
                    <div className="text-sm text-gray-400">Author</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(post.published_at || post.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {post.read_time}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-4">
                {session?.user && (
                  <button
                    onClick={toggleLike}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      isLiked 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes}</span>
                  </button>
                )}
                
                <button className="flex items-center space-x-2 bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors duration-200">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments_count}</span>
                </button>
                
                {session?.user?.id === post.author_id && (
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors duration-200">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Admin Controls */}
                {isAdmin && (
                  <div className="flex space-x-2 border-l border-gray-600 pl-4 ml-4">
                    <div className="flex items-center text-xs text-yellow-400 mr-2">
                      <Crown className="w-3 h-3 mr-1" />
                      ADMIN
                    </div>
                    
                    {adminActions.canFeature && (
                      <button
                        onClick={toggleFeaturePost}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          post.featured 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                        title={post.featured ? 'Unfeature Post' : 'Feature Post'}
                      >
                        <Star className={`w-4 h-4 ${post.featured ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    
                    {adminActions.canFeature && (
                      <button
                        onClick={togglePinPost}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          post.pinned 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                        title={post.pinned ? 'Unpin Post' : 'Pin Post'}
                      >
                        <Pin className={`w-4 h-4 ${post.pinned ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    
                    {adminActions.canDelete && (
                      <button
                        onClick={deletePost}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg">
              {post.content}
            </div>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <footer className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </footer>
          )}
        </motion.article>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="casino-card rounded-xl p-8"
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Comments ({post.comments_count})
          </h3>

          {/* Comment Form */}
          {session?.user ? (
            <div className="mb-8">
              <div className="flex items-start space-x-4">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none resize-none"
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-gray-500 text-sm">{newComment.length}/1000 characters</p>
                    <button
                      onClick={submitComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="bg-casino-600 hover:bg-casino-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 text-center py-8 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 mb-4">Sign in to join the discussion</p>
              <button
                onClick={() => router.push('/api/auth/signin')}
                className="bg-casino-600 hover:bg-casino-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Sign In with Discord
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-4">
                  {comment.author_avatar && (
                    <div className="relative">
                      <img
                        src={comment.author_avatar}
                        alt={comment.author_name}
                        className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                        onClick={() => router.push(`/profile/${comment.author_id}`)}
                      />
                      {/* Owner crown badge for comments */}
                      {comment.author_id === '388422519553654786' && (
                        <>
                          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                            <Crown className="w-2 h-2 text-black fill-current" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                            <CheckCircle2 className="w-2 h-2 text-white fill-current" />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1 bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="font-medium text-white cursor-pointer hover:text-casino-400 transition-colors duration-200 flex items-center space-x-1"
                          onClick={() => router.push(`/profile/${comment.author_id}`)}
                        >
                          <span>{comment.author_name}</span>
                          {comment.author_id === '388422519553654786' && (
                            <>
                              <Crown className="w-3 h-3 text-yellow-400 fill-current" />
                              <CheckCircle2 className="w-3 h-3 text-white fill-blue-500 stroke-none" />
                            </>
                          )}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <button
                          onClick={() => toggleCommentLike(comment.id)}
                          disabled={!session}
                          className="flex items-center space-x-1 hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Heart 
                            className={`w-3 h-3 ${(comment as any).userLiked ? 'text-red-400 fill-red-400' : ''}`} 
                          />
                          <span>{comment.likes}</span>
                        </button>
                        {/* Admin Comment Controls */}
                        {isAdmin && adminActions.canModerate && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="ml-2 text-red-400 hover:text-red-300 p-1 rounded transition-colors duration-200"
                            title="Delete Comment (Admin)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}