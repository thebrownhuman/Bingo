import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { serverUrl } from './server.config';

export interface ManagedUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'player';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  async listUsers(): Promise<ManagedUser[]> {
    const result = await firstValueFrom(
      this.http.get<{ users: ManagedUser[] }>(`${serverUrl()}/api/admin/users`, { headers: this.authHeaders() })
    );
    return result.users;
  }

  async createPlayer(username: string, password: string, displayName: string): Promise<ManagedUser> {
    const result = await firstValueFrom(
      this.http.post<{ user: ManagedUser }>(
        `${serverUrl()}/api/admin/users`,
        { username, password, displayName },
        { headers: this.authHeaders() }
      )
    );
    return result.user;
  }

  async deletePlayer(userId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${serverUrl()}/api/admin/users/delete`, { userId }, { headers: this.authHeaders() })
    );
  }
}
