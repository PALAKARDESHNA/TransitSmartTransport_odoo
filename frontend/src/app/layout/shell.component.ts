import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: ('FleetManager' | 'Dispatcher' | 'SafetyOfficer' | 'FinancialAnalyst')[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <!-- SIDENAV -->
      <mat-sidenav mode="side" opened class="sidenav">
        <!-- Logo Header -->
        <div class="logo-area">
          <div class="logo-accent"></div>
          <span class="logo-title">TransitOps</span>
          <span class="logo-tagline">Smart Fleet Platform</span>
        </div>

        <!-- Sidenav Nav Links -->
        <nav class="nav-links">
          <ng-container *ngFor="let item of navItems">
            <a *ngIf="hasAccess(item)"
               [routerLink]="[item.route]"
               routerLinkActive="active"
               class="nav-item">
              <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>

        <!-- Current User Profile Footer -->
        <div class="sidenav-footer" *ngIf="user()">
          <div class="user-avatar">{{ user()?.name?.charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ user()?.name }}</div>
            <div class="user-role">{{ formatRole(user()?.role) }}</div>
          </div>
          <button mat-icon-button class="logout-btn" (click)="logout()" title="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <!-- MAIN CONTENT CONTENT CONTAINER -->
      <mat-sidenav-content class="content-container">
        <!-- HEADER TOPBAR -->
        <header class="topbar">
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input type="text" placeholder="Global search vehicles, drivers, trips..." class="search-input" />
          </div>

          <div class="header-actions">
            <!-- Notifications Badge -->
            <button mat-icon-button class="header-icon-btn">
              <mat-icon class="badge-icon">notifications</mat-icon>
              <span class="notification-indicator"></span>
            </button>

            <!-- User Info chip -->
            <div class="role-chip" [ngClass]="getRoleClass(user()?.role)">
              <span class="role-dot"></span>
              {{ formatRole(user()?.role) }}
            </div>
          </div>
        </header>

        <!-- Dynamic router content goes here -->
        <main class="page-content animate-fade-in">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }

    .sidenav-container {
      height: 100%;
      width: 100%;
      background-color: var(--bg-main);
    }

    .sidenav {
      width: 240px;
      background-color: var(--bg-sidenav) !important;
      border-right: 1px solid var(--border-color) !important;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15) !important;
    }

    .logo-area {
      padding: 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      border-bottom: 1px solid var(--border-color);
    }

    .logo-accent {
      position: absolute;
      top: 24px;
      left: 10px;
      width: 4px;
      height: 24px;
      background-color: var(--primary-accent);
      border-radius: 2px;
    }

    .logo-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.5px;
      padding-left: 4px;
    }

    .logo-tagline {
      font-size: 0.7rem;
      color: var(--text-secondary);
      letter-spacing: 0.2px;
      margin-top: 4px;
      padding-left: 4px;
      text-transform: uppercase;
    }

    .nav-links {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 6px;
      transition: all var(--transition-speed) ease;
      font-size: 0.9rem;
      font-weight: 500;
      position: relative;

      &:hover {
        color: var(--text-primary);
        background-color: rgba(255, 255, 255, 0.04);
      }

      &.active {
        color: var(--primary-accent);
        background-color: rgba(245, 158, 11, 0.08);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 4px;
          background-color: var(--primary-accent);
          border-radius: 0 4px 4px 0;
        }

        .nav-icon {
          color: var(--primary-accent);
        }
      }
    }

    .nav-icon {
      font-size: 1.25rem;
      width: 20px;
      height: 20px;
      transition: color var(--transition-speed) ease;
    }

    .sidenav-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: rgba(0, 0, 0, 0.15);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--border-color);
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.1rem;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.7rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      color: var(--status-red);
      opacity: 0.8;
      &:hover {
        opacity: 1;
        background-color: rgba(239, 68, 68, 0.08);
      }
    }

    .content-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow-y: hidden !important;
      background-color: var(--bg-main) !important;
    }

    .topbar {
      height: 64px;
      background-color: rgba(15, 17, 23, 0.8);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      backdrop-filter: blur(10px);
      z-index: 10;
      flex-shrink: 0;
    }

    .search-box {
      display: flex;
      align-items: center;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 4px 14px;
      width: 320px;
      transition: all var(--transition-speed) ease;

      &:focus-within {
        border-color: var(--primary-accent);
        width: 380px;
      }
    }

    .search-icon {
      font-size: 1.15rem;
      color: var(--text-secondary);
      margin-right: 6px;
      height: 18px;
      width: 18px;
    }

    .search-input {
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-family: var(--font-family);
      font-size: 0.85rem;
      width: 100%;
      outline: none;

      &::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon-btn {
      color: var(--text-secondary);
      position: relative;

      &:hover {
        color: var(--text-primary);
      }
    }

    .notification-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 6px;
      height: 6px;
      background-color: var(--status-orange);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--status-orange);
    }

    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      border: 1px solid var(--border-color);
      background-color: rgba(255, 255, 255, 0.02);
    }

    .role-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .role-manager {
      color: var(--status-green);
      border-color: rgba(34, 197, 94, 0.3);
      .role-dot { background-color: var(--status-green); }
    }

    .role-dispatcher {
      color: var(--status-blue);
      border-color: rgba(59, 130, 246, 0.3);
      .role-dot { background-color: var(--status-blue); }
    }

    .role-safety {
      color: var(--status-orange);
      border-color: rgba(245, 158, 11, 0.3);
      .role-dot { background-color: var(--status-orange); }
    }

    .role-finance {
      color: #a855f7; // Purple accent for finance
      border-color: rgba(168, 85, 247, 0.3);
      .role-dot { background-color: #a855f7; }
    }

    .page-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      height: calc(100vh - 64px);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.currentUser;

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Vehicles', route: '/vehicles', icon: 'local_shipping' },
    { label: 'Drivers', route: '/drivers', icon: 'badge' },
    { label: 'Trips', route: '/trips', icon: 'route' },
    { label: 'Maintenance', route: '/maintenance', icon: 'build' },
    { label: 'Fuel & Expenses', route: '/fuel-expense', icon: 'local_gas_station' },
    { label: 'Analytics & Reports', route: '/analytics', icon: 'bar_chart' },
    { label: 'Settings & RBAC', route: '/settings', icon: 'settings', roles: ['FleetManager'] }
  ];

  hasAccess(item: NavItem): boolean {
    if (!item.roles) return true;
    return this.authService.hasRole(item.roles);
  }

  formatRole(role?: string): string {
    if (!role) return '';
    switch (role) {
      case 'FleetManager': return 'Fleet Manager';
      case 'Dispatcher': return 'Dispatcher';
      case 'SafetyOfficer': return 'Safety Officer';
      case 'FinancialAnalyst': return 'Financial Analyst';
      default: return role;
    }
  }

  getRoleClass(role?: string): string {
    if (!role) return '';
    switch (role) {
      case 'FleetManager': return 'role-manager';
      case 'Dispatcher': return 'role-dispatcher';
      case 'SafetyOfficer': return 'role-safety';
      case 'FinancialAnalyst': return 'role-finance';
      default: return '';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
