import fs from 'fs';
import path from 'path';
import { User } from '../types';

const FILE_PATH = path.join(__dirname, 'users.json');

function readAll(): User[] {
  if (!fs.existsSync(FILE_PATH)) {
    return [];
  }
  const raw = fs.readFileSync(FILE_PATH, 'utf-8');
  return JSON.parse(raw) as User[];
}

function writeAll(users: User[]): void {
  fs.writeFileSync(FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

export const userStore = {
  all(): User[] {
    return readAll();
  },
  byUsername(username: string): User | undefined {
    return readAll().find((u) => u.username.toLowerCase() === username.toLowerCase());
  },
  byId(id: string): User | undefined {
    return readAll().find((u) => u.id === id);
  },
  upsert(user: User): void {
    const users = readAll();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    writeAll(users);
  },
};
