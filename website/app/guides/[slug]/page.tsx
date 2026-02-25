'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Star, 
  Eye, 
  Heart, 
  Share,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Code,
  Settings,
  Play,
  Copy,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface GuideSection {
  id: string
  title: string
  content: string
  type: 'text' | 'code' | 'warning' | 'tip' | 'info'
}

interface Guide {
  id: string
  title: string
  description: string
  content: GuideSection[]
  category: string
  readTime: string
  author: string
  published: string
  difficulty: string
  tags: string[]
  views: number
  likes?: number
}

const guides: Record<string, Guide> = {
  'getting-started-casino-bot': {
    id: '1',
    title: 'Getting Started with Casino Bot',
    description: 'Learn the fundamentals of using Casino Bot in your Discord server and get started with the ultimate gambling experience.',
    content: [
      {
        id: '1',
        title: 'Welcome to Casino Bot',
        content: 'Casino Bot is the most advanced gambling bot for Discord. Transform your server into a thriving virtual casino with realistic games, comprehensive economy system, and engaging social features.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Bot Invitation',
        content: 'To invite Casino Bot to your server, you need administrator permissions. Click the invitation link and select your server to get started.',
        type: 'info'
      },
      {
        id: '3',
        title: 'Initial Setup Commands',
        content: '/setup casino\n/config economy enable\n/config channels setup\n/permissions configure',
        type: 'code'
      },
      {
        id: '4',
        title: 'Essential First Commands',
        content: 'Master these basic commands to get started:\n\n• `/balance` - Check your current balance\n• `/daily` - Claim daily chips\n• `/help` - View all available commands\n• `/blackjack 100` - Start playing blackjack\n• `/coinflip 50 heads` - Flip a coin\n• `/shop` - Browse the item shop',
        type: 'text'
      },
      {
        id: '5',
        title: 'Important Permissions',
        content: 'Ensure the bot has necessary permissions: Send Messages, Embed Links, Add Reactions, Use External Emojis, and Manage Messages for optimal functionality.',
        type: 'warning'
      },
      {
        id: '6',
        title: 'Next Steps',
        content: 'Once configured, explore advanced games, set up the economy system, and customize your server\'s casino experience with roles and special channels.',
        type: 'tip'
      }
    ],
    category: 'Beginner',
    readTime: '5 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['basics', 'setup', 'commands'],
    views: 0,
    likes: 0
  },
  'essential-casino-commands': {
    id: '2',
    title: 'Essential Casino Bot Commands',
    description: 'Master the most important commands to get the maximum benefit from Casino Bot in your Discord server.',
    content: [
      {
        id: '1',
        title: 'Core Game Commands',
        content: 'Games are the heart of Casino Bot. Here are the main commands you need to know for an exciting gambling experience.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Economy System Commands',
        content: '/balance - Check current balance\n/daily - Claim daily chips\n/weekly - Weekly bonus reward\n/give @user [amount] - Transfer money\n/leaderboard - Player rankings',
        type: 'code'
      },
      {
        id: '3',
        title: 'Comandos de Juegos',
        content: '/blackjack [apuesta] - Jugar blackjack\n/coinflip [apuesta] cara/cruz - Lanzar moneda\n/ruleta [apuesta] [color/número] - Jugar ruleta\n/dados [apuesta] - Lanzar dados\n/tragamonedas [apuesta] - Máquinas tragamonedas',
        type: 'code'
      },
      {
        id: '4',
        title: 'Consejo Pro',
        content: 'Usa `/help [comando]` para ver información detallada sobre cualquier comando específico.',
        type: 'tip'
      },
      {
        id: '5',
        title: 'Comandos Sociales',
        content: '/leaderboard - Ver ranking de usuarios\n/profile [@usuario] - Ver perfil de usuario\n/inventory - Ver tu inventario\n/shop - Tienda de items',
        type: 'code'
      },
      {
        id: '6',
        title: 'Atención',
        content: 'Algunos comandos tienen cooldowns (tiempos de espera). Respeta estos límites para una experiencia justa.',
        type: 'warning'
      }
    ],
    category: 'Commands',
    readTime: '8 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Medio',
    tags: ['comandos', 'economía', 'juegos'],
    views: 12890
  },
  'estrategias-blackjack': {
    id: '3',
    title: 'Estrategias Ganadoras en Blackjack',
    description: 'Aprende las mejores estrategias para dominar el blackjack y maximizar tus ganancias.',
    content: [
      {
        id: '1',
        title: 'Fundamentos del Blackjack',
        content: 'El blackjack es un juego de habilidad donde puedes influir en el resultado con decisiones inteligentes. El objetivo es llegar lo más cerca posible a 21 sin pasarse.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Estrategia Básica',
        content: '• Pide carta con 11 o menos\n• Plántate con 17 o más\n• Con 12-16, depende de la carta visible del dealer\n• Dobla con 10-11 si el dealer muestra carta baja\n• Separa ases y ochos siempre',
        type: 'text'
      },
      {
        id: '3',
        title: 'Comando de Blackjack',
        content: '/blackjack 100 - Apostar 100 fichas\n\nOpciones durante el juego:\n• hit - Pedir carta\n• stand - Plantarse\n• double - Doblar apuesta\n• split - Separar cartas (si son iguales)',
        type: 'code'
      },
      {
        id: '4',
        title: 'Gestión de Bankroll',
        content: 'Nunca apostes más del 5% de tu balance total en una sola mano. Esto te permitirá jugar más tiempo y recuperarte de las rachas perdedoras.',
        type: 'tip'
      },
      {
        id: '5',
        title: 'Errores Comunes',
        content: 'No tomes el seguro, nunca te separes los 10s, y no hagas apuestas emocionales. Mantén la disciplina.',
        type: 'warning'
      },
      {
        id: '6',
        title: 'Práctica',
        content: 'Usa apuestas pequeñas al principio para practicar la estrategia básica antes de apostar cantidades grandes.',
        type: 'info'
      }
    ],
    category: 'Avanzado',
    readTime: '12 min',
    author: 'KayX',
    published: '2024-10-25',
    difficulty: 'Difícil',
    tags: ['blackjack', 'estrategia', 'casino'],
    views: 0,
    likes: 0
  },
  'advanced-economy-system': {
    id: '4',
    title: 'Advanced Economy System',
    description: 'Explore the advanced features of Casino Bot\'s comprehensive economic system and maximize your virtual wealth.',
    content: [
      {
        id: '1',
        title: 'Economy System Overview',
        content: 'Casino Bot features a sophisticated economic system designed to simulate real-world financial mechanics. The system includes multiple currencies, banking services, investment opportunities, and complex trading mechanisms that create a realistic virtual economy experience.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Currency Types and Usage',
        content: '• **Chips** - Primary casino currency earned through games and daily rewards\n• **Bank Balance** - Secure storage with interest accumulation\n• **Items** - Collectibles, tools, and functional objects with real value\n• **Property Investments** - Real estate that generates passive income\n• **Special Tokens** - Event-based currency for exclusive purchases',
        type: 'text'
      },
      {
        id: '3',
        title: 'Banking System Commands',
        content: '/deposit [amount] - Store chips in bank (earns interest)\n/withdraw [amount] - Take chips from bank\n/balance bank - Check bank balance and interest\n/interest - View current interest rates\n/loan - Access lending services (if available)',
        type: 'code'
      },
      {
        id: '4',
        title: 'Investment Strategies',
        content: 'Smart economy management involves diversifying your portfolio:\n\n1. **Conservative**: 70% bank, 20% safe items, 10% gambling\n2. **Balanced**: 40% bank, 30% items, 30% active play\n3. **Aggressive**: 20% bank, 30% items, 50% high-stakes games\n\nChoose based on your risk tolerance and activity level.',
        type: 'info'
      },
      {
        id: '5',
        title: 'Shop and Item Management',
        content: '/shop - Browse available items and their prices\n/inventory - View your collected items\n/shop buy [item] [quantity] - Purchase items\n/shop sell [item] [quantity] - Sell items back\n/item info [item] - Get detailed item information',
        type: 'code'
      },
      {
        id: '6',
        title: 'Advanced Trading Tips',
        content: '• Monitor item prices for buying opportunities\n• Keep emergency funds in the bank\n• Use items that provide gameplay bonuses\n• Track your ROI on different investments\n• Don\'t put all resources in one basket',
        type: 'tip'
      },
      {
        id: '7',
        title: 'Risk Management',
        content: 'Never invest more than you can afford to lose. The virtual economy can fluctuate, and while the bank is safe, items and gambling carry risk. Always maintain a reserve fund.',
        type: 'warning'
      }
    ],
    category: 'Economy',
    readTime: '15 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Advanced',
    tags: ['economy', 'banking', 'investment'],
    views: 0,
    likes: 0
  },
  'social-features-friends-system': {
    id: '6',
    title: 'Social Features and Friends System',
    description: 'Build a strong social network and leverage Casino Bot\'s social features to enhance your gaming experience.',
    content: [
      {
        id: '1',
        title: 'Friends System Overview',
        content: 'Casino Bot includes a comprehensive friends system that allows you to connect with other players, share experiences, and enjoy social features together.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Managing Friends',
        content: '/friends add @user - Send friend request\n/friends remove @user - Remove a friend\n/friends list - View your friends list\n/friends requests - Check pending requests',
        type: 'code'
      },
      {
        id: '3',
        title: 'Social Interactions',
        content: 'Once you have friends, you can:\n\n• Send and receive chips as gifts\n• View their profiles and achievements\n• Compete in friendly challenges\n• Share your big wins with them\n• Get referral bonuses for inviting them',
        type: 'text'
      },
      {
        id: '4',
        title: 'Referral System Benefits',
        content: 'The referral system rewards you for bringing new players to Casino Bot. Both you and your referred friend get bonus chips!',
        type: 'info'
      },
      {
        id: '5',
        title: 'Referral Commands',
        content: '/ref @newuser - Refer a new player\n/ref stats - Check your referral statistics\n/ref rewards - View available referral rewards',
        type: 'code'
      },
      {
        id: '6',
        title: 'Community Building',
        content: 'Building a strong friend network enhances your Casino Bot experience. Friends can help you during tough times and celebrate your victories!',
        type: 'tip'
      }
    ],
    category: 'Social',
    readTime: '8 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['social', 'friends', 'community'],
    views: 0,
    likes: 0
  },
  'blackjack-winning-strategies': {
    id: '7',
    title: 'Blackjack Winning Strategies',
    description: 'Learn the best strategies to dominate blackjack and maximize your winnings in Casino Bot.',
    content: [
      {
        id: '1',
        title: 'Blackjack Fundamentals',
        content: 'Blackjack is a game of skill and strategy where your decisions directly impact the outcome. The goal is to get a hand value as close to 21 as possible without going over (busting) while beating the dealer\'s hand. In Casino Bot, the blackjack game uses realistic rules and card mechanics.',
        type: 'text'
      },
      {
        id: '2',
        title: 'Basic Strategy Chart',
        content: 'Follow these fundamental rules for optimal play:\n\n**Hard Hands (no Ace or Ace counted as 1):**\n• 8 or less: Always HIT\n• 9: Double vs dealer 3-6, otherwise HIT\n• 10-11: Double vs dealer 2-9, otherwise HIT\n• 12: Stand vs dealer 4-6, otherwise HIT\n• 13-16: Stand vs dealer 2-6, otherwise HIT\n• 17+: Always STAND',
        type: 'text'
      },
      {
        id: '3',
        title: 'Soft Hands Strategy',
        content: '**Soft Hands (Ace counted as 11):**\n• A,2-A,3: Double vs dealer 5-6, otherwise HIT\n• A,4-A,5: Double vs dealer 4-6, otherwise HIT\n• A,6: Double vs dealer 3-6, otherwise HIT\n• A,7: Stand vs dealer 2,7,8; Double vs 3-6; Hit vs 9,10,A\n• A,8-A,9: Always STAND',
        type: 'info'
      },
      {
        id: '4',
        title: 'Pairs Splitting Strategy',
        content: '/blackjack [amount] - Start a blackjack game\n\n**When to SPLIT:**\n• Always split Aces and 8s\n• Split 2s and 3s vs dealer 2-7\n• Split 6s vs dealer 2-6\n• Split 7s vs dealer 2-7\n• Split 9s vs dealer 2-9 (except 7)\n\n**Never split:** 5s, 10s, face cards',
        type: 'code'
      },
      {
        id: '5',
        title: 'Bankroll Management',
        content: 'Proper bankroll management is crucial for long-term success:\n\n• Never bet more than 5% of your total balance\n• Set win/loss limits before playing\n• Take breaks after big wins or losses\n• Don\'t chase losses with bigger bets\n• Keep detailed records of your sessions',
        type: 'tip'
      },
      {
        id: '6',
        title: 'Advanced Techniques',
        content: 'Casino Bot\'s blackjack includes advanced features:\n\n• **Insurance**: Generally avoid insurance bets (house edge too high)\n• **Double Down**: Use strategically with 10 or 11\n• **Surrender**: Not always available, but valuable when offered\n• **Card Counting Practice**: While not effective in digital games, practice helps understand card flow',
        type: 'text'
      },
      {
        id: '7',
        title: 'Common Mistakes to Avoid',
        content: 'Avoid these costly errors that beginners often make:\n\n• Taking insurance on your blackjack\n• Splitting 10s or face cards\n• Not splitting Aces or 8s\n• Playing "hunches" instead of basic strategy\n• Betting more when losing\n• Not understanding soft vs hard hands',
        type: 'warning'
      }
    ],
    category: 'Games',
    readTime: '12 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Advanced',
    tags: ['blackjack', 'strategy', 'casino'],
    views: 0,
    likes: 0
  },
  'lottery-and-scratch-cards': {
    id: '8',
    title: 'Lottery and Scratch Card Guide',
    description: 'Master the lottery system and scratch card games to hit the jackpot in Casino Bot.',
    content: [
      {
        id: '1',
        title: 'Lottery System Overview',
        content: 'Casino Bot features an exciting lottery system (Lotería) with scheduled draws, multiple prize tiers, and massive jackpots. The lottery runs automatically at set intervals, creating anticipation and community excitement as players wait for results.',
        type: 'text'
      },
      {
        id: '2',
        title: 'How to Play Lottery',
        content: 'The lottery system allows players to purchase tickets and select numbers for upcoming draws. Each ticket gives you a chance to win various prize levels, from small consolation prizes to life-changing jackpots.',
        type: 'text'
      },
      {
        id: '3',
        title: 'Lottery Commands',
        content: '/loteria buy - Purchase lottery tickets for next draw\n/loteria numbers - Check your numbers for current draw\n/loteria results - View latest draw results\n/loteria jackpot - Current jackpot amount\n/loteria history - Past winning numbers and prizes',
        type: 'code'
      },
      {
        id: '4',
        title: 'Lottery Strategy Tips',
        content: 'While lottery is primarily luck-based, these tips can help:\n\n• **Consistent Play**: Regular participation increases long-term chances\n• **Number Selection**: Avoid common patterns like birthdays\n• **Budget Management**: Only spend what you can afford\n• **Group Play**: Consider pooling with friends\n• **Timing**: Check jackpot sizes before buying',
        type: 'tip'
      },
      {
        id: '5',
        title: 'Scratch Cards (Rasca)',
        content: 'Scratch cards offer instant gratification with immediate results. Unlike lottery, you know right away if you\'ve won, making them perfect for players who prefer instant outcomes over waiting for draws.',
        type: 'info'
      },
      {
        id: '6',
        title: 'Scratch Card Commands and Strategy',
        content: '/rasca [amount] - Buy scratch cards (higher amounts = better prizes)\n/rasca info - View scratch card odds and prizes\n\n**Strategy Tips:**\n• Start small to understand odds\n• Higher denomination cards have better prize structures\n• Set daily limits to avoid overspending\n• Track your results to understand patterns',
        type: 'code'
      },
      {
        id: '7',
        title: 'Understanding Odds and Expectations',
        content: 'Both lottery and scratch cards are games of chance with house edges. The key is entertainment value and responsible play. Set budgets, enjoy the excitement, but never expect guaranteed returns.',
        type: 'warning'
      },
      {
        id: '8',
        title: 'Prize Claiming and Taxes',
        content: 'In Casino Bot, winnings are automatically credited to your account. Large wins may be announced server-wide, adding to the excitement and community celebration of big victories.',
        type: 'text'
      }
    ],
    category: 'Games',
    readTime: '10 min',
    author: 'KayX',
    published: '2024-11-07',
    difficulty: 'Easy',
    tags: ['lottery', 'scratch', 'luck'],
    views: 0,
    likes: 0
  }
}

export default function GuidePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const slug = params.slug as string
  
  // Estado para likes y vistas
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [views, setViews] = useState(0)

  const guide = guides[slug]

  // Inicializar likes desde los datos de la guía y localStorage
  useEffect(() => {
    if (guide) {
      setLikes(guide.likes || 0)
      
      // Cargar estado de like del localStorage
      if (session?.user) {
        const userId = (session.user as any).id
        const likedGuides = JSON.parse(localStorage.getItem('likedGuides') || '[]')
        setIsLiked(likedGuides.includes(`${slug}-${userId}`))
        
        // Cargar likes del localStorage si existen
        const guideLikes = localStorage.getItem(`guide-likes-${slug}`)
        if (guideLikes) {
          setLikes(parseInt(guideLikes))
        }
      }
      
      // Cargar vistas del localStorage
      const currentViews = parseInt(localStorage.getItem(`guide-views-${slug}`) || '0')
      
      // Contar vista (solo una vez por sesión)
      const viewedKey = `guide-viewed-${slug}`
      if (!sessionStorage.getItem(viewedKey)) {
        // Incrementar contador de vistas
        const newViews = currentViews + 1
        localStorage.setItem(`guide-views-${slug}`, newViews.toString())
        sessionStorage.setItem(viewedKey, 'true')
        setViews(newViews)
      } else {
        setViews(currentViews)
      }
    }
  }, [guide, session, slug])

  const handleLike = async () => {
    if (!session) {
      // Redirigir a login si no está autenticado
      window.location.href = '/api/auth/signin'
      return
    }

    try {
      const userId = (session.user as any).id
      const newIsLiked = !isLiked
      const newLikes = isLiked ? likes - 1 : likes + 1
      
      setIsLiked(newIsLiked)
      setLikes(newLikes)
      
      // Guardar estado en localStorage
      const likedGuides = JSON.parse(localStorage.getItem('likedGuides') || '[]')
      const guideKey = `${slug}-${userId}`
      
      if (newIsLiked) {
        // Agregar like
        if (!likedGuides.includes(guideKey)) {
          likedGuides.push(guideKey)
        }
      } else {
        // Quitar like
        const index = likedGuides.indexOf(guideKey)
        if (index > -1) {
          likedGuides.splice(index, 1)
        }
      }
      
      localStorage.setItem('likedGuides', JSON.stringify(likedGuides))
      localStorage.setItem(`guide-likes-${slug}`, newLikes.toString())
      
      // Aquí iría la llamada a la API cuando implementes el backend
      // const response = await fetch(`/api/guides/${slug}/like`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // })
      
    } catch (error) {
      console.error('Error liking guide:', error)
      // Revertir cambios si hay error
      setIsLiked(isLiked)
      setLikes(likes)
    }
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Guía no encontrada</h1>
          <p className="text-gray-400 mb-6">La guía que buscas no existe.</p>
          <Link href="/guides" className="bg-casino-600 hover:bg-casino-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            Volver a Guías
          </Link>
        </div>
      </div>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const renderSection = (section: GuideSection) => {
    const baseClasses = "rounded-2xl p-6 mb-6 border"
    
    switch (section.type) {
      case 'code':
        return (
          <div key={section.id} className={`${baseClasses} bg-gray-900/90 border-gray-700/50 relative group`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-casino-400" />
                <span className="font-semibold text-white">{section.title}</span>
              </div>
              <button
                onClick={() => copyToClipboard(section.content)}
                className="opacity-0 group-hover:opacity-100 bg-gray-700/50 hover:bg-gray-600/50 p-2 rounded-lg transition-all duration-200"
              >
                <Copy className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <pre className="text-casino-300 font-mono text-sm whitespace-pre-wrap bg-black/30 p-4 rounded-xl overflow-x-auto">
              {section.content}
            </pre>
          </div>
        )
      
      case 'warning':
        return (
          <div key={section.id} className={`${baseClasses} bg-red-500/10 border-red-500/30`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-300 mb-2">{section.title}</h4>
                <p className="text-red-200 leading-relaxed">{section.content}</p>
              </div>
            </div>
          </div>
        )
      
      case 'tip':
        return (
          <div key={section.id} className={`${baseClasses} bg-amber-500/10 border-amber-500/30`}>
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-300 mb-2">{section.title}</h4>
                <p className="text-amber-200 leading-relaxed">{section.content}</p>
              </div>
            </div>
          </div>
        )
      
      case 'info':
        return (
          <div key={section.id} className={`${baseClasses} bg-blue-500/10 border-blue-500/30`}>
            <div className="flex items-start space-x-3">
              <Info className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-2">{section.title}</h4>
                <p className="text-blue-200 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div key={section.id} className={`${baseClasses} bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50`}>
            <h3 className="text-xl font-bold text-white mb-4">{section.title}</h3>
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{section.content}</div>
          </div>
        )
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'fácil': return 'text-green-400 bg-green-500/20'
      case 'medio': return 'text-amber-400 bg-amber-500/20'
      case 'difícil': return 'text-red-400 bg-red-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-casino-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            href="/guides" 
            className="inline-flex items-center space-x-2 text-casino-400 hover:text-casino-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Guides</span>
          </Link>
        </motion.div>

        {/* Guide Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(guide.difficulty)}`}>
                {guide.difficulty}
              </span>
              <span className="px-3 py-1 bg-casino-500/20 text-casino-300 rounded-full text-sm font-semibold">
                {guide.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              {guide.title}
            </h1>

            <p className="text-xl text-gray-300 mb-6 leading-relaxed">
              {guide.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{guide.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{guide.readTime}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>{views.toLocaleString()} views</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {guide.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Guide Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {guide.content.map((section) => renderSection(section))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-wrap gap-4"
        >
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              isLiked 
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white' 
                : 'bg-gradient-to-r from-casino-600 to-purple-600 text-white hover:from-casino-500 hover:to-purple-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{isLiked ? 'Liked' : 'Like'} ({likes})</span>
          </button>

          <Link 
            href="/guides"
            className="flex items-center space-x-2 bg-gray-800/50 text-gray-300 px-6 py-3 rounded-xl font-semibold hover:bg-gray-700/50 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            <span>More Guides</span>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}