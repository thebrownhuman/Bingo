import fs from 'fs';
import path from 'path';
import { User } from '../types';

// One JSON file per player, named after their username, kept outside src/ so
// ts-node-dev's file watcher never sees these writes and restarts the
// process mid-request (that restart race was silently corrupting the old
// single shared users.json file — accounts were vanishing).
const PLAYERS_DIR = path.join(__dirname, '..', '..', 'data', 'players');

function ensureDir(): void {
  if (!fs.existsSync(PLAYERS_DIR)) {
    fs.mkdirSync(PLAYERS_DIR, { recursive: true });
  }
}

function filePathFor(username: string): string {
  return path.join(PLAYERS_DIR, `${username.toLowerCase()}.json`);
}

function readFile(filePath: string): User | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const user = JSON.parse(raw) as User;
  if (!user.games) user.games = [];
  return user;
}

function writeFile(user: User): void {
  ensureDir();
  fs.writeFileSync(filePathFor(user.username), JSON.stringify(user, null, 2), 'utf-8');
}

export const userStore = {
  all(): User[] {
    ensureDir();
    return fs
      .readdirSync(PLAYERS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readFile(path.join(PLAYERS_DIR, f)))
      .filter((u): u is User => Boolean(u));
  },
  byUsername(username: string): User | undefined {
    return readFile(filePathFor(username));
  },
  byId(id: string): User | undefined {
    return this.all().find((u) => u.id === id);
  },
  upsert(user: User): void {
    writeFile({ ...user, games: user.games ?? [] });
  },
  remove(id: string): boolean {
    const user = this.byId(id);
    if (!user) return false;
    fs.unlinkSync(filePathFor(user.username));
    return true;
  },
  /** Appends a finished-game record to a player's permanent file. */
  recordGame(userId: string, record: User['games'][number]): void {
    const user = this.byId(userId);
    if (!user) return;
    user.games = [record, ...(user.games ?? [])];
    writeFile(user);
  },
};
