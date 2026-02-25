'use client'

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
  Package
} from 'lucide-react'

// Tipos para TypeScript
type VersionType = 'major' | 'minor' | 'patch'
type ChangeType = 'new' | 'improved' | 'fixed'

const updates = [
  {
    version: '2.1.0',
    date: '2024-11-01',
    type: 'major' as VersionType,
    title: 'Crypto Trading System 2.0',
    description: 'Renovación completa del sistema de trading de criptomonedas con nuevas funciones y mejoras espectaculares.',
    featured: true,
    changes: [
      {
        type: 'new' as ChangeType,
        items: [
          'Agregadas 12 nuevas criptomonedas incluyendo SOL, ADA, MATIC',
          'Sistema de eventos de mercado con impactos de precios en tiempo real',
          'Nuevo sistema de logros crypto con recompensas épicas',
          'Sistema de noticias y alertas crypto integrado',
          'Análisis de sentimiento de mercado con indicadores de miedo/avaricia'
        ]
      },
      {
        type: 'improved' as ChangeType,
        items: [
          'Sistema de volatilidad mejorado para trading más realista',
          'Horarios de mercado mejorados con soporte de zona horaria',
          'Mejor gestión de cooldowns de trading',
          'Visualización de portafolio mejorada con gráficos'
        ]
      },
      {
        type: 'fixed' as ChangeType,
        items: [
          'Corregidos errores de cálculo en períodos de alta volatilidad',
          'Resueltos problemas de bypass de cooldown de trading',
          'Corregidas inconsistencias en la visualización del valor del portafolio'
        ]
      }
    ]
  },
  {
    version: '2.0.5',
    date: '2024-10-15',
    type: 'minor' as VersionType,
    title: 'Mejoras del Sistema de Tienda',
    description: 'Grandes mejoras al sistema de tienda con nuevos objetos y mejor gestión de cooldowns.',
    changes: [
      {
        type: 'new' as ChangeType,
        items: [
          'Categoría de equipo de atraco con herramientas especializadas',
          'Nuevos objetos consumibles para gameplay mejorado',
          'Sistema de cooldown de compras implementado',
          'Seguimiento de duración de efectos de objetos'
        ]
      },
      {
        type: 'improved' as ChangeType,
        items: [
          'Interfaz de tienda rediseñada con mejor navegación',
          'Sistema de precios dinámicos basado en demanda',
          'Mejores descripciones de objetos con estadísticas detalladas'
        ]
      },
      {
        type: 'fixed' as ChangeType,
        items: [
          'Corregido bug de duplicación de objetos',
          'Resueltos problemas de sincronización de inventario',
          'Corregidos errores de precio en objetos especiales'
        ]
      }
    ]
  },
  {
    version: '2.0.0',
    date: '2024-09-28',
    type: 'major' as VersionType,
    title: 'Gran Actualización: Bank Heists',
    description: 'La actualización más grande hasta la fecha con un sistema completo de atracos bancarios.',
    featured: true,
    changes: [
      {
        type: 'new' as ChangeType,
        items: [
          '8 bancos únicos con diferentes niveles de dificultad',
          'Sistema de minijuegos para atracos (hackeo, sigilo, combate)',
          'Objetos de atraco especiales y equipo táctico',
          'Sistema de reputación criminal con beneficios únicos',
          'Eventos de atraco grupal para hasta 6 jugadores'
        ]
      },
      {
        type: 'improved' as ChangeType,
        items: [
          'Completamente rediseñado el sistema de seguridad',
          'Mejor balanceamiento de recompensas y riesgos',
          'Sistema de cooldowns más inteligente y justo'
        ]
      }
    ]
  },
  {
    version: '1.8.3',
    date: '2024-09-10',
    type: 'patch' as VersionType,
    title: 'Correcciones y Optimizaciones',
    description: 'Correcciones importantes y mejoras de rendimiento.',
    changes: [
      {
        type: 'fixed' as ChangeType,
        items: [
          'Corregido crash en blackjack con apuestas altas',
          'Resueltos problemas de lag en servidores grandes',
          'Corregidos errores de cálculo en ruleta',
          'Fix crítico en sistema de amigos'
        ]
      },
      {
        type: 'improved' as ChangeType,
        items: [
          'Optimización de base de datos para mejor rendimiento',
          'Reducido tiempo de respuesta de comandos en 40%',
          'Mejor manejo de errores y mensajes informativos'
        ]
      }
    ]
  }
]

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
            <GitCommit className="w-5 h-5 text-casino-400 mr-3 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-casino-300 font-semibold tracking-wide">Actualizaciones Recientes</span>
            <Package className="w-4 h-4 text-purple-400 ml-3 animate-pulse" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl md:text-8xl font-black mb-8 relative"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-300 to-purple-300">
              Changelog
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
              Épico
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-20"></div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light"
          >
            Sigue todas las <span className="text-casino-400 font-bold">nuevas características</span>, 
            <span className="text-purple-400 font-bold"> mejoras</span> y correcciones que hacemos al bot
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { label: 'Versiones', value: '25+', icon: Layers },
              { label: 'Características', value: '200+', icon: Sparkles },
              { label: 'Correcciones', value: '500+', icon: CheckCircle },
              { label: 'Mejoras', value: '150+', icon: TrendingUp }
            ].map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="group text-center bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-casino-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-casino-500/10"
                >
                  <IconComponent className="w-8 h-8 text-casino-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-3xl font-black text-white mb-2 group-hover:text-casino-300 transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Updates Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-casino-500 via-purple-500 to-pink-500 rounded-full opacity-30"></div>
          
          <div className="space-y-8">
            {updates.map((update, index) => {
              const versionInfo = getVersionBadge(update.type)
              const VersionIcon = versionInfo.icon
              
              return (
                <motion.div
                  key={update.version}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-6 w-6 h-6 bg-gradient-to-r from-casino-500 to-purple-500 rounded-full border-4 border-gray-950 flex items-center justify-center shadow-lg">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>

                  {/* Update Card */}
                  <div className="ml-20">
                    <motion.div
                      whileHover={{ y: -5 }}
                      className={`group bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 hover:border-casino-400/50 transition-all duration-500 overflow-hidden ${
                        update.featured ? 'ring-2 ring-casino-400/30 shadow-2xl shadow-casino-500/20' : 'hover:shadow-xl hover:shadow-casino-500/10'
                      }`}
                    >
                      {/* Header */}
                      <div className={`p-8 border-b border-gray-700/50 ${
                        update.featured ? 'bg-gradient-to-r from-casino-900/30 to-purple-900/30' : ''
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            {/* Version Badge */}
                            <div className={`flex items-center space-x-2 bg-gradient-to-r ${versionInfo.color} text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg`}>
                              <VersionIcon className="w-4 h-4" />
                              <span>{versionInfo.text}</span>
                            </div>
                            
                            <div className="text-3xl font-black text-white group-hover:text-casino-300 transition-colors">
                              v{update.version}
                            </div>

                            {update.featured && (
                              <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/30">
                                <Crown className="w-3 h-3" />
                                <span>Destacada</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-gray-400 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(update.date).toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-casino-300 transition-colors">
                          {update.title}
                        </h3>

                        <p className="text-gray-300 leading-relaxed">
                          {update.description}
                        </p>
                      </div>

                      {/* Changes */}
                      <div className="p-8 space-y-6">
                        {update.changes.map((changeCategory, changeIndex) => {
                          const ChangeIcon = getChangeIcon(changeCategory.type)
                          const changeColor = getChangeColor(changeCategory.type)
                          
                          return (
                            <div key={changeIndex} className="space-y-3">
                              {/* Change Category Header */}
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-r ${changeColor} flex items-center justify-center shadow-md`}>
                                  <ChangeIcon className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-lg font-bold text-white capitalize">
                                  {changeCategory.type === 'new' ? 'Nuevas Características' :
                                   changeCategory.type === 'improved' ? 'Mejoras' : 'Correcciones'}
                                </h4>
                              </div>

                              {/* Change Items */}
                              <div className="ml-11 space-y-2">
                                {changeCategory.items.map((item, itemIndex) => (
                                  <motion.div
                                    key={itemIndex}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.7 + index * 0.1 + changeIndex * 0.05 + itemIndex * 0.02 }}
                                    className="flex items-start space-x-3 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/40 transition-colors duration-200 group/item"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-casino-400 mt-2.5 group-hover/item:scale-125 transition-transform duration-200"></div>
                                    <p className="text-gray-300 leading-relaxed group-hover/item:text-white transition-colors duration-200">
                                      {item}
                                    </p>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Timeline End */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="relative mt-16"
          >
            <div className="absolute left-6 w-6 h-6 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full border-4 border-gray-950 flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
            
            <div className="ml-20">
              <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Rocket className="w-8 h-8 text-casino-400" />
                  <h3 className="text-2xl font-bold text-white">¡Más Por Venir!</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Estamos trabajando constantemente en nuevas características emocionantes. 
                  Mantente atento para más actualizaciones increíbles.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}