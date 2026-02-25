'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Shield, 
  Calendar,
  Search,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react'
import Image from 'next/image'

interface UserProfile {
  discord_id: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
  is_owner: boolean
  created_at: string
}

export default function VerificationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const isOwner = session?.user && (session.user as any).id === '388422519553654786'

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || !isOwner) {
      router.push('/')
      return
    }

    fetchUsers()
  }, [session, status, isOwner, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/verification')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        console.error('Error fetching users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      setUpdating(userId)
      const response = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          verified: !currentStatus
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.discord_id === userId 
            ? { ...user, is_verified: !currentStatus }
            : user
        ))
      } else {
        console.error('Error updating verification:', data.error)
      }
    } catch (error) {
      console.error('Error updating verification:', error)
    } finally {
      setUpdating(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.discord_id.includes(searchTerm)
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'verified' && user.is_verified) ||
                         (filter === 'unverified' && !user.is_verified)
    
    return matchesSearch && matchesFilter && !user.is_owner
  })

  const stats = {
    total: users.filter(u => !u.is_owner).length,
    verified: users.filter(u => u.is_verified && !u.is_owner).length,
    unverified: users.filter(u => !u.is_verified && !u.is_owner).length
  }

  if (status === 'loading' || !session?.user || !isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-3">
              Gestión de Verificaciones
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Administra las verificaciones de usuarios registrados
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Usuarios</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Verificados</p>
                <p className="text-2xl font-bold text-white">{stats.verified}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Sin Verificar</p>
                <p className="text-2xl font-bold text-white">{stats.unverified}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o ID de Discord..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                className="pl-10 pr-8 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-casino-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'verified' | 'unverified')}
              >
                <option value="all">Todos</option>
                <option value="verified">Verificados</option>
                <option value="unverified">Sin Verificar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-400">Cargando usuarios...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Usuario</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Discord ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Estado</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Registrado</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.discord_id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <Image
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&size=40&background=6366f1&color=ffffff`}
                            alt={user.display_name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium">{user.display_name}</p>
                              {user.is_verified && (
                                <CheckCircle className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-mono text-sm">
                        {user.discord_id}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_verified
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {user.is_verified ? 'Verificado' : 'Sin Verificar'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => toggleVerification(user.discord_id, user.is_verified)}
                          disabled={updating === user.discord_id}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            user.is_verified
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                          } ${updating === user.discord_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updating === user.discord_id ? (
                            <span>Procesando...</span>
                          ) : user.is_verified ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Quitar Verificación
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verificar
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}