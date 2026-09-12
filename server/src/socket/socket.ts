import { Server, Socket } from 'socket.io';
import { authService, TokenPayload } from '../auth/auth.service';
import { gameEngine, GameError, MAX_PLAYERS } from '../game/game.engine';
import { partyStore } from '../party/party.store';
import { sessionRegistry } from '../session/session.registry';
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

function socketsForUserInRoom(io: Server, room: string, userId: string): AuthedSocket[] {
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  if (!socketsInRoom) return [];
  const matches: AuthedSocket[] = [];
  for (const socketId of socketsInRoom) {
    const socket = io.sockets.sockets.get(socketId) as AuthedSocket | undefined;
    if (socket?.user?.userId === userId) matches.push(socket);
  }
  return matches;
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

    // Session takeover: if this account is already connected from another
    // tab/device, don't silently displace it — ask the new connection to
    // confirm before kicking the old one.
    const existingSocketId = sessionRegistry.activeSocketId(user.userId);
    const existingSocket = existingSocketId ? io.sockets.sockets.get(existingSocketId) : undefined;
    if (existingSocket && existingSocket.id !== socket.id) {
      socket.emit('session:conflict');
    } else {
      sessionRegistry.claim(user.userId, socket.id);
      socket.emit('session:ready');
    }

    socket.on('session:force_login', () => {
      const currentSocketId = sessionRegistry.activeSocketId(user.userId);
      const otherSocket = currentSocketId ? io.sockets.sockets.get(currentSocketId) : undefined;
      if (otherSocket && otherSocket.id !== socket.id) {
        otherSocket.emit('session:kicked');
        otherSocket.disconnect(true);
      }
      sessionRegistry.claim(user.userId, socket.id);
      socket.emit('session:ready');
    });

    socket.on('party:create', (payload: { maxPlayers?: number }, ack) => {
      try {
        const party = gameEngine.createParty(user.userId, user.displayName, user.role, payload?.maxPlayers ?? MAX_PLAYERS);
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

    socket.on('board:unready', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.unsetReady(payload.roomCode, user.userId);
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

    socket.on('game:restart', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.restartGame(payload.roomCode, user.userId);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('game:quit', (payload: { roomCode: string }, ack) => {
      try {
        const party = gameEngine.quitGame(payload.roomCode, user.userId);
        ack?.({ ok: true });
        broadcastState(io, party);
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('party:kick', (payload: { roomCode: string; targetUserId: string }, ack) => {
      try {
        const party = gameEngine.kickPlayer(payload.roomCode, user.userId, payload.targetUserId);
        ack?.({ ok: true });
        broadcastState(io, party);

        // The kicked player might not be in party.players any more (setup
        // kicks remove them outright), so they wouldn't get anything from
        // broadcastState above — tell them directly and pull them out of
        // the socket.io room so they stop receiving this room's traffic.
        const room = roomOf(payload.roomCode);
        for (const kickedSocket of socketsForUserInRoom(io, room, payload.targetUserId)) {
          kickedSocket.emit('party:kicked');
          kickedSocket.leave(room);
        }
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      sessionRegistry.releaseIfCurrent(user.userId, socket.id);
      for (const room of socket.rooms) {
        if (!room.startsWith('party:')) continue;
        const roomCode = room.replace('party:', '');
        const party = partyStore.get(roomCode);
        if (!party || !party.players.has(user.userId)) continue;
        gameEngine.handleDisconnect(roomCode, user.userId, (resolvedParty) => broadcastState(io, resolvedParty));
        broadcastState(io, party);

        if (user.userId === party.adminUserId) {
          gameEngine.handleOwnerDisconnect(roomCode, () => {
            io.to(roomOf(roomCode)).emit('party:closed');
          });
        }
      }
    });
  });
}
