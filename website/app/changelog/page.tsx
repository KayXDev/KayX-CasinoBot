'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Code, 
  Bug, 
  Star, 
  Shield, 
  Zap, 
  Plus, 
  Wrench, 
  AlertCircle,
  Sparkles,
  Rocket,
  Target,
  Crown,
  Flame,
  ArrowUpRight,
  CheckCircle,
  GitCommit,
  Clock,
  Layers,
  TrendingUp,
  Package,
  X,
  Save,
  Users,
  MessageSquare,
  Activity
} from 'lucide-react'

// Tipos para TypeScript
type VersionType = 'major' | 'minor' | 'patch'
type ChangeType = 'new' | 'improved' | 'fixed'

interface Changelog {
  id?: number
  version: string
  date: string
  type: VersionType
  title: string
  description: string
  featured: boolean
  changes: {
    type: ChangeType
    items: string[]
  }[]
}

// Componente de formulario para agregar changelog
function AddChangelogForm({ onAdd, onCancel }: { onAdd: (changelog: Changelog) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Changelog>({
    version: '',
    date: new Date().toISOString().split('T')[0],
    type: 'minor',
    title: '',
    description: '',
    featured: false,
    changes: [
      { type: 'new', items: [] },
      { type: 'improved', items: [] },
      { type: 'fixed', items: [] }
    ]
  })
  
  const [newItems, setNewItems] = useState({
    new: '',
    improved: '',
    fixed: ''
  })

  const handleAddItem = (type: ChangeType) => {
    const item = newItems[type].trim()
    if (item) {
      setFormData(prev => ({
        ...prev,
        changes: prev.changes.map(change => 
          change.type === type 
            ? { ...change, items: [...change.items, item] }
            : change
        )
      }))
      setNewItems(prev => ({ ...prev, [type]: '' }))
    }
  }

  const handleRemoveItem = (type: ChangeType, index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map(change => 
        change.type === type 
          ? { ...change, items: change.items.filter((_, i) => i !== index) }
          : change
      )
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.version && formData.title && formData.description) {
      onAdd(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Agregar Nuevo Changelog</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Versión</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                placeholder="2.1.0"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as VersionType }))}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
              >
                <option value="patch">Patch</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="mr-2"
                />
                Destacado
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
              placeholder="Nueva funcionalidad increíble"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
              rows={3}
              placeholder="Descripción detallada de los cambios..."
              required
            />
          </div>

          {/* Secciones de cambios */}
          {(['new', 'improved', 'fixed'] as ChangeType[]).map(changeType => {
            const changeData = formData.changes.find(c => c.type === changeType)
            return (
              <div key={changeType} className="mb-6">
                <h3 className="text-white text-lg font-medium mb-3 capitalize">
                  {changeType === 'new' ? 'Nuevas Funciones' : 
                   changeType === 'improved' ? 'Mejoras' : 'Correcciones'}
                </h3>
                
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newItems[changeType]}
                    onChange={(e) => setNewItems(prev => ({ ...prev, [changeType]: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                    placeholder={`Agregar ${changeType === 'new' ? 'nueva función' : changeType === 'improved' ? 'mejora' : 'corrección'}...`}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem(changeType))}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddItem(changeType)}
                    className="px-4 py-2 bg-casino-500 text-white rounded-lg hover:bg-casino-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {changeData?.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                      <span className="flex-1 text-white text-sm">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(changeType, index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="flex gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-casino-500 text-white rounded-lg hover:bg-casino-600 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Changelog
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const getChangeIcon = (type: ChangeType) => {
  switch (type) {
    case 'new':
      return Plus
    case 'improved':
      return Wrench
    case 'fixed':
      return Bug
    default:
      return Code
  }
}

const getChangeColor = (type: ChangeType) => {
  switch (type) {
    case 'new':
      return 'from-green-500 to-emerald-500'
    case 'improved':
      return 'from-blue-500 to-cyan-500'
    case 'fixed':
      return 'from-red-500 to-pink-500'
    default:
      return 'from-gray-500 to-gray-600'
  }
}

const getVersionBadge = (type: VersionType) => {
  switch (type) {
    case 'major':
      return { color: 'from-casino-500 to-purple-500', icon: Rocket, text: 'MAJOR' }
    case 'minor':
      return { color: 'from-blue-500 to-cyan-500', icon: Star, text: 'MINOR' }
    case 'patch':
      return { color: 'from-green-500 to-emerald-500', icon: Shield, text: 'PATCH' }
    default:
      return { color: 'from-gray-500 to-gray-600', icon: Code, text: 'UPDATE' }
  }
}

export default function ChangelogPage() {
  const { data: session } = useSession()
  const [changelogs, setChangelogs] = useState<Changelog[]>([])
  const [stats, setStats] = useState({ versions: 0, features: 0, fixes: 0, improvements: 0 })
  const [loading, setLoading] = useState(false) // Optimized for fast loading
  const [showAddForm, setShowAddForm] = useState(false)
  
  const isOwner = session?.user && (session.user as any)?.id === '388422519553654786'

  useEffect(() => {
    fetchChangelogs()
  }, [])



  const fetchChangelogs = async () => {
    try {
      const response = await fetch('/api/changelogs')
      
      if (response.ok) {
        const data = await response.json()
        const changelogList = data.changelogs || []
        setChangelogs(changelogList)
        
        // Calcular estadísticas reales del lado del cliente
        const calculatedStats = changelogList.reduce((acc: any, changelog: any) => {
          acc.versions += 1
          changelog.changes?.forEach((changeGroup: any) => {
            if (changeGroup.type === 'new') {
              acc.features += changeGroup.items?.length || 0
            } else if (changeGroup.type === 'fixed') {
              acc.fixes += changeGroup.items?.length || 0
            } else if (changeGroup.type === 'improved') {
              acc.improvements += changeGroup.items?.length || 0
            }
          })
          return acc
        }, { versions: 0, features: 0, fixes: 0, improvements: 0 })
        
        setStats(calculatedStats)
      } else {
        // Fallback to empty state since we don't want static data
        setChangelogs([])
        setStats({ versions: 0, features: 0, fixes: 0, improvements: 0 })
      }
    } catch (error) {
      console.error('Error fetching changelogs:', error)
      setChangelogs([])
      setStats({ versions: 0, features: 0, fixes: 0, improvements: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleAddChangelog = async (changelog: Changelog) => {
    try {
      const response = await fetch('/api/changelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changelog)
      })
      
      if (response.ok) {
        const data = await response.json()
        setChangelogs(prev => [data.changelog, ...prev])
        setShowAddForm(false)
        // Refresh stats
        fetchChangelogs()
      }
    } catch (error) {
      console.error('Error adding changelog:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-casino-500/30 border-t-casino-400 mx-auto mb-6"></div>
            <Package className="w-6 h-6 text-casino-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-300 font-medium">Loading changelogs...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900">
      {/* Add Form Modal */}
      {showAddForm && (
        <AddChangelogForm 
          onAdd={handleAddChangelog}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">
            Changelog
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-6">
            Stay up to date with all the new features, improvements, and bug fixes of the casino bot
          </p>
          
          {/* Add Button for Admin */}
          {isOwner && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Changelog
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Versions', value: stats.versions, icon: Layers },
            { label: 'Features', value: stats.features, icon: Sparkles },
            { label: 'Fixes', value: stats.fixes, icon: CheckCircle },
            { label: 'Improvements', value: stats.improvements, icon: TrendingUp }
          ].map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div
                key={stat.label}
                className="text-center bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-casino-400/30 transition-all duration-200"
              >
                <IconComponent className="w-8 h-8 text-casino-400 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Updates Timeline */}
        {changelogs.length > 0 ? (
          <div className="space-y-8">
            {changelogs.map((update, index) => {
              const versionInfo = getVersionBadge(update.type)
              const VersionIcon = versionInfo.icon
              
              return (
                <div
                  key={update.version}
                  className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-casino-400/30 transition-all duration-200 overflow-hidden ${
                    update.featured ? 'ring-2 ring-casino-400/30' : ''
                  }`}
                >
                  {/* Header */}
                  <div className={`p-6 border-b border-white/10 ${
                    update.featured ? 'bg-gradient-to-r from-casino-600/20 to-purple-600/20' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {/* Version Badge */}
                        <div className={`flex items-center space-x-1.5 bg-gradient-to-r ${versionInfo.color} text-white px-3 py-1.5 rounded-lg font-bold text-xs`}>
                          <VersionIcon className="w-3 h-3" />
                          <span>{versionInfo.text}</span>
                        </div>
                        
                        <div className="text-xl font-bold text-white">
                          v{update.version}
                        </div>

                        {update.featured && (
                          <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold border border-yellow-400/30">
                            <Crown className="w-3 h-3" />
                            <span>Destacada</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(update.date).toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                      {update.title}
                    </h3>

                    <p className="text-gray-300 leading-relaxed">
                      {update.description}
                    </p>
                  </div>

                  {/* Changes */}
                  <div className="p-6 space-y-6">
                    {update.changes.map((changeCategory, changeIndex) => {
                      const ChangeIcon = getChangeIcon(changeCategory.type)
                      const changeColor = getChangeColor(changeCategory.type)
                      
                      return (
                        <div key={changeIndex} className="space-y-3">
                          {/* Change Category Header */}
                          <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${changeColor} flex items-center justify-center`}>
                              <ChangeIcon className="w-3 h-3 text-white" />
                            </div>
                            <h4 className="text-sm font-bold text-white capitalize">
                              {changeCategory.type === 'new' ? 'Nuevas Características' :
                               changeCategory.type === 'improved' ? 'Mejoras' : 'Correcciones'}
                            </h4>
                          </div>

                          {/* Change Items */}
                          <div className="ml-8 space-y-2">
                            {changeCategory.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="flex items-start space-x-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200"
                              >
                                <div className="w-2 h-2 rounded-full bg-casino-400 mt-2 flex-shrink-0"></div>
                                <p className="text-gray-300 leading-relaxed">
                                  {item}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-white/10 max-w-2xl mx-auto">
              <Package className="w-16 h-16 text-gray-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">No hay changelogs aún</h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                Los changelogs aparecerán aquí una vez que el administrador agregue las actualizaciones del bot.
              </p>
              {isOwner && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Agregar Primer Changelog
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}