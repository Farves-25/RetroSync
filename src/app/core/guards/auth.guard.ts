import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PRESET_COLLABORATORS } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // "Open 2nd tab" links carry a persona so two tabs can act as different people.
  const userParam = route.queryParamMap.get('user');
  const uidParam = route.queryParamMap.get('uid');

  if (userParam || uidParam) {
    const found = PRESET_COLLABORATORS.find(p => p.name.toLowerCase() === userParam?.toLowerCase());
    const role = found ? found.role : 'Team Member';
    const color = found ? found.color : '#ec4899';
    authService.createPersona(userParam || 'Maya Lin', role, color, uidParam || undefined);
    return true;
  }

  // Wait for a persisted / OAuth / magic-link session to be restored before deciding.
  await authService.ready;

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
