import { Injectable, signal, computed } from '@angular/core';
import { User } from './models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Mock accounts corresponding to the spec
  private users: User[] = [
    { id: 'u1', name: 'Frank Miller', email: 'fleetmanager@transitops.com', role: 'FleetManager', status: 'Active' },
    { id: 'u2', name: 'Dave Jenkins', email: 'dispatcher@transitops.com', role: 'Dispatcher', status: 'Active' },
    { id: 'u3', name: 'Sarah Connor', email: 'safetyofficer@transitops.com', role: 'SafetyOfficer', status: 'Active' },
    { id: 'u4', name: 'Fiona Gallagher', email: 'finance@transitops.com', role: 'FinancialAnalyst', status: 'Active' }
  ];

  // Current logged in user state using Angular Signal
  private currentUserSignal = signal<User | null>(null);

  // Expose signal read-only
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = computed(() => this.currentUserSignal() !== null);
  userRole = computed(() => this.currentUserSignal()?.role || null);

  constructor() {
    // Check if session exists in localStorage for persistence during refreshes
    const savedUser = localStorage.getItem('transitops_user');
    if (savedUser) {
      try {
        this.currentUserSignal.set(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('transitops_user');
      }
    }
  }

  getUsers(): User[] {
    return this.users;
  }

  login(email: string, password: string): { success: boolean; error?: string } {
    // Mock check: password is password123 for all users
    if (password !== 'password123') {
      return { success: false, error: 'Invalid password. Hint: use password123' };
    }

    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'User account not found' };
    }

    if (user.status === 'Inactive') {
      return { success: false, error: 'Account is deactivated' };
    }

    this.currentUserSignal.set(user);
    localStorage.setItem('transitops_user', JSON.stringify(user));
    return { success: true };
  }

  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem('transitops_user');
  }

  // Helper checking roles
  hasRole(allowedRoles: ('FleetManager' | 'Dispatcher' | 'SafetyOfficer' | 'FinancialAnalyst')[]): boolean {
    const role = this.userRole();
    if (!role) return false;
    return allowedRoles.includes(role);
  }
}
