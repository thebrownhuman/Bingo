export type Role = 'admin' | 'player';
export type PartyStatus = 'setup' | 'in_progress' | 'finished';

export interface PublicPlayer {
  userId: string;
  displayName: string;
  role: Role;
  ready: boolean;
  connected: boolean;
  linesCompleted: number;
}

export interface PublicPartyState {
  roomCode: string;
  adminUserId: string;
  status: PartyStatus;
  players: PublicPlayer[];
  currentTurnUserId: string | null;
  calledNumbers: number[];
  winnerUserId: string | null;
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
