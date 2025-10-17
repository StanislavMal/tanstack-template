# TanStack Template

A modern chat application template built with TanStack Router and AI integration, featuring a clean and responsive interface.

**⚡ View demo:** [https://tanstack-starter.netlify.app/](https://tanstack-starter.netlify.app/)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/StanislavMal/tanstack-template)

## Features

- Powered by AI (configured for DeepSeek API)
- Rich markdown formatting with syntax highlighting
- Customizable system prompts for tailored AI behavior
- Real-time message updates and streaming responses
- Modern UI with Tailwind CSS and Lucide icons
- Conversation management
- API key management
- Responsive design for all devices
- PostgreSQL database integration via Supabase

## Architecture

- **Frontend Framework**: React 19 with Vite
- **Routing**: TanStack Router (file-based routing)
- **State Management**: TanStack Store
- **Database**: Supabase PostgreSQL (primary), Convex (optional)
- **Styling**: Tailwind CSS
- **AI Integration**: DeepSeek API
- **Build Tool**: Vite
- **Deployment**: Netlify

## Project Structure

```
tanstack-template/
├── convex/                  # Optional Convex database configuration
│   ├── _generated/          # Auto-generated Convex types
│   ├── conversations.ts     # Conversation logic
│   ├── schema.ts            # Database schema
│   └── ...
├── public/                  # Static assets
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── LoadingIndicator.tsx
│   │   ├── SettingsDialog.tsx
│   │   ├── Sidebar.tsx
│   │   └── WelcomeScreen.tsx
│   ├── providers/           # Context providers
│   │   └── AuthProvider.tsx
│   ├── routes/              # Route definitions
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Home route
│   │   ├── login.tsx        # Login page
│   │   └── signup.tsx       # Signup page
│   ├── store/               # State management
│   │   ├── store.ts         # Main store
│   │   ├── hooks.ts         # Custom hooks
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   ├── ai.ts            # AI integration logic
│   │   ├── supabase.ts      # Supabase client
│   │   └── index.ts
│   ├── api.ts               # API client configuration
│   ├── router.tsx           # Router setup
│   ├── routeTree.gen.ts     # Auto-generated route tree
│   ├── client.tsx           # Client entry point
│   ├── ssr.tsx              # Server-side rendering
│   ├── sentry.ts            # Error monitoring
│   └── styles.css           # Global styles
├── .env.example             # Environment variables template
├── app.config.ts            # Application configuration
├── netlify.toml             # Netlify configuration
├── postcss.config.ts        # PostCSS configuration
├── renovate.json            # Dependency update configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.js           # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js v20.9+
- (Optional) nvm for Node version management
- DeepSeek API account
- (Optional) Supabase account for database storage
- (Optional) Convex account for alternative database storage

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/StanislavMal/tanstack-template.git
   cd tanstack-template
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your credentials:
   ```
   # Required: Add your DeepSeek API key
   VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
   
   # Optional: Add Supabase URL for database features
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Optional: Add Convex URL if using database features
   VITE_CONVEX_URL=your_convex_deployment_url
   
   # Optional: Add Sentry credentials for error monitoring
   VITE_SENTRY_DSN=your-sentry-dsn-here
   SENTRY_AUTH_TOKEN=your-sentry-auth-token-here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The application will be running at [http://localhost:3000](http://localhost:3000)

### Using Netlify Dev

For full Netlify functionality locally:

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Link your Netlify site (optional):**
   ```bash
   netlify link
   ```

3. **Start with Netlify Dev:**
   ```bash
   netlify dev
   ```
   
   The application will be available at [http://localhost:8888](http://localhost:8888)

## Configuration

### Node.js Version

Ensure you're using Node.js v20.9 or higher:
```bash
node -v
```

Using nvm:
```bash
nvm install 20.9
nvm use 20.9
```

### Environment Variables

Never commit your `.env` file to version control. It's already included in `.gitignore`.

### Database Setup

**Supabase (Primary):**
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add your Supabase URL and anon key to `.env`

**Convex (Optional):**
```bash
npx convex dev
```

## Troubleshooting

- **API Key Issues**: Verify your DeepSeek API key is correctly set in `.env` and that you have sufficient credits.
- **Port Conflicts**: If port 3000 is in use, the server will automatically use the next available port.
- **Missing Dependencies**: Run `npm install` if you encounter module not found errors.

## Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run serve
```

## Styling

This project uses Tailwind CSS for styling. Customize the design by modifying:
- `src/styles.css` - Global styles
- Tailwind configuration in `postcss.config.ts`

## Error Monitoring

Sentry integration is optional. Add your Sentry credentials to enable error tracking.

## Routing

This project uses TanStack Router with file-based routing in `src/routes/`. To add a new route, create a new file in this directory.

The root layout is defined in `src/routes/__root.tsx` and appears on all pages. Use `<Outlet />` to render route content.

## Data Fetching

Use TanStack Router's loader functionality to fetch data before rendering routes.

## State Management

This project uses TanStack Store for local state management in `src/store/`. For persistent storage, it supports both Supabase and optional Convex integration.

## Learn More

- [Netlify Documentation](https://docs.netlify.com/)
- [TanStack Documentation](https://tanstack.com/)
- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Convex Documentation](https://docs.convex.dev/)