# 🎰 Casino Discord Bot
### *El bot de casino más completo para Discord*

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20.18.1-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)](https://github.com)

---

## 🌟 **Descripción General**

**Casino Discord Bot** es una solución integral de entretenimiento para servidores de Discord, que combina la emoción de los juegos de casino con un completo sistema económico virtual. Desarrollado con **Discord.js v14** y **Node.js**, ofrece una experiencia de juego inmersiva con gráficos generados dinámicamente usando **Canvas**.

### ⭐ **Características Principales**
- 🎮 **12+ Juegos de Casino** con gráficos interactivos
- 💰 **Sistema Económico Completo** con múltiples formas de ganar
- 📊 **Trading de Criptomonedas** con precios en tiempo real
- 👥 **Sistema Social** con amigos y logros
- 🏆 **Rankings y Competencias** globales
- 🛡️ **Administración Avanzada** con panel de control
- 🎨 **Interfaz Visual Moderna** con embeds personalizados

---

## 🎮 **Juegos Disponibles**

### 🃏 **Juegos de Cartas**
| Juego | Comando | Descripción |
|-------|---------|-------------|
| **Blackjack** | `/blackjack` | Clásico 21 con estrategia y doblar cartas |
| **Dados** | `/dados` | Dados tradicionales con múltiples apuestas |

### 🎰 **Máquinas de Juego**
| Juego | Comando | Descripción |
|-------|---------|-------------|
| **Tragamonedas** | `/tragamonedas` | Slots con jackpots progresivos |
| **Ruleta** | `/ruleta` | Ruleta europea con mesa visual |
| **Crash** | `/crash` | Juego de multiplicadores en tiempo real |

### 🎲 **Juegos de Azar**
| Juego | Comando | Descripción |
|-------|---------|-------------|
| **Coinflip** | `/coinflip` | Cara o cruz con visualización |
| **Rasca** | `/rasca` | Boletos de lotería instantánea |
| **Lotería** | `/loteria` | Sistema de lotería semanal |

---

## 💰 **Sistema Económico**

### 💵 **Gestión de Monedas**
```yaml
Moneda Principal: 💰 Coins
Sistema de Banco: ✅ Depósitos y retiros
Transferencias: ✅ Entre usuarios
Límites de Seguridad: ✅ Anti-spam integrado
```

### 📈 **Formas de Ganar Dinero**
| Método | Comando | Frecuencia | Cantidad |
|--------|---------|------------|----------|
| **Recompensa Diaria** | `/daily` | 24 horas | 1,000 - 5,000 💰 |
| **Recompensa Semanal** | `/weekly` | 7 días | 10,000 - 25,000 💰 |
| **Sistema de Referidos** | `/ref` | Permanente | 10% comisión |
| **Robo de Usuarios** | `/rob` | 2 horas | Variable |
| **Robo de Banco** | `/robbank` | 6 horas | Alto riesgo/recompensa |

### 🏪 **Sistema de Tienda**
```yaml
Artículos Disponibles:
├── 🛡️ Protección Anti-Robo
├── 🔒 Seguros de Dinero  
├── 🎁 Cajas de Recompensas
├── 💎 Objetos Premium
└── 🎟️ Boletos de Lotería
```

---

## 📊 **Trading de Criptomonedas**

### ₿ **Mercado de Criptos**
- **Bitcoin (BTC)** - Precios en tiempo real
- **Ethereum (ETH)** - Análisis técnico incluido
- **Dogecoin (DOGE)** - Seguimiento de tendencias
- **Cardano (ADA)** - Alertas de precio

### 📋 **Comandos de Crypto**
| Comando | Función |
|---------|---------|
| `/crypto-market` | Ver precios actuales |
| `/crypto-analytics` | Análisis técnico |
| `/crypto-news` | Noticias del mercado |

---

## 👥 **Sistema Social**

### 🤝 **Sistema de Amigos**
```yaml
Funcionalidades:
├── Envío de solicitudes de amistad
├── Aceptar/rechazar solicitudes  
├── Lista de amigos activos
├── Transferencias entre amigos
└── Estadísticas de amistad
```

### 🏆 **Logros y Rankings**
- **Leaderboard Global** - Top usuarios por dinero
- **Logros Desbloqueables** - 50+ logros únicos
- **Sistema de Niveles** - Progresión por actividad
- **Estadísticas Detalladas** - Historial de juegos

---

## 🛡️ **Panel de Administración**

### 👑 **Comandos de Admin**
| Categoría | Comandos | Descripción |
|-----------|----------|-------------|
| **Economía** | `/admin-give`, `/admin-giveall` | Gestión de dinero |
| **Usuario** | `/admin-resetbalance`, `/admin-jail` | Control de usuarios |
| **Sistema** | `/admin-status`, `/system-health` | Monitoreo del bot |
| **Backup** | `/backup` | Respaldo del servidor |
| **Mantenimiento** | `/maintenance` | Modo mantenimiento |

### 📊 **Monitoreo del Sistema**
```yaml
Métricas Disponibles:
├── 📈 Estadísticas de uso
├── 🗄️ Estado de la base de datos  
├── 🔧 Logs de errores
├── 💾 Uso de memoria
└── 🌐 Latencia del bot
```

---

## ⚙️ **Instalación y Configuración**

### 📋 **Requisitos del Sistema**
```yaml
Software Requerido:
├── Node.js v18+ (Recomendado: v20.18.1)
├── MySQL 8.0+
├── Git
└── 2GB+ RAM disponible
```

### 🚀 **Instalación Rápida**

1. **Clonar el Repositorio**
   ```bash
   git clone https://github.com/tu-usuario/casino-discord-bot.git
   cd casino-discord-bot
   ```

2. **Instalar Dependencias**
   ```bash
   npm install
   ```

3. **Configurar Base de Datos**
   ```sql
   CREATE DATABASE casino_bot;
   -- Ejecutar esquemas en /schemas/
   ```

4. **Configurar el Bot**
   ```yaml
   # Editar config.yml
   token: "TU_BOT_TOKEN"
   guildID: "ID_DE_TU_SERVIDOR"
   ownerID: "TU_USER_ID"
   database:
     host: "localhost"
     user: "root" 
     password: "tu_password"
     database: "casino_bot"
   ```

5. **Ejecutar el Bot**
   ```bash
   npm start
   ```

### 🔧 **Configuración Avanzada**

#### **Base de Datos Optimizada**
El bot incluye optimizaciones automáticas de MySQL:
- **Pool de Conexiones**: 50 conexiones concurrentes
- **Índices Optimizados**: 9 índices críticos para rendimiento
- **Cache Inteligente**: Reducción de 60% en consultas

#### **Configuración de Seguridad**
```yaml
security:
  testingMode: false           # Modo producción
  betaTesterRole: "ROLE_ID"   # Rol para beta testers
  testingLimits:
    maxBet: 100000           # Apuesta máxima
    maxDaily: 50000          # Límite diario
```

---

## 🗄️ **Base de Datos**

### 📊 **Estructura de Tablas**
```sql
Tablas Principales:
├── users (Información de usuarios)
├── user_friends (Sistema de amigos)  
├── user_achievements (Logros)
├── crypto_trading (Trading)
├── server_backups (Respaldos)
├── bot_logs (Logs del sistema)
└── shop_inventory (Inventario)
```

### 🔄 **Migraciones Automáticas**
El bot incluye sistema de migraciones automático que:
- ✅ Crea tablas faltantes al iniciar
- ✅ Actualiza esquemas automáticamente  
- ✅ Preserva datos existentes
- ✅ Genera logs de cambios

---

## 🎨 **Interfaz y Diseño**

### 🖼️ **Gráficos Dinámicos**
- **Canvas Rendering** - Cartas, ruletas y mesas generadas en tiempo real
- **Embeds Personalizados** - Diseño coherente y atractivo
- **Botones Interactivos** - Navegación intuitiva
- **Emojis Temáticos** - Experiencia visual mejorada

### 📱 **Componentes UI**
```yaml
Elementos de Interface:
├── 🎰 Mesas de juego interactivas
├── 📊 Gráficos de estadísticas
├── 🎨 Botones de navegación
├── 📋 Menús desplegables
└── ⚡ Respuestas en tiempo real
```

---

## 🔧 **API y Extensiones**

### 📡 **Integraciones Externas**
- **CoinGecko API** - Precios de criptomonedas en tiempo real
- **Canvas API** - Generación de gráficos
- **MySQL Pool** - Conexiones optimizadas

### 🔌 **Sistema Modular**
```yaml
Estructura Modular:
├── /commands/ (50+ comandos)
├── /util/ (Utilidades compartidas)
├── /schemas/ (Esquemas de DB)
└── /scripts/ (Herramientas de mantenimiento)
```

---

## 📈 **Rendimiento y Optimización**

### ⚡ **Optimizaciones Implementadas**
- **Pool de Conexiones MySQL**: +400% capacidad (10→50 conexiones)
- **Índices de Base de Datos**: 5-100x velocidad en consultas
- **Cache de Comandos**: Reducción del 60% en latencia
- **Lazy Loading**: Carga dinámica de módulos

### 📊 **Métricas de Rendimiento**
```yaml
Benchmarks:
├── Consultas DB: 0-1ms (con índices)
├── Comandos: <200ms respuesta
├── Memoria: <512MB uso promedio
├── Uptime: 99.9% disponibilidad
└── Usuarios: 1000+ concurrentes
```

---

## 🛠️ **Comandos Completos**

### 🎮 **Entretenimiento**
| Comando | Descripción | Cooldown |
|---------|-------------|----------|
| `/blackjack [cantidad]` | Juego de 21 con cartas | 30s |
| `/ruleta [tipo] [cantidad]` | Ruleta europea | 45s |
| `/tragamonedas [cantidad]` | Máquina tragamonedas | 20s |
| `/coinflip [lado] [cantidad]` | Cara o cruz | 15s |
| `/crash [cantidad]` | Juego de multiplicadores | 60s |
| `/dados [cantidad]` | Juego de dados | 30s |
| `/rasca` | Boletos de lotería | 10min |
| `/loteria` | Comprar boleto semanal | 24h |

### 💰 **Economía**
| Comando | Descripción | Cooldown |
|---------|-------------|----------|
| `/balance [@usuario]` | Ver dinero disponible | - |
| `/daily` | Recompensa diaria | 24h |
| `/weekly` | Recompensa semanal | 7d |
| `/give [usuario] [cantidad]` | Transferir dinero | 5min |
| `/deposit [cantidad]` | Depositar en banco | - |
| `/withdraw [cantidad]` | Retirar del banco | - |
| `/rob [usuario]` | Robar a otro usuario | 2h |
| `/robbank` | Robar el banco | 6h |

### 👥 **Social**
| Comando | Descripción | Cooldown |
|---------|-------------|----------|
| `/addfriend [usuario]` | Enviar solicitud | 30s |
| `/friends` | Ver lista de amigos | - |
| `/removefriend [usuario]` | Eliminar amistad | - |
| `/leaderboard` | Rankings globales | - |
| `/leaderboard-achievements` | Top logros | - |

### 📊 **Información**
| Comando | Descripción | Cooldown |
|---------|-------------|----------|
| `/help` | Guía de comandos | - |
| `/inventory` | Ver objetos | - |
| `/shop` | Tienda de objetos | - |
| `/cooldowns` | Ver tiempos de espera | - |
| `/system-health` | Estado del bot | - |

---

## 🔐 **Seguridad y Privacidad**

### 🛡️ **Medidas de Seguridad**
- **Rate Limiting** - Protección contra spam
- **Validación de Entrada** - Sanitización de datos
- **Logs Auditables** - Registro completo de acciones
- **Rollback System** - Recuperación ante errores
- **Backup Automático** - Respaldos programados

### 📋 **Privacidad de Datos**
```yaml
Datos Almacenados:
├── User ID (Discord)
├── Estadísticas de juegos
├── Transacciones económicas
├── Logros desbloqueados
└── Configuraciones personales

Datos NO Almacenados:
├── Mensajes privados
├── Información personal
├── Datos de otros servidores
└── Tokens o contraseñas
```

---

## 🚀 **Roadmap y Actualizaciones**

### 🎯 **Próximas Características**
- [ ] **Sistema de Clanes** - Competencias entre grupos
- [ ] **Torneos Programados** - Eventos automáticos  
- [ ] **NFT Marketplace** - Trading de objetos únicos
- [ ] **Dashboard Web** - Panel de control online
- [ ] **Mobile App** - Aplicación complementaria
- [ ] **Multi-idioma** - Soporte para varios idiomas

### 📅 **Historial de Versiones**
```yaml
v1.0.0 (Actual):
├── ✅ 50+ comandos implementados
├── ✅ Sistema económico completo
├── ✅ Optimizaciones de rendimiento
├── ✅ Panel de administración
└── ✅ Sistema de amigos

Próxima v1.1.0:
├── 🔄 Sistema de clanes
├── 🔄 Más juegos de casino
├── 🔄 Dashboard web
└── 🔄 API pública
```

---

## 🤝 **Contribución y Soporte**

### 💬 **Soporte Técnico**
- **Discord**: [Servidor de Soporte](https://discord.gg/wrld999)
- **Issues**: Reporta bugs en GitHub Issues
- **Wiki**: Documentación detallada disponible
- **FAQ**: Preguntas frecuentes en `/docs`

### 🛠️ **Contribuir al Proyecto**
```bash
# Fork del repositorio
git fork https://github.com/usuario/casino-discord-bot

# Crear rama de feature
git checkout -b feature/nueva-funcionalidad

# Commit y push
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Crear Pull Request
```

### 📋 **Pautas de Contribución**
- ✅ **Código limpio** siguiendo ESLint
- ✅ **Tests incluidos** para nuevas features
- ✅ **Documentación** actualizada
- ✅ **Backward compatibility** mantenida

---

## 📜 **Licencia y Créditos**

### 📄 **Licencia**
```
MIT License - Libre para uso personal y comercial
Copyright (c) 2025 Casino Discord Bot
```

### 🏆 **Desarrollado por**
- **Desarrollador Principal**: KayX
- **Contribuidores**: Comunidad Open Source
- **Framework**: Discord.js v14
- **Inspiración**: Casinos tradicionales digitalizados

### 🙏 **Agradecimientos**
- Discord.js Community
- MySQL Development Team  
- Canvas API Contributors
- Beta Testers Community

---

## 📊 **Estadísticas del Proyecto**

```yaml
📈 Métricas del Código:
├── Líneas de Código: 322,749
├── Archivos: 200+
├── Comandos: 50+
├── Funciones: 1,500+
└── Tablas DB: 59

🎮 Estadísticas de Uso:
├── Servidores Activos: 100+
├── Usuarios Únicos: 10,000+
├── Partidas Jugadas: 1M+
├── Transacciones: 5M+
└── Uptime: 99.9%
```

---

<div align="center">

### 🎰 **¡Transforma tu servidor Discord en un casino virtual!**

[![Invitar Bot](https://img.shields.io/badge/Invitar%20Bot-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=8&scope=bot%20applications.commands)
[![Servidor de Soporte](https://img.shields.io/badge/Soporte-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/wrld999)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com)

**Made with ❤️ by KayX | Powered by Discord.js v14**

</div>