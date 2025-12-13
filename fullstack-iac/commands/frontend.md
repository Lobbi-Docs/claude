---
description: Scaffold React/Vite frontend with TypeScript, routing, state management, and deployment
argument-hint: "[name] --template [basic|dashboard|saas]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Frontend Scaffold

Scaffold a modern React frontend with TypeScript, Vite, routing, state management, and production-ready configurations.

## Usage
```
/zenith:frontend <name> [options]
```

## Arguments
- `name` - Frontend project name (required)

## Options
- `--template <type>` - Project template (default: basic)
  - `basic` - Minimal React setup
  - `dashboard` - Admin dashboard with layout
  - `saas` - SaaS landing + app template
  - `mobile` - Mobile-first responsive
- `--styling <framework>` - Styling framework (default: tailwind)
  - `tailwind` - Tailwind CSS
  - `mui` - Material-UI
  - `chakra` - Chakra UI
  - `styled` - Styled Components
- `--state <manager>` - State management (default: zustand)
  - `zustand` - Zustand
  - `redux` - Redux Toolkit
  - `jotai` - Jotai
  - `context` - React Context
- `--api <base>` - API integration setup
  - Provide backend API URL
- `--auth` - Include authentication flows
- `--i18n` - Add internationalization (react-i18next)

## Project Structure
```
<name>/
├── src/
│   ├── components/       # Reusable components
│   │   ├── common/      # Common UI elements
│   │   └── layout/      # Layout components
│   ├── pages/           # Page components
│   ├── features/        # Feature modules
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── store/           # State management
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   ├── assets/          # Static assets
│   ├── styles/          # Global styles
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Public assets
├── tests/
│   ├── unit/           # Vitest unit tests
│   └── e2e/            # Playwright E2E tests
├── .env.example        # Environment template
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript config
├── tailwind.config.js  # Tailwind config
└── package.json
```

## Features

### Core
- React 18 with TypeScript
- Vite for fast builds
- Hot Module Replacement (HMR)
- TypeScript strict mode
- ESLint + Prettier

### Routing
- React Router v6
- Protected routes
- Lazy loading
- 404 handling

### State Management
- Global state setup
- Async state handling
- Devtools integration
- Persistence (localStorage)

### API Integration
- Axios/Fetch client
- Request/response interceptors
- Error handling
- Loading states
- Type-safe API calls

### Authentication (if enabled)
- Login/Signup flows
- Protected routes
- Token management
- Auto-refresh
- Logout handling

### Styling
- Responsive design
- Dark mode support
- Theme configuration
- Component library
- Icons (lucide-react)

### Testing
- Vitest for unit tests
- React Testing Library
- Playwright for E2E
- Coverage reports

### Build & Deploy
- Production optimization
- Code splitting
- Asset optimization
- Environment variables
- Docker deployment

## Templates

### Basic
- Clean React setup
- Basic routing
- Simple layout

### Dashboard
- Sidebar navigation
- Header/Footer
- Dashboard cards
- Tables & charts
- User profile

### SaaS
- Landing page
- Pricing page
- Authentication
- User dashboard
- Settings panel

## Examples

```bash
# Basic frontend with Tailwind
/zenith:frontend my-app --template basic --styling tailwind

# Dashboard with auth and Redux
/zenith:frontend admin-panel --template dashboard --state redux --auth

# SaaS app with MUI and i18n
/zenith:frontend saas-app --template saas --styling mui --i18n

# Mobile-first with API integration
/zenith:frontend mobile-web --template mobile --api https://api.example.com
```

## Generated Pages

### Basic Template
- `/` - Home page
- `/about` - About page
- `*` - 404 page

### Dashboard Template
- `/` - Dashboard home
- `/analytics` - Analytics view
- `/users` - User management
- `/settings` - Settings page
- `/profile` - User profile

### SaaS Template
- `/` - Landing page
- `/pricing` - Pricing page
- `/login` - Login page
- `/signup` - Signup page
- `/app` - Application dashboard
- `/app/settings` - User settings

## Agent Assignment
This command activates the **zenith-frontend-builder** agent for execution.

## Prerequisites
- Node.js 18+
- npm/yarn/pnpm

## Post-Creation Steps
1. `cd <name>`
2. `npm install` or `yarn install`
3. Configure `.env` from `.env.example`
4. `npm run dev` (start dev server)
5. Access at `http://localhost:5173`

## Development Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
