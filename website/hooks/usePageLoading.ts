'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    setIsLoading(true)
    
    // Simular tiempo de carga realista
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [pathname])

  return isLoading
}