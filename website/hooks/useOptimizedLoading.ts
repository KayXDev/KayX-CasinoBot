'use client'

import { useState, useEffect } from 'react'

// Hook para optimizar la carga de páginas
export function useOptimizedLoading() {
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  useEffect(() => {
    // Simular carga mínima para evitar flash
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
    }, 100) // Solo 100ms para evitar flash, no para "loading"
    
    return () => clearTimeout(timer)
  }, [])
  
  return { isInitialLoad }
}

// Hook para mostrar contenido con fade-in suave
export function useFadeIn(delay: number = 0) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  return { 
    isVisible, 
    className: `transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}` 
  }
}

// Hook para cargar datos sin bloquear UI
export function useAsyncLoad<T>(loadFn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    let isMounted = true
    
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await loadFn()
        
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading data')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    load()
    
    return () => {
      isMounted = false
    }
  }, deps)
  
  return { data, error, isLoading }
}