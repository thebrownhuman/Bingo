/**
 * Derives the backend URL from whatever host the browser used to load this
 * page. This is what makes "runs on the host's laptop, other phones join
 * over LAN" work without hardcoding an IP: a phone that loaded the app via
 * http://192.168.1.42:4200 will talk to the API at http://192.168.1.42:3000
 * automatically, same as the host loading it via localhost.
 */
const SERVER_PORT = 3000;

export function serverUrl(): string {
  return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
}
