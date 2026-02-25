'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { motion } from 'framer-motion'
import AdminChat from '@/components/ModernAdminChat'
import { 
  Shield,
  MessageSquare, 
  MessageCircle,
  AlertTriangle,
  UserCheck
} from 'lucide-react'

export default function ServerAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Verificar permisos - solo admins del servidor (no owner)
  const { isAdmin, isOwner, loading: permissionsLoading } = useUserPermissions()
  
  const [activeTab, setActiveTab] = useState<'moderation' | 'chat'>('moderation')

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return
    
    if (!session?.user) {
      router.push('/api/auth/signin')
      return
    }
  }, [session, status, router, permissionsLoading])

  // Loading state
  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si no tiene permisos (solo admins del servidor, NO owner)
  if (!isAdmin || isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Panel de Administradores del Servidor</h2>
          <p className="text-gray-400 mb-4">Este panel es exclusivo para administradores del servidor Discord.</p>
          {isOwner && (
            <p className="text-casino-400">Como owner, tu panel está en <a href="/admin" className="underline hover:text-casino-300">/admin</a></p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/90 via-purple-900/90 to-blue-900/90 backdrop-blur-xl rounded-3xl border border-blue-700/50 shadow-2xl shadow-blue-500/10">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600"></div>
            </div>
            
            <div className="relative px-8 py-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-xl border border-blue-400/30">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Panel de Administradores
                  </h1>
                  <p className="text-blue-200/80 text-lg">
                    Gestión de contenido del servidor • Moderación
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex space-x-2 bg-gray-900/50 backdrop-blur-xl p-2 rounded-2xl border border-gray-700/50">
            {[
              { id: 'moderation', label: 'Moderación', icon: UserCheck },
              { id: 'chat', label: 'Chat', icon: MessageCircle }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'moderation' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Herramientas de Moderación</h2>
                <p className="text-gray-400 mb-4">Funcionalidades de moderación avanzadas próximamente.</p>
                <div className="text-sm text-gray-500">
                  <p>Esta sección incluirá:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Gestión de reportes de usuarios</li>
                    <li>• Herramientas de moderación de contenido</li>
                    <li>• Sistema de advertencias y sanciones</li>
                    <li>• Logs de actividad de moderación</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <AdminChat />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}