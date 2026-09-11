import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  theme = inject(ThemeService);
}
