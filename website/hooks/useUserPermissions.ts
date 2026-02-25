import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UserPermissions {
  isAdmin: boolean
  isOwner: boolean
  permissions: string[]
  loading: boolean
  error?: string
}

export function useUserPermissions(): UserPermissions {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<UserPermissions>({
    isAdmin: false,
    isOwner: false,
    permissions: [],
    loading: true
  })

  useEffect(() => {
    if (status === 'loading') {
      setPermissions(prev => ({ ...prev, loading: true }))
      return
    }

    if (!session) {
      setPermissions({
        isAdmin: false,
        isOwner: false,
        permissions: [],
        loading: false
      })
      return
    }

    // Verificar permisos del usuario
    const checkPermissions = async () => {
      try {
        const response = await fetch('/api/users/permissions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setPermissions({
            isAdmin: data.isAdmin || false,
            isOwner: data.isOwner || false,
            permissions: data.permissions || [],
            loading: false,
            error: undefined
          })
        } else {
          console.error('Failed to fetch user permissions')
          setPermissions({
            isAdmin: false,
            isOwner: false,
            permissions: [],
            loading: false,
            error: 'Failed to fetch permissions'
          })
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error)
        setPermissions({
          isAdmin: false,
          isOwner: false,
          permissions: [],
          loading: false,
          error: 'Error fetching permissions'
        })
      }
    }

    checkPermissions()
  }, [session, status])

  return permissions
}

// Hook para verificar solo si es admin (combina owner y permisos de servidor)
export function useIsAdmin(): boolean {
  const { isAdmin, isOwner, loading } = useUserPermissions()
  return !loading && (isAdmin || isOwner)
}

// Hook para verificar si es owner específicamente
export function useIsOwner(): boolean {
  const { isOwner, loading } = useUserPermissions()
  return !loading && isOwner
}