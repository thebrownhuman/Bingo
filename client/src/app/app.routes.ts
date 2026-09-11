import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: 'room/:code',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/game-room/game-room.component').then((m) => m.GameRoomComponent),
  },
  { path: '**', redirectTo: 'login' },
];
