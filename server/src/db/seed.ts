import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { userStore } from './userStore';
import { User } from '../types';

/**
 * Run with `npm run seed`. Edit ACCOUNTS below, then re-run any time to add
 * more players — existing usernames are left untouched.
 */
const ACCOUNTS: Array<{ username: string; password: string; displayName: string; role: 'admin' | 'player' }> = [
  { username: 'admin', password: 'admin123', displayName: 'Shivansh', role: 'admin' },
  { username: 'player1', password: 'player123', displayName: 'Player One', role: 'player' },
  { username: 'player2', password: 'player123', displayName: 'Player Two', role: 'player' },
  { username: 'player3', password: 'player123', displayName: 'Player Three', role: 'player' },
  { username: 'player4', password: 'player123', displayName: 'Player Four', role: 'player' },
];

function seed() {
  for (const account of ACCOUNTS) {
    const existing = userStore.byUsername(account.username);
    if (existing) {
      console.log(`Skipping existing user: ${account.username}`);
      continue;
    }
    const user: User = {
      id: randomUUID(),
      username: account.username,
      passwordHash: bcrypt.hashSync(account.password, 10),
      displayName: account.displayName,
      role: account.role,
    };
    userStore.upsert(user);
    console.log(`Created user: ${account.username} / ${account.password} (${account.role})`);
  }
}

seed();
