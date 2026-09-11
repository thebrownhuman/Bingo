import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { ProgressBarModule } from '@progress/kendo-angular-progressbar';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { NotificationService } from '@progress/kendo-angular-notification';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { BoardSetupComponent } from '../board-setup/board-setup.component';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, BoardSetupComponent, LayoutModule, ButtonsModule, IndicatorsModule, ProgressBarModule, DialogModule],
  templateUrl: './game-room.component.html',
})
export class GameRoomComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);
  auth = inject(AuthService);
  socket = inject(SocketService);

  roomCode = '';
  errorMessage = signal<string | null>(null);
  busy = signal(false);
  private lastNotifiedTurn: string | null = null;
  private lastNotifiedCallCount = 0;

  state = this.socket.state;
  isAdmin = computed(() => this.auth.user?.userId === this.state()?.adminUserId);
  me = computed(() => this.state()?.players.find((p) => p.userId === this.auth.user?.userId));
  isMyTurn = computed(() => this.state()?.currentTurnUserId === this.auth.user?.userId);
  currentTurnPlayer = computed(() => this.state()?.players.find((p) => p.userId === this.state()?.currentTurnUserId));
  readyCount = computed(() => this.state()?.players.filter((p) => p.ready).length ?? 0);
  allReady = computed(() => (this.state()?.players.length ?? 0) > 0 && this.readyCount() === this.state()?.players.length);
  winner = computed(() => this.state()?.players.find((p) => p.userId === this.state()?.winnerUserId));
  isWinnerMe = computed(() => this.winner()?.userId === this.auth.user?.userId);

  availableNumbers = computed(() => {
    const called = new Set(this.state()?.calledNumbers ?? []);
    return Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !called.has(n));
  });

  constructor() {
    effect(() => {
      const s = this.state();
      if (!s || s.status !== 'in_progress') return;

      if (s.calledNumbers.length !== this.lastNotifiedCallCount) {
        this.lastNotifiedCallCount = s.calledNumbers.length;
        const last = s.calledNumbers[s.calledNumbers.length - 1];
        if (last !== undefined) {
          this.notification.show({
            content: `Number called: ${last}`,
            cssClass: 'bingo-toast',
            animation: { type: 'fade', duration: 200 },
            position: { horizontal: 'center', vertical: 'top' },
            type: { style: 'info', icon: true },
            hideAfter: 1800,
          });
        }
      }

      if (s.currentTurnUserId && s.currentTurnUserId !== this.lastNotifiedTurn) {
        this.lastNotifiedTurn = s.currentTurnUserId;
        if (s.currentTurnUserId === this.auth.user?.userId) {
          this.notification.show({
            content: "It's your turn — call a number!",
            cssClass: 'bingo-toast',
            animation: { type: 'slide', duration: 300 },
            position: { horizontal: 'center', vertical: 'top' },
            type: { style: 'success', icon: true },
            hideAfter: 2500,
          });
        }
      }
    });
  }

  ngOnInit(): void {
    this.roomCode = this.route.snapshot.paramMap.get('code') ?? '';
    this.socket.connect();
    if (!this.socket.state()) {
      this.socket.joinParty(this.roomCode).then((ack) => {
        if (!ack.ok) {
          this.errorMessage.set(ack.error ?? 'Could not join that room.');
          this.router.navigate(['/lobby']);
        }
      });
    }
  }

  isMarked(index: number): boolean {
    const layout = this.state()?.yourLayout ?? [];
    const number = layout[index];
    if (number === null || number === undefined) return false;
    return (this.state()?.calledNumbers ?? []).includes(number);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.notification.show({
      content: message,
      cssClass: 'bingo-toast',
      animation: { type: 'fade', duration: 200 },
      position: { horizontal: 'center', vertical: 'top' },
      type: { style: 'error', icon: true },
      hideAfter: 3000,
    });
  }

  async submitReady(layout: (number | null)[]): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    const setAck = await this.socket.setBoard(this.roomCode, layout);
    if (!setAck.ok) {
      this.showError(setAck.error ?? 'Could not save your board.');
      this.busy.set(false);
      return;
    }
    const readyAck = await this.socket.setReady(this.roomCode);
    if (!readyAck.ok) {
      this.showError(readyAck.error ?? 'Could not mark ready.');
    }
    this.busy.set(false);
  }

  async startGame(): Promise<void> {
    this.busy.set(true);
    const ack = await this.socket.startGame(this.roomCode);
    if (!ack.ok) this.showError(ack.error ?? 'Could not start the game.');
    this.busy.set(false);
  }

  async callNumber(n: number): Promise<void> {
    if (!this.isMyTurn()) return;
    this.busy.set(true);
    const ack = await this.socket.callNumber(this.roomCode, n);
    if (!ack.ok) this.showError(ack.error ?? 'Could not call that number.');
    this.busy.set(false);
  }

  backToLobby(): void {
    this.router.navigate(['/lobby']);
  }

  initialsOf(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
