import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthUser } from './models';
import { serverUrl } from './server.config';

const STORAGE_KEY = 'bingo-party-auth';
const REMEMBER_KEY = 'bingo-party-remember';

interface StoredAuth {
  token: string;
  user: AuthUser;
}

interface RememberedCredentials {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly current = signal<StoredAuth | null>(this.readStorage());

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return this.current()?.token ?? null;
  }

  get user(): AuthUser | null {
    return this.current()?.user ?? null;
  }

  async login(username: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<StoredAuth>(`${serverUrl()}/api/auth/login`, { username, password })
    );
    this.current.set(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  logout(): void {
    this.current.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token}` });
    await firstValueFrom(
      this.http.post(`${serverUrl()}/api/auth/change-password`, { currentPassword, newPassword }, { headers })
    );
    // Keep "remember me" auto-login working after the password changes.
    const remembered = this.getRememberedCredentials();
    if (remembered && remembered.username === this.user?.username) {
      this.rememberCredentials(remembered.username, newPassword);
    }
  }

  rememberCredentials(username: string, password: string): void {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
  }

  forgetCredentials(): void {
    localStorage.removeItem(REMEMBER_KEY);
  }

  getRememberedCredentials(): RememberedCredentials | null {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RememberedCredentials;
    } catch {
      return null;
    }
  }

  private readStorage(): StoredAuth | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredAuth;
    } catch {
      return null;
    }
  }
}
