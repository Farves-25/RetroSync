import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  // If user parameter is provided in query params, auto-initialize that persona
  const userParam = route.queryParamMap.get('user');
  if (userParam) {
    authService.signInAsDemoUser(userParam);
    return true;
  }

  // Initialize default guest participant for frictionless direct board viewing
  authService.signInAsDemoUser('Alex Rivera');
  return true;
};
