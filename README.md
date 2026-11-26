# Slackish Frontend

Web client for Slackish, a lightweight team messaging app. Built with React, TypeScript, and Vite.

## Requirements
- Node 20+
- The Slackish backend running on http://localhost:8080

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173. API requests to `/api/*` are proxied to the backend (see `vite.config.ts`).

## Build
```bash
npm run build
```

## Structure
- `src/api/client.ts` — typed API client
- `src/auth.tsx` — session/auth context
- `src/routes/` — login, signup, password reset, and the main workspace view
- `src/components/` — sidebar, channels, DMs, members, admin console, modals
