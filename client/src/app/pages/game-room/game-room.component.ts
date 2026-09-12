import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { NotificationService } from '@progress/kendo-angular-notification';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { BoardSetupComponent } from '../board-setup/board-setup.component';

/** How often to tell the server we're still here. Server marks a player away after 6s of silence (HEARTBEAT_TIMEOUT_MS), so this still leaves room for a couple of missed beats before that happens. */
const HEARTBEAT_INTERVAL_MS = 2_000;

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, BoardSetupComponent, LayoutModule, ButtonsModule, IndicatorsModule, DialogModule],
  templateUrl: './game-room.component.html',
})
export class GameRoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);
  auth = inject(AuthService);
  socket = inject(SocketService);

  roomCode = '';
  errorMessage = signal<string | null>(null);
  busy = signal(false);
  /** Players list popup — only reachable by tapping the "N players" chip while arranging. */
  playersDialogOpen = signal(false);
  /** True for a brief grace period after tapping close, to swallow a mobile ghost-click. */
  closingPlayersDialog = signal(false);
  /** Confirmation shown when a ready player wants to go back and rearrange. */
  unreadyConfirmOpen = signal(false);
  /** Confirmation shown before quitting an in-progress game. */
  quitConfirmOpen = signal(false);
  /** Player the host is about to kick, while the confirmation is open. */
  kickTarget = signal<{ userId: string; displayName: string } | null>(null);

  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.sendHeartbeat();
  };
  private handleFocus = () => this.sendHeartbeat();

  state = this.socket.state;
  /** Whoever created this specific room — controls starting the game and restarting after it ends. */
  isHost = computed(() => this.auth.user?.userId === this.state()?.adminUserId);
  me = computed(() => this.state()?.players.find((p) => p.userId === this.auth.user?.userId));
  isMyTurn = computed(() => this.state()?.currentTurnUserId === this.auth.user?.userId);
  currentTurnPlayer = computed(() => this.state()?.players.find((p) => p.userId === this.state()?.currentTurnUserId));
  readyCount = computed(() => this.state()?.players.filter((p) => p.ready).length ?? 0);
  allReady = computed(() => (this.state()?.players.length ?? 0) > 0 && this.readyCount() === this.state()?.players.length);
  winners = computed(() => {
    const winnerIds = new Set(this.state()?.winnerUserIds ?? []);
    return this.state()?.players.filter((p) => winnerIds.has(p.userId)) ?? [];
  });
  /** "Alka", "Alka & Dixit", or "Alka, Dixit & Suivant" for however many co-winners there are. */
  winnerNames = computed(() => {
    const names = this.winners().map((w) => w.displayName);
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  });
  isWinnerMe = computed(() => this.winners().some((w) => w.userId === this.auth.user?.userId));
  hasQuit = computed(() => this.me()?.quit ?? false);

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
    this.startHeartbeat();
  }

  ngOnDestroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
  }

  private sendHeartbeat(): void {
    if (this.roomCode) this.socket.sendHeartbeat(this.roomCode);
  }

  /**
   * Pings the server on an interval, plus immediately whenever the tab comes
   * back to the foreground or the window regains focus — that's the case
   * that matters most: the screen was off (or the tab backgrounded) for a
   * while, and we want the server to see we're back right away instead of
   * waiting for the next tick.
   */
  private startHeartbeat(): void {
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
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

  /** Tapping a cell on your own board calls that number directly, instead of picking it from a separate list. */
  async callFromGrid(index: number): Promise<void> {
    if (!this.isMyTurn() || this.busy()) return;
    const number = this.state()?.yourLayout[index];
    if (number === null || number === undefined) return;
    if (this.isMarked(index)) return;
    await this.callNumber(number);
  }

  /** Leaves to the home screen. The party itself stays alive until its host disconnects. */
  backToLobby(): void {
    this.router.navigate(['/lobby']);
  }

  /** Resets this same room back to setup so everyone can play another round. */
  async playAgain(): Promise<void> {
    this.busy.set(true);
    const ack = await this.socket.restartGame(this.roomCode);
    if (!ack.ok) this.showError(ack.error ?? 'Could not start a new game.');
    this.busy.set(false);
  }

  openQuitConfirm(): void {
    this.quitConfirmOpen.set(true);
  }

  cancelQuit(): void {
    this.quitConfirmOpen.set(false);
  }

  /**
   * Quitting counts as an immediate loss and drops you out of the turn
   * order, but the game keeps going for everyone else — you just leave and
   * don't wait around for it to finish.
   */
  async confirmQuit(): Promise<void> {
    this.busy.set(true);
    const ack = await this.socket.quitGame(this.roomCode);
    this.busy.set(false);
    this.quitConfirmOpen.set(false);
    if (!ack.ok) {
      this.showError(ack.error ?? 'Could not quit the game.');
      return;
    }
    this.router.navigate(['/lobby']);
  }

  openKickConfirm(userId: string, displayName: string): void {
    this.kickTarget.set({ userId, displayName });
  }

  cancelKick(): void {
    this.kickTarget.set(null);
  }

  /**
   * Only the host can do this, to anyone but themselves. Before the game
   * starts it drops the player entirely; once it's in progress it has the
   * same effect as that player quitting themselves.
   */
  async confirmKick(): Promise<void> {
    const target = this.kickTarget();
    if (!target) return;
    this.busy.set(true);
    const ack = await this.socket.kickPlayer(this.roomCode, target.userId);
    this.busy.set(false);
    this.kickTarget.set(null);
    if (!ack.ok) this.showError(ack.error ?? 'Could not remove that player.');
  }

  openPlayersDialog(): void {
    if (this.closingPlayersDialog()) return;
    this.playersDialogOpen.set(true);
  }

  /**
   * On mobile, the same touch that taps the close button can register as a
   * "ghost click" a moment later on whatever is now underneath it (a board
   * cell) once the dialog and its backdrop are removed from the DOM. Keep
   * the (now-disabled) dialog mounted for a beat after closing so it keeps
   * absorbing taps until that ghost click has had a chance to land on it
   * instead of the grid.
   */
  closePlayersDialog(): void {
    if (this.closingPlayersDialog()) return;
    this.closingPlayersDialog.set(true);
    setTimeout(() => {
      this.playersDialogOpen.set(false);
      this.closingPlayersDialog.set(false);
    }, 500);
  }

  openUnreadyConfirm(): void {
    this.unreadyConfirmOpen.set(true);
  }

  keepReady(): void {
    this.unreadyConfirmOpen.set(false);
  }

  /** Un-readies this player so they can reshuffle/rearrange their board. */
  async goBackToRearranging(): Promise<void> {
    this.busy.set(true);
    const ack = await this.socket.setNotReady(this.roomCode);
    if (!ack.ok) this.showError(ack.error ?? 'Could not go back to rearranging.');
    this.busy.set(false);
    this.unreadyConfirmOpen.set(false);
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
