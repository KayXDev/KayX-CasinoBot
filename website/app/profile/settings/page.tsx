'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  User, 
  Camera, 
  Save, 
  ArrowLeft,
  ExternalLink,
  Twitter,
  Instagram,
  MapPin,
  Crown,
  Loader2
} from 'lucide-react'

interface ProfileSettings {
  customUsername: string
  displayName: string
  bio: string
  website: string
  twitter: string
  instagram: string
  location: string
  avatarUrl: string
  bannerUrl: string
}

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [settings, setSettings] = useState<ProfileSettings>({
    customUsername: '',
    displayName: '',
    bio: '',
    website: '',
    twitter: '',
    instagram: '',
    location: '',
    avatarUrl: '',
    bannerUrl: ''
  })
  
  const [loading, setLoading] = useState(false) // Optimizado para carga rápida
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isOwner = session?.user && (session.user as any).id === '388422519553654786'

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/api/auth/signin')
      return
    }

    loadProfile()
  }, [session, status, router])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const userId = (session?.user as any)?.id
      const response = await fetch(`/api/profiles/${userId}`)
      const data = await response.json()
      
      if (data.success && data.profile) {
        const profile = data.profile
        setSettings({
          customUsername: profile.customUsername || '',
          displayName: profile.displayName || session?.user?.name || '',
          bio: profile.bio || '',
          website: profile.website || '',
          twitter: profile.twitter || '',
          instagram: profile.instagram || '',
          location: profile.location || '',
          avatarUrl: profile.avatarUrl || session?.user?.image || '',
          bannerUrl: profile.bannerUrl || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProfileSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const validateSettings = () => {
    if (settings.customUsername && settings.customUsername.length < 3) {
      setError('Username must be at least 3 characters long')
      return false
    }

    if (settings.customUsername && !/^[a-zA-Z0-9_]+$/.test(settings.customUsername)) {
      setError('Username can only contain letters, numbers, and underscores')
      return false
    }

    if (settings.bio && settings.bio.length > 500) {
      setError('Bio must be less than 500 characters')
      return false
    }

    return true
  }

  const saveProfile = async () => {
    if (!validateSettings()) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profiles/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Profile updated successfully!')
        setTimeout(() => {
          router.push(`/profile/${(session?.user as any)?.id}`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/profiles/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        if (type === 'avatar') {
          setSettings(prev => ({ ...prev, avatarUrl: data.url }))
        } else if (type === 'banner') {
          setSettings(prev => ({ ...prev, bannerUrl: data.url }))
        }
        setSuccess(`${type === 'avatar' ? 'Profile picture' : 'Banner'} uploaded successfully!`)
      } else {
        setError(data.error || `Failed to upload ${type}`)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-casino-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading profile settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Simple Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-casino-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
              <p className="text-gray-400">Customize your public profile</p>
            </div>
            {isOwner && (
              <div className="ml-auto">
                <div className="flex items-center space-x-1 text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded-lg">
                  <Crown className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">OWNER</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 max-w-4xl mx-auto"
        >
          {/* Avatar Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={settings.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(settings.displayName || 'User')}&size=128&background=random`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-gray-700"
                />
                {isOwner && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                    <Crown className="w-4 h-4 text-black fill-current" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex space-x-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={settings.avatarUrl}
                      onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                      placeholder="https://example.com/your-avatar.jpg"
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use Discord avatar
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <label className="cursor-pointer bg-casino-600 hover:bg-casino-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                    <Camera className="w-4 h-4" />
                    <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'avatar')}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {uploading && <Loader2 className="w-6 h-6 text-casino-500 animate-spin" />}
                </div>
              </div>
            </div>
          </div>

          {/* Banner Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Banner</h3>
            <div className="space-y-4">
              {settings.bannerUrl && (
                <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-700">
                  <img
                    src={settings.bannerUrl}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banner URL
                  </label>
                  <input
                    type="url"
                    value={settings.bannerUrl}
                    onChange={(e) => handleInputChange('bannerUrl', e.target.value)}
                    placeholder="https://example.com/your-banner.jpg"
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional banner image for your profile
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50">
                  <Camera className="w-4 h-4" />
                  <span>{uploading ? 'Uploading...' : 'Upload Banner'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'banner')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {uploading && <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Your display name"
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom Username
                </label>
                <input
                  type="text"
                  value={settings.customUsername}
                  onChange={(e) => handleInputChange('customUsername', e.target.value.toLowerCase())}
                  placeholder="username"
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  pattern="[a-zA-Z0-9_]+"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional • Letters, numbers, and underscores only • Will be used in profile URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={settings.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell people a little about yourself..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings.bio.length}/500 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, Country"
                    className="w-full bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Social Links</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Twitter
                </label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-2.5 w-4 h-4 text-blue-400" />
                  <input
                    type="text"
                    value={settings.twitter}
                    onChange={(e) => handleInputChange('twitter', e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="w-full bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Username only, without @
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instagram
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-pink-400" />
                  <input
                    type="text"
                    value={settings.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="w-full bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-casino-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Username only, without @
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2 bg-casino-600 hover:bg-casino-700 disabled:bg-casino-800 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}