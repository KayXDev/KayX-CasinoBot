import {  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle , MessageFlags } from 'discord.js';
import { logGamblingCommand } from '../util/selectiveLogging.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows all available casino commands.');

export async function execute(interaction, config) {
  const moneda = config?.casino?.moneda || '💰';
  
  // Embed principal del menú
  const mainEmbed = new EmbedBuilder()
    .setTitle('🎰 Casino Bot | Command Center')
    .setColor(0xf39c12)
    .setDescription(`**Welcome to the Ultimate Casino Experience, ${interaction.user.username}!**\n\n🎲 *Your gateway to fortune and excitement awaits*`)
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .setImage('https://i.imgur.com/hMwxvcd.png');

  // Información del bot
  mainEmbed.addFields({
    name: '🤖 Bot Information',
    value: `\`\`\`🎰 Casino Bot v1.0.0\n💰 Currency: ${moneda}\n🎮 Games Available: 10+\n📈 Live Crypto Trading (12 currencies)\n🛠️ Smart Maintenance System\n🏆 Achievement Tracking\n⚡ Always Online\`\`\``,
    inline: false
  });

  // Categories con diseño atractivo
  let categoriesText = '';
  const categories = [
    { emoji: '💰', name: 'Balance & Money', desc: 'Manage your casino funds & rewards' },
    { emoji: '🎮', name: 'Casino Games', desc: 'Classic games of chance' },
    { emoji: '🎲', name: 'Special Games', desc: 'Lottery & scratch cards' },
    { emoji: '📈', name: 'Crypto Exchange', desc: 'Trade cryptocurrencies with real market simulation' },
    { emoji: '👥', name: 'Friends System', desc: 'Social features & connections' },
    { emoji: '🛒', name: 'Shop & Items', desc: 'Purchase premium items' },
    { emoji: '⚙️', name: 'Admin Tools', desc: 'Server management' },
    { emoji: '🛠️', name: 'Maintenance System', desc: 'Bot maintenance and status management' },
    { emoji: '💡', name: 'Tips & Info', desc: 'Help and strategies' }
  ];

  categories.forEach(cat => {
    categoriesText += `${cat.emoji} **${cat.name}**\n`;
    categoriesText += `   └ *${cat.desc}*\n\n`;
  });

  mainEmbed.addFields({
    name: '📋 Command Categories',
    value: categoriesText,
    inline: false
  });

  mainEmbed.addFields({
    name: '🎯 Quick Start Guide',
    value: '```• Use the dropdown menu below to explore commands\n• Start with /balance to check your funds\n• Use /daily and /weekly for free rewards\n• Try /crypto-market to see live cryptocurrency prices\n• Check /maintenance action:Ver Estado for system status\n• Explore /shop for premium items and advantages```',
    inline: false
  });

  mainEmbed.addFields({
    name: '✨ Premium Features',
    value: '```📈 Live Crypto Trading with Technical Analysis\n�️ Advanced Maintenance System with Auto-Timers\n� Achievement System with Public Announcements\n📰 AI-Generated Market News & Sentiment Analysis\n👥 Friends System with Social Features\n🎰 Fair Gaming with Comprehensive Statistics```',
    inline: false
  });

  mainEmbed.setFooter({ 
    text: 'Casino Bot • Select a category from the dropdown to explore commands!',
    iconURL: 'https://i.imgur.com/hMwxvcd.png'
  });
  mainEmbed.setTimestamp();

  // Crear el menú de selección
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help-category')
    .setPlaceholder('🎰 Choose a command category...')
    .addOptions([
      {
        label: 'Balance & Money',
        description: 'Manage funds, deposits, withdrawals, rewards and transfers',
        value: 'balance',
        emoji: '💰'
      },
      {
        label: 'Casino Games', 
        description: 'Blackjack, Roulette, Slots, Dice, and more',
        value: 'games',
        emoji: '🎮'
      },
      {
        label: 'Special Games',
        description: 'Daily lottery, scratch cards, and unique games',
        value: 'special',
        emoji: '🎲'
      },
      {
        label: 'Crypto Exchange',
        description: 'Trade Bitcoin, Ethereum, BNB & Solana with real prices',
        value: 'crypto',
        emoji: '📈'
      },
      {
        label: 'Friends System',
        description: 'Add friends, manage requests, and social features',
        value: 'friends',
        emoji: '👥'
      },
      {
        label: 'Shop & Inventory',
        description: 'Purchase items, manage inventory, and effects',
        value: 'shop',
        emoji: '🛒'
      },
      {
        label: 'Admin Tools',
        description: 'Administrative commands for server management',
        value: 'admin',
        emoji: '⚙️'
      },
      {
        label: 'Maintenance System',
        description: 'Bot maintenance and system status management',
        value: 'maintenance',
        emoji: '🛠️'
      },
      {
        label: 'Tips & Strategies',
        description: 'Gaming tips, strategies, and helpful information',
        value: 'tips',
        emoji: '💡'
      }
    ]);

  const actionRow = new ActionRowBuilder().addComponents(selectMenu);

  // Log gambling command
  await logGamblingCommand(interaction.user, 'help', {
    action: 'main_menu_opened'
  });

  // Crear collector para manejar interacciones
  const response = await interaction.reply({
    embeds: [mainEmbed],
    components: [actionRow]
  });

  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async (selectInteraction) => {
    if (selectInteraction.user.id !== interaction.user.id) {
      return selectInteraction.reply({
        content: '❌ Only the user who ran the command can use this menu.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (selectInteraction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(selectInteraction, config, moneda);
    } else if (selectInteraction.isButton()) {
      await handleButtonInteraction(selectInteraction, config, moneda);
    }
  });

  collector.on('end', () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      selectMenu.setDisabled(true).setPlaceholder('⏰ Menu expired - run /help again')
    );
    interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

async function handleSelectMenuInteraction(interaction, config, moneda) {
  const category = interaction.values[0];
  let embed;
  let components = [createBackButton()];

  switch (category) {
    case 'balance':
      embed = createBalanceEmbed(moneda);
      break;
    case 'games':
      embed = createGamesEmbed(moneda);
      break;
    case 'special':
      embed = createSpecialEmbed(moneda);
      break;
    case 'crypto':
      embed = createCryptoEmbed(moneda);
      break;
    case 'friends':
      embed = createFriendsEmbed(moneda);
      break;
    case 'admin':
      embed = createAdminEmbed(moneda);
      break;
    case 'maintenance':
      embed = createMaintenanceEmbed(moneda);
      break;
    case 'shop':
      embed = createShopEmbed(moneda);
      break;
    case 'tips':
      embed = createTipsEmbed(moneda);
      break;
  }

  await interaction.update({ embeds: [embed], components });
}

async function handleButtonInteraction(interaction, config, moneda) {
  if (interaction.customId === 'back-main') {
    // Recrear el embed principal
    const mainEmbed = new EmbedBuilder()
      .setTitle('🎰 Casino Bot | Command Center')
      .setColor(0xf39c12)
      .setDescription(`**Welcome to the Ultimate Casino Experience, ${interaction.user.username}!**\n\n🎲 *Your gateway to fortune and excitement awaits*`)
      .setThumbnail('https://i.imgur.com/0jM0J5h.png')
      .setImage('https://i.imgur.com/hMwxvcd.png');

    mainEmbed.addFields({
      name: '🤖 Bot Information',
      value: `\`\`\`🎰 Casino Bot v1.0.0\n💰 Currency: ${moneda}\n🎮 Games Available: 10+\n📈 Live Crypto Trading (12 currencies)\n⚡ Always Online\`\`\``,
      inline: false
    });

    let categoriesText = '';
    const categories = [
      { emoji: '💰', name: 'Balance & Money', desc: 'Manage your casino funds & rewards' },
      { emoji: '🎮', name: 'Casino Games', desc: 'Classic games of chance' },
      { emoji: '🎲', name: 'Special Games', desc: 'Lottery & scratch cards' },
      { emoji: '�', name: 'Crypto Exchange', desc: 'Trade cryptocurrencies with real market simulation' },
      { emoji: '�👥', name: 'Friends System', desc: 'Social features & connections' },
      { emoji: '🛒', name: 'Shop & Items', desc: 'Purchase premium items' },
      { emoji: '⚙️', name: 'Admin Tools', desc: 'Server management' },
      { emoji: '�️', name: 'Maintenance System', desc: 'Bot maintenance and status management' },
      { emoji: '�💡', name: 'Tips & Info', desc: 'Help and strategies' }
    ];

    categories.forEach(cat => {
      categoriesText += `${cat.emoji} **${cat.name}**\n`;
      categoriesText += `   └ *${cat.desc}*\n\n`;
    });

    mainEmbed.addFields({
      name: '📋 Command Categories',
      value: categoriesText,
      inline: false
    });

    mainEmbed.addFields({
      name: '🎯 Quick Start Guide',
      value: '```• Use the dropdown menu below to explore commands\n• Start with /balance to check your funds\n• Use /daily and /weekly for free rewards\n• Try /shop to buy premium items\n• Play games to earn more money```',
      inline: false
    });

    mainEmbed.addFields({
      name: '✨ Premium Features',
      value: '```✨ Multipliers & Boosts\n🛡️ Bank Protection\n🎁 Daily & Weekly Rewards\n👥 Friends System\n📊 Leaderboards\n🎰 Fair Gaming```',
      inline: false
    });

    mainEmbed.setFooter({ 
      text: 'Casino Bot • Select a category from the dropdown to explore commands!',
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    });
    mainEmbed.setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category')
      .setPlaceholder('🎰 Choose a command category...')
      .addOptions([
        {
          label: 'Balance & Money',
          description: 'Manage funds, deposits, withdrawals, rewards and transfers',
          value: 'balance',
          emoji: '💰'
        },
        {
          label: 'Casino Games', 
          description: 'Blackjack, Roulette, Slots, Dice, and more',
          value: 'games',
          emoji: '🎮'
        },
        {
          label: 'Special Games',
          description: 'Daily lottery, scratch cards, and unique games',
          value: 'special',
          emoji: '🎲'
        },
        {
          label: 'Crypto Exchange',
          description: 'Trade Bitcoin, Ethereum, BNB & Solana with real prices',
          value: 'crypto',
          emoji: '📈'
        },
        {
          label: 'Friends System',
          description: 'Add friends, manage requests, and social features',
          value: 'friends',
          emoji: '👥'
        },
        {
          label: 'Shop & Inventory',
          description: 'Purchase items, manage inventory, and effects',
          value: 'shop',
          emoji: '🛒'
        },
        {
          label: 'Admin Tools',
          description: 'Administrative commands for server management',
          value: 'admin',
          emoji: '⚙️'
        },
        {
          label: 'Maintenance System',
          description: 'Bot maintenance and system status management',
          value: 'maintenance',
          emoji: '🛠️'
        },
        {
          label: 'Tips & Strategies',
          description: 'Gaming tips, strategies, and helpful information',
          value: 'tips',
          emoji: '💡'
        }
      ]);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
      embeds: [mainEmbed],
      components: [actionRow]
    });
  }
}

function createBackButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('back-main')
      .setLabel('🔙 Back to Main Menu')
      .setStyle(ButtonStyle.Secondary)
  );
}

function createBalanceEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('💰 Balance & Money Management')
    .setColor(0x1ABC9C)
    .setDescription('**💳 Complete financial control for your casino experience**\n\n*Master your funds with these powerful money management tools*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '📊 Core Balance Commands',
        value: `\`\`\`yaml
🔍 Balance Check:
   • /balance - View your financial status
   • /balance @user - Check other player's funds

🏦 Bank Operations:
   • /deposit amount - Secure money in bank
   • /withdraw amount - Access banked funds

🎁 Daily Rewards:
   • /daily - Claim daily coin reward (24h cooldown)
   • /weekly - Claim weekly bonus (7 days cooldown)

💸 Transfers & PvP:
   • /give @user amount - Send money safely
   • /rob @user - Risky money grab attempt
   • /robbank [banco] - 🏦 Advanced bank heist system
   
📈 Rankings:
   • /leaderboard - Top casino players\`\`\``,
        inline: false
      },
      {
        name: '🎯 Financial Strategy Guide',
        value: `\`\`\`💡 Pro Tips:
┌─────────────────────────────────┐
│ Hand Money: Available for bets  │
│ Bank Money: Protected storage   │ 
│ Rob Protection: Keep in bank!   │
│ Daily Rewards: Free money!      │
│ Weekly Bonus: Even bigger!      │
└─────────────────────────────────┘\`\`\``,
        inline: true
      },
      {
        name: '⚠️ Risk Management',
        value: `\`\`\`🛡️ Safety First:
┌─────────────────────────────────┐
│ ❌ Rob Failure = Money Loss     │
│ ✅ Bank Storage = 100% Safe     │
│ 🎯 Only Hand Money = Robbable   │
│ 💰 Regular Deposits = Smart     │
│ 🎁 Daily/Weekly = Guaranteed    │
└─────────────────────────────────┘\`\`\``,
        inline: true
      }
    )
    .setFooter({ 
      text: `💰 Currency: ${moneda} • Don't forget your daily and weekly rewards!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createGamesEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('🎮 Casino Games Collection')
    .setColor(0x9B59B6)
    .setDescription('**🎯 Test your luck with classic casino favorites**\n\n*Each game offers unique excitement and winning opportunities*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🃏 Card Games',
        value: `\`\`\`yaml
🎴 Blackjack:
   • /blackjack bet:amount - Beat the dealer to 21
   • Strategic gameplay with hit/stand decisions
   • House edge: ~1% with perfect strategy\`\`\``,
        inline: false
      },
      {
        name: '🎰 Luck-Based Games',
        value: `\`\`\`yaml
🎰 Slot Machine:
   • /tragamonedas bet:amount - Classic slot reels
   • Multiple winning combinations
   • Progressive jackpot opportunities

🎲 Dice Games:
   • /dados bet:amount - Roll for multipliers
   • Simple yet exciting gameplay
   • Various betting strategies

💰 Coin Flip:
   • /coinflip bet:amount - 50/50 chance
   • Heads or tails betting
   • Perfect for quick games\`\`\``,
        inline: false
      },
      {
        name: '🎪 Advanced Games',
        value: `\`\`\`yaml
🎡 Roulette:
   • /ruleta bet:amount - European style wheel
   • Multiple betting options available
   • Red/Black, Odd/Even, Numbers

📈 Crash:
   • /crash bet:amount - Multiplier timing game
   • Cash out before the crash
   • Risk vs reward strategy\`\`\``,
        inline: false
      },
      {
        name: '🏦 Bank Heist System (HIGH RISK)',
        value: `\`\`\`diff
+ /robbank [banco] - Ultimate challenge mode
- Requires 50k+ coins to attempt
- 2 hour cooldown between attempts
- Max 3 attempts per day

🎮 Interactive Minigames:
🧠 Memory games & pattern matching
🧮 Math challenges & timing tests
🎯 Sequence reproduction puzzles

⚠️ Severe Penalties if Caught:
💸 50% money loss + 1 hour jail time
🚫 Cannot use economy commands while jailed

🏪 Local Bank:    25k-75k reward
🏛️ Regional Bank: 50k-150k reward
🏦 National Bank: 100k-500k reward
🏢 Central Bank:  250k-1M reward\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `🎮 Currency: ${moneda} • All games use provably fair algorithms!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createSpecialEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('🎲 Special Games & Events')
    .setColor(0xE74C3C)
    .setDescription('**🎊 Unique gaming experiences beyond traditional casino**\n\n*Special events and limited-time gaming opportunities*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🎫 Lottery System 2.0',
        value: `\`\`\`yaml
🎰 Modern Multi-Type Lottery:
   • /loteria comprar - Buy tickets with chosen numbers
   • /loteria info - View active lottery draws
   • /loteria misboletos - Check your tickets
   • /loteria stats - Numbers & winners statistics
   
🌅 Daily: 5,000 ${moneda} | 📅 Weekly: 15,000 ${moneda} | 🗓️ Monthly: 50,000 ${moneda}
Choose 6 numbers (1-49) • Progressive jackpots • Multiple prize tiers\`\`\``,
        inline: false
      },
      {
        name: '🎴 Scratch Cards',
        value: `\`\`\`yaml
🎨 Instant Win Games:
   • /rasca - Purchase scratch cards
   • Immediate prize reveals
   • Various prize tiers available
   • Quick entertainment option\`\`\``,
        inline: false
      },
      {
        name: '🎪 Special Features',
        value: `\`\`\`💡 Unique Advantages:
┌─────────────────────────────────┐
│ 🎯 Community Participation      │
│ 🏆 Progressive Jackpots         │ 
│ 🕐 Time-Based Events           │
│ 💰 Bonus Prize Multipliers     │
│ 🎨 Visual Interactive Elements │
└─────────────────────────────────┘\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `🎲 Currency: ${moneda} • Special games offer unique winning opportunities!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createCryptoEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('📈 Crypto Exchange & Trading')
    .setColor(0x3498DB)
    .setDescription('**🏛️ Casino Metaverse Exchange - Real cryptocurrency trading simulation**\n\n*Trade 12 different cryptocurrencies including Bitcoin, Ethereum, and top altcoins with realistic 2025 market prices and volatility*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🛒 Core Trading Commands',
        value: `\`\`\`yaml
📊 Main Trading Platform (/crypto):
   • market - Live market prices & 24h changes
   • buy [crypto] [amount] - Purchase cryptocurrency with casino coins
   • sell [crypto] [amount] - Sell crypto holdings (supports "all")
   • portfolio - View holdings with real-time P&L analysis
   • achievements - Check crypto trading achievements & progress

📈 Advanced Analysis Tools:
   • /crypto-analytics [crypto] - Technical analysis with RSI, MACD, Bollinger
   • /crypto-news - Market news, sentiment analysis & alerts
   • /leaderboard-achievements - View crypto achievements rankings\`\`\``,
        inline: false
      },
      {
        name: '🪙 Supported Cryptocurrencies (Live 2025 Prices)',
        value: `\`\`\`yaml
🟠 BTC - Bitcoin (~$98,500) [LEGENDARY] - Digital gold standard
💙 ETH - Ethereum (~$3,450) [LEGENDARY] - Smart contracts leader
🟡 BNB - Binance Coin (~$720) [EPIC] - Exchange ecosystem token
💜 SOL - Solana (~$245) [EPIC] - High-performance blockchain
🔵 ADA - Cardano (~$1.15) [RARE] - Academic blockchain research
🟣 MATIC - Polygon (~$0.85) [RARE] - Ethereum scaling solution\`\`\``,
        inline: false
      },
      {
        name: '🪙 More Cryptocurrencies Available',
        value: `\`\`\`yaml
🔗 LINK - Chainlink (~$22.40) [EPIC] - Decentralized oracle network
🔺 AVAX - Avalanche (~$42.80) [EPIC] - Fast consensus protocol
🔴 DOT - Polkadot (~$8.95) [RARE] - Cross-chain interoperability
⚛️ ATOM - Cosmos (~$7.25) [RARE] - Internet of blockchains hub
⚫ ALGO - Algorand (~$0.42) [COMMON] - Pure proof-of-stake
💧 XRP - Ripple (~$2.15) [RARE] - Cross-border payment solution\`\`\``,
        inline: false
      },
      {
        name: '🔥 Advanced Features',
        value: `\`\`\`⚡ Market Engine Features:
┌─────────────────────────────────┐
│ 🕐 Smart Market Hours (9AM-9PM) │
│ 📈 Live Price Updates (30s)     │
│ 🎪 Dynamic Market Events        │
│ 💎 Realistic 2025 Pricing       │
│ 🛡️ Anti-Negative Price System   │
│ 📊 Technical Analysis Suite     │
│ 📰 AI News Generation          │
│ 🏆 Achievement Tracking         │
│ 📢 Price Alert System          │
│ 🎯 Portfolio Analytics         │
└─────────────────────────────────┘\`\`\``,
        inline: true
      },
      {
        name: '💡 Trading Tips',
        value: `\`\`\`🎯 Pro Trading Strategies:
┌─────────────────────────────────┐
│ 📈 Buy Low, Sell High          │
│ 💰 Diversify Your Portfolio     │
│ ⏰ Respect Market Hours         │
│ 📊 Monitor Market Events        │
│ 🎯 Set Trading Limits          │
│ 💎 HODL for Long-Term Gains    │
└─────────────────────────────────┘\`\`\``,
        inline: true
      },
      {
        name: '🏦 Market Schedule',
        value: `\`\`\`🕐 Trading Hours:
• Open: 9:00 AM - 9:00 PM (Madrid Time)
• Closed: Weekends & Holidays
• Status: Check /crypto market

💸 Trading Fees:
• Buy Fee: 0.5%
• Sell Fee: 0.75%
• Min Investment: 500 ${moneda}
• Max Investment: 250,000 ${moneda}\`\`\``,
        inline: false
      },
      {
        name: '🎪 Market Events System',
        value: `\`\`\`🌟 Dynamic Market Events:
┌─────────────────────────────────┐
│ 🐋 Whale Movements              │
│ 📈 Market Pump Events           │
│ 📉 Flash Crash Scenarios        │
│ ⚡ Network Activity Surges      │
│ 📰 Simulated News Impact        │
│ 🎯 Crypto-Specific Events       │
└─────────────────────────────────┘\`\`\``,
        inline: false
      },
      {
        name: '📊 Advanced Analytics & News',
        value: `\`\`\`yaml
🔬 Technical Analysis (/crypto-analytics):
   • RSI (Relative Strength Index) - Overbought/oversold signals
   • MACD (Moving Average Convergence) - Trend momentum  
   • Bollinger Bands - Volatility and support/resistance
   • Clean ASCII charts with trend lines and indicators
   • Real-time calculation based on market data

📰 Market Intelligence (/crypto-news):
   • AI-generated market news based on real events
   • Market sentiment analysis (Fear & Greed Index)
   • Price change notifications and explanations
   • Automated news every 30 minutes during market hours
   • Context-aware news based on actual market movements

🏆 Achievement System (Active):
   • First Steps - Make your first crypto purchase
   • Diamond Hands 💎 - Hold positions for 7+ days
   • Whale Status 🐋 - Portfolio exceeds 100k coins
   • Perfect Timing ⏰ - Buy during market crashes
   • Day Trader 📈 - Complete 10+ trades in one day
   • Portfolio Master 🎯 - Own all 4 cryptocurrencies\`\`\``,
        inline: false
      },
      {
        name: '💡 Command Usage Examples',
        value: `\`\`\`yaml
🎯 Quick Start Trading:
   1. /crypto market                    # Check current prices
   2. /crypto buy crypto:BTC amount:1000   # Invest 1000 coins in Bitcoin
   3. /crypto portfolio                 # Check your investments
   4. /crypto sell crypto:BTC amount:all   # Sell everything when profitable

📊 Advanced Analysis:
   • /crypto-analytics crypto:ETH       # Get ETH technical indicators
   • /crypto-news                       # Read latest market sentiment
   
🏦 Portfolio Management:
   • /crypto achievements               # Track your trading milestones
   • /crypto portfolio                  # Monitor real-time P&L
   
💰 Trading Limits & Fees:
   • Minimum Investment: 500 ${moneda}
   • Maximum Investment: 250,000 ${moneda}
   • Buy Fee: 0.5% | Sell Fee: 0.75%
   • Trading Cooldown: 30 seconds between trades\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `📈 Currency: ${moneda} • Professional crypto trading simulation with real market behavior!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createFriendsEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('👥 Friends System & Social Features')
    .setColor(0x1abc9c)
    .setDescription('**🤝 Build your casino community and connect with other players**\n\n*Enhance your gaming experience through social connections*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🎯 Core Friend Commands',
        value: `\`\`\`yaml
🤝 Friend Management:
   • /addfriend @user - Send friend request
   • /friends - View friends system
   • /removefriend @user - Remove a friend

📋 Friends System Features:
   • View all your friends list
   • Manage pending requests
   • Check sent requests status
   • Real-time friend statistics
   • Interactive navigation menu\`\`\``,
        inline: false
      },
      {
        name: '📊 Social Benefits',
        value: `\`\`\`💡 Friend Advantages:
┌─────────────────────────────────┐
│ 📈 Special Friend Rankings      │
│ 🎮 Future: Group Activities     │
│ 💰 Future: Friend Bonuses       │
│ 🏆 Future: Challenges & Duels   │
│ 📱 Public Friend Notifications  │
└─────────────────────────────────┘\`\`\``,
        inline: true
      },
      {
        name: '🔧 System Features',
        value: `\`\`\`⚙️ Advanced Options:
┌─────────────────────────────────┐
│ 🔔 Public Request Notifications │
│ ✅ Exclusive Button Controls    │
│ 📊 Friendship Statistics       │
│ 🗓️ Friend Since Date Display   │
│ 🔄 Real-time Status Updates    │
└─────────────────────────────────┘\`\`\``,
        inline: true
      },
      {
        name: '🎮 How to Get Started',
        value: `\`\`\`🚀 Quick Start Guide:
1️⃣ Use /addfriend @someone to send your first request
2️⃣ Wait for them to accept via the public notification
3️⃣ Use /friends to manage your growing network
4️⃣ Check friend stats and build your community
5️⃣ Future: Enjoy exclusive friend benefits!\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `👥 Currency: ${moneda} • Build your casino network and enhance your experience!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createAdminEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('⚙️ Administrator Control Panel')
    .setColor(0xFF5722)
    .setDescription('**👑 Comprehensive administrative tools for complete casino management**\n\n*Server administrators have full control over economy, systems, and user management*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '💰 Economy & User Management',
        value: `\`\`\`yaml
👑 Individual Economy Control:
   • /admin-give [user] [amount] [hand/bank] - Gift money to specific user
   • /admin-resetbalance [user] - Reset user's complete balance to zero
   • /admin-inventory [user] - View user's complete inventory
   • /admin-removeitems [user] - Remove specific items from inventory

🎁 Mass Economy Operations:
   • /admin-giveall [amount] [reason] - Distribute money to ALL users
   • Confirmation required for server-wide changes
   • Affects entire registered user base

⏰ Cooldown & Reward Management:
   • /admin-resetcooldown [user] [daily/weekly] - Reset user rewards
   • Instantly restore daily/weekly collection eligibility
   • Perfect for events and compensation\`\`\``,
        inline: false
      },
      {
        name: '🔒 Security & Jail System',
        value: `\`\`\`yaml
🏛️ Robbank Jail Administration (/admin-jail):
   • release [user] - Free user from jail immediately
   • status [user] - Check specific user's jail status
   • list - View all currently jailed users
   • Auto role assignment/removal system integration

�️ Usage Examples:
   • /admin-jail release @user - Emergency jail release
   • /admin-jail status @user - Verify punishment status
   • /admin-jail list - Monitor jail population\`\`\``,
        inline: false
      },
      {
        name: '📈 Crypto System Administration',
        value: `\`\`\`yaml
🔧 Crypto Engine Management (/admin-crypto-setup):
   • setup - Initialize complete crypto trading system
   • reset-prices - Restore all cryptos to config.yml values
   • update-prices - Sync database with current market engine

📰 News & Alerts System (/admin-crypto-news):
   • configure [news_channel] [alerts_channel] - Set notification channels
   • test-news - Generate test news announcement
   • test-alert - Send test price alert
   • status - Check system configuration status

🔍 Price Management:
   • /admin-check-prices - Verify database price integrity
   • /admin-reset-prices - Reset all crypto prices to base values
   • Automatic synchronization with market engine\`\`\``,
        inline: false
      },
      {
        name: '🎫 Lottery & Game Administration',
        value: `\`\`\`yaml
🎰 Lottery Pool Management:
   • /loteria anadirpozo [amount] [tipo] - Boost jackpot pools
   • Choose type: daily/weekly/monthly lottery systems
   • Add custom amounts for special events
   • Encourage participation with larger prizes

🎲 Draw Controls:
   • /loteria terminar [tipo] - Force immediate lottery draw
   • Admin confirmation required for manual draws
   • Instant winner selection and prize distribution
   • Perfect for special events and celebrations\`\`\``,
        inline: false
      },
      {
        name: '⚠️ Admin Command Guidelines',
        value: `\`\`\`yaml
🔒 Security Requirements:
   • Administrator permission required for ALL admin commands
   • Commands have immediate effect - no undo functionality
   • Use with caution - affects live economy and user data

💡 Best Practices:
   • Test crypto system commands in development first
   • Use /admin-jail list before releases to check fairness
   • Announce /admin-giveall events in advance
   • Keep backups before major system resets
   • Monitor economy balance after mass distributions

🎯 Command Categories Summary:
   • 11 total admin commands covering all bot systems
   • Economy, Security, Crypto, Lottery, and User Management
   • Real-time effect on live casino operations\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `👑 Currency: ${moneda} • 11 Admin Commands • Full casino system control • Use responsibly!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createMaintenanceEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('🛠️ Maintenance System Control')
    .setColor(0xFF9800)
    .setDescription('**🔧 Advanced bot maintenance and system monitoring**\n\n*Keep the casino running smoothly with comprehensive maintenance tools*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🛠️ Core Maintenance Commands',
        value: `\`\`\`yaml
🔧 Activation Control:
   • /maintenance action:🔧 Activar Mantenimiento
     ├ reason: Why maintenance is needed
     ├ duration: Auto-disable timer (minutes)
     └ Blocks non-essential commands

✅ Deactivation Control:
   • /maintenance action:✅ Desactivar Mantenimiento
     ├ Manual override of active maintenance
     ├ Immediate restoration of all commands
     └ Sends completion notification

📊 Status Monitoring:
   • /maintenance action:📊 Ver Estado
     ├ Available to ALL users (not admin-only)
     ├ Shows current maintenance status
     ├ Displays remaining time if active
     └ System operational information\`\`\``,
        inline: false
      },
      {
        name: '👑 Administrative Controls',
        value: `\`\`\`yaml
👥 User Management:
   • /maintenance action:👥 Agregar Admin
     └ Grant maintenance control permissions

👤 Permission Control:
   • /maintenance action:👤 Remover Admin
     └ Revoke maintenance management access

📋 Admin Oversight:
   • /maintenance action:📋 Listar Admins
     └ View all users with maintenance permissions

📢 Notification Setup:
   • /maintenance action:📢 Configurar Canal
     ├ channel: Specific notification channel
     ├ Auto-validates permissions and access
     └ Sends test message for confirmation\`\`\``,
        inline: false
      },
      {
        name: '⚡ Advanced Features',
        value: `\`\`\`yaml
🤖 Auto-Disable System:
   ├ Automatic maintenance termination
   ├ Restart-persistent timer system  
   ├ Detects expired maintenance on startup
   └ Smart recovery from unexpected shutdowns

📢 Smart Notifications:
   ├ Configurable notification channels
   ├ Automatic channel detection fallback
   ├ Rich embed status messages
   └ Both manual and automatic completion alerts

🔒 Emergency Commands:
   ├ Configurable command whitelist
   ├ Essential functions remain available
   ├ Help and maintenance always accessible
   └ Customizable emergency command list

📊 Configuration Sources:
   ├ config.yml - Global maintenance settings
   ├ maintenance.json - Runtime state persistence
   ├ Discord permissions - Admin validation
   └ Dynamic channel configuration\`\`\``,
        inline: false
      },
      {
        name: '💡 Usage Examples & Best Practices',
        value: `\`\`\`yaml
🎯 Quick Maintenance (1 hour):
   /maintenance action:🔧 Activar reason:"Database update" duration:60

📢 Configure Notifications:
   /maintenance action:📢 Configurar channel:#maintenance-alerts

👀 Check Status (Anyone can use):
   /maintenance action:📊 Ver Estado

✨ Emergency Stop:
   /maintenance action:✅ Desactivar Mantenimiento

🔐 Pro Tips:
   ├ Configure notification channel before first use
   ├ Use descriptive reasons for user clarity
   ├ Set realistic duration estimates
   ├ Test notification system regularly
   └ Emergency commands always work during maintenance\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `🛠️ Currency: ${moneda} • Maintenance system ensures optimal bot performance • Plan ahead!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createShopEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('🛒 Shop & Inventory System')
    .setColor(0x3498DB)
    .setDescription('**🎁 Premium items and powerful effects for enhanced gameplay**\n\n*Invest your winnings in game-changing advantages*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '🛍️ Core Shop Commands',
        value: `\`\`\`yaml
🛒 Shopping:
   • /shop - Browse available items
   • /inventory - View owned items
   • /cooldowns - Check purchase cooldowns
   • /effects - Manage active effects

💎 Premium Items Available:
   • Multiplier boosts
   • Protection items
   • Special advantages
   • Cosmetic upgrades\`\`\``,
        inline: false
      },
      {
        name: '💡 Item Categories',
        value: `\`\`\`💰 Investment Tips:
┌─────────────────────────────────┐
│ 🎯 Multipliers = More Winnings │
│ 🛡️ Protection = Risk Safety    │
│ ⚡ Boosts = Temporary Power     │
│ 🎨 Cosmetics = Style Points    │
└─────────────────────────────────┘\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `🛒 Currency: ${moneda} • Smart purchases enhance your casino experience!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}

function createTipsEmbed(moneda) {
  return new EmbedBuilder()
    .setTitle('💡 Tips & Strategies Guide')
    .setColor(0xF39C12)
    .setDescription('**🎯 Master the casino with proven strategies and expert tips**\n\n*Learn from the pros and maximize your winning potential*')
    .setThumbnail('https://i.imgur.com/0jM0J5h.png')
    .addFields(
      {
        name: '📈 Money Management',
        value: `\`\`\`💰 Smart Financial Habits:
┌─────────────────────────────────┐
│ 🏦 Always keep money in bank    │
│ 💸 Only bet what you can lose   │
│ 🎯 Set betting limits daily     │
│ 📊 Track wins and losses        │
│ 💎 Reinvest winnings wisely     │
└─────────────────────────────────┘\`\`\``,
        inline: false
      },
      {
        name: '🎮 Game Strategies',
        value: `\`\`\`🎯 Pro Gaming Tips:
┌─────────────────────────────────┐
│ 🃏 Blackjack: Learn basic cards │
│ 🎰 Slots: Manage bet sizes      │
│ 🎲 Dice: Understand odds        │
│ 💰 Coinflip: 50/50 quick plays  │
│ ⏰ Daily: Consistent play wins  │
└─────────────────────────────────┘\`\`\``,
        inline: false
      },
      {
        name: '🚀 Success Mindset',
        value: `\`\`\`🏆 Winner's Psychology:
• Set realistic daily goals
• Take breaks after big losses
• Celebrate small wins
• Learn from each game
• Stay disciplined and patient
• Remember: It's entertainment first!\`\`\``,
        inline: false
      }
    )
    .setFooter({ 
      text: `💡 Currency: ${moneda} • Knowledge + Discipline = Long-term Success!`,
      iconURL: 'https://i.imgur.com/hMwxvcd.png'
    })
    .setTimestamp();
}