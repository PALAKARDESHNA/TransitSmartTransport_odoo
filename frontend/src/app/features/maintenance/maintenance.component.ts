import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FleetStateService } from '../../core/fleet-state.service';
import { AuthService } from '../../core/auth.service';
import { Vehicle, MaintenanceLog } from '../../core/models';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="maintenance-page animate-fade-in">
      <div class="grid-container grid-cols-2">
        <!-- LEFT PANEL: LOG FORM (AUTHORIZED ROLE ONLY) -->
        <div class="custom-card flex-column" *ngIf="canWrite(); else roForm">
          <div class="panel-header">
            <h2>Log Maintenance Record</h2>
            <p class="text-muted">Place a vehicle into servicing status instantly.</p>
          </div>

          <form [formGroup]="maintenanceForm" (ngSubmit)="onSubmitMaintenance()" class="maint-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select Vehicle</mat-label>
              <mat-select formControlName="vehicleId">
                <mat-option *ngFor="let v of eligibleVehicles()" [value]="v.id">
                  {{ v.registrationNumber }} — {{ v.name }} (Current: {{ v.status }})
                </mat-option>
                <mat-option *ngIf="eligibleVehicles().length === 0" disabled>
                  No vehicles eligible for shop maintenance.
                </mat-option>
              </mat-select>
              <mat-error *ngIf="maintenanceForm.get('vehicleId')?.hasError('required')">Vehicle is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Maintenance Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="Oil Change">Oil Change & Filters</mat-option>
                <mat-option value="Tire Rotation">Tire Rotation & Alignment</mat-option>
                <mat-option value="Brake Servicing">Brake Replacement / Service</mat-option>
                <mat-option value="Engine Repair">Engine/Transmission Diagnostic</mat-option>
                <mat-option value="Electrical Repair">Electrical/Battery Repair</mat-option>
                <mat-option value="Annual Inspection">Annual Regulatory Inspection</mat-option>
              </mat-select>
              <mat-error *ngIf="maintenanceForm.get('type')?.hasError('required')">Type is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Estimated Cost ($)</mat-label>
              <input matInput type="number" formControlName="cost" placeholder="e.g. 500">
              <mat-error *ngIf="maintenanceForm.get('cost')?.hasError('required')">Cost is required</mat-error>
              <mat-error *ngIf="maintenanceForm.get('cost')?.hasError('min')">Must be positive</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Detailed Work Order Description</mat-label>
              <textarea matInput rows="3" formControlName="description" placeholder="Specify mechanics notes, parts ordered, or work details..."></textarea>
              <mat-error *ngIf="maintenanceForm.get('description')?.hasError('required')">Description is required</mat-error>
            </mat-form-field>

            <button mat-flat-button class="btn-accent full-width" type="submit" [disabled]="maintenanceForm.invalid">
              Register Shop Work Order
            </button>
          </form>
        </div>

        <!-- READ-ONLY FALLBACK FOR NON-ADMIN WRITING -->
        <ng-template #roForm>
          <div class="custom-card ro-card text-center flex-column">
            <mat-icon class="ro-icon">lock_outline</mat-icon>
            <h2>Work Orders Restricted</h2>
            <p class="text-muted">Only Fleet Managers are authorized to register new shop work orders. Your current access level is Read-Only.</p>
          </div>
        </ng-template>

        <!-- RIGHT PANEL: MAINTENANCE LOG TABLE -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Maintenance Logs</h2>
            <p class="text-muted">Active shop orders and historical repair closures.</p>
          </div>

          <div class="table-container">
            <table class="maint-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Order Type & Date</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th class="text-right" *ngIf="canWrite()">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of maintenance()" class="table-row">
                  <td>
                    <div class="vehicle-cell">
                      <strong>{{ getVehicleReg(log.vehicleId) }}</strong>
                      <span class="subtext">{{ getVehicleName(log.vehicleId) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="type-cell">
                      <strong>{{ log.type }}</strong>
                      <span class="subtext">Opened: {{ log.startDate | date:'shortDate' }}</span>
                    </div>
                  </td>
                  <td>\${{ log.cost | number }}</td>
                  <td>
                    <span class="status-badge" [ngClass]="log.status === 'Active' ? 'status-orange' : 'status-green'">
                      {{ log.status === 'Active' ? 'In Shop' : 'Closed' }}
                    </span>
                  </td>
                  <td class="text-right" *ngIf="canWrite()">
                    <button mat-flat-button class="btn-green text-xs" *ngIf="log.status === 'Active'" (click)="onCloseMaintenance(log.id)">
                      Close
                    </button>
                    <span class="text-muted text-xs" *ngIf="log.status === 'Closed'">Closed</span>
                  </td>
                </tr>
                <tr *ngIf="maintenance().length === 0">
                  <td colspan="5" class="empty-cell">No maintenance history recorded.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- LEGEND BANNER -->
      <section class="compliance-info">
        <mat-icon class="info-icon">build</mat-icon>
        <span class="info-text">
          <strong>Automatic Fleet Status Sync:</strong> Registering a maintenance work order shifts the vehicle's status to **In Shop** (orange), blocking it from trips. Closing the order rolls it back to **Available** (green) and records it in Operational Expenses.
        </span>
      </section>
    </div>
  `,
  styles: [`
    .maintenance-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .flex-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
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

    .maint-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .full-width {
      width: 100%;
    }

    // Tables
    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .maint-table {
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

    .table-row {
      transition: background-color var(--transition-speed) ease;
      &:hover {
        background-color: rgba(255, 255, 255, 0.02);
      }
    }

    .vehicle-cell, .type-cell {
      display: flex;
      flex-direction: column;
      .subtext {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
    }

    .text-right {
      text-align: right;
    }

    .text-xs {
      font-size: 0.75rem;
    }

    .btn-green {
      background-color: var(--status-green) !important;
      color: #12151c !important;
      font-weight: 600 !important;
      padding: 4px 10px !important;
      min-width: 60px !important;
      height: 28px !important;
      line-height: 20px !important;
      border-radius: 4px !important;
    }

    .empty-cell {
      text-align: center;
      color: var(--text-secondary);
      padding: 32px !important;
    }

    .compliance-info {
      background-color: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
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
        color: var(--status-orange);
      }
    }

    .ro-card {
      align-items: center;
      justify-content: center;
      padding: 48px !important;
    }

    .ro-icon {
      font-size: 3.5rem;
      width: 56px;
      height: 56px;
      color: var(--border-color);
      margin-bottom: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaintenanceComponent {
  private fleetState = inject(FleetStateService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  maintenanceForm: FormGroup = this.fb.group({
    vehicleId: ['', Validators.required],
    type: ['Oil Change', Validators.required],
    cost: [null, [Validators.required, Validators.min(1)]],
    description: ['', Validators.required]
  });

  // DB Signal collections
  maintenance = this.fleetState.maintenance;

  // RBAC Access: FleetManager only write access (RBAC matrix Section 3)
  canWrite = computed(() => this.authService.hasRole(['FleetManager']));

  // Vehicles eligible for shop: Available or In Shop (updating existing), not On Trip, not Retired
  eligibleVehicles = computed(() => {
    return this.fleetState.vehicles().filter(v => v.status !== 'On Trip' && v.status !== 'Retired');
  });

  getVehicleReg(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.registrationNumber : 'Unknown';
  }

  getVehicleName(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.name : 'Unknown Vehicle';
  }

  onSubmitMaintenance(): void {
    if (this.maintenanceForm.invalid) return;

    const payload = {
      ...this.maintenanceForm.value,
      createdBy: this.authService.currentUser()?.id || 'u_unknown'
    };

    const res = this.fleetState.logMaintenance(payload);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.maintenanceForm.reset({
        type: 'Oil Change'
      });
    } else {
      this.snackBar.open(res.message, 'Close', { duration: 4000 });
    }
  }

  onCloseMaintenance(logId: string): void {
    if (confirm('Are you sure you want to close this work order? The vehicle status will be restored to Available.')) {
      const res = this.fleetState.closeMaintenance(logId);
      if (res.success) {
        this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      } else {
        this.snackBar.open(res.message, 'Close', { duration: 4000 });
      }
    }
  }
}
