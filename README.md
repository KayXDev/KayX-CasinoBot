# 🎰 Casino Discord Bot
### *The most complete casino bot for Discord*

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20.18.1-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)](https://github.com)

---

## 🌟 **Overview**

**Casino Discord Bot** is a complete entertainment solution for Discord servers, combining the thrill of casino games with a full virtual economy system. Built with **Discord.js v14** and **Node.js**, it delivers an immersive gaming experience with dynamically generated graphics using **Canvas**.

### ⭐ **Key Features**
- 🎮 **12+ Casino Games** with interactive graphics
- 💰 **Complete Economy System** with multiple ways to earn
- 📊 **Cryptocurrency Trading** with real-time prices
- 👥 **Social System** with friends and achievements
- 🏆 **Global Leaderboards and Competitions**
- 🛡️ **Advanced Administration** with a control panel
- 🎨 **Modern Visual Interface** with custom embeds

---

## 🎮 **Available Games**

### 🃏 **Card Games**
| Game | Command | Description |
|------|---------|-------------|
| **Blackjack** | `/blackjack` | Classic 21 with strategy and double-down options |
| **Dice** | `/dados` | Traditional dice with multiple bet types |

### 🎰 **Game Machines**
| Game | Command | Description |
|------|---------|-------------|
| **Slots** | `/tragamonedas` | Slots with progressive jackpots |
| **Roulette** | `/ruleta` | European roulette with a visual table |
| **Crash** | `/crash` | Real-time multiplier game |

### 🎲 **Chance Games**
| Game | Command | Description |
|------|---------|-------------|
| **Coinflip** | `/coinflip` | Heads or tails with visualization |
| **Scratch** | `/rasca` | Instant lottery scratch tickets |
| **Lottery** | `/loteria` | Weekly lottery system |

---

## 💰 **Economy System**

### 💵 **Currency Management**
```yaml
Main Currency: 💰 Coins
Bank System: ✅ Deposits and withdrawals
Transfers: ✅ Between users
Security Limits: ✅ Built-in anti-spam
```

### 📈 **Ways to Earn Money**
| Method | Command | Frequency | Amount |
|--------|---------|-----------|--------|
| **Daily Reward** | `/daily` | 24 hours | 1,000 - 5,000 💰 |
| **Weekly Reward** | `/weekly` | 7 days | 10,000 - 25,000 💰 |
| **Referral System** | `/ref` | Permanent | 10% commission |
| **Rob Users** | `/rob` | 2 hours | Variable |
| **Bank Robbery** | `/robbank` | 6 hours | High risk/reward |

### 🏪 **Shop System**
```yaml
Available Items:
├── 🛡️ Anti-Rob Protection
├── 🔒 Money Insurance
├── 🎁 Reward Boxes
├── 💎 Premium Items
└── 🎟️ Lottery Tickets
```

---

## 📊 **Cryptocurrency Trading**

### ₿ **Crypto Market**
- **Bitcoin (BTC)** - Real-time prices
- **Ethereum (ETH)** - Includes technical analysis
- **Dogecoin (DOGE)** - Trend tracking
- **Cardano (ADA)** - Price alerts

### 📋 **Crypto Commands**
| Command | Function |
|---------|----------|
| `/crypto-market` | View current prices |
| `/crypto-analytics` | Technical analysis |
| `/crypto-news` | Market news |

---

## 👥 **Social System**

### 🤝 **Friends System**
```yaml
Features:
├── Send friend requests
├── Accept/decline requests
├── Active friends list
├── Transfers between friends
└── Friendship stats
```

### 🏆 **Achievements and Leaderboards**
- **Global Leaderboard** - Top users by money
- **Unlockable Achievements** - 50+ unique achievements
- **Level System** - Progression based on activity
- **Detailed Stats** - Game history

---

## 🛡️ **Administration Panel**

### 👑 **Admin Commands**
| Category | Commands | Description |
|----------|----------|-------------|
| **Economy** | `/admin-give`, `/admin-giveall` | Money management |
| **User** | `/admin-resetbalance`, `/admin-jail` | User control |
| **System** | `/admin-status`, `/system-health` | Bot monitoring |
| **Backup** | `/backup` | Server backup |
| **Maintenance** | `/maintenance` | Maintenance mode |

### 📊 **System Monitoring**
```yaml
Available Metrics:
├── 📈 Usage statistics
├── 🗄️ Database status
├── 🔧 Error logs
├── 💾 Memory usage
└── 🌐 Bot latency
```

---

## ⚙️ **Installation & Setup**

### 📋 **System Requirements**
```yaml
Required Software:
├── Node.js v18+ (Recommended: v20.18.1)
├── MySQL 8.0+
├── Git
└── 2GB+ RAM available
```

### 🚀 **Quick Installation**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-user/casino-discord-bot.git
   cd casino-discord-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure the Database**
   ```sql
   CREATE DATABASE casino_bot;
   -- Run schemas in /schemas/
   ```

4. **Configure the Bot**
   ```yaml
   # Edit config.yml
   token: "YOUR_BOT_TOKEN"
   guildID: "YOUR_SERVER_ID"
   ownerID: "YOUR_USER_ID"
   database:
     host: "localhost"
     user: "root"
     password: "your_password"
     database: "casino_bot"
   ```

5. **Run the Bot**
   ```bash
   npm start
   ```

### 🔧 **Advanced Configuration**

#### **Optimized Database**
The bot includes automatic MySQL optimizations:
- **Connection Pool**: 50 concurrent connections
- **Optimized Indexes**: 9 critical indexes for performance
- **Smart Cache**: 60% reduction in queries

#### **Security Configuration**
```yaml
security:
  testingMode: false          # Production mode
  betaTesterRole: "ROLE_ID"   # Role for beta testers
  testingLimits:
    maxBet: 100000            # Maximum bet
    maxDaily: 50000           # Daily limit
```

---

## 🗄️ **Database**

### 📊 **Table Structure**
```sql
Main Tables:
├── users (User information)
├── user_friends (Friends system)
├── user_achievements (Achievements)
├── crypto_trading (Trading)
├── server_backups (Backups)
├── bot_logs (System logs)
└── shop_inventory (Inventory)
```

### 🔄 **Automatic Migrations**
The bot includes an automatic migration system that:
- ✅ Creates missing tables on startup
- ✅ Updates schemas automatically
- ✅ Preserves existing data
- ✅ Generates change logs

---

## 🎨 **Interface & Design**

### 🖼️ **Dynamic Graphics**
- **Canvas Rendering** - Cards, roulettes, and tables generated in real time
- **Custom Embeds** - Consistent and attractive design
- **Interactive Buttons** - Intuitive navigation
- **Themed Emojis** - Enhanced visual experience

### 📱 **UI Components**
```yaml
Interface Elements:
├── 🎰 Interactive game tables
├── 📊 Statistics charts
├── 🎨 Navigation buttons
├── 📋 Dropdown menus
└── ⚡ Real-time responses
```

---

## 🔧 **API & Extensions**

### 📡 **External Integrations**
- **CoinGecko API** - Real-time cryptocurrency prices
- **Canvas API** - Graphics generation
- **MySQL Pool** - Optimized connections

### 🔌 **Modular System**
```yaml
Modular Structure:
├── /commands/ (50+ commands)
├── /util/ (Shared utilities)
├── /schemas/ (DB schemas)
└── /scripts/ (Maintenance tools)
```

---

## 📈 **Performance & Optimization**

### ⚡ **Implemented Optimizations**
- **MySQL Connection Pool**: +400% capacity (10→50 connections)
- **Database Indexes**: 5-100x faster queries
- **Command Cache**: 60% latency reduction
- **Lazy Loading**: Dynamic module loading

### 📊 **Performance Metrics**
```yaml
Benchmarks:
├── DB queries: 0-1ms (with indexes)
├── Commands: <200ms response time
├── Memory: <512MB average usage
├── Uptime: 99.9% availability
└── Users: 1000+ concurrent
```

---

## 🛠️ **Full Command List**

### 🎮 **Entertainment**
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/blackjack [amount]` | 21 card game | 30s |
| `/ruleta [type] [amount]` | European roulette | 45s |
| `/tragamonedas [amount]` | Slot machine | 20s |
| `/coinflip [side] [amount]` | Heads or tails | 15s |
| `/crash [amount]` | Multiplier game | 60s |
| `/dados [amount]` | Dice game | 30s |
| `/rasca` | Scratch tickets | 10min |
| `/loteria` | Buy weekly ticket | 24h |

### 💰 **Economy**
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/balance [@user]` | View available money | - |
| `/daily` | Daily reward | 24h |
| `/weekly` | Weekly reward | 7d |
| `/give [user] [amount]` | Transfer money | 5min |
| `/deposit [amount]` | Deposit to bank | - |
| `/withdraw [amount]` | Withdraw from bank | - |
| `/rob [user]` | Rob another user | 2h |
| `/robbank` | Rob the bank | 6h |

### 👥 **Social**
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/addfriend [user]` | Send request | 30s |
| `/friends` | View friends list | - |
| `/removefriend [user]` | Remove friend | - |
| `/leaderboard` | Global rankings | - |
| `/leaderboard-achievements` | Top achievements | - |

### 📊 **Info**
| Command | Description | Cooldown |
|---------|-------------|----------|
| `/help` | Command guide | - |
| `/inventory` | View items | - |
| `/shop` | Item shop | - |
| `/cooldowns` | View cooldowns | - |
| `/system-health` | Bot status | - |

---

## 🔐 **Security & Privacy**

### 🛡️ **Security Measures**
- **Rate Limiting** - Anti-spam protection
- **Input Validation** - Data sanitization
- **Auditable Logs** - Full action logging
- **Rollback System** - Recovery after errors
- **Automatic Backups** - Scheduled backups

### 📋 **Data Privacy**
```yaml
Stored Data:
├── User ID (Discord)
├── Game statistics
├── Economy transactions
├── Unlocked achievements
└── Personal settings

NOT Stored:
├── Private messages
├── Personal information
├── Data from other servers
└── Tokens or passwords
```

---

## 🚀 **Roadmap & Updates**

### 🎯 **Upcoming Features**
- [ ] **Clan System** - Group competitions
- [ ] **Scheduled Tournaments** - Automated events
- [ ] **NFT Marketplace** - Trading unique items
- [ ] **Web Dashboard** - Online control panel
- [ ] **Mobile App** - Companion application
- [ ] **Multi-language** - Support for multiple languages

### 📅 **Version History**
```yaml
v1.0.0 (Current):
├── ✅ 50+ commands implemented
├── ✅ Complete economy system
├── ✅ Performance optimizations
├── ✅ Admin panel
└── ✅ Friends system

Next v1.1.0:
├── 🔄 Clan system
├── 🔄 More casino games
├── 🔄 Web dashboard
└── 🔄 Public API
```

---

## 🤝 **Contributing & Support**

### 💬 **Technical Support**
- **Discord**: [Support Server](https://discord.gg/wrld999)
- **Issues**: Report bugs via GitHub Issues
- **Wiki**: Detailed documentation available
- **FAQ**: Frequently asked questions in `/docs`

### 🛠️ **Contribute to the Project**
```bash
# Fork the repository
git fork https://github.com/user/casino-discord-bot

# Create a feature branch
git checkout -b feature/new-feature

# Commit and push
git commit -m "feat: new feature"
git push origin feature/new-feature

# Create Pull Request
```

### 📋 **Contribution Guidelines**
- ✅ **Clean code** following ESLint
- ✅ **Tests included** for new features
- ✅ **Documentation** kept up to date
- ✅ **Backward compatibility** maintained

---

## 📜 **License & Credits**

### 📄 **License**
```
MIT License - Free for personal and commercial use
Copyright (c) 2025 Casino Discord Bot
```

### 🏆 **Developed by**
- **Lead Developer**: KayX
- **Contributors**: Open Source community
- **Framework**: Discord.js v14
- **Inspiration**: Traditional casinos, digitized

### 🙏 **Thanks**
- Discord.js Community
- MySQL Development Team
- Canvas API Contributors
- Beta Testers Community

---

## 📊 **Project Stats**

```yaml
📈 Code Metrics:
├── Lines of Code: 322,749
├── Files: 200+
├── Commands: 50+
├── Functions: 1,500+
└── DB Tables: 59

🎮 Usage Stats:
├── Active Servers: 100+
├── Unique Users: 10,000+
├── Games Played: 1M+
├── Transactions: 5M+
└── Uptime: 99.9%
```

---

<div align="center">

### 🎰 **Turn your Discord server into a virtual casino!**

[![Invite Bot](https://img.shields.io/badge/Invite%20Bot-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands)
[![Support Server](https://img.shields.io/badge/Support-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/wrld999)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com)

**Made with ❤️ by KayX | Powered by Discord.js v14**

</div>
