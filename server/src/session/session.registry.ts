// Tracks the single "active" socket per user account, independent of which
// party they're in. Used to detect "you're already logged in elsewhere" and
// let the new login either back off or forcibly take over (kicking the old
// connection). Socket.IO's own connect/disconnect events double as the
// heartbeat here — no separate polling endpoint needed.
const activeSocketByUser = new Map<string, string>();

export const sessionRegistry = {
  activeSocketId(userId: string): string | undefined {
    return activeSocketByUser.get(userId);
  },
  claim(userId: string, socketId: string): void {
    activeSocketByUser.set(userId, socketId);
  },
  releaseIfCurrent(userId: string, socketId: string): void {
    if (activeSocketByUser.get(userId) === socketId) {
      activeSocketByUser.delete(userId);
    }
  },
};
