# Sistema de Reviews - Casino Bot

## 📖 Descripción

Sistema completo de reviews que permite a los usuarios registrados escribir, leer y dar "me gusta" a las reviews del Casino Bot.

## ✨ Características

- ⭐ Sistema de calificación de 1-5 estrellas
- 📝 Reviews con título y descripción detallada
- 👍 Sistema de "likes" en reviews
- 📊 Estadísticas en tiempo real (promedio, distribución)
- 🔒 Solo usuarios autenticados pueden escribir reviews
- 📱 Diseño completamente responsivo
- 🎨 Interfaz moderna con animaciones

## 🗄️ Estructura de Base de Datos

### Tabla `reviews`
```sql
- id (INT, PRIMARY KEY)
- user_id (VARCHAR(50), UNIQUE)
- rating (INT, 1-5)
- title (VARCHAR(100))
- content (TEXT)
- likes (INT, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabla `review_likes`
```sql
- id (INT, PRIMARY KEY)
- review_id (INT, FK)
- user_id (VARCHAR(50))
- created_at (TIMESTAMP)
- UNIQUE(review_id, user_id)
```

## 🚀 Instalación

### 1. Ejecutar Migración de Base de Datos

```bash
# Opción 1: Usar el script automático
cd casino-discord-bot
node scripts/setup-reviews.js

# Opción 2: Ejecutar manualmente el SQL
# Importar el archivo: schemas/reviews_system_migration.sql
```

### 2. Variables de Entorno

Asegúrate de tener configuradas las variables de base de datos:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=casino_bot
```

### 3. Verificar Funcionamiento

1. Navega a `/reviews`
2. Inicia sesión con Discord
3. Escribe tu primera review
4. ¡Disfruta del sistema!

## 📋 API Endpoints

### `GET /api/reviews`
- Obtiene todas las reviews
- Incluye información del usuario que escribió cada review
- Si está autenticado, incluye si el usuario actual dio "like"

### `POST /api/reviews`
- Crea una nueva review (requiere autenticación)
- Validación: rating 1-5, título max 100 chars, contenido max 500 chars
- Un usuario solo puede tener una review

### `POST /api/reviews/[id]/like`
- Toggle "like" en una review (requiere autenticación)
- Actualiza contador de likes automáticamente

## 🎨 Componentes UI

### Página Principal (`/reviews`)
- **Header**: Título y descripción
- **Sidebar**: Estadísticas y filtros
- **Lista de Reviews**: Reviews paginadas con interacciones
- **Formulario**: Para crear nuevas reviews (usuarios logueados)

### Características de UX
- **Animaciones**: Framer Motion para transiciones suaves
- **Filtros**: Por calificación (todas, 5⭐, 4⭐, etc.)
- **Responsive**: Funciona perfectamente en móvil y desktop
- **Feedback Visual**: Estados de carga, hover effects, etc.

## 🔧 Funcionalidades Técnicas

### Validaciones
- **Cliente**: Validación en tiempo real de formularios
- **Servidor**: Validación exhaustiva en API endpoints
- **Base de Datos**: Constraints y tipos de datos correctos

### Seguridad
- **Autenticación**: Solo usuarios logueados pueden escribir/dar like
- **Rate Limiting**: Una review por usuario
- **Sanitización**: Validación de longitud de contenido

### Performance
- **Queries Optimizadas**: Joins eficientes con índices
- **Lazy Loading**: Componentes se cargan según necesidad
- **Caching**: Datos se mantienen en estado local

## 🎯 Integración con Homepage

La homepage ahora muestra:
- **Testimonios Destacados**: Muestra reviews reales
- **Enlace Directo**: Botón para ir a escribir reviews
- **Vista Previa**: Cards interactivas que enlazan a `/reviews`

## 🐛 Solución de Problemas

### Error: "Cannot find module auth"
- Verificar que `app/api/auth/[...nextauth]/route.ts` exista
- Comprobar imports relativos en APIs

### Error: "Missing script dev"
- Ejecutar desde directorio `/website/`
- Verificar `package.json` tenga script "dev"

### Reviews no aparecen
- Verificar conexión a base de datos
- Comprobar que las tablas estén creadas
- Revisar logs del servidor para errores

## 📈 Métricas y Analytics

El sistema incluye:
- **Promedio de Calificaciones**: Calculado dinámicamente
- **Distribución por Estrellas**: Gráfico visual con barras
- **Total de Reviews**: Contador en tiempo real
- **Engagement**: Tracking de likes por review

## 🎨 Personalización

### Colores y Tema
Los colores siguen el sistema de diseño del bot:
- **Primary**: `casino-600` to `purple-600`
- **Accent**: `yellow-400` (estrellas)
- **Background**: Gradientes oscuros con blur effects

### Animaciones
Usando Framer Motion para:
- Entrada escalonada de reviews
- Hover effects en cards
- Transiciones suaves entre estados
- Loading states animados

¡El sistema de reviews está listo para usar! 🎉