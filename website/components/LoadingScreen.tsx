'use client'

import { motion } from 'framer-motion'
import { Loader2, Sparkles, Diamond, Trophy, Star } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 z-50 flex items-center justify-center"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-casino-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10 text-center">
        {/* Animated Icons */}
        <div className="relative mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="relative mx-auto w-24 h-24"
          >
            {/* Main Loader */}
            <div className="absolute inset-0 rounded-full border-4 border-casino-500/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-casino-500 animate-spin"></div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Diamond className="w-8 h-8 text-casino-400" />
            </div>
          </motion.div>

          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                x: [0, Math.cos(i * 60 * Math.PI / 180) * 100],
                y: [0, Math.sin(i * 60 * Math.PI / 180) * 100],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            >
              {i % 3 === 0 && <Sparkles className="w-4 h-4 text-casino-400" />}
              {i % 3 === 1 && <Star className="w-4 h-4 text-purple-400" />}
              {i % 3 === 2 && <Trophy className="w-4 h-4 text-amber-400" />}
            </motion.div>
          ))}
        </div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-casino-400 via-purple-400 to-pink-400">
            Casino Bot
          </h2>
          
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.div>
            <span className="text-lg font-medium">Loading epic experience...</span>
          </div>

          {/* Loading Bar */}
          <div className="w-64 h-2 bg-gray-800/50 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-casino-500 via-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </div>

          {/* Loading Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-gray-400 max-w-xs mx-auto"
          >
            💡 Tip: Use /daily to get free chips every day!
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}