import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authService } from './auth.service';
import { requireAuth, AuthedRequest } from './auth.middleware';
import { userStore } from '../db/userStore';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: { message: 'Enter a username and password.' } });
    return;
  }
  const result = authService.login(username, password);
  if (!result) {
    res.status(401).json({ error: { message: "Those credentials don't match." } });
    return;
  }
  res.json(result);
});

authRouter.post('/change-password', requireAuth, (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: { message: 'Enter your current and new password.' } });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: { message: 'New password must be at least 6 characters.' } });
    return;
  }
  const user = userStore.byId(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: { message: 'Account not found.' } });
    return;
  }
  if (!bcrypt.compareSync(String(currentPassword), user.passwordHash)) {
    res.status(401).json({ error: { message: 'Current password is incorrect.' } });
    return;
  }
  user.passwordHash = bcrypt.hashSync(String(newPassword), 10);
  userStore.upsert(user);
  res.json({ ok: true });
});
