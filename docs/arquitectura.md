# Arquitectura del Proyecto — FINAL_AGILE

**Estado:** En desarrollo
**Última actualización:** Julio 2026

## 1. Contexto

Proyecto universitario desarrollado bajo metodología ágil (sprints cortos), con el siguiente stack tecnológico:

- **Frontend:** React (Vite)
- **Backend:** Next.js (API Routes / App Router)
- **Base de datos:** Supabase (PostgreSQL + Auth + Storage)
- **Despliegue:** Netlify

## 2. Estilo Arquitectónico

**Jamstack + BaaS (Backend as a Service)**, donde Next.js actúa como capa intermedia de API entre el frontend en React y Supabase.

```
Cliente (React) → API (Next.js) → Base de datos (Supabase) → Despliegue (Netlify)
```

## 3. Estructura de Carpetas

```
proyecto-universitario/
│
├── frontend/          → Proyecto React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/ o views/
│   │   ├── context/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── package.json
│   └── .env
│
├── backend/            → Proyecto Next.js
│   ├── app/
│   │   └── api/
│   ├── lib/
│   ├── middleware/
│   ├── utils/
│   ├── package.json
│   └── .env.local
│
├── database/
│   └── supabase/
│       ├── migrations/
│       ├── seed/
│       └── policies/
│
├── docs/
│   ├── arquitectura.md
│   ├── manual-usuario.md
│   └── historias-de-usuario.md
│
├── .gitignore
├── netlify.toml
└── README.md
```

## 4. Configuración del Frontend (React + Vite)

Inicializado con:

```
npm create vite@latest . -- --template react
```

**Opciones seleccionadas durante la creación:**
- Conflicto de carpeta no vacía → **Remove existing files and continue**
- Linter → **ESLint**
- Instalar con npm y arrancar ahora → **Yes**

**Dependencias adicionales a instalar:**

```
npm install axios @supabase/supabase-js react-router-dom
```

| Dependencia | Uso |
|---|---|
| `axios` | Consumo de la API de Next.js |
| `@supabase/supabase-js` | Conexión directa a Supabase (auth/sesión desde el cliente) |
| `react-router-dom` | Manejo de rutas/vistas |

## 5. Configuración del Backend (Next.js)

Inicializado con:

```
npx create-next-app@latest .
```

**Opciones seleccionadas durante la creación:**

| Pregunta | Respuesta |
|---|---|
| ¿Usar configuración recomendada? | No, customize settings |
| TypeScript | No |
| Linter | ESLint |
| React Compiler | No |
| Tailwind CSS | No |
| Directorio `src/` | No |
| App Router | Sí |
| Alias de importación personalizado | No |
| Incluir AGENTS.md | No |

**Razonamiento de las decisiones:**
- Sin Tailwind: el backend no renderiza interfaz, solo expone API.
- Sin TypeScript: mantener consistencia con el frontend en JavaScript plano.
- App Router: es el enfoque actual recomendado por Next.js y el usado en esta arquitectura.
- Sin AGENTS.md: la documentación del proyecto se maneja manualmente en `docs/`.

**Dependencia adicional a instalar:**

```
npm install @supabase/supabase-js
```

**Variables de entorno (`.env.local`):**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 6. Base de Datos (Supabase)

- PostgreSQL como motor relacional.
- Auth integrado para registro/login de usuarios.
- Row Level Security (RLS) como capa adicional de seguridad a nivel de fila.
- Storage disponible si el proyecto requiere manejo de archivos.

## 7. Control de Versiones (.gitignore)

Se definió un `.gitignore` en la raíz del proyecto para excluir archivos que no deben subirse al repositorio:

- **Dependencias:** `node_modules/` (frontend y backend)
- **Variables de entorno:** `.env`, `.env.*` (excepto `.env.example`), incluyendo los específicos de `frontend/` y `backend/` (`.env.local`, `.env.development.local`, `.env.production.local`, `.env.test.local`)
- **Logs:** `logs/`, `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- **Build:** `dist/`, `build/`, `.next/`, `out/`, `coverage/`
- **Cache:** `.cache/`, `.parcel-cache/`, `.vite/`, `.eslintcache`
- **Sistema operativo:** `.DS_Store`, `Thumbs.db`
- **IDE:** `.vscode/`, `.idea/` (con excepción de `.vscode/extensions.json` y `.vscode/settings.json` si se comparten configuraciones de equipo)
- **Archivos temporales:** `*.tmp`, `*.temp`, `*.swp`
- **Supabase local:** `.supabase/`

Esto asegura que las claves de Supabase, los módulos instalados y los archivos de build no se versionen en el repositorio.

## 8. Despliegue (Netlify)

- Build y deploy automático conectado al repositorio Git.
- Variables de entorno configuradas en el panel de Netlify (claves de Supabase).
- Previews automáticos por rama/PR.
- Configuración definida en `netlify.toml`.

## 9. Organización Ágil (Sprints)

| Sprint | Objetivo |
|---|---|
| 1 | Setup del repo, estructura de carpetas, conexión Next.js–Supabase, despliegue inicial en Netlify |
| 2 | Autenticación (registro/login) y modelo de datos base |
| 3 | CRUD principal del dominio del proyecto |
| 4 | Reglas de permisos (RLS), validaciones y manejo de errores |
| 5 | Pulido de UI, pruebas y documentación final |

## 10. Estado Actual del Proyecto

- [x] Definición de arquitectura general
- [x] Definición de estructura de carpetas
- [x] Frontend inicializado con Vite + React + ESLint
- [x] Backend inicializado con Next.js (JavaScript, App Router, ESLint, sin Tailwind)
- [x] Configuración de `.gitignore`
- [ ] Instalación de `@supabase/supabase-js` en frontend y backend
- [ ] Creación del archivo de conexión `supabaseClient`
- [ ] Configuración de variables de entorno
- [ ] Configuración de `netlify.toml` y despliegue inicial

## 11. Próximos Pasos

1. Instalar dependencias de Supabase en ambos proyectos.
2. Crear el cliente de conexión a Supabase en `backend/lib/`.
3. Configurar variables de entorno (`.env` / `.env.local`).
4. Definir el primer endpoint de prueba en `backend/app/api/`.
5. Conectar el frontend con el primer endpoint del backend.