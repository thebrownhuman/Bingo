import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { serverUrl } from './server.config';
import { PublicPartyState, SocketAck } from './models';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  readonly state = signal<PublicPartyState | null>(null);
  readonly connected = signal(false);

  constructor(private auth: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(serverUrl(), { auth: { token: this.auth.token }, transports: ['websocket'] });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('state', (state: PublicPartyState) => this.state.set(state));
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
