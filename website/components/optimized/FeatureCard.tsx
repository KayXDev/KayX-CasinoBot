import { memo } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  index: number
}

// Memoizar componente para evitar re-renders innecesarios
export const FeatureCard = memo(function FeatureCard({ 
  icon, 
  title, 
  description, 
  color, 
  index 
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }} // Optimización: cargar solo cuando esté cerca
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-casino-500/50 transition-all duration-300"
    >
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${color} mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  )
})

interface StatCardProps {
  value: string
  label: string
  description: string
  isLoading: boolean
}

export const StatCard = memo(function StatCard({ 
  value, 
  label, 
  description, 
  isLoading 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-casino-500/50 transition-all duration-300"
    >
      <div className="text-4xl font-bold bg-gradient-to-r from-casino-400 to-purple-400 bg-clip-text text-transparent mb-4">
        {isLoading ? (
          <span className="animate-pulse">•••</span>
        ) : (
          value
        )}
      </div>
      <div className="text-white text-xl font-semibold mb-2">{label}</div>
      <div className="text-gray-400">
        {isLoading ? 'Loading...' : description}
      </div>
    </motion.div>
  )
})