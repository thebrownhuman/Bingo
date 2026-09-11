import { PartyState } from '../types';

const parties = new Map<string, PartyState>();

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1, avoids visual confusion

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
  } while (parties.has(code));
  return code;
}

export const partyStore = {
  create(adminUserId: string, maxPlayers: number): PartyState {
    const party: PartyState = {
      roomCode: generateRoomCode(),
      adminUserId,
      status: 'setup',
      maxPlayers,
      players: new Map(),
      turnOrder: [],
      currentTurnIndex: 0,
      calledNumbers: [],
      winnerUserId: null,
      createdAt: Date.now(),
    };
    parties.set(party.roomCode, party);
    return party;
  },
  get(roomCode: string): PartyState | undefined {
    return parties.get(roomCode.toUpperCase());
  },
  remove(roomCode: string): void {
    parties.delete(roomCode.toUpperCase());
  },
};
