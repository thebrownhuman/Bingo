---
name: Bingo Party
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464556'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4f40e9'
  primary: '#412edc'
  on-primary: '#ffffff'
  primary-container: '#5b4ef5'
  on-primary-container: '#ece8ff'
  inverse-primary: '#c4c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#8a3800'
  on-tertiary: '#ffffff'
  tertiary-container: '#b14a00'
  on-tertiary-container: '#ffe5da'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c0ff'
  on-primary-fixed: '#110068'
  on-primary-fixed-variant: '#351bd2'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb692'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#793000'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  tile-number:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 22px
    letterSpacing: 0em
  tile-header:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '800'
    lineHeight: 20px
    letterSpacing: 0.05em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system defines an energetic, modern, flat party-game interface built for local real-time social multiplayer. The aesthetic balances game-room excitement with clean, utilitarian digital product design. It rejects loud casino tropes, skeuomorphic felt textures, and glossy gradients in favor of crisp solid planes, precise structural outlines, and instant legibility across dynamic lighting conditions.

The emotional tone is welcoming, upbeat, and social. Visual weight is carried by vibrant solid fills, punchy hairline borders, and friendly geometry, creating an interface that feels like a polished physical board game brought to a mobile screen.

## Colors

The palette relies entirely on pure solid swatches without gradients, glows, or blurs:
- **Primary (`#5B4EF5`)**: Electric Indigo. Drives primary calls-to-action, active game state signals, caller badges, and selected bingo tiles.
- **Secondary (`#10B981`)**: Pure Success Emerald. Dedicated to completed rows, valid patterns, "BINGO!" callouts, and victory states.
- **Canvas Base (`#F8FAFC`)**: A cool, muted light-gray canvas providing soft contrast behind elevated white play cards.
- **Surface Card (`#FFFFFF`)**: Pure flat white for playfield cards, modal dialogues, and grid wrappers.
- **Structural Stroke (`#E2E8F0`)**: Crisp, light borders framing cards, unselected tiles, and form fields.
- **Pressed Border Shadow (`#CBD5E1`)**: Used for tactile mechanical offset edges under buttons and interactive tiles.
- **Text & Hierarchy**: `#0F172A` (Slate 900) for primary headers, cell numbers, and active labels; `#64748B` (Slate 500) for secondary metadata and round stats.

## Typography

Plus Jakarta Sans is utilized across all UI tiers for its geometric legibility, wide apertures, and friendly counters. 

- Use tabular numbers (`font-variant-numeric: tabular-nums`) across all grid cells, draw counters, and timers to prevent layout shifts.
- Keep all textual labels and prompts in sentence case (e.g., "Join local room", "Next call in 3s"). Use uppercase exclusively for the traditional column identifiers: `B - I - N - G - O`.
- Tile numbers must maintain strong vertical centering within their square touch targets.

## Layout & Spacing

The layout is built for mobile portrait viewports (375px–390px baseline) with a fixed-width single-column core centered on wider screens.

- **Grid Architecture**: The 5x5 bingo card employs an explicit 5-column fluid layout with a uniform `0.5rem` (`8px`) gutter between tiles, guaranteeing square aspect ratios across all device sizes.
- **Canvas Margins**: Safe margin of `1rem` (`16px`) from device boundaries.
- **Hit Targets**: All interactive elements (number tiles, room toggles, callout buttons) maintain a minimum touch bounding box of 48x48px.
- **Screen Reflow**: On viewports wider than 640px (tablets, TV displays), the game board remains constrained to a max-width of 440px while player leaderboards and room status shift into an adjacent secondary side panel.

## Elevation & Depth

This system avoids soft gaussian blurs, diffusion shadows, and translucent materials. Depth is communicated strictly via structural 2D cues:

1. **Flat Tactile Base**: Cards and containers use a crisp `1.5px` or `2px` solid outline in `#E2E8F0` against the `#F8FAFC` canvas.
2. **Hard Drop Edges**: Interactive elements like active tiles and primary buttons feature a zero-blur, solid vertical drop edge (`box-shadow: 0 3px 0 0 #CBD5E1` or darker counterpart `#4338CA` for indigo elements).
3. **Active/Pressed State**: On touch-down, the element translates down by `2px` or `3px`, collapsing the hard drop edge (`box-shadow: 0 0 0 0 transparent`) to mimic a satisfying mechanical game-board punch-out.
4. **Modal Layering**: Floating dialogues rely on a solid 2px dark border (`#0F172A`) over a dimming backdrop with no blur (`rgba(15, 23, 42, 0.4)`).

## Shapes

The interface balances soft friendliness with structured, responsive alignment:

- **Game Board & Dialog Cards**: `rounded-2xl` (`16px`) for primary container surfaces, softening large blocks of screen real estate.
- **Bingo Grid Tiles & Action Buttons**: `rounded-xl` (`12px`) for all standard interactive game controls, maintaining a tactile block feel.
- **Pills & Indicator Badges**: Fully rounded (`rounded-full` / `9999px`) for player status tags, draw pills, player avatars, and room code chips.

## Components

### Bingo Grid Tiles
- **Default (Unmarked)**: White surface (`#FFFFFF`), `1.5px` solid outline in `#E2E8F0`, hard flat bottom edge `0 3px 0 #CBD5E1`, text in `#0F172A`.
- **Dabbed / Selected**: Electric Indigo fill (`#5B4EF5`), text in `#FFFFFF`, flat bottom edge `0 3px 0 #4338CA`.
- **Winning Line Tile**: Pure Success Emerald fill (`#10B981`), text in `#FFFFFF`, flat bottom edge `0 3px 0 #059669`.
- **Center "FREE" Space**: Electric Indigo 10% tint background (`#EEF2FF`), solid `#5B4EF5` border, star icon or bold label in `#5B4EF5`.

### Buttons
- **Primary ("BINGO!", "Join Game")**: Solid `#5B4EF5`, text `#FFFFFF`, `rounded-xl`, height 52px, `box-shadow: 0 4px 0 #4338CA`. Translates `translate-y-1` on tap with shadow collapsed.
- **Secondary / Action**: Solid `#FFFFFF`, text `#0F172A`, 2px outline `#E2E8F0`, `box-shadow: 0 4px 0 #CBD5E1`.
- **Success Claim**: Flashing solid `#10B981`, white text, `box-shadow: 0 4px 0 #059669`.

### Chips & Room Badges
- Height 32px, `rounded-full`, horizontal padding 12px.
- Display network status, room pin (e.g., "PIN: 4821"), and player counts. Neutral chips use `#F1F5F9` surface with `#0F172A` text; active host badge uses `#EEF2FF` with `#5B4EF5` text.

### Current Call Billboard
- Compact header component displaying the latest drawn ball: a 64px circle with a solid `#5B4EF5` background, bold white letter + number, flanked by mini chips showing the last 3 calls.

### Input Fields
- Solid `#FFFFFF` fill, 2px border in `#E2E8F0`, `rounded-xl`, height 48px, text `#0F172A`. On focus, stroke transitions to solid `#5B4EF5` without glow.

### Player Presence Lists
- Compact list items, `rounded-xl`, light background (`#FFFFFF`), separated by 6px gaps, featuring circular avatars with a 2px stroke and dab-count progress indicators.