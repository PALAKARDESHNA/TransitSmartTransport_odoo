import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrapper">
      <!-- LEFT PANEL: Brand Info (Light Cream Background) -->
      <div class="brand-panel">
        <div class="brand-content animate-slide-up">
          <div class="brand-logo-area">
            <span class="logo-text">TransitOps</span>
            <span class="logo-dot">.</span>
          </div>
          <h2 class="brand-headline">Smart Transport Operations Platform</h2>
          <p class="brand-desc">
            An enterprise-grade fleet intelligence suite designed for real-time dispatch control, compliance tracking, and operational cost auditing.
          </p>

          <div class="role-overview">
            <h3 class="role-title">Platform Access Matrix</h3>
            <ul class="role-list">
              <li>
                <div class="role-bullet bullet-manager"></div>
                <div>
                  <strong>Fleet Manager:</strong> Full control over registry, drivers, dispatches, maintenance, and system configurations.
                </div>
              </li>
              <li>
                <div class="role-bullet bullet-dispatcher"></div>
                <div>
                  <strong>Dispatcher:</strong> Direct authority to draft, validate, and execute trip assignments.
                </div>
              </li>
              <li>
                <div class="role-bullet bullet-safety"></div>
                <div>
                  <strong>Safety Officer:</strong> Monitors safety metrics, license compliance, and suspended status controls.
                </div>
              </li>
              <li>
                <div class="role-bullet bullet-finance"></div>
                <div>
                  <strong>Financial Analyst:</strong> Real-time cost rolled up reports, operational margins, and vehicle ROI tracking.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Authentication Form (Dark Slate Background) -->
      <div class="form-panel">
        <div class="login-card animate-fade-in">
          <div class="login-header">
            <h1>Sign in to your account</h1>
            <p class="text-muted">Enter credentials or use the rapid credentials helper below.</p>
          </div>

          <!-- Alert Banner -->
          <div class="alert-banner" *ngIf="errorMessage()">
            <mat-icon class="alert-icon">error</mat-icon>
            <span class="alert-text">{{ errorMessage() }}</span>
          </div>

          <!-- Login Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <mat-form-field appearance="outline" class="custom-field">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" placeholder="email@transitops.com" formControlName="email" autocomplete="username">
              <mat-icon matSuffix>mail_outline</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Invalid email address</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="custom-field">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" autocomplete="current-password">
              <button mat-icon-button matSuffix (click)="togglePasswordVisibility($event)" type="button">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            <div class="form-options">
              <mat-checkbox color="primary">Remember me</mat-checkbox>
              <a href="#" class="forgot-pass-link" (click)="$event.preventDefault()">Forgot password?</a>
            </div>

            <button mat-flat-button class="btn-accent full-width-btn" type="submit" [disabled]="loginForm.invalid">
              Sign In
            </button>
          </form>

          <!-- RAPID CREDENTIALS HELPER -->
          <div class="credentials-helper">
            <div class="divider">
              <span>Demo Quick Login</span>
            </div>
            <p class="helper-subtitle">Click to pre-fill and sign in with role-filtered workspace views:</p>
            <div class="helper-buttons">
              <button mat-stroked-button class="btn-secondary" (click)="quickLogin('fleetmanager@transitops.com')">
                Fleet Manager
              </button>
              <button mat-stroked-button class="btn-secondary" (click)="quickLogin('dispatcher@transitops.com')">
                Dispatcher
              </button>
              <button mat-stroked-button class="btn-secondary" (click)="quickLogin('safetyofficer@transitops.com')">
                Safety Officer
              </button>
              <button mat-stroked-button class="btn-secondary" (click)="quickLogin('finance@transitops.com')">
                Finance Analyst
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    // Brand Panel (Left Panel)
    .brand-panel {
      width: 42%;
      background-color: #f7f5ef; // Warm Light/Cream
      color: #12151c;
      padding: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(0, 0, 0, 0.05);

      @media (max-width: 960px) {
        display: none; // Hide on tablet and mobile
      }
    }

    .brand-content {
      max-width: 480px;
    }

    .brand-logo-area {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: baseline;
      color: #12151c;
    }

    .logo-dot {
      color: var(--primary-accent);
      font-size: 2.5rem;
    }

    .brand-headline {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 16px;
      line-height: 1.3;
      color: #1e2229;
    }

    .brand-desc {
      font-size: 0.95rem;
      color: #555b66;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .role-overview {
      background-color: rgba(0, 0, 0, 0.03);
      border-radius: 8px;
      padding: 24px;
      border: 1px solid rgba(0, 0, 0, 0.04);
    }

    .role-title {
      font-size: 0.9rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      color: #12151c;
    }

    .role-list {
      list-style-type: none;
      display: flex;
      flex-direction: column;
      gap: 16px;

      li {
        display: flex;
        gap: 12px;
        font-size: 0.85rem;
        line-height: 1.5;
        color: #444952;
      }
    }

    .role-bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .bullet-manager { background-color: var(--status-green); }
    .bullet-dispatcher { background-color: var(--status-blue); }
    .bullet-safety { background-color: var(--status-orange); }
    .bullet-finance { background-color: #a855f7; }

    // Form Panel (Right Panel)
    .form-panel {
      flex: 1;
      background-color: var(--bg-main);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      padding: 40px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .login-header {
      margin-bottom: 28px;
      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--text-primary);
      }
      p {
        font-size: 0.85rem;
      }
    }

    .alert-banner {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--status-red);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
    }

    .alert-icon {
      font-size: 1.25rem;
      width: 20px;
      height: 20px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .custom-field {
      width: 100%;
    }

    .form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: -4px;
    }

    .forgot-pass-link {
      color: var(--primary-accent);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }

    .full-width-btn {
      width: 100%;
      padding: 12px !important;
      font-size: 1rem !important;
      margin-top: 10px;
    }

    .credentials-helper {
      margin-top: 32px;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;

      &::before, &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border-color);
      }

      span {
        padding: 0 10px;
      }
    }

    .helper-subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-align: center;
      margin-bottom: 14px;
    }

    .helper-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;

      button {
        font-size: 0.75rem !important;
        padding: 6px 4px !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  hidePassword = signal(true);
  errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update(v => !v);
    event.stopPropagation();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    const result = this.authService.login(email, password);
    if (result.success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(result.error || 'Authentication failed');
    }
  }

  quickLogin(email: string): void {
    this.errorMessage.set(null);
    this.loginForm.patchValue({
      email: email,
      password: 'password123'
    });
    this.onSubmit();
  }
}
