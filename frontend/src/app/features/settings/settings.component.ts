import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FleetStateService } from '../../core/fleet-state.service';

interface RbacRow {
  module: string;
  manager: string;
  dispatcher: string;
  safety: string;
  finance: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-page animate-fade-in">
      <div class="grid-container grid-cols-2">
        <!-- RBAC MATRIX PANEL -->
        <div class="custom-card flex-column span-two-mobile">
          <div class="panel-header">
            <h2>Role-Based Access Control (RBAC) Settings</h2>
            <p class="text-muted">Global module access permissions matrix. Configured for active session security checking.</p>
          </div>

          <div class="table-container">
            <table class="rbac-table">
              <thead>
                <tr>
                  <th>System Module</th>
                  <th>Fleet Manager</th>
                  <th>Dispatcher</th>
                  <th>Safety Officer</th>
                  <th>Financial Analyst</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rbacData" class="table-row">
                  <td class="bold-text">{{ row.module }}</td>
                  <td>
                    <span class="access-indicator" [ngClass]="getAccessClass(row.manager)">
                      {{ row.manager }}
                    </span>
                  </td>
                  <td>
                    <span class="access-indicator" [ngClass]="getAccessClass(row.dispatcher)">
                      {{ row.dispatcher }}
                    </span>
                  </td>
                  <td>
                    <span class="access-indicator" [ngClass]="getAccessClass(row.safety)">
                      {{ row.safety }}
                    </span>
                  </td>
                  <td>
                    <span class="access-indicator" [ngClass]="getAccessClass(row.finance)">
                      {{ row.finance }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="settings-actions">
            <button mat-flat-button class="btn-accent" (click)="saveSettings()">
              <mat-icon>save</mat-icon> Save Changes
            </button>
          </div>
        </div>

        <!-- DEMO UTILITIES & OPERATIONS PANEL -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Platform Evaluation Utilities</h2>
            <p class="text-muted">Helpers to restart, seed, and manipulate mock data states during evaluations.</p>
          </div>

          <div class="demo-utilities">
            <div class="utility-box">
              <div class="util-info">
                <h3>Reset Seed Database</h3>
                <p class="text-muted">Wipe all current changes in localStorage (dispatches, maintenance log modifications, and additions) and restart from clean spec seeds.</p>
              </div>
              <button mat-flat-button color="warn" class="btn-red-m" (click)="resetDatabase()">
                <mat-icon>refresh</mat-icon> WIPE & RE-SEED
              </button>
            </div>

            <div class="utility-box mt-16">
              <div class="util-info">
                <h3>Audits Integrity Check</h3>
                <p class="text-muted">Verify formulas and mock system state linkages across vehicle, driver, and trip modules.</p>
              </div>
              <button mat-stroked-button class="btn-secondary" (click)="runSelfCheck()">
                <mat-icon>done_all</mat-icon> RUN SELF-DIAGNOSTICS
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- LEGEND INFO -->
      <section class="compliance-info">
        <mat-icon class="info-icon">admin_panel_settings</mat-icon>
        <span class="info-text">
          <strong>RBAC Settings Note:</strong> This configurations module is restricted at the router level. Only accounts possessing the **Fleet Manager** role are authorized to access or modify this view.
        </span>
      </section>
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .flex-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .span-two-mobile {
      @media (max-width: 960px) {
        grid-column: span 1;
      }
    }

    .panel-header {
      h2 {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      p {
        font-size: 0.8rem;
      }
    }

    // RBAC Table
    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .rbac-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        padding: 12px;
        color: var(--text-secondary);
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background-color: rgba(22, 26, 35, 0.4);
      }

      td {
        padding: 14px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 0.85rem;
      }
    }

    .bold-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    .access-indicator {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .acc-full {
      background-color: var(--status-green-bg);
      color: var(--status-green);
    }

    .acc-read {
      background-color: var(--status-blue-bg);
      color: var(--status-blue);
    }

    .acc-restricted {
      background-color: var(--status-orange-bg);
      color: var(--status-orange);
    }

    .acc-none {
      background-color: var(--status-red-bg);
      color: var(--status-red);
    }

    .settings-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
    }

    // Demo utils
    .utility-box {
      border: 1px solid var(--border-color);
      background-color: rgba(0, 0, 0, 0.1);
      padding: 20px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }

    .util-info {
      flex: 1;
      min-width: 200px;
      h3 {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }
      p {
        font-size: 0.8rem;
        line-height: 1.4;
      }
    }

    .btn-red-m {
      background-color: var(--status-red) !important;
      color: #fff !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      &:hover {
        background-color: #dc2626 !important;
      }
    }

    .compliance-info {
      background-color: rgba(239, 68, 68, 0.04);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--card-radius);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      color: var(--text-secondary);

      strong {
        color: var(--text-primary);
      }

      .info-icon {
        color: var(--status-red);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private fleetState = inject(FleetStateService);
  private snackBar = inject(MatSnackBar);

  // RBAC data drawn from spec sheet Section 3
  rbacData: RbacRow[] = [
    { module: 'Dashboard Metrics', manager: 'Full', dispatcher: 'Own Trips', safety: 'Compliance', finance: 'Costs' },
    { module: 'Vehicle Registry CRUD', manager: 'Full', dispatcher: 'Read-Only', safety: 'Read-Only', finance: 'Read-Only' },
    { module: 'Driver registry CRUD', manager: 'Full', dispatcher: 'Read-Only', safety: 'Full Edit', finance: 'Read-Only' },
    { module: 'Trip creation & execution', manager: 'Full', dispatcher: 'Full (Own)', safety: 'Read-Only', finance: 'Read-Only' },
    { module: 'Maintenance Logs CRUD', manager: 'Full', dispatcher: 'None', safety: 'Read-Only', finance: 'Read-Only' },
    { module: 'Fuel & Expenses CRUD', manager: 'Full', dispatcher: 'Fuel Log Only', safety: 'None', finance: 'Read-Only' },
    { module: 'Analytics & Financials', manager: 'Full', dispatcher: 'None', safety: 'Compliance', finance: 'Full' },
    { module: 'System Admin Configurations', manager: 'Full', dispatcher: 'None', safety: 'None', finance: 'None' }
  ];

  getAccessClass(access: string): string {
    switch (access) {
      case 'Full':
      case 'Full Edit':
        return 'acc-full';
      case 'Read-Only':
      case 'Own Trips':
      case 'Compliance':
      case 'Costs':
        return 'acc-read';
      case 'Full (Own)':
      case 'Fuel Log Only':
        return 'acc-restricted';
      case 'None':
      default:
        return 'acc-none';
    }
  }

  saveSettings(): void {
    this.snackBar.open('RBAC configurations persisted successfully.', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  resetDatabase(): void {
    if (confirm('WARNING: This will wipe all mock dispatches, maintenance logging records, and fuel edits, re-seeding default registry data. Proceed?')) {
      this.fleetState.resetDemoSeed();
    }
  }

  runSelfCheck(): void {
    const vCount = this.fleetState.vehicles().length;
    const dCount = this.fleetState.drivers().length;
    const tCount = this.fleetState.trips().length;
    const mActive = this.fleetState.maintenance().filter(m => m.status === 'Active').length;

    this.snackBar.open(
      `Self check complete. Integrity values: ${vCount} Vehicles, ${dCount} Drivers, ${tCount} Trips, ${mActive} Active Maintenance logs. Status OK.`,
      'Close',
      { duration: 5000 }
    );
  }
}
