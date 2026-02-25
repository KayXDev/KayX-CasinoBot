'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, Settings, Trophy, Coins, Shield } from 'lucide-react'
import Image from 'next/image'
import { NotificationBell } from './NotificationBell'
import { useUserPermissions } from '@/hooks/useUserPermissions'

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Usar el nuevo sistema de permisos
  const { isAdmin, isOwner, loading: permissionsLoading } = useUserPermissions()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  // Auto-create profile for logged in users and fetch profile data
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      // Create profile if doesn't exist
      fetch('/api/profiles/create', {
        method: 'POST',
      }).catch(error => {
        console.log('Profile auto-creation info:', error)
      })

      // Fetch user profile data
      fetch(`/api/profiles/${(session.user as any).id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserProfile(data.profile)
          }
        })
        .catch(error => {
          console.log('Error fetching profile:', error)
        })
    }
  }, [session, status])

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Commands', href: '/commands' },
    { name: 'Changelog', href: '/changelog' },
    { name: 'Guides', href: '/guides' },
    { name: 'Blogs', href: '/blogs' },
    { name: 'Reviews', href: '/reviews' },
    { name: 'Discovery', href: '/discovery' },
  ]

  return (
    <nav className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-b border-gray-700/30 fixed w-full top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Compact */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="group flex items-center space-x-2 hover:scale-105 transition-transform duration-200">
              <div className="w-10 h-10 bg-gradient-to-br from-casino-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-casino-500/30 transition-all duration-200">
                <span className="text-white font-bold text-base">🎰</span>
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-casino-600 to-purple-600 group-hover:from-casino-500 group-hover:to-purple-500 transition-all duration-200">
                Casino Bot
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Compact */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-gray-300 hover:text-white font-medium text-sm transition-all duration-200 rounded-lg hover:bg-gradient-to-r hover:from-casino-600/20 hover:to-purple-600/20"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu / Login Compact */}
          <div className="hidden md:flex items-center space-x-3">
            {status === "loading" ? (
              <div className="flex items-center space-x-2">
                <div className="animate-pulse w-8 h-8 bg-gray-700/50 rounded-full"></div>
                <div className="animate-pulse w-16 h-3 bg-gray-700/50 rounded"></div>
              </div>
            ) : session ? (
              <div className="relative flex items-center space-x-2">
                {/* User Profile Compact */}
                <div
                  onClick={() => router.push(`/profile/${(session.user as any)?.id}`)}
                  className="group flex items-center space-x-3 cursor-pointer px-3 py-2 bg-gray-800/50 backdrop-blur-xl rounded-lg border border-gray-600/30 hover:border-casino-400/50 transition-all duration-200"
                >
                  <div className="relative">
                    <Image
                      src={userProfile?.avatarUrl || session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || session.user?.name || 'User')}&size=32&background=6366f1&color=ffffff`}
                      alt={userProfile?.displayName || session.user?.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full border border-casino-400/30"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-gray-800"></div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-white font-medium text-sm truncate max-w-24">
                        {userProfile?.displayName || session.user?.name}
                      </span>
                      {!!userProfile?.isVerified && (
                        <img src="/images/Twitter_Verified_Badge.png" alt="Verified" className="w-3 h-3 flex-shrink-0" />
                      )}
                      {isOwner && (
                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                          OWNER
                        </span>
                      )}
                      {!isOwner && isAdmin && (
                        <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    {isOwner && (
                      <span className="text-xs text-gray-400 font-medium">
                        Owner | Casino
                      </span>
                    )}
                    {!isOwner && isAdmin && (
                      <span className="text-xs text-gray-400 font-medium">
                        Admin | Casino
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* Menu Button Compact */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2 text-gray-400 hover:text-white focus:outline-none bg-gray-800/50 rounded-lg border border-gray-600/30 hover:border-casino-400/50 transition-all duration-200"
                >
                  <Menu className="w-4 h-4" />
                </button>

                {isUserMenuOpen && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-600/30 z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-700/50 bg-gradient-to-r from-casino-600/10 to-purple-600/10">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={userProfile?.avatarUrl || session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || session.user?.name || 'User')}&size=32&background=6366f1&color=ffffff`}
                          alt={userProfile?.displayName || session.user?.name || 'User'}
                          width={32}
                          height={32}
                          className="rounded-full border border-casino-400/50"
                        />
                        <div>
                          <div className="flex items-center space-x-1">
                            <p className="font-medium text-white text-sm">{userProfile?.displayName || session.user?.name}</p>
                            {!!userProfile?.isVerified && (
                              <img src="/images/Twitter_Verified_Badge.png" alt="Verified" className="w-3 h-3 flex-shrink-0" />
                            )}
                          </div>
                          {isOwner && (
                            <p className="text-xs text-gray-400">Owner | Casino</p>
                          )}
                          {!isOwner && isAdmin && (
                            <p className="text-xs text-gray-400">Admin | Casino</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href={`/profile/${(session.user as any)?.id}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-casino-600/20 hover:to-purple-600/20 transition-all duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4 mr-2 text-casino-400" />
                        <span className="font-medium">Mi Perfil</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-casino-600/20 hover:to-purple-600/20 transition-all duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Trophy className="w-4 h-4 mr-2 text-green-400" />
                        <span className="font-medium">Dashboard</span>
                      </Link>
                      <Link
                        href="/profile/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-casino-600/20 hover:to-purple-600/20 transition-all duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-2 text-purple-400" />
                        <span className="font-medium">Configuración</span>
                      </Link>
                      {isOwner && (
                        <Link
                          href="/admin"
                          className="flex items-center px-4 py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4 mr-2 text-amber-400" />
                          <span className="font-medium">Admin Dashboard</span>
                        </Link>
                      )}
                      {!isOwner && isAdmin && (
                        <Link
                          href="/server-admin"
                          className="flex items-center px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 transition-all duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4 mr-2 text-blue-400" />
                          <span className="font-medium">Admin</span>
                        </Link>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="border-t border-gray-700/50 mx-2"></div>

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          signOut()
                          setIsUserMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span className="font-medium">Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-500 hover:to-purple-500 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.201 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.2 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38z"/>
                </svg>
                <span>Login</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white focus:outline-none focus:text-white"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-700/30">
            <div className="px-4 pt-4 pb-3 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-lg text-base font-medium hover:bg-gray-800/50"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {session ? (
                <div className="pt-3 pb-3 border-t border-gray-700/30 mt-3">
                  <div 
                    className="flex items-center px-3 cursor-pointer hover:bg-gray-800/50 py-2 rounded-lg transition-colors duration-200"
                    onClick={() => {
                      router.push(`/profile/${(session.user as any)?.id}`)
                      setIsOpen(false)
                    }}
                  >
                    <Image
                      src={session.user?.image || '/default-avatar.svg'}
                      alt={session.user?.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-base font-medium text-white flex items-center space-x-2">
                        <span>{session.user?.name}</span>
                        {isOwner && (
                          <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5 rounded font-bold">OWNER</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{session.user?.email}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <Link
                      href={`/profile/${(session.user as any)?.id}`}
                      className="block px-3 py-2 text-base font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
                      onClick={() => setIsOpen(false)}
                    >
                      Mi Perfil
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="block px-3 py-2 text-base font-medium text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
                      onClick={() => setIsOpen(false)}
                    >
                      Configuración
                    </Link>
                    {isOwner && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 text-base font-medium text-yellow-400 hover:text-yellow-300 rounded-lg hover:bg-gray-800/50"
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut()
                        setIsOpen(false)
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-800/50"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    signIn('discord')
                    setIsOpen(false)
                  }}
                  className="w-full bg-gradient-to-r from-casino-600 to-purple-600 hover:from-casino-500 hover:to-purple-500 text-white px-3 py-2 rounded-lg text-base font-medium"
                >
                  Login with Discord
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}