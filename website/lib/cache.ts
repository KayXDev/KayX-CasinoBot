import { NextRequest, NextResponse } from 'next/server'

// Cache en memoria simple para desarrollo (en producción usar Redis)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function withCache(handler: Function, ttlSeconds: number = 120) {
  return async (req: NextRequest, ...args: any[]) => {
    const cacheKey = `${req.method}:${req.url}`
    const now = Date.now()
    
    // Verificar cache
    const cached = cache.get(cacheKey)
    if (cached && (now - cached.timestamp) < cached.ttl * 1000) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
          'X-Cache': 'HIT'
        }
      })
    }
    
    // Ejecutar handler original
    const response = await handler(req, ...args)
    const data = await response.json()
    
    // Guardar en cache si la respuesta es exitosa
    if (response.ok) {
      cache.set(cacheKey, {
        data,
        timestamp: now,
        ttl: ttlSeconds
      })
    }
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
        'X-Cache': 'MISS'
      }
    })
  }
}

// Limpiar cache periódicamente
setInterval(() => {
  const now = Date.now()
  cache.forEach((value, key) => {
    if ((now - value.timestamp) > value.ttl * 1000 * 2) {
      cache.delete(key)
    }
  })
}, 5 * 60 * 1000) // Limpiar cada 5 minutos