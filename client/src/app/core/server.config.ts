/**
 * The app is always served under the `/bingo` base path (see `<base href>` in
 * index.html) — both for LAN play (http://<host>:4011/bingo/) and for the
 * public deploy behind Cloudflare (https://shivanshmishra.in/bingo/). nginx
 * proxies `/bingo/api/*` and the `/bingo/socket.io` path to the backend on
 * the same origin, so REST calls and the socket connection never need a
 * separate port or hardcoded hostname — everything is same-origin.
 */

/** Prefix REST calls with this, e.g. `${serverUrl()}/api/auth/login`. */
export function serverUrl(): string {
  return document.baseURI.replace(/\/$/, '');
}

/** Socket.IO's own path option — passed alongside `window.location.origin`. */
export const SOCKET_IO_PATH = '/bingo/socket.io';
