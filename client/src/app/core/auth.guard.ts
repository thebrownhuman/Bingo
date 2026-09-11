import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token) return true;
  router.navigate(['/login']);
  return false;
};

/** Keeps an already-logged-in session out of the login screen — session
 * persists across reloads/restarts until the user explicitly signs out. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token) return true;
  router.navigate(['/lobby']);
  return false;
};
