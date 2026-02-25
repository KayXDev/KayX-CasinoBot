'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearSessionPage() {
  const router = useRouter()

  useEffect(() => {
    const clearSession = async () => {
      // Clear all NextAuth cookies
      document.cookie = 'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = '__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = '__Host-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      // Clear localStorage
      localStorage.clear()
      sessionStorage.clear()
      
      // Sign out and redirect
      await signOut({ redirect: false })
      
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }

    clearSession()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-casino-500/30 border-t-casino-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-white mb-2">Limpiando sesión...</h2>
        <p className="text-gray-400">Redirigiendo en un momento...</p>
      </div>
    </div>
  )
}