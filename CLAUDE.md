# Slackish Frontend

Single-page web client for Slackish, a lightweight Slack-like team messaging app. React 18 + TypeScript (strict) + Vite 7, with `react-router-dom` v6. No state library and no UI library.

The backend is a separate service (expected at `http://localhost:8080`). This repo is only the browser client.

## Commands

```bash
npm install
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc (type-check, noEmit) && vite build
npm run preview   # serve the production build
npm test          # Vitest (jsdom + Testing Library)
npm run test:coverage  # also writes coverage/lcov.info for SonarQube
```

- Requires Node 20.19+ (Vite 7). CI uses Node 22.
- `vite.config.ts` proxies `/api/*` to `http://localhost:8080`. All API calls use relative `/api/...` paths, so there is no base-URL config.
- Tests use Vitest + Testing Library, colocated as `*.test.ts(x)`; shared fixtures and setup live in `src/test/`. CI runs `npm run build` and `npm run test:coverage`, and SonarQube enforces 80% coverage on new code. There is no lint or format tooling.

## Architecture

```
main.tsx
 └─ BrowserRouter
     └─ AuthProvider            (src/auth.tsx: session context)
         └─ App                 (src/App.tsx: route table and auth gating)
             ├─ /login    → routes/Login
             ├─ /signup   → routes/Signup
             ├─ /forgot   → routes/Forgot
             └─ /*        → routes/Workspace   (only when logged in)
                              ├─ components/Sidebar
                              └─ <main> renders ONE of:
                                   ChannelView | DmView | MembersPanel | AdminPanel
                              plus modals: InviteModal, CreateWorkspaceModal
```

### Layers

1. **API client** (`src/api/client.ts`)
   - Holds all TypeScript domain types (`User`, `Workspace`, `Channel`, `Message`, `Member`, `Conversation`, `DmMessage`, `ConversationDetail`, `Invitation`, `Attachment`).
   - Holds a private `req<T>(method, path, body?)` wrapper around `fetch`. It uses `credentials: 'include'` (cookie session), JSON-encodes bodies, and throws `Error(json.error ?? "HTTP <status>")` on non-2xx responses. Empty response bodies resolve to `undefined`. A sibling `upload<T>(path, file)` sends one file as multipart `file` (no explicit Content-Type) and shares the same response/error parsing.
   - Exports a single `api` object with one typed method per endpoint, grouped as auth, workspaces, channels, messages, dms, invitations, and admin.
   - Components never call `fetch` directly. New endpoints belong here.

2. **Auth** (`src/auth.tsx`)
   - `AuthProvider` calls `api.me()` on mount to restore the session, and exposes `{ user, loading, login, register, logout }`.
   - `useAuth()` is the hook consumers use.
   - Auth is cookie-based and server-managed. The client stores no tokens.

3. **Routing and gating** (`src/App.tsx`)
   - Shows a loading state until `api.me()` settles.
   - `/login` and `/signup` redirect to `/` when a user exists. `/*` redirects to `/login` when there is no user. `/forgot` is always reachable.
   - Routing is coarse. Everything after login lives under `/*` in `Workspace`, and the selected channel, DM, or panel is **component state, not URL state**. Deep links and the back button do not reach a channel.

4. **Workspace shell** (`src/routes/Workspace.tsx`)
   - The container component. It owns `workspaces`, `current` workspace, `channels`, `conversations`, the active `view`, and modal visibility.
   - `view` is a discriminated union: `{kind:'channel'|'dm', id} | {kind:'members'} | {kind:'admin'}`.
   - On mount it loads workspaces and selects the first. When `current` changes it loads that workspace's channels and the user's DMs, then resets `view`. It auto-selects the first channel when no view is set.
   - Data flows down as props, and events flow up through callbacks (`onSelectView`, `onChannelsChanged`, and so on).

5. **Components** (`src/components/`)
   - Presentational/feature components. Each fetches its own data via `api` in a `useEffect` and keeps local state (`useState`).
   - `Sidebar`: workspace switcher, channel list and create form (with private toggle), DM list, and nav to Members, Admin, and Invite. It also shows the current user and the sign-out button.
   - `ChannelView`: top-level messages (replies are filtered out by `parentId === null`), composer, a thread side panel with its own composer, and an "open message by id" lookup.
   - `DmView`: loads a conversation with its messages, and sends DMs.
   - `Composer`: shared message composer (channel, thread, DM). Posts the message, then uploads each picked file to the returned message id (10 MB client-side check). On partial upload failure it keeps the failed files and shows an error.
   - `AttachmentList`: renders a message's attachments (download links, image thumbnails, delete for the uploader). Also exports `fetchAttachments` and `formatSize`.
   - `MembersPanel`: member table with a role dropdown (OWNER/ADMIN/MEMBER). Calls `updateMemberRole`.
   - `AdminPanel`: audit log table and a full workspace JSON export. Uses the `/api/admin/...` endpoints.
   - `InviteModal`: create an invitation (email and role) and list pending invitations, including each token.
   - `CreateWorkspaceModal`: name plus optional slug. The slug defaults to the kebab-cased name.

6. **Styling** (`src/styles/app.css`): one global stylesheet with plain class names (`.app`, `.sidebar`, `.main`, `.msg`, `.composer`, `.modal`, `.panel`, `.table`, and so on). There are no CSS modules or CSS-in-JS.

## Functional overview

| Feature | Where | Backend endpoints |
|---|---|---|
| Sign in, sign up, sign out, session restore | `Login`, `Signup`, `auth.tsx` | `/api/auth/{login,register,logout,me}` |
| Password reset (request token, then set new password) | `Forgot` | `/api/auth/{forgot,reset}` |
| Multiple workspaces, create and switch | `Workspace`, `Sidebar`, `CreateWorkspaceModal` | `/api/workspaces` |
| Public and private channels, create | `Sidebar` | `/api/workspaces/:id/channels` |
| Channel messaging and threaded replies | `ChannelView` | `/api/channels/:id/messages`, `/api/messages/:id[/thread]` |
| Message attachments (upload, list, download, delete) | `Composer`, `AttachmentList` | `/api/messages/:id/attachments`, `/api/dms/messages/:id/attachments`, `/api/attachments/:id` |
| 1:1 direct messages | `DmView`, `Sidebar` | `/api/dms[/:id[/messages]]` |
| Member list and role changes | `MembersPanel` | `/api/workspaces/:id/members[/:userId]` |
| Invitations | `InviteModal` | `/api/workspaces/:id/invitations`, `/api/invitations/accept` |
| Admin: audit log, data export, change role, deactivate member | `AdminPanel` | `/api/admin/workspaces/:id/...` |

Roles are the strings `OWNER`, `ADMIN`, and `MEMBER`. IDs are numeric. Timestamps are ISO strings, rendered with `toLocaleString()`.

## Conventions

- Function components with hooks only. Default-export one component per file, named after the file.
- Local `useState` plus `useEffect` for data loading. After a mutation, call the `load()` function again (re-fetch) instead of updating state optimistically.
- Errors: the API client throws `Error`. Components catch and show `e.message` in a `<div className="error">`. Some components skip the catch (see quirks below).
- Terse single-line style: no semicolons, single quotes, 2-space indent, and compact inline handlers.
- `tsconfig` is `strict`, with `noUnusedLocals` and `noUnusedParameters` off.
- When adding a feature: add the type and endpoint to `src/api/client.ts`, build the component in `src/components/`, and wire it in `Workspace.tsx` (add a `View` variant if it is a main-pane view).

## Known quirks and gaps

Observations from reading the code. Verify before relying on them, and fix them deliberately.

- **No real-time updates.** There is no WebSocket or polling. Messages refresh only on send or when the view changes.
- **Pre-filled login.** `Login.tsx` defaults to `alice@acme.io` / `password123` (dev convenience, which should not ship).
- **Forgot flow.** The backend returns `resetToken` in the response and the UI shows it directly, so the token is never delivered out of band.
- **Invitation tokens** are displayed in `InviteModal`'s table. `acceptInvite` exists in the API client but no UI uses it.
- **Authorization is not enforced in the client.** The Admin console and Members role editor show for every user, and the invite modal offers OWNER for everyone. Enforcement relies entirely on the backend.
- **Unhandled errors.** Several async handlers (`send` in `InviteModal`, plus `Forgot` and `AdminPanel.doExport`) have no try/catch, so failures become unhandled rejections with no UI feedback.
- **Unused or partial APIs.** `api.changeRole`, `api.deactivateMember`, `api.joinChannel`, `api.deleteChannel`, and `api.createConversation` have no UI. DMs are labeled "Conversation #id" rather than by participant. Messages show "user <id>" instead of names. MFA appears in the `User` type (`mfaEnabled`) but has no UI.
- **Stale-closure and dependency issues.** Some `useEffect` hooks omit dependencies (for example, `Workspace` runs `loadWorkspaces` on mount and reads `current` inside it). `ChannelView` ignores its `workspace` prop.
- **Typing looseness.** `AuthContext` is created with `null as any`. Admin audit and export use `any`. `Sidebar.onSelectView` is typed `(v: any)` and does not reuse the `View` type from `Workspace.tsx`.
- **Native dialogs.** The message lookup uses `alert()`; attachment delete uses `confirm()`.
- **Attachments are fetched per message.** The backend doesn't embed attachments in message responses, so every load issues one list request per message (N+1).
