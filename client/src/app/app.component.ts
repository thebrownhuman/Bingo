import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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

  declineTakeover(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  takeOverSession(): void {
    this.socket.takeOverSession();
  }

  acknowledgeKicked(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
