'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
}

export default function LazyLoad({ 
  children, 
  fallback = <div className="h-32 animate-pulse bg-gray-800/50 rounded-lg"></div>,
  rootMargin = '50px',
  threshold = 0.1
}: LazyLoadProps) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsInView(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      {
        rootMargin,
        threshold
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasLoaded, rootMargin, threshold])

  return (
    <div ref={ref}>
      {isInView || hasLoaded ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      ) : (
        fallback
      )}
    </div>
  )
}