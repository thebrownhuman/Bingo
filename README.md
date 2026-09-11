# Bingo Party

Local-LAN, real-time multiplayer Bingo. See `.planning/specs/bingo-party.md` and
`.planning/specs/architecture.md` for the full design. `stitch_bingo_party_mobile_app/`
holds the Stitch design export the visual language (colors, type, spacing) was pulled from.

## Run it

**Backend** (Node + Express + Socket.IO):

```bash
cd server
npm install
npm run seed   # creates admin/admin123 + player1-4/player123 — edit src/db/seed.ts to change accounts
npm run dev    # http://localhost:3000
```

**Frontend** (Angular):

```bash
cd client
npm install
npm start      # http://localhost:4200
```

Open `http://localhost:4200` on the host machine, and `http://<host-lan-ip>:4200` on
any other device on the same WiFi (the client auto-derives the API/socket URL from
whatever hostname loaded the page — see `client/src/app/core/server.config.ts`).
You may need to allow the port through Windows Firewall for other devices to connect.

## Seeded accounts

| Username | Password | Role |
|---|---|---|
| admin | admin123 | admin (plays too, per spec) |
| player1-4 | player123 | player |

## What's implemented

Full game loop from the spec: private board arrangement (tap-to-place + swap, or one-tap
Randomize), Ready gating, admin-started round-robin turns, global number-call marking
across every player's independently-shuffled board, live lines-completed tracking, and
win detection (5 lines). Disconnect handling (30s grace + auto-call) is implemented
server-side in `server/src/game/game.engine.ts` but has no dedicated UI indicator yet.

The UI is built entirely on **Kendo UI for Angular** (a real Telerik license is
activated locally via `~/.telerik/telerik-license.txt` — see `client/telerik-license.txt`,
gitignored): Card, Avatar, Chip/ChipList, Button, TextBox + FloatingLabel, ProgressBar,
Loader, Dialog (game-over modal), and NotificationService (toasts on turn-change,
number-called, and errors). Brand colors/radius/font are applied via a Sass variable
override in `client/src/theme.scss` (Kendo's own `!default` variables — `$primary`,
`$success`, `$error`, `$border-radius`, `$font-family` — overridden before importing
the theme), not CSS custom properties, since this Kendo theme generation compiles
color into static class rules rather than exposing runtime CSS variables.

**Kendo version note:** the newest component packages (v21) only pair correctly with
the theme's `next`-tagged prerelease line (`@progress/kendo-theme-default@5.0.0-beta.x`)
— the "latest" stable theme tag (14.5.0) is generation-locked to older component
majors and silently fails to apply colors (right CSS loads, wrong class names) if
mixed with v21 components. If Kendo pushes a stable v5 theme release, bump
`client/package.json`'s pin off `next` and re-verify buttons/chips pick up brand colors.

### Dark mode

Toggle button top-right on every screen (`client/src/app/core/theme.service.ts`),
persisted to `localStorage` (`bingo-party-theme`) and applied before Angular even
bootstraps (inline script in `client/src/index.html`) so there's no light-mode flash
on reload. Because Kendo's theme generation compiles colors into static classes
rather than runtime CSS variables (see above), dark mode isn't a variable flip — it's
a **second, fully separate compiled theme** (`client/src/theme-dark.scss`, near-black
surfaces inspired by Apple Music's dark sign-in modal, same brand indigo/emerald
accents as light mode) built as its own non-injected CSS bundle and swapped in via two
mutually-exclusive `<link>` tags (`#light-theme-link` / `#dark-theme-link`) — enabling
one always disables the other, since both target identical Kendo class names and would
otherwise conflict. Non-Kendo chrome (our own `--surface`/`--on-surface`/etc. tokens in
`styles.css`) flips via a `:root[data-theme='dark']` block, toggled on `<html>` at the
same time.

### Remember me

Login page has a "Remember me on this device" checkbox. When checked, username and
password are saved to `localStorage` (`bingo-party-remember`) and auto-fill the form on
return visits (`client/src/app/core/auth.service.ts` — `rememberCredentials` /
`getRememberedCredentials` / `forgetCredentials`). This is separate from the session
token (`bingo-party-auth`), which is always persisted regardless of this checkbox so a
logged-in session survives a refresh either way.

**Security note:** this stores the raw password in plaintext in `localStorage`,
which is fine for this app's threat model (local-only LAN party game, casual
pre-seeded low-stakes accounts, opt-in checkbox) but would not be an acceptable
pattern for anything internet-facing or handling real credentials.

## Deviations from the original architecture doc (worth knowing)

- **User storage is a JSON file** (`server/src/db/userStore.ts`), not SQLite — avoids
  native module build tooling on Windows. Fine at this scale (a handful of pre-seeded
  accounts); swap in SQLite later if that ever matters.
- **Board arrangement uses tap-to-select-then-place**, not native drag-and-drop (tap a
  number, tap a cell to place it; tap two filled cells to swap; double-tap to return to
  tray). Kendo's Sortable component doesn't cleanly model a fixed 25-slot grid with
  holes, so this was kept as a reliable custom interaction instead of forcing it.

## Known gaps for a next pass

- No visible "player disconnected" indicator in the UI (state exists, just not rendered).
- Admin can't see anyone's board layout by design — the admin panel only shows lines-completed counts, which is correct per spec but worth a design pass.
- No reconnect-into-existing-session UX on the client (server supports it — same userId rejoining re-attaches — but a refreshed browser currently has to navigate back to the room URL manually).
