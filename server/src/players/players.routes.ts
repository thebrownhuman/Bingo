import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { userStore } from '../db/userStore';

export const playersRouter = Router();

playersRouter.get('/:username', requireAuth, (req, res) => {
  const user = userStore.byUsername(req.params.username);
  if (!user) {
    res.status(404).json({ error: { message: 'No player with that username.' } });
    return;
  }
  const gamesPlayed = user.games.length;
  const gamesWon = user.games.filter((g) => g.won).length;
  res.json({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    gamesPlayed,
    gamesWon,
    games: user.games,
  });
});
