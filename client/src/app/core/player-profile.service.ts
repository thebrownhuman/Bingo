import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { serverUrl } from './server.config';
import { Role } from './models';

export interface GameRecord {
  roomCode: string;
  playedAt: string;
  opponents: string[];
  won: boolean;
}

export interface PlayerProfile {
  username: string;
  displayName: string;
  role: Role;
  gamesPlayed: number;
  gamesWon: number;
  games: GameRecord[];
}

@Injectable({ providedIn: 'root' })
export class PlayerProfileService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  async getProfile(username: string): Promise<PlayerProfile> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
    return firstValueFrom(this.http.get<PlayerProfile>(`${serverUrl()}/api/players/${username}`, { headers }));
  }
}
