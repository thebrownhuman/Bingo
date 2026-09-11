import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userStore } from '../db/userStore';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'bingo-party-local-dev-secret';
const TOKEN_EXPIRY_SECONDS = 60 * 60 * 12; // 12 hours, more than enough for a local play session

export interface TokenPayload {
  userId: string;
  username: string;
  displayName: string;
  role: User['role'];
}

export const authService = {
  login(username: string, password: string): { token: string; user: TokenPayload } | null {
    const user = userStore.byUsername(username);
    if (!user) {
      return null;
    }
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return null;
    }
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY_SECONDS });
    return { token, user: payload };
  },
  verify(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  },
};
