# OpenAdapter Dashboard

A modern, real-time management dashboard for OpenAdapter built with Next.js 16, Vercel AI SDK, and shadcn/ui.

## Features

### 🎯 4-Tab Interface

1. **Chat** - AI-powered chat interface with Claude via OpenAdapter
2. **Server Activities** - Real-time health monitoring and performance metrics
3. **Logs** - Live server logs with search, filtering, and export capabilities
4. **Settings** - Server configuration and session control

### 🎨 Design

- **Apple HIG Principles** - Clean, intuitive interface following Apple Human Interface Guidelines
- **Dark/Light Mode** - Seamless theme switching with system preference detection
- **Responsive** - Mobile-first design that works on all screen sizes
- **Real-time** - Live updates every 3-5 seconds for health monitoring and logs

### 🔧 Technical Stack

- **Next.js 16** with Turbopack for fast development
- **Vercel AI SDK v6** for AI chat capabilities
- **React 19** with Server Components
- **shadcn/ui** - 48+ accessible components
- **Tailwind CSS v4** for styling
- **TypeScript** for type safety
- **next-auth** for authentication (optional)
- **Drizzle ORM** for database (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- OpenAdapter server running on port 3001

### Installation

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment
cp .env.example .env.local

# Edit .env.local and configure:
# - NEXT_PUBLIC_OPENADAPTER_SERVER_URL (default: http://127.0.0.1:3001)
# - AUTH_SECRET (generate with: openssl rand -base64 32)
# - OPENADAPTER_ADMIN_API_KEY (if server requires authentication)
```

### Development

```bash
# From monorepo root
pnpm dev:dashboard

# Or from this directory
pnpm dev
```

The dashboard will be available at http://localhost:3000

### Production Build

```bash
# From monorepo root
pnpm build

# Or from this directory
pnpm build
pnpm start
```

## Dashboard Tabs

### Chat

AI-powered chat interface that communicates with Claude via the OpenAdapter bridge. Features include:
- Real-time streaming responses
- File attachments
- Message history
- Model selection

### Server Activities

Real-time monitoring dashboard showing:
- **Overall Status** - Server health indicator
- **Browser Status** - Playwright browser connection state
- **Uptime** - How long the server has been running
- **Success Rate** - Percentage of successful requests
- **Request Statistics** - Total, successful, failed, and rate-limited requests

Auto-refreshes every 5 seconds.

### Logs

Live server log viewer with:
- **Real-time Updates** - Auto-refresh every 3 seconds (toggleable)
- **Search** - Filter logs by keyword
- **Download** - Export logs to text file
- **Clear** - Remove all logs
- **Line Numbers** - Easy reference and navigation

### Settings

Server configuration and control panel:
- **Configuration Display** - View current server settings (port, timeouts, thresholds)
- **Session Controls**:
  - **New Chat** - Start a fresh conversation
  - **Recover Session** - Multi-tier session recovery
  - **Restart Browser** - Force browser restart (with confirmation)

## API Client

The dashboard uses a type-safe API client to communicate with OpenAdapter:

```typescript
import { openAdapterClient } from "@/lib/openadapter-client";

// Get server health
const health = await openAdapterClient.getHealth();

// Restart session
const result = await openAdapterClient.restartSession();

// Get logs
const logs = await openAdapterClient.getLogs(100);
```

See `lib/openadapter-client.ts` for all available methods.

## Environment Variables

### Required

- `NEXT_PUBLIC_OPENADAPTER_SERVER_URL` - OpenAdapter server URL (default: http://127.0.0.1:3001)
- `AUTH_SECRET` - Secret for NextAuth.js sessions

### Optional

- `OPENADAPTER_ADMIN_API_KEY` - API key if server requires authentication
- `POSTGRES_URL` - PostgreSQL database URL (for chat history)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage (for file uploads)
- `REDIS_URL` - Redis for rate limiting
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway API key

## Customization

### Theme Colors

Tailwind theme colors are defined in `app/globals.css`. The dashboard uses CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### Adding New Tabs

1. Create a new route in `app/(chat)/your-tab/page.tsx`
2. Add tab to `components/dashboard-tabs.tsx`
3. Create necessary components in `components/`

## Architecture

```
apps/dashboard/
├── app/
│   ├── (auth)/          # Authentication routes
│   ├── (chat)/          # Main dashboard routes
│   │   ├── activities/  # Server Activities tab
│   │   ├── logs/        # Logs tab
│   │   ├── settings/    # Settings tab
│   │   └── page.tsx     # Chat tab (default)
│   ├── layout.tsx       # Root layout with theme
│   └── globals.css      # Global styles
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── dashboard-tabs.tsx
│   ├── server-health-monitor.tsx
│   ├── logs-viewer.tsx
│   └── server-settings.tsx
└── lib/
    ├── openadapter-client.ts  # API client
    └── utils.ts               # Utilities
```

## Development Guidelines

- Follow Apple HIG design principles
- Use shadcn/ui components for consistency
- Maintain type safety with TypeScript
- Keep components focused and reusable
- Use server components where possible
- Add loading states for async operations
- Handle errors gracefully with toast notifications

## Troubleshooting

### Dashboard can't connect to server

- Verify OpenAdapter server is running on port 3001
- Check `NEXT_PUBLIC_OPENADAPTER_SERVER_URL` in `.env.local`
- Look for CORS issues in browser console

### Dark mode not working

- Clear browser cache
- Check that theme script in `app/layout.tsx` is present
- Verify `next-themes` is properly configured

### Components not rendering

- Check console for TypeScript errors
- Verify all dependencies are installed
- Try clearing `.next` cache: `rm -rf .next && pnpm dev`

## Contributing

See the main repository's CONTRIBUTING.md for guidelines.

## License

See the main repository's LICENSE file.
