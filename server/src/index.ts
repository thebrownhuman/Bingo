import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './auth/auth.routes';
import { adminRouter } from './admin/admin.routes';
import { playersRouter } from './players/players.routes';
import { registerSocketHandlers } from './socket/socket';

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/players', playersRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
// Path matches the reverse proxy's route so requests behind /bingo (LAN nginx
// container and the public Cloudflare deploy alike) reach this same endpoint.
const io = new Server(httpServer, { cors: { origin: '*' }, path: '/bingo/socket.io' });
registerSocketHandlers(io);

// Bind to 0.0.0.0 (not just localhost) so other devices on the same LAN can reach this server.
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Bingo Party server listening on port ${PORT}`);
  console.log('Other devices on the same WiFi can connect using this machine\'s LAN IP.');
});
