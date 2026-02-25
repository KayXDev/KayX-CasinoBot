'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Users, Crown, Shield, Wifi, WifiOff, Clock, Check, CheckCheck } from 'lucide-react'
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

export default function ModernAdminChat() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const connectionAttempts = useRef(0)
  
  // Cambio crítico: usar una sola referencia global compartida
  const initializationKey = useRef(`admin-chat-${Date.now()}-${Math.random()}`)
  
  const currentUserId = (session?.user as any)?.id
  const maxRetries = 3

  // Estado para el nombre de usuario personalizado
  const [displayUsername, setDisplayUsername] = useState<string>('')
  const [isLoadingUsername, setIsLoadingUsername] = useState<boolean>(true)

  // Función para obtener el nombre de usuario personalizado de la web
  const fetchDisplayUsername = async () => {
    if (!currentUserId) {
      console.log('❌ No currentUserId available')
      setIsLoadingUsername(false)
      return
    }

    setIsLoadingUsername(true)
    try {
      console.log('🔍 Fetching display username for user:', currentUserId)
      const response = await fetch(`/api/profiles/${currentUserId}`)
      console.log('📊 Profile API response status:', response.status)
      
      if (response.ok) {
        const profileData = await response.json()
        console.log('📊 Full profile data received:', profileData)
        
        // Priorizar customUsername primero, luego displayName
        let customName = 'Usuario' // Default
        
        if (profileData.profile?.customUsername) {
          customName = profileData.profile.customUsername
          console.log('✅ Using customUsername:', customName)
        } else if (profileData.profile?.displayName) {
          customName = profileData.profile.displayName  
          console.log('✅ Using displayName:', customName)
        } else {
          customName = session?.user?.name || 'Usuario'
          console.log('✅ Using session name fallback:', customName)
        }
        
        setDisplayUsername(customName)
        console.log('👤 Final username set to:', customName)
        
      } else {
        console.log('❌ Profile API failed, using fallback')
        const fallbackName = session?.user?.name || 'Usuario'
        setDisplayUsername(fallbackName)
        console.log('👤 Using fallback username (no profile):', fallbackName)
      }
    } catch (error) {
      console.error('❌ Error fetching display username:', error)
      const fallbackName = session?.user?.name || 'Usuario'
      setDisplayUsername(fallbackName)
      console.log('👤 Using fallback username (error):', fallbackName)
    } finally {
      setIsLoadingUsername(false)
    }
  }

  // useEffect para cargar el nombre personalizado
  useEffect(() => {
    if (currentUserId && session) {
      fetchDisplayUsername()
    }
  }, [currentUserId, session])

  // useEffect para conectar socket solo después de tener el nombre
  useEffect(() => {
    // Solo conectar si no estamos cargando el nombre y tenemos todos los datos necesarios
    if (!isLoadingUsername && displayUsername && currentUserId && session) {
      console.log('👤 Display username loaded, ready to connect:', displayUsername)
      // Dar un pequeño delay para asegurar que todo esté listo
      setTimeout(() => {
        if (!socket || !socket.connected) {
          connectSocket()
        }
      }, 200)
    }
  }, [isLoadingUsername, displayUsername, currentUserId, session])

  // Determinar tipo de usuario
  const loadMessages = async () => {
    try {
      console.log('📥 Loading initial messages...')
      const response = await fetch('/api/admin/chat?limit=50', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('📊 API Response status:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 API Response data:', data)
        setMessages(data.messages || [])
        console.log(`✅ Loaded ${data.messages?.length || 0} messages`)
        
        // Scroll hacia abajo después de cargar mensajes - múltiples intentos para asegurar
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
          console.log('📜 Forced scroll to bottom after loading')
        }, 100)
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 300)
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        }, 500)
        
      } else {
        const errorData = await response.text()
        console.error('❌ Failed to load messages:', response.status, response.statusText, errorData)
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
    }
  }

  // Determinar tipo de usuario
  const userType = currentUserId === '388422519553654786' ? 'owner' : 'server_admin'

  // Funciones de utilidad
  const getUserColor = (userType: string) => {
    return userType === 'owner' 
      ? 'from-yellow-400 to-orange-500' 
      : 'from-blue-400 to-indigo-500'
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // useEffect para scroll automático al cargar la página
  useEffect(() => {
    // Pequeño delay para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        console.log('📜 Auto-scrolling to bottom on initial load')
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }) // Sin smooth para ser inmediato
      }
    }, 100)

    return () => clearTimeout(timer)
  }, []) // Solo se ejecuta una vez al montar

  // useEffect adicional para cuando se cargan mensajes por primera vez
  useEffect(() => {
    if (messages.length > 0) {
      // Múltiples intentos de scroll para asegurar que llegue al final
      const scrollAttempts = [100, 300, 500, 1000]
      
      scrollAttempts.forEach((delay) => {
        setTimeout(() => {
          const messagesContainer = messagesEndRef.current?.parentElement
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          }
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, delay)
      })
    }
  }, [messages.length]) // Se ejecuta cuando cambia el número de mensajes

  // Conectar socket (versión con control global)
  const connectSocket = async () => {
    if (!currentUserId || !session) {
      console.log('❌ No userId or session available')
      return
    }

    // Control global usando localStorage para evitar múltiples instancias
    const connectionKey = `admin-chat-connecting-${currentUserId}`
    
    // Verificar si hay una página oculta reciente (navegación)
    const pageHiddenKey = `page-hidden-${currentUserId}`
    const pageHiddenTime = localStorage.getItem(pageHiddenKey)
    if (pageHiddenTime && Date.now() - parseInt(pageHiddenTime) < 3000) {
      console.log('🛑 Page was recently hidden, skipping connection...')
      localStorage.removeItem(pageHiddenKey)
      return
    }
    
    const isAlreadyConnecting = localStorage.getItem(connectionKey)
    
    if (isAlreadyConnecting && Date.now() - parseInt(isAlreadyConnecting) < 10000) {
      console.log('🔄 Another instance is already connecting, waiting...')
      return
    }

    // Marcar que estamos conectando
    localStorage.setItem(connectionKey, Date.now().toString())

    // Evitar conexiones múltiples simultáneas
    if (isConnecting) {
      console.log('🔄 Connection already in progress, skipping...')
      localStorage.removeItem(connectionKey)
      return
    }

    if (socket && socket.connected) {
      console.log('✅ Socket already connected, skipping...')
      localStorage.removeItem(connectionKey)
      return
    }

    setIsConnecting(true)

    // Limpiar conexión previa con más tiempo de espera
    if (socket) {
      console.log('🧹 Cleaning up previous socket connection')
      socket.removeAllListeners()
      socket.disconnect()
      setSocket(null)
      await new Promise(resolve => setTimeout(resolve, 500)) // Aumentado
    }

    try {
      console.log(`🔌 Starting fresh socket connection for user: ${currentUserId}`)
      
      // Inicializar el servidor Socket.IO
      await fetch('/api/socket.io', { method: 'POST' })

      const newSocket = io({
        path: '/api/socket.io',
        addTrailingSlash: false,
        forceNew: true,
        timeout: 15000, // Aumentado timeout
        reconnection: false,
        transports: ['polling'],
        auth: {
          userId: currentUserId,
          username: displayUsername || session?.user?.name || 'Usuario',
          userType: userType
        }
      })
      
      console.log('🔌 Socket connecting with auth:', {
        userId: currentUserId,
        username: displayUsername || session?.user?.name || 'Usuario',
        displayUsername: displayUsername,
        sessionName: session?.user?.name,
        userType: userType
      })

      // Configurar listeners
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully with ID:', newSocket.id)
        setIsConnected(true)
        setIsConnecting(false)
        connectionAttempts.current = 0
        setSocket(newSocket)
        localStorage.removeItem(connectionKey) // Limpiar flag de conexión
      })

      newSocket.on('disconnect', (reason, description) => {
        console.log('❌ Socket disconnected:', reason, description)
        setIsConnected(false)
        setIsConnecting(false)
        localStorage.removeItem(connectionKey)
        
        if (socket === newSocket) {
          setSocket(null)
        }
        
        // Solo reconectar en casos específicos y con delay mayor
        if (reason === 'transport close' || reason === 'io server disconnect') {
          console.log('🔄 Connection lost, will retry in 5 seconds...')
          setTimeout(() => {
            // Verificar que no se haya navegado a otra página
            const pageHidden = localStorage.getItem(`page-hidden-${currentUserId}`)
            if (!pageHidden && !socket?.connected && session && currentUserId && !isConnecting) {
              connectSocket()
            }
          }, 5000) // Aumentado delay
        }
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error)
        setIsConnected(false)
        setIsConnecting(false)
        setSocket(null)
        localStorage.removeItem(connectionKey)
      })

      // Configurar listeners de mensajes
      newSocket.on('new-message', (data: ChatMessage) => {
        console.log('📨 New admin message received:', data)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === data.id)
          if (exists) return prev
          return [...prev, data]
        })
        
        // Scroll hacia abajo cuando llegue un nuevo mensaje
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      })

      newSocket.on('active-users', (users: ActiveUser[]) => {
        console.log('👥 Active admin users updated:', users)
        setActiveUsers(users)
      })

      newSocket.on('admin-typing', (data: TypingUser) => {
        console.log('⌨️ Typing status:', data)
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.userId !== data.userId)
          return data.isTyping ? [...filtered, data] : filtered
        })
      })

      setTimeout(() => {
        setIsLoading(false)
      }, 1200) // Reducido también

    } catch (error) {
      console.error('❌ Error in connectSocket:', error)
      setIsConnected(false)
      setIsConnecting(false) // Importante: liberar la bandera
      setIsLoading(false)
      setSocket(null)
    }
  }

  useEffect(() => {
    // Control usando localStorage para evitar múltiples inicializaciones
    const initKey = `admin-chat-initialized-${currentUserId}`
    const alreadyInitialized = localStorage.getItem(initKey)
    
    if (alreadyInitialized && Date.now() - parseInt(alreadyInitialized) < 5000) {
      console.log('🛑 Component recently initialized, skipping...')
      return
    }

    if (!session || !currentUserId) {
      console.log('⏳ Waiting for session or userId...')
      return
    }

    console.log('🚀 Initializing admin chat component')
    localStorage.setItem(initKey, Date.now().toString())
    
    // Cargar mensajes iniciales primero
    loadMessages()
    
    // NO conectar socket aquí - esperar a que se cargue displayUsername
    console.log('⏳ Waiting for display username before connecting socket...')

    return () => {
      console.log('🧹 Cleaning up on unmount')
      
      // Limpiar flag de inicialización inmediatamente
      localStorage.removeItem(initKey)
      
      // Limpiar socket si existe
      if (socket) {
        console.log('🔌 Disconnecting socket on cleanup')
        socket.removeAllListeners()
        socket.disconnect()
        setSocket(null)
      }
      
      // Limpiar estados
      setIsConnecting(false)
      setIsConnected(false)
      
      // Limpiar flag después de un tiempo para evitar reconexiones rápidas
      setTimeout(() => {
        localStorage.removeItem(initKey)
      }, 2000) // Aumentado a 2 segundos
    }
  }, [session, currentUserId]) // Solo cuando cambien estos valores

  // useEffect separado para limpiar cuando cambies de página
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('📄 Page unloading, cleaning up socket...')
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
        setSocket(null)
      }
      // Limpiar localStorage para permitir reconexión limpia
      localStorage.removeItem(`admin-chat-initialized-${currentUserId}`)
      localStorage.removeItem(`admin-chat-connecting-${currentUserId}`)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📄 Page hidden, preparing for cleanup...')
        // Marcar para limpieza pero no desconectar inmediatamente
        localStorage.setItem(`page-hidden-${currentUserId}`, Date.now().toString())
      } else {
        console.log('📄 Page visible again')
        localStorage.removeItem(`page-hidden-${currentUserId}`)
      }
    }

    // Añadir listeners para detectar cambios de página
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [socket, currentUserId])

  // Manejar escritura
  const handleTyping = () => {
    if (!socket || !isConnected) return

    socket?.emit('admin-typing', {
      userId: currentUserId,
      username: displayUsername || session?.user?.name || 'Usuario',
      userType: userType,
      isTyping: true
    })

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('admin-typing', {
        userId: currentUserId,
        username: displayUsername || session?.user?.name || 'Usuario',
        userType: userType,
        isTyping: false
      })
    }, 1000)
  }

  // Enviar mensaje (versión robusta)
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const messageToSend = newMessage.trim()
    if (!messageToSend || !socket || !isConnected || isSending) {
      console.log('❌ Cannot send message:', { messageToSend: !!messageToSend, socket: !!socket, isConnected, isSending })
      return
    }

    // Verificar que el socket esté realmente conectado
    if (!socket.connected) {
      console.error('❌ Socket is not connected')
      alert('Error: No hay conexión con el servidor. Intentando reconectar...')
      connectSocket()
      return
    }

    setIsSending(true)
    setNewMessage('')

    console.log('📤 Sending message:', messageToSend)

    try {
      // Usar promesa para mejor control del envío
      const sendPromise = new Promise<void>((resolve, reject) => {
        let isResolved = false
        
        const cleanup = () => {
          if (!isResolved) {
            socket.off('message-sent', handleSuccess)
            socket.off('error', handleError)
            socket.off('disconnect', handleDisconnect)
          }
        }

        const handleSuccess = () => {
          if (isResolved) return
          isResolved = true
          cleanup()
          console.log('✅ Message sent successfully')
          resolve()
        }

        const handleError = (error: any) => {
          if (isResolved) return
          isResolved = true
          cleanup()
          console.error('❌ Socket error during send:', error)
          reject(new Error(error.message || 'Error del servidor'))
        }

        const handleDisconnect = () => {
          if (isResolved) return
          isResolved = true
          cleanup()
          console.error('❌ Socket disconnected during send')
          reject(new Error('Conexión perdida durante el envío'))
        }

        // Configurar listeners temporales
        socket.once('message-sent', handleSuccess)
        socket.once('error', handleError) 
        socket.once('disconnect', handleDisconnect)

        // Enviar mensaje
        socket.emit('send-message', {
          message: messageToSend,
          userId: currentUserId,
          username: displayUsername || session?.user?.name || 'Usuario',
          userType: userType
        })
      })

      // Timeout de 8 segundos
      const result = await Promise.race([
        sendPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
      ])

      setIsSending(false)

      // Crear notificación solo si el mensaje se envió exitosamente
      try {
        const notifResponse = await fetch('/api/notifications/admin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageToSend,
            sender_name: displayUsername || session?.user?.name || 'Administrador',
            sender_id: (session?.user as any)?.id || 'unknown'
          })
        })
        
        if (notifResponse.ok) {
          const notifData = await notifResponse.json()
          console.log(`✅ Notificación enviada a ${notifData.notifications_sent} administradores`)
        }
        
      } catch (notifError) {
        console.error('❌ Error creating chat notification:', notifError)
      }

    } catch (error: any) {
      setIsSending(false)
      console.error('❌ Error in sendMessage:', error)
      
      if (error.message === 'Timeout') {
        alert('Error: El mensaje tardó demasiado en enviarse. Verifica tu conexión.')
      } else if (error.message.includes('Conexión perdida')) {
        alert('Error: Se perdió la conexión. Intentando reconectar...')
        connectSocket()
      } else {
        alert('Error al enviar mensaje: ' + error.message)
      }
      
      // Restaurar mensaje si falló
      setNewMessage(messageToSend)
    }
    
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  // Formatear tiempo
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 24) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffHours < 48) {
      return 'Ayer ' + date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden h-[700px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Conectando al chat...</h3>
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden h-[700px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Acceso Denegado</h3>
          <p className="text-gray-400">Inicia sesión para acceder al chat administrativo</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden h-[700px] flex">
      {/* Chat Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-xl border-b border-gray-600/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Chat de Administradores
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  {isConnected ? (
                    <div className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Conectado</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <WifiOff className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-400 font-medium">
                        {connectionAttempts.current > 0 ? 'Reconectando...' : 'Desconectado'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {activeUsers.length > 0 && (
                <div className="flex items-center space-x-2 bg-gray-700/50 rounded-xl px-3 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-300 font-medium">
                    {activeUsers.length} online
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">¡Inicia la conversación!</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Este es el chat privado para administradores. Los mensajes aquí son visibles solo para el equipo de administración.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => {
              const isOwn = message.user_id === currentUserId
              const isOwner = message.user_type === 'owner'
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-r ${getUserColor(message.user_type)} flex items-center justify-center shadow-lg ${isOwn ? 'ml-2' : 'mr-2'}`}>
                      {isOwner ? (
                        <Crown className="h-5 w-5 text-white" />
                      ) : (
                        <Shield className="h-5 w-5 text-white" />
                      )}
                    </div>
                    
                    {/* Mensaje */}
                    <div className="flex flex-col">
                      {!isOwn && (
                        <div className="flex items-center space-x-2 mb-1 px-1">
                          <span className={`text-sm font-semibold bg-gradient-to-r ${getUserColor(message.user_type)} bg-clip-text text-transparent`}>
                            {message.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                        isOwn 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                          : 'bg-gray-700/80 text-gray-100 border border-gray-600/50'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.message}
                        </p>
                        
                        {isOwn && (
                          <div className="flex items-center justify-end space-x-1 mt-2">
                            <span className="text-xs text-blue-100 opacity-75">
                              {formatTime(message.timestamp)}
                            </span>
                            <CheckCheck className="h-3 w-3 text-blue-100 opacity-75" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}

        {/* Indicador de escritura */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 px-4"
          >
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400">
              {typingUsers.map(u => u.username).join(', ')} está escribiendo...
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input mejorado */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-xl border-t border-gray-600/50 p-6">
        <form onSubmit={sendMessage} className="flex space-x-4">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              placeholder={isConnected ? "Escribe tu mensaje..." : "Conectando..."}
              disabled={!isConnected || isSending}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 pr-12"
              maxLength={1000}
              autoComplete="off"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
              {newMessage.length}/1000
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim() || !isConnected || isSending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-2xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">Enviar</span>
          </motion.button>
        </form>
      </div>
      </div> {/* Cierre del chat principal */}
      
      {/* Panel Lateral - Lista de Administradores Conectados */}
      <div className="w-64 bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-xl border-l border-gray-600/50 flex flex-col">
        {/* Header del Panel */}
        <div className="p-3 border-b border-gray-600/50">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h3 className="text-base font-semibold text-white">Administradores</h3>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">
              {activeUsers.length} {activeUsers.length === 1 ? 'conectado' : 'conectados'}
            </span>
          </div>
        </div>

        {/* Lista de Usuarios Conectados */}
        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
          <AnimatePresence>
            {activeUsers.length > 0 ? (
              activeUsers.map((user, index) => (
                <motion.div
                  key={user.user_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-2 p-2 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-all duration-200"
                >
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getUserColor(user.user_type)} flex items-center justify-center shadow-lg`}>
                      {user.user_type === 'owner' ? (
                        <Crown className="h-3 w-3 text-white" />
                      ) : (
                        <Shield className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <p className="text-xs font-medium text-white truncate">
                        {user.username}
                      </p>
                      {user.user_type === 'owner' && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-xs font-medium rounded border border-yellow-500/30">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(user.last_activity).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6"
              >
                <div className="w-8 h-8 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-xs text-gray-400">Sin conexiones</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer del Panel */}
        <div className="p-2 border-t border-gray-600/50">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>En línea</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}