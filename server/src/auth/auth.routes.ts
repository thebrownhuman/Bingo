import { Router } from 'express';
import { authService } from './auth.service';

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
