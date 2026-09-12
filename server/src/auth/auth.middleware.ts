import { NextFunction, Request, Response } from 'express';
import { authService, TokenPayload } from './auth.service';

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: { message: 'Sign in required.' } });
    return;
  }
  const payload = authService.verify(token);
  if (!payload) {
    res.status(401).json({ error: { message: 'Your session expired. Sign in again.' } });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      res.status(403).json({ error: { message: 'Only an admin can do that.' } });
      return;
    }
    next();
  });
}
