'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, X, Settings, Volume2, VolumeX, Smartphone, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'

interface NotificationSettings {
  blog_notifications: boolean
  changelog_notifications: boolean
  review_notifications: boolean
  like_notifications: boolean
  comment_notifications: boolean
  system_notifications: boolean
  email_notifications: boolean
  push_notifications: boolean
  sound_notifications: boolean
}

export default function NotificationSettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<NotificationSettings>({
    blog_notifications: true,
    changelog_notifications: true,
    review_notifications: true,
    like_notifications: true,
    comment_notifications: true,
    system_notifications: true,
    email_notifications: false,
    push_notifications: false,
    sound_notifications: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)

  useEffect(() => {
    // Check support for push notifications
    setPushSupported('Notification' in window && 'serviceWorker' in navigator)
    
    if (session?.user) {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }))
        return true
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    } finally {
      setSaving(false)
    }
    return false
  }

  const requestPushPermission = async () => {
    if (!pushSupported) return false

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await updateSettings({ push_notifications: true })
        return true
      }
    } catch (error) {
      console.error('Error requesting push permission:', error)
    }
    return false
  }

  const toggleSetting = async (key: keyof NotificationSettings) => {
    if (key === 'push_notifications' && !settings.push_notifications) {
      const granted = await requestPushPermission()
      if (!granted) return
    } else {
      await updateSettings({ [key]: !settings[key] })
    }
  }

  const settingGroups = [
    {
      title: 'Content',
      icon: <Bell className="w-5 h-5" />,
      settings: [
        {
          key: 'blog_notifications' as keyof NotificationSettings,
          title: 'New blog posts',
          description: 'Receive notifications when new articles are published'
        },
        {
          key: 'changelog_notifications' as keyof NotificationSettings,
          title: 'Bot updates',
          description: 'Changelog and new features'
        },
        {
          key: 'review_notifications' as keyof NotificationSettings,
          title: 'New reviews',
          description: 'When other users leave reviews'
        }
      ]
    },
    {
      title: 'Interactions',
      icon: <Volume2 className="w-5 h-5" />,
      settings: [
        {
          key: 'like_notifications' as keyof NotificationSettings,
          title: 'Likes',
          description: 'When someone likes your content'
        },
        {
          key: 'comment_notifications' as keyof NotificationSettings,
          title: 'Comments',
          description: 'Replies to your posts or comments'
        },
        {
          key: 'system_notifications' as keyof NotificationSettings,
          title: 'System',
          description: 'Maintenance, important alerts'
        }
      ]
    },
    {
      title: 'Delivery Channels',
      icon: <Smartphone className="w-5 h-5" />,
      settings: [
        {
          key: 'push_notifications' as keyof NotificationSettings,
          title: 'Push notifications',
          description: pushSupported ? 'Receive notifications on your device' : 'Not supported in this browser',
          disabled: !pushSupported
        },
        {
          key: 'email_notifications' as keyof NotificationSettings,
          title: 'Email',
          description: 'Weekly summary by email'
        },
        {
          key: 'sound_notifications' as keyof NotificationSettings,
          title: 'Sounds',
          description: 'Play sound when receiving notifications'
        }
      ]
    }
  ]

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 text-casino-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Required</h1>
          <p className="text-gray-400">Sign in to configure your notifications</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center mb-4"
          >
            <Settings className="w-8 h-8 text-casino-500 mr-3" />
            <h1 className="text-3xl font-bold text-white">Notification Settings</h1>
          </motion.div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Customize which notifications you want to receive and how you prefer to receive them
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-casino-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {settingGroups.map((group, groupIndex) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
              >
                <div className="flex items-center mb-6">
                  {group.icon}
                  <h2 className="text-xl font-semibold text-white ml-3">{group.title}</h2>
                </div>

                <div className="space-y-4">
                  {group.settings.map((setting) => (
                    <div
                      key={setting.key}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        setting.disabled 
                          ? 'bg-gray-800/30 border-gray-700/50 opacity-50' 
                          : 'bg-gray-800/80 border-gray-700 hover:border-gray-600'
                      } transition-all duration-200`}
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{setting.title}</h3>
                        <p className="text-gray-400 text-sm">{setting.description}</p>
                      </div>

                      <button
                        onClick={() => !setting.disabled && toggleSetting(setting.key)}
                        disabled={setting.disabled || saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          setting.disabled 
                            ? 'bg-gray-700 cursor-not-allowed'
                            : settings[setting.key] 
                              ? 'bg-casino-500' 
                              : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Test Notification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Test notifications</h2>
              <p className="text-gray-400 mb-4">
                Send a test notification to verify your configuration
              </p>
              <button
                onClick={async () => {
                  await fetch('/api/notifications/test', { method: 'POST' })
                }}
                className="bg-casino-500 hover:bg-casino-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Send test notification
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}