import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { SOCKET_IO_PATH } from './server.config';
import { PublicPartyState, SocketAck } from './models';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private connectedToken: string | null = null;
  readonly state = signal<PublicPartyState | null>(null);
  readonly connected = signal(false);
  /** Another active session exists for this account — needs a user decision. */
  readonly sessionConflict = signal(false);
  /** This session got kicked because the account logged in elsewhere. */
  readonly sessionKicked = signal(false);
  /** The party's host disconnected and the room was torn down. */
  readonly partyClosed = signal(false);
  /** The host removed this session from the party. */
  readonly kicked = signal(false);
  /** Set when the server tells us this account is still a live participant in a party that hasn't finished — lets the app jump straight back into that room instead of the lobby. */
  readonly resumeRoomCode = signal<string | null>(null);

  constructor(private auth: AuthService) {}

  /**
   * Re-authenticates with the socket server whenever the logged-in user
   * changes. Without this, a socket that connected as user A stays
   * authenticated as A even after logging out and back in as user B in the
   * same tab — every subsequent action would silently act on A's account.
   */
  connect(): void {
    if (this.socket?.connected && this.connectedToken === this.auth.token) return;
    this.disconnect();
    this.connectedToken = this.auth.token;
    this.sessionConflict.set(false);
    this.sessionKicked.set(false);
    this.partyClosed.set(false);
    this.kicked.set(false);
    this.resumeRoomCode.set(null);
    this.socket = io(window.location.origin, {
      path: SOCKET_IO_PATH,
      auth: { token: this.auth.token },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('state', (state: PublicPartyState) => this.state.set(state));
    this.socket.on('session:conflict', () => this.sessionConflict.set(true));
    this.socket.on('session:ready', () => this.sessionConflict.set(false));
    this.socket.on('session:kicked', () => this.sessionKicked.set(true));
    this.socket.on('party:closed', () => {
      this.partyClosed.set(true);
      this.state.set(null);
    });
    this.socket.on('party:kicked', () => {
      this.kicked.set(true);
      this.state.set(null);
    });
    this.socket.on('party:resume', (payload: { roomCode: string }) => this.resumeRoomCode.set(payload.roomCode));
  }

  /** Call once the resume redirect has been acted on, so it doesn't fire again for the same room. */
  acknowledgeResume(): void {
    this.resumeRoomCode.set(null);
  }

  /** Call after reacting to a `partyClosed` notification so it only fires once. */
  acknowledgePartyClosed(): void {
    this.partyClosed.set(false);
  }

  /** Call after reacting to a `kicked` notification so it only fires once. */
  acknowledgeKickedFromParty(): void {
    this.kicked.set(false);
  }

  /** Kicks the other active session for this account and takes over as the active one. */
  takeOverSession(): void {
    this.socket?.emit('session:force_login');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectedToken = null;
    this.state.set(null);
    this.connected.set(false);
    // Otherwise these dialogs (rendered globally in app root) keep blocking
    // the screen forever after logout/login, since nothing else clears them.
    this.sessionConflict.set(false);
    this.sessionKicked.set(false);
    this.partyClosed.set(false);
    this.kicked.set(false);
    this.resumeRoomCode.set(null);
  }

  private emitWithAck<T extends Record<string, unknown>>(event: string, payload: T): Promise<SocketAck> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected.'));
        return;
      }
      this.socket.emit(event, payload, (ack: SocketAck) => resolve(ack));
    });
  }

  createParty(maxPlayers?: number) {
    return this.emitWithAck('party:create', { maxPlayers });
  }

  joinParty(roomCode: string) {
    return this.emitWithAck('party:join', { roomCode });
  }

  setBoard(roomCode: string, layout: (number | null)[]) {
    return this.emitWithAck('board:set', { roomCode, layout });
  }

  randomizeBoard(roomCode: string) {
    return this.emitWithAck('board:randomize', { roomCode });
  }

  setReady(roomCode: string) {
    return this.emitWithAck('board:ready', { roomCode });
  }

  setNotReady(roomCode: string) {
    return this.emitWithAck('board:unready', { roomCode });
  }

  startGame(roomCode: string) {
    return this.emitWithAck('game:start', { roomCode });
  }

  callNumber(roomCode: string, number: number) {
    return this.emitWithAck('game:call', { roomCode, number });
  }

  restartGame(roomCode: string) {
    return this.emitWithAck('game:restart', { roomCode });
  }

  quitGame(roomCode: string) {
    return this.emitWithAck('game:quit', { roomCode });
  }

  kickPlayer(roomCode: string, targetUserId: string) {
    return this.emitWithAck('party:kick', { roomCode, targetUserId });
  }

  /**
   * No ack needed — this is fire-and-forget presence signalling, not a game
   * action. Buffered by socket.io until the transport is actually connected,
   * so it's safe to call right after a screen-off/on cycle before the
   * underlying socket has finished reconnecting.
   */
  sendHeartbeat(roomCode: string): void {
    this.socket?.emit('presence:ping', { roomCode });
  }
}
