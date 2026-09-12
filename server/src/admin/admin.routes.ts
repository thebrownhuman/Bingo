import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { requireAdmin, AuthedRequest } from '../auth/auth.middleware';
import { userStore } from '../db/userStore';
import { User } from '../types';

export const adminRouter = Router();

function toPublicUser(user: User) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

adminRouter.get('/users', requireAdmin, (_req, res) => {
  res.json({ users: userStore.all().map(toPublicUser) });
});

adminRouter.post('/users', requireAdmin, (req, res) => {
  const { username, password, displayName } = req.body ?? {};
  if (!username || !password || !displayName) {
    res.status(400).json({ error: { message: 'Enter a username, password, and display name.' } });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: { message: 'Password must be at least 6 characters.' } });
    return;
  }
  if (userStore.byUsername(username)) {
    res.status(409).json({ error: { message: 'That username is already taken.' } });
    return;
  }
  const user: User = {
    id: randomUUID(),
    username: String(username).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    displayName: String(displayName).trim(),
    role: 'player',
    games: [],
  };
  userStore.upsert(user);
  res.json({ user: toPublicUser(user) });
});

adminRouter.post('/users/password', requireAdmin, (req: AuthedRequest, res) => {
  const { userId, newPassword } = req.body ?? {};
  if (!userId || !newPassword) {
    res.status(400).json({ error: { message: 'Missing userId or newPassword.' } });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: { message: 'Password must be at least 6 characters.' } });
    return;
  }
  const target = userStore.byId(userId);
  if (!target) {
    res.status(404).json({ error: { message: 'That account no longer exists.' } });
    return;
  }
  if (target.role === 'admin' || target.role === 'super_admin') {
    res.status(403).json({ error: { message: 'Admin passwords cannot be changed here.' } });
    return;
  }
  target.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  userStore.upsert(target);
  res.json({ ok: true });
});

adminRouter.post('/users/delete', requireAdmin, (req: AuthedRequest, res) => {
  const { userId } = req.body ?? {};
  if (!userId) {
    res.status(400).json({ error: { message: 'Missing userId.' } });
    return;
  }
  const target = userStore.byId(userId);
  if (!target) {
    res.status(404).json({ error: { message: 'That account no longer exists.' } });
    return;
  }
  if (target.role === 'admin' || target.role === 'super_admin') {
    res.status(403).json({ error: { message: 'Admin accounts cannot be deleted here.' } });
    return;
  }
  userStore.remove(userId);
  res.json({ ok: true });
});
