import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './auth/auth.routes';
import { registerSocketHandlers } from './socket/socket';

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
registerSocketHandlers(io);

// Bind to 0.0.0.0 (not just localhost) so other devices on the same LAN can reach this server.
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Bingo Party server listening on port ${PORT}`);
  console.log('Other devices on the same WiFi can connect using this machine\'s LAN IP.');
});
