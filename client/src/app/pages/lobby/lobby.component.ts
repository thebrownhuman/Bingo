import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { AdminService, ManagedUser } from '../../core/admin.service';
import { PlayerProfile, PlayerProfileService } from '../../core/player-profile.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutModule, ButtonsModule, InputsModule, DialogModule, IndicatorsModule],
  templateUrl: './lobby.component.html',
})
export class LobbyComponent implements OnInit {
  roomCodeInput = '';
  errorMessage = signal<string | null>(null);
  busy = signal(false);

  managedUsers = signal<ManagedUser[]>([]);
  newUsername = '';
  newPassword = '';
  newDisplayName = '';
  managePlayersError = signal<string | null>(null);
  managePlayersBusy = signal(false);

  profile = signal<PlayerProfile | null>(null);
  profileLoading = signal(false);

  constructor(
    public auth: AuthService,
    private socket: SocketService,
    private router: Router,
    private admin: AdminService,
    private playerProfile: PlayerProfileService
  ) {}

  ngOnInit(): void {
    this.socket.connect();
    if (this.auth.user?.role === 'admin') {
      this.refreshUsers();
    }
  }

  get initials(): string {
    const name = this.auth.user?.displayName ?? '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  async createParty(): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    const ack = await this.socket.createParty();
    this.busy.set(false);
    if (!ack.ok) {
      this.errorMessage.set(ack.error ?? 'Could not create a party.');
      return;
    }
    this.router.navigate(['/room', ack['roomCode']]);
  }

  async joinParty(): Promise<void> {
    const code = this.roomCodeInput.trim().toUpperCase();
    if (!code) {
      this.errorMessage.set('Enter a room code.');
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    const ack = await this.socket.joinParty(code);
    this.busy.set(false);
    if (!ack.ok) {
      this.errorMessage.set(ack.error ?? 'Could not join that room.');
      return;
    }
    this.router.navigate(['/room', code]);
  }

  logout(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  async openMyProfile(): Promise<void> {
    if (!this.auth.user) return;
    this.profileLoading.set(true);
    try {
      this.profile.set(await this.playerProfile.getProfile(this.auth.user.username));
    } catch {
      this.errorMessage.set('Could not load your profile.');
    } finally {
      this.profileLoading.set(false);
    }
  }

  closeProfile(): void {
    this.profile.set(null);
  }

  private async refreshUsers(): Promise<void> {
    try {
      this.managedUsers.set(await this.admin.listUsers());
    } catch {
      this.managePlayersError.set('Could not load player accounts.');
    }
  }

  async addPlayer(): Promise<void> {
    if (!this.newUsername.trim() || !this.newPassword || !this.newDisplayName.trim()) {
      this.managePlayersError.set('Fill in username, password, and display name.');
      return;
    }
    this.managePlayersBusy.set(true);
    this.managePlayersError.set(null);
    try {
      await this.admin.createPlayer(this.newUsername.trim(), this.newPassword, this.newDisplayName.trim());
      this.newUsername = '';
      this.newPassword = '';
      this.newDisplayName = '';
      await this.refreshUsers();
    } catch (err) {
      const message =
        (err as { error?: { error?: { message?: string } } })?.error?.error?.message ?? 'Could not create account.';
      this.managePlayersError.set(message);
    } finally {
      this.managePlayersBusy.set(false);
    }
  }

  async removePlayer(userId: string): Promise<void> {
    this.managePlayersBusy.set(true);
    this.managePlayersError.set(null);
    try {
      await this.admin.deletePlayer(userId);
      await this.refreshUsers();
    } catch (err) {
      const message =
        (err as { error?: { error?: { message?: string } } })?.error?.error?.message ?? 'Could not delete account.';
      this.managePlayersError.set(message);
    } finally {
      this.managePlayersBusy.set(false);
    }
  }
}
