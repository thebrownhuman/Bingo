export const GRID_SIZE = 5;
export const NUMBERS_MIN = 1;
export const NUMBERS_MAX = 25;
export const LINES_TO_WIN = 5;

/**
 * Fisher-Yates shuffle. Single source of truth for "pick a random ordering" —
 * used both by the setup-phase Randomize button and by the disconnect
 * auto-call fallback, so there is exactly one randomization implementation.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomFullLayout(): number[] {
  const numbers = Array.from({ length: NUMBERS_MAX - NUMBERS_MIN + 1 }, (_, i) => i + NUMBERS_MIN);
  return shuffle(numbers);
}

/** Picks one random number from whatever hasn't been called yet. */
export function pickRandomRemaining(calledNumbers: number[]): number | null {
  const called = new Set(calledNumbers);
  const remaining: number[] = [];
  for (let n = NUMBERS_MIN; n <= NUMBERS_MAX; n++) {
    if (!called.has(n)) {
      remaining.push(n);
    }
  }
  if (remaining.length === 0) {
    return null;
  }
  return shuffle(remaining)[0];
}

/**
 * layout is a flat 25-length array, row-major: index = row * 5 + col.
 * Returns how many of the 12 possible lines (5 rows + 5 cols + 2 diagonals)
 * are fully marked given the set of called numbers.
 */
export function countCompletedLines(layout: (number | null)[], calledNumbers: number[]): number {
  const called = new Set(calledNumbers);
  const marked = layout.map((n) => (n !== null ? called.has(n) : false));
  const at = (row: number, col: number) => marked[row * GRID_SIZE + col];

  let lines = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    let full = true;
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!at(row, col)) {
        full = false;
        break;
      }
    }
    if (full) lines++;
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    let full = true;
    for (let row = 0; row < GRID_SIZE; row++) {
      if (!at(row, col)) {
        full = false;
        break;
      }
    }
    if (full) lines++;
  }

  let diag1 = true;
  let diag2 = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!at(i, i)) diag1 = false;
    if (!at(i, GRID_SIZE - 1 - i)) diag2 = false;
  }
  if (diag1) lines++;
  if (diag2) lines++;

  return lines;
}

export function hasWon(layout: (number | null)[], calledNumbers: number[]): boolean {
  return countCompletedLines(layout, calledNumbers) >= LINES_TO_WIN;
}
