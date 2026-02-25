# Casino Bot Website

Una página web moderna y exclusiva para el Casino Bot de Discord con autenticación Discord OAuth y dashboard de usuario completo.

> **Nota**: Este es un bot privado. Los usuarios deben tener acceso autorizado para usar el bot y la página web.

## 🚀 Características

- **Autenticación Discord OAuth**: Login seguro con Discord
- **Dashboard de Usuario**: Similar a Dank Memer con estadísticas detalladas
- **Navegación Completa**: Home, Commands, Changelog, Guides, Blogs, Store, Discovery
- **Responsive Design**: Funciona perfectamente en móvil y desktop
- **Integración con Base de Datos**: Conecta con la base de datos del bot
- **Estadísticas en Tiempo Real**: Balance, crypto, juegos, amigos, logros

## 📋 Páginas Incluidas

- **Home**: Página principal con características del bot
- **Commands**: Lista completa de comandos con búsqueda y filtros
- **Dashboard**: Panel de usuario con estadísticas detalladas
- **Changelog**: Historial de actualizaciones
- **Guides**: Guías de uso del bot
- **Blogs**: Artículos y noticias
- **Store**: Tienda virtual
- **Discovery**: Explorar servidores

## 🛠️ Tecnologías Utilizadas

- **Next.js 14**: Framework de React con App Router
- **TypeScript**: Tipado estático para mejor desarrollo
- **Tailwind CSS**: Framework de CSS utilitario
- **NextAuth.js**: Autenticación con Discord OAuth
- **Framer Motion**: Animaciones fluidas
- **Lucide React**: Iconos modernos
- **MySQL**: Base de datos (mismo que el bot)
- **Prisma**: ORM para base de datos (opcional)

## 🔧 Instalación

1. **Instalar dependencias**:
```bash
cd website
npm install
```

2. **Configurar variables de entorno** (`.env.local`):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-clave-secreta-aqui

# Discord OAuth
DISCORD_CLIENT_ID=tu-discord-client-id
DISCORD_CLIENT_SECRET=tu-discord-client-secret

# Base de datos (misma que el bot)
DATABASE_URL="mysql://root:@localhost:3306/casino_bot"

# Token del bot (opcional, para funciones adicionales)
BOT_TOKEN=tu-bot-token
```

3. **Configurar Discord Application**:
   - Ve a https://discord.com/developers/applications
   - Crea una nueva aplicación o usa la existente del bot
   - En OAuth2 → Redirects, añade: `http://localhost:3000/api/auth/callback/discord`
   - Copia el Client ID y Client Secret

4. **Ejecutar en desarrollo**:
```bash
npm run dev
```

5. **Acceder a la aplicación**:
   - Abre http://localhost:3000 en tu navegador

## 📊 Dashboard Features

El dashboard incluye:

### 💰 Balance Overview
- Dinero en mano
- Dinero en banco
- Valor total (incluyendo crypto)

### 🎮 Gaming Statistics
- Total de juegos jugados
- Ganancias totales
- Tasa de victoria
- Juego favorito

### 📈 Crypto Portfolio
- Valor total del portfolio
- Profit/Loss total
- Holdings detallados por cryptocurrency

### 👥 Social & Ranking
- Número de amigos
- Referidos
- Ranking en el servidor

### 🏆 Achievements
- Logros recientes desbloqueados
- Descripción y fecha

### ⚡ Quick Actions
- Botones rápidos para comandos comunes
- Ver balance, store, crypto trading, logros

## 🔗 Integración con el Bot

La web se conecta directamente con la base de datos del bot para mostrar:

- Estadísticas reales del usuario
- Balance actualizado
- Portfolio de crypto
- Historial de juegos
- Lista de amigos
- Logros desbloqueados

## 🎨 Personalización

### Colores y Tema
Los colores están definidos en `tailwind.config.js`:
```javascript
colors: {
  'casino': {
    50: '#fff7ed',
    // ... más colores
    900: '#7c2d12',
  },
  'discord': {
    // ... colores de Discord
  }
}
```

### Modificar Dashboard
El dashboard está en `app/dashboard/page.tsx` y es completamente personalizable.

## 🚀 Producción

1. **Build de producción**:
```bash
npm run build
```

2. **Deploy**:
   - Vercel (recomendado para Next.js)
   - Netlify
   - Servidor propio con PM2

3. **Variables de entorno en producción**:
   - Actualiza `NEXTAUTH_URL` con tu dominio
   - Usa secretos seguros
   - Configura la base de datos de producción

## 📝 Estructura del Proyecto

```
website/
├── app/                    # App Router de Next.js
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard de usuario
│   ├── commands/          # Página de comandos
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   └── providers.tsx      # Providers de React
├── components/            # Componentes reutilizables
│   ├── Navbar.tsx         # Navegación principal
│   └── Footer.tsx         # Pie de página
├── public/                # Archivos estáticos
├── .env.local            # Variables de entorno
├── next.config.js        # Configuración de Next.js
├── tailwind.config.js    # Configuración de Tailwind
└── tsconfig.json         # Configuración de TypeScript
```

## 🔒 Seguridad

- Autenticación segura con Discord OAuth
- Variables de entorno para datos sensibles
- Validación de permisos en API routes
- Sanitización de datos de usuario

## 🐛 Troubleshooting

### Error de conexión a base de datos
- Verifica que la base de datos del bot esté ejecutándose
- Revisa las credenciales en `.env.local`
- Asegúrate que las tablas necesarias existen

### Error de autenticación Discord
- Verifica el Client ID y Secret
- Confirma la URL de redirect en Discord Developer Portal
- Revisa que `NEXTAUTH_SECRET` esté configurado

### Problemas de desarrollo
- Ejecuta `npm install` para instalar dependencias
- Limpia cache con `rm -rf .next && npm run dev`
- Verifica que no hay conflictos de puerto

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de consola
2. Verifica la configuración de variables de entorno  
3. Consulta la documentación de Next.js y NextAuth.js
4. Contacta al desarrollador del bot

---

¡Disfruta tu nueva página web para Casino Bot! 🎰✨