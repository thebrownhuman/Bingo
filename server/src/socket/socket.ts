import { Server, Socket } from 'socket.io';
import { authService, TokenPayload } from '../auth/auth.service';
import { gameEngine, GameError, MAX_PLAYERS } from '../game/game.engine';
import { partyStore } from '../party/party.store';
import { PartyState } from '../types';

interface AuthedSocket extends Socket {
  user?: TokenPayload;
}

function roomOf(roomCode: string) {
  return `party:${roomCode.toUpperCase()}`;
}

function broadcastState(io: Server, party: PartyState) {
  const room = roomOf(party.roomCode);
  for (const [userId] of party.players) {
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    if (!socketsInRoom) continue;
    for (const socketId of socketsInRoom) {
      const socket = io.sockets.sockets.get(socketId) as AuthedSocket | undefined;
      if (socket?.user?.userId === userId) {
        socket.emit('state', gameEngine.toPublicState(party, userId));
      }
    }
  }
}

export function registerSocketHandlers(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing auth token.'));
    const payload = authService.verify(token);
    if (!payload) return next(new Error('Invalid or expired token.'));
    socket.user = payload;
    next();
  });

  io.on('connection', (socket: AuthedSocket) => {
    const user = socket.user!;

    socket.on('party:create', (payload: { maxPlayers?: number }, ack) => {
      try {
        if (user.role !== 'admin') throw new GameError('Only an admin account can create a party.');
        const party = gameEngine.createParty(user.userId, user.displayName, payload?.maxPlayers ?? MAX_PLAYERS);
        socket.join(roomOf(party.roomCode));
        ack?.({ ok: true, roomCode: party.roomCode });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('party:join', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.joinParty(payload.roomCode, user.userId, user.displayName, user.role);
        socket.join(roomOf(party.roomCode));
        ack?.({ ok: true, roomCode: party.roomCode });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('board:set', (payload: { roomCode: string; layout: (number | null)[] }, ack) => {
      try {
        const party = gameEngine.setLayout(payload.roomCode, user.userId, payload.layout);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('board:randomize', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.randomizeLayout(payload.roomCode, user.userId);
        ack?.({ ok: true, layout: party.players.get(user.userId)?.layout });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('board:ready', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.setReady(payload.roomCode, user.userId);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('game:start', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.startGame(payload.roomCode, user.userId);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('game:call', (payload: { roomCode: string; number: number }, ack) => {
      try {
        const party = gameEngine.callNumber(payload.roomCode, user.userId, payload.number);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('party:')) continue;
        const roomCode = room.replace('party:', '');
        const party = partyStore.get(roomCode);
        if (!party || !party.players.has(user.userId)) continue;
        gameEngine.handleDisconnect(roomCode, user.userId, (resolvedParty) => broadcastState(io, resolvedParty));
        broadcastState(io, party);
      }
    });
  });
}
