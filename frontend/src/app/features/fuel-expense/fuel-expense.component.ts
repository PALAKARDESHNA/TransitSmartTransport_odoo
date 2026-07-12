import { Component, ChangeDetectionStrategy, inject, signal, computed, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FleetStateService } from '../../core/fleet-state.service';
import { AuthService } from '../../core/auth.service';
import { Vehicle, FuelLog, Expense } from '../../core/models';

@Component({
  selector: 'app-fuel-expense',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="fuel-expense-page animate-fade-in">
      <!-- TOP ACTION BAR -->
      <section class="action-bar custom-card">
        <div class="search-and-filters">
          <div class="filter-title">
            <mat-icon>filter_list</mat-icon>
            <span>Filter by Vehicle:</span>
          </div>

          <mat-form-field appearance="outline" class="medium-field">
            <mat-label>Select Fleet Asset</mat-label>
            <mat-select [value]="selectedVehicleId()" (selectionChange)="selectedVehicleId.set($event.value)">
              <mat-option value="ALL">All Vehicles</mat-option>
              <mat-option *ngFor="let v of vehicles()" [value]="v.id">
                {{ v.registrationNumber }} — {{ v.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="action-buttons">
          <button mat-flat-button class="btn-accent" *ngIf="canWriteFuel()" (click)="openFuelDialog(fuelTemplate)">
            <mat-icon>local_gas_station</mat-icon> Log Fuel
          </button>
          <button mat-flat-button class="btn-accent" *ngIf="canWriteExpense()" (click)="openExpenseDialog(expenseTemplate)">
            <mat-icon>receipt</mat-icon> Add Expense
          </button>
        </div>
      </section>

      <!-- TWO ROWS OF LOGS -->
      <div class="grid-container grid-cols-2">
        <!-- FUEL LOGS TABLE -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Fuel Refueling Logs</h2>
            <p class="text-muted">Recorded fuel fillings and invoice details.</p>
          </div>

          <div class="table-container">
            <table class="logs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Liters</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of filteredFuelLogs()" class="table-row">
                  <td>{{ log.date | date:'shortDate' }}</td>
                  <td><strong>{{ getVehicleReg(log.vehicleId) }}</strong></td>
                  <td>{{ log.liters }} L</td>
                  <td class="bold-text">\${{ log.cost | number:'1.2-2' }}</td>
                </tr>
                <tr *ngIf="filteredFuelLogs().length === 0">
                  <td colspan="4" class="empty-cell">No fuel records matched filter.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- RECENT EXPENSES TABLE -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Recent Operating Expenses</h2>
            <p class="text-muted">Tolls, maintenance work closures, and incidental costs.</p>
          </div>

          <div class="table-container">
            <table class="logs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let exp of filteredExpenses()" class="table-row">
                  <td>{{ exp.date | date:'shortDate' }}</td>
                  <td><strong>{{ getVehicleReg(exp.vehicleId) }}</strong></td>
                  <td>
                    <span class="status-badge" [ngClass]="getExpenseTypeClass(exp.type)">
                      {{ exp.type }}
                    </span>
                  </td>
                  <td class="bold-text">\${{ exp.amount | number:'1.2-2' }}</td>
                  <td class="notes-text" [title]="exp.notes">{{ exp.notes }}</td>
                </tr>
                <tr *ngIf="filteredExpenses().length === 0">
                  <td colspan="5" class="empty-cell">No operational expenses matched filter.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- COST ROLLUP FOOTER SUMMARY CARD -->
      <section class="rollup-footer-card custom-card">
        <div class="rollup-left">
          <mat-icon class="money-icon">account_balance_wallet</mat-icon>
          <div>
            <h3>Total Fleet Operating Cost Rollup</h3>
            <p class="text-muted">
              {{ selectedVehicleId() === 'ALL' ? 'Aggregated operating costs for all active and retired vehicles' : 'Individual costs rollup for vehicle: ' + getVehicleReg(selectedVehicleId()) }}
            </p>
          </div>
        </div>
        <div class="rollup-right">
          <div class="cost-breakdown">
            <div class="cost-item">
              <span class="lbl">Fuel</span>
              <span class="val font-semibold">\${{ rollupCosts().fuel | number:'1.2-2' }}</span>
            </div>
            <div class="cost-item">
              <span class="lbl">Maintenance</span>
              <span class="val font-semibold">\${{ rollupCosts().maintenance | number:'1.2-2' }}</span>
            </div>
            <div class="cost-item">
              <span class="lbl">Tolls & Other</span>
              <span class="val font-semibold">\${{ rollupCosts().other | number:'1.2-2' }}</span>
            </div>
          </div>
          <div class="cost-total-box">
            <span class="total-lbl">Total Operating Expense</span>
            <span class="total-val">\${{ rollupCosts().total | number:'1.2-2' }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- LOG FUEL DIALOG -->
    <ng-template #fuelTemplate>
      <div class="dialog-container">
        <h2 class="dialog-title">Log Vehicle Refueling</h2>
        <form [formGroup]="fuelForm" (ngSubmit)="onSubmitFuel()" class="dialog-form">
          <div class="dialog-content">
            <mat-form-field appearance="outline">
              <mat-label>Select Vehicle</mat-label>
              <mat-select formControlName="vehicleId">
                <mat-option *ngFor="let v of vehicles()" [value]="v.id">
                  {{ v.registrationNumber }} — {{ v.name }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="fuelForm.get('vehicleId')?.hasError('required')">Vehicle is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fuel liters (L)</mat-label>
              <input matInput type="number" formControlName="liters" placeholder="e.g. 80">
              <mat-error *ngIf="fuelForm.get('liters')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="fuelForm.get('liters')?.hasError('min')">Must be positive</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Total Invoice Cost ($)</mat-label>
              <input matInput type="number" formControlName="cost" placeholder="e.g. 150">
              <mat-error *ngIf="fuelForm.get('cost')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="fuelForm.get('cost')?.hasError('min')">Must be positive</mat-error>
            </mat-form-field>
          </div>

          <div class="dialog-actions">
            <button mat-button type="button" class="btn-secondary" (click)="closeDialog()">Cancel</button>
            <button mat-flat-button class="btn-accent" type="submit" [disabled]="fuelForm.invalid">
              Save Log
            </button>
          </div>
        </form>
      </div>
    </ng-template>

    <!-- ADD EXPENSE DIALOG -->
    <ng-template #expenseTemplate>
      <div class="dialog-container">
        <h2 class="dialog-title">Record Fleet Incident Expense</h2>
        <form [formGroup]="expenseForm" (ngSubmit)="onSubmitExpense()" class="dialog-form">
          <div class="dialog-content">
            <mat-form-field appearance="outline">
              <mat-label>Select Vehicle</mat-label>
              <mat-select formControlName="vehicleId">
                <mat-option *ngFor="let v of vehicles()" [value]="v.id">
                  {{ v.registrationNumber }} — {{ v.name }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="expenseForm.get('vehicleId')?.hasError('required')">Vehicle is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Expense Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="Toll">Road Toll fee</mat-option>
                <mat-option value="Other">Incidental / Permits / Other</mat-option>
              </mat-select>
              <mat-error *ngIf="expenseForm.get('type')?.hasError('required')">Type is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Amount ($)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="e.g. 50">
              <mat-error *ngIf="expenseForm.get('amount')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="expenseForm.get('amount')?.hasError('min')">Must be positive</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Detailed Notes</mat-label>
              <textarea matInput rows="2" formControlName="notes" placeholder="Invoice details, location info..."></textarea>
              <mat-error *ngIf="expenseForm.get('notes')?.hasError('required')">Notes are required</mat-error>
            </mat-form-field>
          </div>

          <div class="dialog-actions">
            <button mat-button type="button" class="btn-secondary" (click)="closeDialog()">Cancel</button>
            <button mat-flat-button class="btn-accent" type="submit" [disabled]="expenseForm.invalid">
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </ng-template>
  `,
  styles: [`
    .fuel-expense-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .action-bar {
      padding: 16px 24px !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-and-filters {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .filter-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    ::ng-deep .medium-field {
      width: 220px !important;
      margin-bottom: 0 !important;
      .mat-mdc-form-field-flex {
        height: 48px !important;
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
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

    // Tables
    .table-container {
      width: 100%;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .logs-table {
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

    .notes-text {
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bold-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    .empty-cell {
      text-align: center;
      color: var(--text-secondary);
      padding: 32px !important;
    }

    // Rollup footer
    .rollup-footer-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px !important;
      border-left: 4px solid var(--primary-accent) !important;
      flex-wrap: wrap;
      gap: 24px;
    }

    .rollup-left {
      display: flex;
      align-items: center;
      gap: 16px;

      h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .money-icon {
        font-size: 2.5rem;
        width: 40px;
        height: 40px;
        color: var(--primary-accent);
      }
    }

    .rollup-right {
      display: flex;
      align-items: center;
      gap: 40px;
      flex-wrap: wrap;
    }

    .cost-breakdown {
      display: flex;
      gap: 24px;
    }

    .cost-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .lbl {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .val {
        font-size: 1rem;
        color: var(--text-primary);
      }
    }

    .cost-total-box {
      background-color: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 6px;
      padding: 12px 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .total-lbl {
        font-size: 0.7rem;
        color: var(--primary-accent);
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .total-val {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--primary-accent);
      }
    }

    // Modal dialogs
    .dialog-container {
      background-color: var(--bg-card);
      color: var(--text-primary);
      padding: 24px;
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      max-width: 400px;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
      color: var(--text-primary);
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-actions {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FuelExpenseComponent {
  private fleetState = inject(FleetStateService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  selectedVehicleId = signal<string>('ALL');

  fuelForm: FormGroup = this.fb.group({
    vehicleId: ['', Validators.required],
    liters: [null, [Validators.required, Validators.min(1)]],
    cost: [null, [Validators.required, Validators.min(1)]]
  });

  expenseForm: FormGroup = this.fb.group({
    vehicleId: ['', Validators.required],
    type: ['Toll', Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    notes: ['', Validators.required]
  });

  dialogRef: MatDialogRef<any> | null = null;

  // DB selections
  vehicles = this.fleetState.vehicles;

  // RBAC Access: write actions
  canWriteFuel = computed(() => this.authService.hasRole(['FleetManager', 'Dispatcher']));
  canWriteExpense = computed(() => this.authService.hasRole(['FleetManager']));

  // Filter fuel logs reactively
  filteredFuelLogs = computed(() => {
    const list = this.fleetState.fuelLogs();
    const vid = this.selectedVehicleId();
    return vid === 'ALL' ? list : list.filter(l => l.vehicleId === vid);
  });

  // Filter expenses reactively
  filteredExpenses = computed(() => {
    const list = this.fleetState.expenses();
    const vid = this.selectedVehicleId();
    return vid === 'ALL' ? list : list.filter(e => e.vehicleId === vid);
  });

  // Roll up operational costs reactively based on vehicle filter
  rollupCosts = computed(() => {
    const vid = this.selectedVehicleId();

    if (vid === 'ALL') {
      return this.fleetState.getOperationalCostsRollup();
    }

    // Get individual vehicle costs
    const fuel = this.fleetState.fuelLogs().filter(f => f.vehicleId === vid).reduce((sum, f) => sum + f.cost, 0);
    const maintenance = this.fleetState.maintenance().filter(m => m.vehicleId === vid).reduce((sum, m) => sum + m.cost, 0);
    const other = this.fleetState.expenses().filter(e => e.vehicleId === vid).reduce((sum, e) => sum + e.amount, 0);

    return {
      fuel,
      maintenance,
      other,
      total: fuel + maintenance + other
    };
  });

  getVehicleReg(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.registrationNumber : 'Unknown';
  }

  getExpenseTypeClass(type: string): string {
    switch (type) {
      case 'Toll': return 'status-blue';
      case 'Maintenance': return 'status-orange';
      case 'Other': return 'status-red';
      default: return '';
    }
  }

  openFuelDialog(template: TemplateRef<any>): void {
    this.fuelForm.reset();
    this.dialogRef = this.dialog.open(template, {
      width: '400px',
      panelClass: 'custom-dialog-panel'
    });
  }

  openExpenseDialog(template: TemplateRef<any>): void {
    this.expenseForm.reset({ type: 'Toll' });
    this.dialogRef = this.dialog.open(template, {
      width: '400px',
      panelClass: 'custom-dialog-panel'
    });
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  onSubmitFuel(): void {
    if (this.fuelForm.invalid) return;

    const res = this.fleetState.logFuel(this.fuelForm.value);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.closeDialog();
    }
  }

  onSubmitExpense(): void {
    if (this.expenseForm.invalid) return;

    const res = this.fleetState.logExpense(this.expenseForm.value);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.closeDialog();
    }
  }
}
