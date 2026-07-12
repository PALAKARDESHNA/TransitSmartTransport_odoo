import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as Array<'FleetManager' | 'Dispatcher' | 'SafetyOfficer' | 'FinancialAnalyst'>;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // No roles defined, public access
  }

  if (authService.hasRole(allowedRoles)) {
    return true;
  }

  // Redirect to dashboard (unauthorized)
  return router.createUrlTree(['/dashboard']);
};
