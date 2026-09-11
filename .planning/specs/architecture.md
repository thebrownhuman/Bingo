# Architecture: Bingo Party

Companion to `bingo-party.md`. Describes system shape, module boundaries, and
how real-time state flows between server and clients.

## High-Level Diagram

```
┌───────────────────────────┐        ┌───────────────────────────┐
│   Player Device (LAN)     │        │   Admin Device (LAN)      │
│   Angular SPA (browser)   │        │   Angular SPA (browser)   │
└─────────────┬─────────────┘        └─────────────┬─────────────┘
              │ HTTP (auth, initial load)           │
              │ WebSocket (Socket.IO, game events)  │
              ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Node.js + Express + Socket.IO                  │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Auth module   │  │ Party manager  │  │ Game engine        │  │
│  │ (login, JWT)  │  │ (rooms, roster)│  │ (turns, calls, win) │  │
│  └───────────────┘  └────────────────┘  └────────────────────┘  │
│                          │                                       │
│                          ▼                                       │
│                  SQLite (users, seed data)                       │
│                  In-memory store (live party/game state)         │
└─────────────────────────────────────────────────────────────────┘
              ▲ runs on host's laptop, bound to 0.0.0.0
              │ other devices reach it via http://<host-lan-ip>:<port>
```

## Why This Shape

- **Single Node process** hosts both the REST endpoints (login, party creation) and the Socket.IO server (game events) — no need for separate services at this scale (max ~7 concurrent players, single party at a time).
- **SQLite** for durable-but-simple storage: user accounts (seeded once by the admin) need to survive server restarts; nothing else does in v1.
- **In-memory store** (a plain JS object/Map keyed by party id) for live game state: board layouts, called numbers, turn order, ready flags. This is intentionally NOT persisted — if the server restarts mid-game, the game resets. Acceptable for v1 given the single-session, local-only, casual-play scope.
- **Socket.IO over raw WebSocket**: gives room support (one Socket.IO "room" per party) and auto-reconnect handling for free, both of which this app needs directly.

## Module Boundaries (Backend)

```
server/
├── src/
│   ├── auth/
│   │   ├── auth.routes.ts       # POST /login
│   │   ├── auth.service.ts      # verify credentials, issue JWT
│   │   └── auth.middleware.ts   # verify JWT on protected routes/sockets
│   ├── party/
│   │   ├── party.routes.ts      # POST /party (create), POST /party/:code/join
│   │   ├── party.service.ts     # room code generation, roster management
│   │   └── party.store.ts       # in-memory Map<roomCode, PartyState>
│   ├── game/
│   │   ├── game.engine.ts       # turn advancement, call resolution, win check
│   │   ├── game.socket.ts       # Socket.IO event handlers (join_party, set_board, ready, call_number)
│   │   └── board.util.ts        # line-completion checker (rows/cols/diagonals)
│   ├── db/
│   │   ├── schema.sql           # users table
│   │   └── seed.ts              # admin-run script to create player accounts
│   └── index.ts                 # Express + Socket.IO bootstrap
```

## Module Boundaries (Frontend, Angular)

```
client/
├── src/app/
│   ├── auth/
│   │   ├── login/                # login form, calls auth API, stores JWT
│   │   └── auth.guard.ts         # route guard for protected pages
│   ├── lobby/
│   │   ├── create-party/         # admin: create party, get room code
│   │   └── join-party/           # player: enter room code
│   ├── board-setup/
│   │   └── board-setup.component # 5x5 Kendo grid + draggable number tray, Ready button
│   ├── game/
│   │   ├── game-board/           # player's live board, marks, turn indicator
│   │   ├── number-picker/        # enabled only on your turn, disabled numbers already called
│   │   └── called-history/       # shared list of called numbers
│   ├── admin/
│   │   └── admin-dashboard/      # roster, ready status, start/end controls
│   ├── core/
│   │   ├── socket.service.ts     # thin Socket.IO client wrapper, typed events
│   │   └── game-state.service.ts # holds current party/game state, exposed as Angular signals/observables
│   └── shared/                   # Kendo theme setup, shared models/types
```

## Real-Time State Flow (one example: a number gets called)

1. Active player clicks a number in `number-picker`.
2. Client emits `call_number { partyId, number }` over the socket.
3. Server (`game.socket.ts`) validates: is it this player's turn? has this number already been called? → delegates to `game.engine.ts`.
4. `game.engine.ts` updates in-memory `PartyState`: adds number to called list, marks it on every player's board (server-side, since board layouts live server-side to prevent cheating), recomputes each player's completed-line count, checks for a winner.
5. Server broadcasts `number_called` (number + updated called list) to the whole party room, and `turn_changed` (next player id).
6. If a winner is found, server broadcasts `game_over` instead of `turn_changed`.
7. Each client's `game-state.service.ts` receives the broadcast, updates local state, Angular re-renders the board with the new mark applied.

**Why board layouts live server-side, not just client-side**: since calling a number must mark it correctly on every board and the win check happens centrally, the server needs each player's number→cell mapping. This also prevents a player from tampering with their own client to fake a win. Layouts are sent to each client only in a form scoped to that client's own board — never another player's.

## Sequence: Board Setup

1. Player drags numbers into grid cells (client-only state — no need to hit the server on every drag).
2. On drag-drop or manual placement finishing (all 25 cells filled), client enables Ready button.
3. Player clicks Ready → client emits `set_board { partyId, layout }` once (full grid sent as one message) then `player_ready`.
4. Server stores that player's layout in `PartyState`, marks them ready, broadcasts `player_ready` (id only, no layout) to the rest of the party so the admin dashboard / other players can see roster progress.
5. Admin dashboard shows "X/Y ready." Admin clicks Start once satisfied (or once all are ready, per the open question in the spec).

## Win-Check Algorithm (`board.util.ts`)

For a given player's 5x5 layout and the current called-numbers set:
- Build a 5x5 boolean "marked" matrix (true if that cell's number is in the called set).
- Count fully-true rows (max 5), fully-true columns (max 5), and both diagonals (max 2) = up to 12 possible lines.
- `completedLines = countTrueRows + countTrueCols + countTrueDiagonals`.
- Win when `completedLines >= 5`.
- This recomputes fresh on every call (cheap: 5x5 grid, O(1) effectively) — no incremental tracking needed for this scale.

## Deployment / Local Network Notes

- Express server binds to `0.0.0.0` (not `localhost`) so other devices on the same WiFi can reach it via the host machine's LAN IP (e.g., `http://192.168.1.42:3000`).
- Angular build served either as static files from the same Express server (simplest — one process, one port, no CORS headaches) or as a separate dev server during development (`ng serve` with a proxy config to the API during dev only).
- Host's firewall must allow inbound connections on the chosen port — call this out in a README/setup note, not something to automate.
- No HTTPS needed for local/trusted-network play (v1); if this ever needs to work over an untrusted network, revisit auth token handling.

## Disconnect / Auto-Play Handling

- Sockets are keyed by `(userId, partyId)` in `PartyState`, not raw socket id, so a reconnect re-attaches to the same player + board + turn state.
- Server listens for Socket.IO `disconnect`. On disconnect, `game.engine.ts` starts a 30s grace timer for that player.
  - Reconnect (`join_party` again with the same userId) before the timer fires → timer cleared, no effect.
  - Timer fires while it's that player's turn (or their turn arrives before they reconnect) → server calls `pickRandomRemaining(calledNumbers)` (Fisher-Yates shuffle of the not-yet-called numbers array, pop first) and resolves the call exactly like a normal `call_number`, then advances the turn.
- The same `pickRandomRemaining` / Fisher-Yates utility backs both this auto-call path and the setup-phase "Randomize" board button — one shared function in `board.util.ts`, not duplicated logic.
- Admin is a regular player once the game starts (see spec: admin always has party-management privileges, but zero special in-game powers — no kicking, no forced turns). Admin's own disconnect is handled identically to any other player.

## Open Technical Decisions (resolve in plan phase)

- JWT vs. server-side session for auth — JWT is simpler for a stateless Express + Socket.IO combo (attach token to socket handshake for auth).
- Exact Kendo UI components to use for the drag-and-drop grid (Kendo doesn't have a purpose-built "bingo grid" — likely composed from Kendo's Sortable/Drag-and-Drop directives plus a custom CSS grid).
- Whether admin also needs a persistent socket connection during setup/gameplay to drive the dashboard (yes, almost certainly — admin dashboard is real-time too).
- Heartbeat mechanism: Socket.IO's built-in ping/pong timeout vs. an app-level heartbeat event — pick whichever is simpler to wire up reliably during implementation.
