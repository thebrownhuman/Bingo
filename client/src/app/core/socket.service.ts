import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { serverUrl } from './server.config';
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
    this.socket = io(serverUrl(), { auth: { token: this.auth.token }, transports: ['websocket'] });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('state', (state: PublicPartyState) => this.state.set(state));
    this.socket.on('session:conflict', () => this.sessionConflict.set(true));
    this.socket.on('session:ready', () => this.sessionConflict.set(false));
    this.socket.on('session:kicked', () => this.sessionKicked.set(true));
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

  startGame(roomCode: string) {
    return this.emitWithAck('game:start', { roomCode });
  }

  callNumber(roomCode: string, number: number) {
    return this.emitWithAck('game:call', { roomCode, number });
  }
}
