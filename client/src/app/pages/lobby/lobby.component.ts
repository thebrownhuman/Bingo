import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, LayoutModule, ButtonsModule, InputsModule],
  templateUrl: './lobby.component.html',
})
export class LobbyComponent implements OnInit {
  roomCodeInput = '';
  errorMessage = signal<string | null>(null);
  busy = signal(false);

  constructor(public auth: AuthService, private socket: SocketService, private router: Router) {}

  ngOnInit(): void {
    this.socket.connect();
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
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
