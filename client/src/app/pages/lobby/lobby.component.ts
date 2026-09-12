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

  changePasswordCurrent = '';
  changePasswordNew = '';
  changePasswordConfirm = '';
  changePasswordError = signal<string | null>(null);
  changePasswordSuccess = signal(false);
  changePasswordBusy = signal(false);

  passwordResetUserId = signal<string | null>(null);
  passwordResetValue = '';
  passwordResetError = signal<string | null>(null);
  passwordResetBusy = signal(false);

  constructor(
    public auth: AuthService,
    public socket: SocketService,
    private router: Router,
    private admin: AdminService,
    private playerProfile: PlayerProfileService
  ) {}

  ngOnInit(): void {
    this.socket.connect();
    if (this.isAdminTier) {
      this.refreshUsers();
    }
  }

  /** 'admin' and 'super_admin' both get party-hosting and player-management access. */
  get isAdminTier(): boolean {
    return this.auth.user?.role === 'admin' || this.auth.user?.role === 'super_admin';
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

  /** Jumps back into the party this session already joined, without re-entering a room code. */
  backToParty(): void {
    const roomCode = this.socket.state()?.roomCode;
    if (!roomCode) return;
    this.router.navigate(['/room', roomCode]);
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
    this.changePasswordCurrent = '';
    this.changePasswordNew = '';
    this.changePasswordConfirm = '';
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(false);
  }

  async changeMyPassword(): Promise<void> {
    this.changePasswordError.set(null);
    this.changePasswordSuccess.set(false);
    if (!this.changePasswordCurrent || !this.changePasswordNew) {
      this.changePasswordError.set('Enter your current and new password.');
      return;
    }
    if (this.changePasswordNew.length < 6) {
      this.changePasswordError.set('New password must be at least 6 characters.');
      return;
    }
    if (this.changePasswordNew !== this.changePasswordConfirm) {
      this.changePasswordError.set('New passwords do not match.');
      return;
    }
    this.changePasswordBusy.set(true);
    try {
      await this.auth.changePassword(this.changePasswordCurrent, this.changePasswordNew);
      this.changePasswordSuccess.set(true);
      this.changePasswordCurrent = '';
      this.changePasswordNew = '';
      this.changePasswordConfirm = '';
    } catch (err) {
      const message =
        (err as { error?: { error?: { message?: string } } })?.error?.error?.message ?? 'Could not change password.';
      this.changePasswordError.set(message);
    } finally {
      this.changePasswordBusy.set(false);
    }
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

  openPasswordReset(userId: string): void {
    this.passwordResetUserId.set(userId);
    this.passwordResetValue = '';
    this.passwordResetError.set(null);
  }

  cancelPasswordReset(): void {
    this.passwordResetUserId.set(null);
    this.passwordResetValue = '';
    this.passwordResetError.set(null);
  }

  async submitPasswordReset(userId: string): Promise<void> {
    if (this.passwordResetValue.length < 6) {
      this.passwordResetError.set('Password must be at least 6 characters.');
      return;
    }
    this.passwordResetBusy.set(true);
    this.passwordResetError.set(null);
    try {
      await this.admin.changePlayerPassword(userId, this.passwordResetValue);
      this.cancelPasswordReset();
    } catch (err) {
      const message =
        (err as { error?: { error?: { message?: string } } })?.error?.error?.message ?? 'Could not change password.';
      this.passwordResetError.set(message);
    } finally {
      this.passwordResetBusy.set(false);
    }
  }
}
