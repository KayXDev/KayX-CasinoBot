'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Users, MessageCircle, Crown, Shield } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface ChatMessage {
  id: number
  user_id: string
  username: string
  avatar_url?: string
  message: string
  user_type: 'owner' | 'server_admin'
  timestamp: string
  edited_at?: string
  is_edited: boolean
  is_deleted: boolean
  reply_to?: number
}

interface ActiveUser {
  user_id: string
  username: string
  user_type: 'owner' | 'server_admin'
  last_activity: string
}

interface TypingUser {
  userId: string
  username: string
  userType: 'owner' | 'server_admin'
  isTyping: boolean
}

export default function AdminChat() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)

  // Determinar tipo de usuario
  const getUserType = () => {
    if (!session?.user) return null
    const user = session.user as any
    if (!user.id) return null
    return user.id === process.env.NEXT_PUBLIC_DISCORD_OWNER_ID ? 'owner' : 'server_admin'
  }

  // Scroll hacia abajo automáticamente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Cargar mensajes iniciales
  const loadMessages = async () => {
    try {
      const response = await fetch('/api/server-admin/chat')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Configurar Socket.IO
  useEffect(() => {
    if (!session?.user) return

    const userType = getUserType()
    if (!userType) return

    // Evitar múltiples conexiones
    if (socket?.connected) return

    // Cleanup socket anterior si existe
    if (socket && !socket.connected) {
      socket.disconnect()
      setSocket(null)
    }

    // Inicializar Socket.IO
    fetch('/api/socket.io', { method: 'POST' })
      .then(() => {
        const newSocket = io({
          path: '/api/socket.io',
          addTrailingSlash: false,
          auth: {
            userId: (session!.user as any).id,
            username: session!.user!.name || (session!.user as any).username,
            userType: userType
          }
        })

        newSocket.on('connect', () => {
          console.log('Connected to admin chat')
          setIsConnected(true)
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from admin chat')
          setIsConnected(false)
        })

        newSocket.on('new-message', (message: ChatMessage) => {
          setMessages(prev => {
            // Evitar duplicados
            const exists = prev.some(msg => msg.id === message.id)
            if (exists) return prev
            return [...prev, message]
          })
          scrollToBottom()
        })

        newSocket.on('message-sent', (message: ChatMessage) => {
          // Añadir el mensaje que acabamos de enviar a la lista
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === message.id)
            if (exists) return prev
            return [...prev, message]
          })
          scrollToBottom()
        })

        newSocket.on('active-users', (users: ActiveUser[]) => {
          setActiveUsers(users)
        })

        newSocket.on('user-connected', (user: any) => {
          console.log(`${user.username} se conectó`)
        })

        newSocket.on('user-disconnected', (user: any) => {
          console.log(`${user.username} se desconectó`)
        })

        newSocket.on('user-typing', (data: TypingUser) => {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.userId !== data.userId)
            return data.isTyping ? [...filtered, data] : filtered
          })
        })

        newSocket.on('error', (error: any) => {
          console.error('Socket error:', error)
        })

        setSocket(newSocket)
      })

    // Cleanup function
    return () => {
      if (socket?.connected) {
        console.log('Cleaning up socket connection')
        socket.disconnect()
      }
      setSocket(null)
      setIsConnected(false)
    }
  }, [(session?.user as any)?.id]) // Solo dependiente del ID del usuario

  // Cargar mensajes al montar
  useEffect(() => {
    loadMessages()
  }, [])

  // Scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Manejar indicador de escritura
  const handleTyping = () => {
    if (!socket) return

    socket.emit('typing-start')

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop')
    }, 3000)
  }

  // Enviar mensaje
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !socket) return

    // Limpiar indicador de escritura
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      socket.emit('typing-stop')
    }

    socket.emit('send-message', {
      message: newMessage.trim()
    })

    setNewMessage('')
  }

  // Formatear fecha
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Chat de Administradores</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          <span>{activeUsers.length} conectados</span>
        </div>
      </div>

      {/* Usuarios activos */}
      {activeUsers.length > 0 && (
        <div className="p-3 bg-gray-800/50 border-b border-gray-700/50">
          <div className="flex flex-wrap gap-2">
            {activeUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 rounded-lg text-xs"
              >
                {user.user_type === 'owner' ? (
                  <Crown className="h-3 w-3 text-yellow-400" />
                ) : (
                  <Shield className="h-3 w-3 text-blue-400" />
                )}
                <span className="text-gray-300">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex space-x-3 ${message.user_id === (session?.user as any)?.id ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.user_type === 'owner' 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {message.user_type === 'owner' ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </div>
              </div>
              
              <div className={`flex-1 ${message.user_id === (session?.user as any)?.id ? 'text-right' : ''}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`font-medium text-sm ${
                    message.user_type === 'owner' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {message.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.is_edited && (
                    <span className="text-xs text-gray-500">(editado)</span>
                  )}
                </div>
                
                <div className={`inline-block p-3 rounded-2xl max-w-xs lg:max-w-md ${
                  message.user_id === (session?.user as any)?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Indicador de escritura */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.map(u => u.username).join(', ')} está escribiendo...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-700/50">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={1000}
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}