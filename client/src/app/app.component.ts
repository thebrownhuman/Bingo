import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { ThemeService } from './core/theme.service';
import { SocketService } from './core/socket.service';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonsModule, DialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  theme = inject(ThemeService);
  socket = inject(SocketService);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** The theme toggle only makes sense on the home screen — hide it once you're in a party/room. */
  isLobbyRoute = signal(this.router.url.startsWith('/lobby'));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.isLobbyRoute.set(this.router.url.startsWith('/lobby'));
    });
  }

  declineTakeover(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  takeOverSession(): void {
    this.socket.takeOverSession();
  }

  acknowledgeSessionKicked(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  acknowledgePartyClosed(): void {
    this.socket.acknowledgePartyClosed();
    this.router.navigate(['/lobby']);
  }

  acknowledgeKickedFromParty(): void {
    this.socket.acknowledgeKickedFromParty();
    this.router.navigate(['/lobby']);
  }
}
