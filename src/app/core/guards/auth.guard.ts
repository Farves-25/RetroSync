import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService, PRESET_COLLABORATORS } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);

  // If query parameters specify a user or uid (e.g. from "Open 2nd Tab"), ALWAYS prioritize creating that distinct persona!
  const userParam = route.queryParamMap.get('user');
  const uidParam = route.queryParamMap.get('uid');

  if (userParam || uidParam) {
    const found = PRESET_COLLABORATORS.find(p => p.name.toLowerCase() === userParam?.toLowerCase());
    const role = found ? found.role : 'Team Member';
    const color = found ? found.color : '#ec4899';
    authService.createPersona(userParam || 'Maya Lin', role, color, uidParam || undefined);
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Fallback initial demo host
  authService.signInAsDemoUser('Alex Rivera');
  return true;
};
