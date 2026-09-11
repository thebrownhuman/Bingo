import { PartyState, PlayerState, PublicPartyState, PublicPlayer, Role } from '../types';
import { partyStore } from '../party/party.store';
import { countCompletedLines, hasWon, pickRandomRemaining, randomFullLayout, shuffle } from './board.util';

export const DISCONNECT_GRACE_MS = 30_000;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 7;

const disconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${roomCode}:${userId}`

export class GameError extends Error {}

function timerKey(roomCode: string, userId: string) {
  return `${roomCode}:${userId}`;
}

function emptyLayout(): (number | null)[] {
  return Array.from({ length: 25 }, () => null);
}

export const gameEngine = {
  createParty(adminUserId: string, adminDisplayName: string, maxPlayers: number = MAX_PLAYERS): PartyState {
    const clamped = Math.min(Math.max(maxPlayers, MIN_PLAYERS), MAX_PLAYERS);
    const party = partyStore.create(adminUserId, clamped);
    this.joinParty(party.roomCode, adminUserId, adminDisplayName, 'admin');
    return party;
  },

  joinParty(roomCode: string, userId: string, displayName: string, role: Role): PartyState {
    const party = partyStore.get(roomCode);
    if (!party) throw new GameError('Room not found.');
    if (party.status !== 'setup' && !party.players.has(userId)) {
      throw new GameError('This game has already started.');
    }
    const existing = party.players.get(userId);
    if (existing) {
      existing.connected = true;
      existing.disconnectedAt = null;
      this.clearDisconnectTimer(roomCode, userId);
      return party;
    }
    if (party.players.size >= party.maxPlayers) {
      throw new GameError('This room is full.');
    }
    const player: PlayerState = {
      userId,
      displayName,
      role,
      layout: emptyLayout(),
      ready: false,
      connected: true,
      disconnectedAt: null,
      linesCompleted: 0,
    };
    party.players.set(userId, player);
    return party;
  },

  setLayout(roomCode: string, userId: string, layout: (number | null)[]): PartyState {
    const party = this.requireParty(roomCode);
    const player = this.requirePlayer(party, userId);
    if (party.status !== 'setup') throw new GameError('Board is locked once the game has started.');
    const filled = layout.filter((n) => n !== null);
    const unique = new Set(filled);
    if (filled.length !== 25 || unique.size !== 25) {
      throw new GameError('Board must contain each number 1-25 exactly once.');
    }
    player.layout = layout;
    return party;
  },

  randomizeLayout(roomCode: string, userId: string): PartyState {
    const party = this.requireParty(roomCode);
    const player = this.requirePlayer(party, userId);
    if (party.status !== 'setup') throw new GameError('Board is locked once the game has started.');
    if (player.ready) throw new GameError('Un-ready before reshuffling.');
    player.layout = randomFullLayout();
    return party;
  },

  setReady(roomCode: string, userId: string): PartyState {
    const party = this.requireParty(roomCode);
    const player = this.requirePlayer(party, userId);
    const filled = player.layout.filter((n) => n !== null);
    if (filled.length !== 25) throw new GameError('Fill every cell before marking ready.');
    player.ready = true;
    return party;
  },

  startGame(roomCode: string, requesterUserId: string): PartyState {
    const party = this.requireParty(roomCode);
    if (party.adminUserId !== requesterUserId) throw new GameError('Only the admin can start the game.');
    if (party.players.size < MIN_PLAYERS) throw new GameError(`Need at least ${MIN_PLAYERS} players.`);
    const notReady = [...party.players.values()].filter((p) => !p.ready);
    if (notReady.length > 0) throw new GameError('All players must be ready first.');

    party.turnOrder = shuffle([...party.players.keys()]);
    party.currentTurnIndex = 0;
    party.status = 'in_progress';
    return party;
  },

  /** Resolves a called number: marks it, recomputes lines, checks for a winner, advances turn. */
  callNumber(roomCode: string, callerUserId: string, number: number): PartyState {
    const party = this.requireParty(roomCode);
    if (party.status !== 'in_progress') throw new GameError('Game is not in progress.');
    const currentTurnUserId = party.turnOrder[party.currentTurnIndex];
    if (currentTurnUserId !== callerUserId) throw new GameError('Not your turn.');
    if (number < 1 || number > 25) throw new GameError('Number out of range.');
    if (party.calledNumbers.includes(number)) throw new GameError('That number was already called.');

    this.resolveCall(party, number);
    return party;
  },

  /** Shared by a normal call and the disconnect-timeout auto-call. */
  resolveCall(party: PartyState, number: number): void {
    party.calledNumbers.push(number);
    for (const player of party.players.values()) {
      player.linesCompleted = countCompletedLines(player.layout, party.calledNumbers);
    }
    const winner = [...party.players.values()].find((p) => hasWon(p.layout, party.calledNumbers));
    if (winner) {
      party.winnerUserId = winner.userId;
      party.status = 'finished';
      return;
    }
    this.advanceTurn(party);
  },

  advanceTurn(party: PartyState): void {
    party.currentTurnIndex = (party.currentTurnIndex + 1) % party.turnOrder.length;
  },

  requireParty(roomCode: string): PartyState {
    const party = partyStore.get(roomCode);
    if (!party) throw new GameError('Room not found.');
    return party;
  },

  requirePlayer(party: PartyState, userId: string): PlayerState {
    const player = party.players.get(userId);
    if (!player) throw new GameError('You are not in this party.');
    return player;
  },

  toPublicState(party: PartyState, forUserId: string): PublicPartyState & { yourLayout: (number | null)[] } {
    const players: PublicPlayer[] = [...party.players.values()].map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      ready: p.ready,
      connected: p.connected,
      linesCompleted: p.linesCompleted,
    }));
    const you = party.players.get(forUserId);
    return {
      roomCode: party.roomCode,
      adminUserId: party.adminUserId,
      status: party.status,
      players,
      currentTurnUserId: party.status === 'in_progress' ? party.turnOrder[party.currentTurnIndex] : null,
      calledNumbers: party.calledNumbers,
      winnerUserId: party.winnerUserId,
      yourLayout: you ? you.layout : emptyLayout(),
    };
  },

  clearDisconnectTimer(roomCode: string, userId: string): void {
    const key = timerKey(roomCode, userId);
    const t = disconnectTimers.get(key);
    if (t) {
      clearTimeout(t);
      disconnectTimers.delete(key);
    }
  },

  /**
   * Called when a socket disconnects. Starts the 30s grace timer; if it
   * elapses, auto-calls a random remaining number on that player's behalf
   * (only meaningful if it's their turn when the timer fires) and keeps the
   * game moving. `onResolved` lets the socket layer broadcast the result.
   */
  handleDisconnect(roomCode: string, userId: string, onResolved: (party: PartyState) => void): void {
    const party = partyStore.get(roomCode);
    if (!party) return;
    const player = party.players.get(userId);
    if (!player) return;
    player.connected = false;
    player.disconnectedAt = Date.now();

    const key = timerKey(roomCode, userId);
    this.clearDisconnectTimer(roomCode, userId);
    const timer = setTimeout(() => {
      disconnectTimers.delete(key);
      const currentParty = partyStore.get(roomCode);
      if (!currentParty || currentParty.status !== 'in_progress') return;
      const p = currentParty.players.get(userId);
      if (!p || p.connected) return; // reconnected before the timer fired
      const currentTurnUserId = currentParty.turnOrder[currentParty.currentTurnIndex];
      if (currentTurnUserId !== userId) return; // not their turn (yet) — nothing to auto-play
      const autoNumber = pickRandomRemaining(currentParty.calledNumbers);
      if (autoNumber === null) return; // no numbers left, nothing to do
      this.resolveCall(currentParty, autoNumber);
      onResolved(currentParty);
    }, DISCONNECT_GRACE_MS);
    disconnectTimers.set(key, timer);
  },
};
