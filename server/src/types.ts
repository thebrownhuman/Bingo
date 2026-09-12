/**
 * 'admin' can create/host parties and manage player accounts.
 * 'super_admin' can do everything 'admin' can, plus sees the in-game admin
 * view even when just playing in someone else's room, not just when hosting.
 */
export type Role = 'super_admin' | 'admin' | 'player';

export interface GameRecord {
  roomCode: string;
  playedAt: string;
  opponents: string[];
  won: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  /** Every finished game this player took part in — newest first. */
  games: GameRecord[];
}

export type PartyStatus = 'setup' | 'in_progress' | 'finished';

export interface PlayerState {
  userId: string;
  displayName: string;
  role: Role;
  /** cell index (0-24, row-major) -> number, or null while still being arranged */
  layout: (number | null)[];
  ready: boolean;
  connected: boolean;
  /** epoch ms when this player disconnected, used for the 30s grace timer */
  disconnectedAt: number | null;
  /** epoch ms of the last heartbeat ping (or join/reconnect), used to detect a stale connection even when no socket "disconnect" event ever fires (e.g. a phone screen turning off without closing the socket) */
  lastSeenAt: number;
  linesCompleted: number;
  /** Left the game early, by their own choice — counts as a loss and takes them out of the turn order. */
  quit: boolean;
}

export interface PartyState {
  roomCode: string;
  adminUserId: string;
  status: PartyStatus;
  maxPlayers: number;
  players: Map<string, PlayerState>;
  /** fixed round-robin order, decided once the game starts */
  turnOrder: string[];
  currentTurnIndex: number;
  calledNumbers: number[];
  /** Every player who completed 5 lines on the same call is a co-winner. */
  winnerUserIds: string[];
  createdAt: number;
}

export interface PublicPlayer {
  userId: string;
  displayName: string;
  role: Role;
  ready: boolean;
  connected: boolean;
  linesCompleted: number;
  quit: boolean;
}

export interface PublicPartyState {
  roomCode: string;
  adminUserId: string;
  status: PartyStatus;
  players: PublicPlayer[];
  currentTurnUserId: string | null;
  calledNumbers: number[];
  winnerUserIds: string[];
}
