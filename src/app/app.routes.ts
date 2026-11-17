import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/board-list.component').then(m => m.BoardListComponent)
  },
  {
    path: 'board/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/board/board.component').then(m => m.BoardComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
