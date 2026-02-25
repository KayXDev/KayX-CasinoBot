'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Copy, 
  Check, 
  Gamepad2, 
  TrendingUp, 
  Users, 
  Gift, 
  Shield, 
  Star,
  Terminal,
  Command
} from 'lucide-react'

const commandCategories = [
  {
    id: 'casino',
    name: 'Casino Games',
    icon: Gamepad2,
    color: 'from-red-500 to-pink-500',
    stats: '8+ Games',
    description: 'Exciting casino games with spectacular graphics',
    commands: [
      {
        name: '/blackjack',
        description: 'Play a blackjack game with visual cards',
        usage: '/blackjack <amount>',
        example: '/blackjack 1000',
        cooldown: 'None',
        featured: true
      },
      {
        name: '/coinflip',
        description: 'Flip a coin and bet on the result',
        usage: '/coinflip <amount> <heads|tails|edge>',
        example: '/coinflip 500 heads',
        cooldown: 'None'
      },
      {
        name: '/ruleta',
        description: 'Play roulette with multiple betting options',
        usage: '/ruleta <amount> <bet>',
        example: '/ruleta 2000 red',
        cooldown: 'None'
      },
      {
        name: '/tragamonedas',
        description: 'Try your luck on slot machines',
        usage: '/tragamonedas <amount>',
        example: '/tragamonedas 1500',
        cooldown: 'None'
      },
      {
        name: '/dados',
        description: 'Roll dice and bet on the result',
        usage: '/dados <amount>',
        example: '/dados 800',
        cooldown: 'None'
      },
      {
        name: '/rasca',
        description: 'Play scratch cards with multiple prizes',
        usage: '/rasca <amount>',
        example: '/rasca 1000',
        cooldown: 'None'
      },
      {
        name: '/loteria',
        description: 'Participate in the server lottery',
        usage: '/loteria [buy/info]',
        example: '/loteria buy',
        cooldown: 'Varies'
      }
    ]
  },
  {
    id: 'economy',
    name: 'Economy',
    icon: Gift,
    color: 'from-green-500 to-emerald-500',
    stats: '10+ Commands',
    description: 'Manage your virtual money and get rewards',
    commands: [
      {
        name: '/balance',
        description: 'Check your balance or another user\'s balance',
        usage: '/balance [user]',
        example: '/balance @friend',
        cooldown: 'None',
        featured: true
      },
      {
        name: '/daily',
        description: 'Claim your daily reward',
        usage: '/daily',
        example: '/daily',
        cooldown: '24 hours'
      },
      {
        name: '/weekly',
        description: 'Claim your weekly reward',
        usage: '/weekly',
        example: '/weekly',
        cooldown: '7 days'
      },
      {
        name: '/give',
        description: 'Transfer money to another user',
        usage: '/give <user> <amount>',
        example: '/give @friend 5000',
        cooldown: 'None'
      },
      {
        name: '/rob',
        description: 'Attempt to rob another user',
        usage: '/rob <user>',
        example: '/rob @victim',
        cooldown: '1 hour'
      },
      {
        name: '/deposit',
        description: 'Deposit money into your bank account',
        usage: '/deposit <amount>',
        example: '/deposit 5000',
        cooldown: 'None'
      },
      {
        name: '/withdraw',
        description: 'Withdraw money from your bank account',
        usage: '/withdraw <amount>',
        example: '/withdraw 3000',
        cooldown: 'None'
      },
      {
        name: '/leaderboard',
        description: 'View the richest users ranking',
        usage: '/leaderboard [page]',
        example: '/leaderboard 2',
        cooldown: 'None'
      },
      {
        name: '/cooldowns',
        description: 'Check your active cooldowns',
        usage: '/cooldowns',
        example: '/cooldowns',
        cooldown: 'None'
      }
    ]
  },
  {
    id: 'crypto',
    name: 'Crypto Trading',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
    stats: '50+ Cryptos',
    description: 'Trade virtual cryptocurrencies with real-time markets',
    commands: [
      {
        name: '/crypto-market',
        description: 'View the current cryptocurrency market',
        usage: '/crypto-market [crypto]',
        example: '/crypto-market BTC',
        cooldown: 'None',
        featured: true
      },
      {
        name: '/crypto-buy',
        description: 'Buy cryptocurrencies',
        usage: '/crypto-buy <crypto> <amount>',
        example: '/crypto-buy ETH 10',
        cooldown: '30 seconds'
      },
      {
        name: '/crypto-sell',
        description: 'Sell your cryptocurrencies',
        usage: '/crypto-sell <crypto> <amount>',
        example: '/crypto-sell BTC 5',
        cooldown: '30 seconds'
      },
      {
        name: '/crypto-portfolio',
        description: 'View your cryptocurrency portfolio',
        usage: '/crypto-portfolio',
        example: '/crypto-portfolio',
        cooldown: 'None'
      }
    ]
  },
  {
    id: 'heists',
    name: 'Bank Heists',
    icon: Shield,
    color: 'from-purple-500 to-violet-500',
    stats: '8 Banks',
    description: 'Plan and execute epic heists with minigames',
    commands: [
      {
        name: '/robbank',
        description: 'Rob a bank with unique minigames',
        usage: '/robbank',
        example: '/robbank',
        cooldown: '6 hours',
        featured: true
      }
    ]
  },
  {
    id: 'social',
    name: 'Social',
    icon: Users,
    color: 'from-pink-500 to-rose-500',
    stats: '4+ Comandos',
    description: 'Interact with other users in fun ways',
    commands: [
      {
        name: '/addfriend',
        description: 'Add a user as a friend',
        usage: '/addfriend <user>',
        example: '/addfriend @user',
        cooldown: 'None'
      },
      {
        name: '/friends',
        description: 'View your friends list',
        usage: '/friends',
        example: '/friends',
        cooldown: 'None'
      },
      {
        name: '/removefriend',
        description: 'Remove a user from your friends list',
        usage: '/removefriend <user>',
        example: '/removefriend @user',
        cooldown: 'None'
      },
      {
        name: '/ref',
        description: 'Use or view your referral code',
        usage: '/ref [code]',
        example: '/ref ABC123',
        cooldown: 'None'
      }
    ]
  },
  {
    id: 'utility',
    name: 'Utilities',
    icon: Terminal,
    color: 'from-gray-500 to-slate-500',
    stats: '8+ Commands',
    description: 'Useful commands for information and management',
    commands: [
      {
        name: '/help',
        description: 'Show help about available commands',
        usage: '/help [command]',
        example: '/help blackjack',
        cooldown: 'None',
        featured: true
      },
      {
        name: '/inventory',
        description: 'View your item inventory',
        usage: '/inventory',
        example: '/inventory',
        cooldown: 'None'
      },
      {
        name: '/shop',
        description: 'Open the shop to buy items',
        usage: '/shop',
        example: '/shop',
        cooldown: 'None'
      },
      {
        name: '/leaderboard-achievements',
        description: 'View the user achievements ranking',
        usage: '/leaderboard-achievements',
        example: '/leaderboard-achievements',
        cooldown: 'None'
      }
    ]
  }
]

export default function CommandsPage() {
  const [selectedCategory, setSelectedCategory] = useState('casino')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCommand(text)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const filteredCategories = commandCategories.filter(category =>
    category.commands.some(cmd =>
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const selectedCategoryData = commandCategories.find(cat => cat.id === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-casino-600 to-purple-600 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
              <Terminal className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">Available Commands</span>
              <Command className="w-4 h-4 text-white ml-2" />
            </div>
            
            <h1 className="text-4xl font-black text-white mb-3">
              Casino Bot Commands
            </h1>
            
            <p className="text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
              Discover all available commands to create the perfect experience in your server
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-12">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-casino-500 focus:outline-none"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-casino-500/20 text-casino-300 px-2 py-1 rounded-lg text-xs font-medium">
            {commandCategories.reduce((total, cat) => total + cat.commands.length, 0)} commands
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {commandCategories.map((category) => {
            const IconComponent = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-casino-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{category.name}</span>
                <span className="text-xs opacity-75">({category.commands.length})</span>
              </button>
            )
          })}
        </div>

        {/* Commands Display */}
        {selectedCategoryData && (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 mb-6">
              <selectedCategoryData.icon className={`w-8 h-8 text-white p-1.5 rounded-lg bg-gradient-to-r ${selectedCategoryData.color}`} />
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCategoryData.name}</h2>
                <p className="text-gray-400 text-sm">{selectedCategoryData.description}</p>
              </div>
            </div>

            {selectedCategoryData.commands
              .filter(cmd =>
                cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((command, index) => (
                <div
                  key={command.name}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-casino-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <code className="text-lg font-bold text-casino-300 bg-gray-900 px-3 py-1 rounded-lg">
                          {command.name}
                        </code>
                        {command.featured && (
                          <div className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold">
                            <Star className="w-3 h-3" />
                            <span>Popular</span>
                          </div>
                        )}
                        <div className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                          {command.cooldown}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-4">{command.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-casino-400 font-medium">Usage:</span>
                          <code className="block mt-1 bg-gray-900 text-gray-300 px-3 py-2 rounded text-xs">{command.usage}</code>
                        </div>
                        <div>
                          <span className="text-purple-400 font-medium">Example:</span>
                          <code className="block mt-1 bg-gray-900 text-gray-300 px-3 py-2 rounded text-xs">{command.example}</code>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => copyToClipboard(command.name)}
                      className="ml-4 p-2 bg-casino-600 hover:bg-casino-500 text-white rounded-lg transition-colors"
                    >
                      {copiedCommand === command.name ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            }
          </motion.div>
        )}
      </div>
    </div>
  )
}