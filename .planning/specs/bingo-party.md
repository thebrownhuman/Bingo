# Feature Spec: Bingo Party

## Summary

A LAN-hosted, real-time multiplayer Bingo game. The host runs the server on their
own machine; 3-7 pre-registered players join a "party" (room) from their own
devices over the local network. Each player builds their own private 5x5 board
by placing the numbers 1-25 wherever they like, then takes turns calling
numbers. Calling a number marks it on every board simultaneously. First player
to complete 5 lines (row/column/diagonal, any mix) wins.

## Goals

- Let a host stand up a private game session on their own machine, no internet/cloud dependency.
- Let 3-7 players join with pre-issued credentials and play a full round of custom Bingo on their own devices.
- Real-time sync: every board updates the instant any player calls a number.
- Support two roles: **Admin** (creates/manages the party) and **Player**.

## Non-Goals

- No public signup / self-registration flow.
- No persistence beyond a single running session (no game history, leaderboards, or stats — v1 only).
- No matchmaking or multiple concurrent parties on the same server (v1 assumes one active party at a time).
- No mobile app — a mobile-responsive web page reached via LAN IP is sufficient.

## Roles

| Role | Capabilities |
|------|-------------|
| Admin | Logs in, creates a party (generates a room code), sees list of joined players, starts the game once all players are ready, can view aggregate game state (whose turn, scores/lines-completed per player) but not other players' private board layouts, can end/reset the session. |
| Player | Logs in with pre-issued credentials, joins a party via room code, arranges their board during setup, plays turns, sees their own board and the shared "called numbers" history. |

Accounts are pre-created by the admin (seeded directly in the DB / a seed script) — no self-signup screen.

## Game Flow

### 1. Party Creation & Join
- Admin logs in, creates a party → server generates a room code.
- Players log in with their own credentials, enter the room code to join.
- Room supports 3-7 players (configurable, default max 7).
- Admin sees a live roster of joined players.

### 2. Board Setup Phase
- Once a player joins the party, they get a blank 5x5 grid and a bag of numbers 1-25.
- Player places each number into any cell of their own grid (drag-and-drop), one number per cell, until the grid is full.
- No default/shuffled layout is given — placement is entirely manual. (A "Randomize" helper button may auto-fill remaining empty cells to speed up setup, but manual placement is always allowed.)
- Boards are private: no player can see any other player's board layout at any point in the game.
- Player clicks **Ready** once their board is full.
- Once ALL players in the party are ready, the admin starts the game (or the game auto-starts — TBD in plan phase; default: admin clicks Start).
- **Jumbling numbers (swap two placed numbers via drag-and-drop) is only allowed during this setup phase, before clicking Ready.** Once Ready is clicked, that player's layout is locked for the rest of the game.

### 3. Turn Loop
- Server randomly selects the first player to go.
- After that, turn order is strict **round-robin** in a fixed rotation among all joined players (no repeats, no skips, wraps back to the first player after the last).
- On their turn, the active player selects any number (1-25) that has not yet been called, and "calls" it.
- The moment a number is called:
  - It is added to the shared "called numbers" list, visible to everyone.
  - On every player's board, the cell containing that number (wherever it happens to be — every player put it somewhere) is automatically marked/crossed.
- Turn advances to the next player in rotation.
- The UI always shows whose turn it currently is, so players know when to wait vs. when to act.
- A player cannot call a number that's already been called (that option should be visibly disabled/removed from their choices).

### 4. Win Condition
- A "line" = any fully-marked row, column, or diagonal (2 diagonals possible on a 5x5 grid) on a player's own board.
- The first player to complete **5 lines total** (any combination of rows/columns/diagonals) wins immediately.
- When a player wins, the server broadcasts game-over to all clients with the winner's identity; the board locks for everyone.
- Ties are not possible since marks happen instantly and turn order is sequential — the win check runs immediately after each call, ordered by whichever player's turn just completed the number that triggered it. (Edge case: since ALL boards get marked on every call, more than one player could theoretically reach 5 lines from the same single call. Resolve by: whichever player's win condition is evaluated first in a fixed player-list order is declared winner if simultaneous — flag this as a v1 simplification.)

## Data Model (high-level, refine in architecture/plan)

- **User**: id, username, password (hashed), role (admin | player), display name.
- **Party**: id, room code, admin id, status (setup | in_progress | finished), max players, created_at.
- **PartyPlayer**: party id, user id, board layout (5x5 grid → number mapping), ready flag, is_current_turn flag, joined_at.
- **CalledNumber**: party id, number, called_by (user id), called_at, sequence order.
- **GameState** (derived/computed, not necessarily persisted): current turn player, called numbers set, per-player lines-completed count, winner (if any).

## Real-Time Events (high-level)

| Event | Direction | Payload |
|-------|-----------|---------|
| `player_joined` | Server → all in party | player id, display name |
| `player_ready` | Server → all in party | player id |
| `game_started` | Server → all in party | first player's turn |
| `number_called` | Server → all in party | number, called_by, updated called-numbers list |
| `turn_changed` | Server → all in party | next player id |
| `game_over` | Server → all in party | winner id |
| `board_updated` | Server → single player | that player's own board with marks applied (never another player's layout) |

## Resolved Decisions

- **Admin also plays.** The admin account has a player board and takes turns like everyone else. Admin privileges (party management) are always available to them, but once the game starts they have no special in-game powers over other players (e.g. cannot kick anyone mid-game).
- **No kicking players**, ever — not before start, not during. Admin can only create/manage the party shell (start the game), not remove players.
- **Disconnect handling**: server tracks connection health per player (heartbeat/ping over the socket). If a player disconnects:
  - A 30-second grace timer starts for that player.
  - If they reconnect within 30s, play continues normally with no penalty.
  - If the timer elapses while it's their turn (or becomes their turn while still disconnected), the server **auto-calls a random not-yet-called number on their behalf** and advances the turn, so the game is never blocked by one absent player.
  - Random selection for auto-calls uses the same "shuffle the array of remaining numbers, pop one" method as the setup Randomize helper (see below) — one shared utility, not two implementations.
- **Randomize helper (setup phase)**: a "Randomize" button lets a player re-shuffle their entire board in one click. Implementation: take the numbers 1-25 as an array, run a Fisher-Yates shuffle, then lay the shuffled array left-to-right/top-to-bottom into the 5x5 grid. This can be clicked repeatedly pre-Ready, fully replacing the current layout each time (not a partial/incremental shuffle) so results are unpredictable and don't resemble the prior layout's number groupings.

## Open Questions Still Deferred to Plan Phase

- Session/token expiry and reconnect key: reconnect must be keyed by user id + party id (not socket id) so a refreshed/reconnected player is matched back to their existing board and turn state.
- Exact heartbeat mechanism (Socket.IO's built-in ping/pong vs. an app-level heartbeat event) — pick whichever is simpler to wire up reliably during implementation.

## Frontend Changes (Angular)

Since this is a full frontend build (not an addition to an existing app), see `architecture.md` for the app structure. Key screens:

- **Login** — username/password (pre-issued credentials).
- **Lobby / Join Party** — enter room code (players), or Create Party (admin).
- **Board Setup** — 5x5 drag-and-drop grid + number tray, Ready button.
- **Game Board** — player's own 5x5 grid with marks, called-numbers history panel, turn indicator, number picker (only enabled on your turn), line-progress indicator (how many of 5 lines completed).
- **Admin Dashboard** — roster, ready-status per player, start/end game controls, live turn indicator, winner announcement.
- **Game Over** — winner announcement, return-to-lobby action.

## Tech Stack (confirmed)

- **Frontend**: Angular + Kendo UI for Angular (grid + drag-and-drop components), TypeScript.
- **Backend**: Node.js + Express + Socket.IO for real-time events, TypeScript.
- **Auth**: Pre-seeded accounts, session-based (JWT or server session — decide in plan phase), no signup flow.
- **Persistence**: Lightweight — SQLite or even in-memory store is likely sufficient for v1 given no history/leaderboard requirement and single-session-at-a-time scope. Decide in plan phase.
- **Deployment**: Runs entirely on the host's local machine; other devices connect via the host's LAN IP.
