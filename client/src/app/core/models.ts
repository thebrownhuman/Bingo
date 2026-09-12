/**
 * 'admin' can create/host parties and manage player accounts.
 * 'super_admin' can do everything 'admin' can, plus sees the in-game admin
 * view even when just playing in someone else's room, not just when hosting.
 */
export type Role = 'super_admin' | 'admin' | 'player';
export type PartyStatus = 'setup' | 'in_progress' | 'finished';

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
  yourLayout: (number | null)[];
}

export interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface SocketAck {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}
