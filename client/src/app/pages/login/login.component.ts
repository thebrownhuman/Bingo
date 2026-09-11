import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LayoutModule, ButtonsModule, InputsModule, LabelModule, IndicatorsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  rememberMe = false;
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const remembered = this.auth.getRememberedCredentials();
    if (remembered) {
      this.username = remembered.username;
      this.password = remembered.password;
      this.rememberMe = true;
    }
  }

  async submit(): Promise<void> {
    if (!this.username.trim() || !this.password) {
      this.errorMessage.set('Enter a username and password.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.login(this.username.trim(), this.password);
      if (this.rememberMe) {
        this.auth.rememberCredentials(this.username.trim(), this.password);
      } else {
        this.auth.forgetCredentials();
      }
      this.router.navigate(['/lobby']);
    } catch (err) {
      const message =
        (err as { error?: { error?: { message?: string } } })?.error?.error?.message ??
        "Couldn't sign in. Check your credentials.";
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
