import { Component, ChangeDetectionStrategy, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FleetStateService } from '../../core/fleet-state.service';
import { AuthService } from '../../core/auth.service';
import { Trip, Vehicle, Driver } from '../../core/models';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="trips-page animate-fade-in">
      <mat-tab-group class="custom-tabs" (selectedTabChange)="onTabChange($event)">
        <!-- TAB 1: DISPATCH WIZARD -->
        <mat-tab label="Dispatch Stepper Wizard">
          <div class="wizard-container">
            <div class="custom-card wizard-card animate-slide-up" *ngIf="canWrite(); else roWizard">
              <div class="wizard-header">
                <h2>New Trip Dispatch Assignment</h2>
                <p class="text-muted">Follow steps to validate load weight and register dispatches.</p>
              </div>

              <mat-stepper linear #stepper class="stepper-horizontal">
                <!-- STEP 1: CARGO LOADING -->
                <mat-step [stepControl]="cargoForm">
                  <ng-template matStepLabel>Load Cargo</ng-template>
                  <form [formGroup]="cargoForm" class="step-form">
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Origin Location</mat-label>
                        <input matInput formControlName="source" placeholder="e.g. Chicago Depot">
                        <mat-error *ngIf="cargoForm.get('source')?.hasError('required')">Required</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Destination Location</mat-label>
                        <input matInput formControlName="destination" placeholder="e.g. Detroit Logistics">
                        <mat-error *ngIf="cargoForm.get('destination')?.hasError('required')">Required</mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Cargo Weight (kg)</mat-label>
                        <input matInput type="number" formControlName="cargoWeight" placeholder="e.g. 15000">
                        <mat-error *ngIf="cargoForm.get('cargoWeight')?.hasError('required')">Weight is required</mat-error>
                        <mat-error *ngIf="cargoForm.get('cargoWeight')?.hasError('min')">Must be positive</mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Planned Distance (km)</mat-label>
                        <input matInput type="number" formControlName="plannedDistance" placeholder="e.g. 300">
                        <mat-error *ngIf="cargoForm.get('plannedDistance')?.hasError('required')">Distance is required</mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Trip Revenue ($)</mat-label>
                        <input matInput type="number" formControlName="revenue" placeholder="e.g. 2400">
                        <mat-error *ngIf="cargoForm.get('revenue')?.hasError('required')">Revenue is required</mat-error>
                      </mat-form-field>
                      <div class="empty-placeholder"></div>
                    </div>

                    <div class="step-actions">
                      <button mat-flat-button class="btn-accent" matStepperNext>Next</button>
                    </div>
                  </form>
                </mat-step>

                <!-- STEP 2: CHOOSE VEHICLE (LIVE WEIGHT GAUGE) -->
                <mat-step [stepControl]="vehicleForm">
                  <ng-template matStepLabel>Available Vehicle</ng-template>
                  <form [formGroup]="vehicleForm" class="step-form">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Select Available Vehicle</mat-label>
                      <mat-select formControlName="vehicleId" (selectionChange)="onVehicleChange($event.value)">
                        <mat-option *ngFor="let v of availableVehicles()" [value]="v.id">
                          {{ v.registrationNumber }} — {{ v.name }} (Max: {{ v.maxLoadCapacity | number }}kg)
                        </mat-option>
                        <mat-option *ngIf="availableVehicles().length === 0" disabled>
                          No available vehicles.
                        </mat-option>
                      </mat-select>
                      <mat-error *ngIf="vehicleForm.get('vehicleId')?.hasError('required')">Vehicle selection is required</mat-error>
                    </mat-form-field>

                    <!-- LIVE CAPACITY GAUGE -->
                    <div class="capacity-gauge-box" *ngIf="selectedVehicle()">
                      <div class="gauge-header">
                        <span>Load Capacity Utilization:</span>
                        <span [class.gauge-overload]="isOverloaded()">
                          {{ cargoForm.value.cargoWeight | number }}kg / {{ selectedVehicle()?.maxLoadCapacity | number }}kg
                        </span>
                      </div>
                      <div class="gauge-bar-bg">
                        <div class="gauge-bar" [style.width.%]="capacityPercent()" [ngClass]="isOverloaded() ? 'gauge-red' : 'gauge-green'"></div>
                      </div>
                      <div class="overload-warning" *ngIf="isOverloaded()">
                        <mat-icon>warning</mat-icon>
                        <span>Overload warning! Cargo exceeds vehicle capacity by {{ overloadAmount() | number }} kg.</span>
                      </div>
                    </div>

                    <div class="step-actions">
                      <button mat-button class="btn-secondary" matStepperPrevious>Back</button>
                      <button mat-flat-button class="btn-accent" matStepperNext [disabled]="isOverloaded() || vehicleForm.invalid">
                        Next
                      </button>
                    </div>
                  </form>
                </mat-step>

                <!-- STEP 3: CHOOSE DRIVER (EXPIRES SOON / SAFETY SCORE VIEW) -->
                <mat-step [stepControl]="driverForm">
                  <ng-template matStepLabel>Available Driver</ng-template>
                  <form [formGroup]="driverForm" class="step-form">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Select Available Driver</mat-label>
                      <mat-select formControlName="driverId" (selectionChange)="onDriverChange($event.value)">
                        <mat-option *ngFor="let d of availableDrivers()" [value]="d.id">
                          {{ d.name }} — Safety score: {{ d.safetyScore }} (Exp: {{ d.licenseExpiryDate }})
                        </mat-option>
                        <mat-option *ngIf="availableDrivers().length === 0" disabled>
                          No available drivers.
                        </mat-option>
                      </mat-select>
                      <mat-error *ngIf="driverForm.get('driverId')?.hasError('required')">Driver selection is required</mat-error>
                    </mat-form-field>

                    <!-- SELECTED DRIVER DETAILS COMPLIANCE CARD -->
                    <div class="compliance-badge-card" *ngIf="selectedDriver()">
                      <div class="comp-row">
                        <span>Safety Driving Score:</span>
                        <span class="bold-text score-text" [ngClass]="selectedDriver()!.safetyScore >= 85 ? 'text-green' : 'text-orange'">
                          {{ selectedDriver()?.safetyScore }} / 100
                        </span>
                      </div>
                      <div class="comp-row">
                        <span>License Expiry:</span>
                        <span class="bold-text text-green">
                          Valid (Expires {{ selectedDriver()?.licenseExpiryDate }})
                        </span>
                      </div>
                    </div>

                    <div class="step-actions">
                      <button mat-button class="btn-secondary" matStepperPrevious>Back</button>
                      <button mat-flat-button class="btn-accent" matStepperNext [disabled]="driverForm.invalid">Next</button>
                    </div>
                  </form>
                </mat-step>

                <!-- STEP 4: CONFIRM DISPATCH -->
                <mat-step>
                  <ng-template matStepLabel>Confirm</ng-template>
                  <div class="confirm-summary">
                    <h3>Summary Details</h3>
                    <div class="summary-details-grid">
                      <div class="summary-item">
                        <span class="label">Route</span>
                        <span class="val">{{ cargoForm.value.source }} &rarr; {{ cargoForm.value.destination }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Distance & Revenue</span>
                        <span class="val">{{ cargoForm.value.plannedDistance }} km | \${{ cargoForm.value.revenue | number }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Cargo Load Weight</span>
                        <span class="val">{{ cargoForm.value.cargoWeight | number }} kg</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Assigned Vehicle</span>
                        <span class="val">{{ selectedVehicle()?.registrationNumber }} — {{ selectedVehicle()?.name }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Assigned Driver</span>
                        <span class="val">{{ selectedDriver()?.name }} (Safety Score: {{ selectedDriver()?.safetyScore }})</span>
                      </div>
                    </div>

                    <div class="step-actions">
                      <button mat-button class="btn-secondary" matStepperPrevious>Back</button>
                      <button mat-flat-button class="btn-accent" (click)="onDispatchTrip()">DISPATCH TRIP</button>
                    </div>
                  </div>
                </mat-step>
              </mat-stepper>
            </div>

            <!-- Read Only message if not dispatcher/fleet manager -->
            <ng-template #roWizard>
              <div class="custom-card text-center padding-32">
                <mat-icon class="ro-icon">lock</mat-icon>
                <h2>Dispatch Wizard Locked</h2>
                <p class="text-muted">Only Dispatcher and Fleet Manager accounts can authorize dispatches. Check your role permissions matrix.</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>

        <!-- TAB 2: TRIP OPERATIONS -->
        <mat-tab label="Fleet Trip Management">
          <div class="operations-container">
            <!-- LIST TABLE CARD -->
            <div class="custom-card table-card">
              <div class="table-bar">
                <h2>Active and Historical Trips</h2>
                <div class="table-legend">
                  <span class="status-badge status-orange">Draft</span>
                  <span class="status-badge status-blue">Dispatched</span>
                  <span class="status-badge status-green">Completed</span>
                  <span class="status-badge status-red">Cancelled</span>
                </div>
              </div>

              <table mat-table [dataSource]="trips()" class="mat-elevation-z0">
                <!-- Route -->
                <ng-container matColumnDef="route">
                  <th mat-header-cell *matHeaderCellDef>Route</th>
                  <td mat-cell *matCellDef="let t" class="bold-text">
                    {{ t.source }} &rarr; {{ t.destination }}
                  </td>
                </ng-container>

                <!-- Vehicle -->
                <ng-container matColumnDef="vehicle">
                  <th mat-header-cell *matHeaderCellDef>Assigned Vehicle</th>
                  <td mat-cell *matCellDef="let t">{{ getVehicleReg(t.vehicleId) }}</td>
                </ng-container>

                <!-- Driver -->
                <ng-container matColumnDef="driver">
                  <th mat-header-cell *matHeaderCellDef>Assigned Driver</th>
                  <td mat-cell *matCellDef="let t">{{ getDriverName(t.driverId) }}</td>
                </ng-container>

                <!-- Weight / Dist -->
                <ng-container matColumnDef="details">
                  <th mat-header-cell *matHeaderCellDef>Weight / Dist</th>
                  <td mat-cell *matCellDef="let t">
                    {{ t.cargoWeight | number }} kg | {{ t.plannedDistance }} km
                  </td>
                </ng-container>

                <!-- Revenue -->
                <ng-container matColumnDef="revenue">
                  <th mat-header-cell *matHeaderCellDef>Revenue</th>
                  <td mat-cell *matCellDef="let t">\${{ t.revenue | number }}</td>
                </ng-container>

                <!-- Status -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="status-badge" [ngClass]="getTripStatusClass(t.status)">
                      {{ t.status }}
                    </span>
                  </td>
                </ng-container>

                <!-- Actions -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
                  <td mat-cell *matCellDef="let t" class="text-right">
                    <ng-container *ngIf="canWrite()">
                      <!-- Draft actions -->
                      <button mat-flat-button class="btn-accent text-xs btn-sm" *ngIf="t.status === 'Draft'" (click)="directDispatch(t.id)">
                        Dispatch
                      </button>

                      <!-- Dispatched actions -->
                      <div class="action-buttons-group" *ngIf="t.status === 'Dispatched'">
                        <button mat-flat-button class="btn-green text-xs btn-sm" (click)="openCompleteModal(t, completeTemplate)">
                          Complete
                        </button>
                        <button mat-button class="btn-red text-xs btn-sm" (click)="cancelTrip(t.id)">
                          Cancel
                        </button>
                      </div>

                      <span *ngIf="t.status === 'Completed' || t.status === 'Cancelled'" class="text-muted text-xs">Locked</span>
                    </ng-container>
                    <span *ngIf="!canWrite()" class="text-muted text-xs">Read Only</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
              </table>

              <!-- Empty state -->
              <div class="empty-state" *ngIf="trips().length === 0">
                <mat-icon class="empty-icon">route</mat-icon>
                <h3>No Trips Registered</h3>
                <p class="text-muted">Create assignments using the Dispatch Stepper Wizard.</p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- TRIP COMPLETION MODAL -->
    <ng-template #completeTemplate>
      <div class="dialog-container">
        <h2 class="dialog-title">Complete Trip Assignment</h2>
        <form [formGroup]="completeForm" (ngSubmit)="onSubmitComplete()" class="dialog-form">
          <div class="dialog-content">
            <p class="text-muted text-sm margin-bottom-16">
              Enter trip closure metrics. Completing updates vehicle odometers and auto-generates fuel log expenses.
            </p>

            <div class="comp-row-flex">
              <div class="text-sm">Start Odometer:</div>
              <div class="bold-text">{{ activeCompletingTrip()?.startOdometer | number }} km</div>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>End Odometer Reading (km)</mat-label>
              <input matInput type="number" formControlName="endOdometer" placeholder="e.g. 96000">
              <mat-error *ngIf="completeForm.get('endOdometer')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="completeForm.get('endOdometer')?.hasError('min')">Must exceed starting odometer</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fuel Consumed (Liters)</mat-label>
              <input matInput type="number" formControlName="fuelConsumed" placeholder="e.g. 120">
              <mat-error *ngIf="completeForm.get('fuelConsumed')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="completeForm.get('fuelConsumed')?.hasError('min')">Must be positive</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Trip Revenue Adjustments ($)</mat-label>
              <input matInput type="number" formControlName="revenue" placeholder="Final invoice amount">
            </mat-form-field>
          </div>

          <div class="dialog-actions">
            <button mat-button type="button" class="btn-secondary" (click)="closeDialog()">Cancel</button>
            <button mat-flat-button class="btn-accent" type="submit" [disabled]="completeForm.invalid">
              Complete Assignment
            </button>
          </div>
        </form>
      </div>
    </ng-template>
  `,
  styles: [`
    .trips-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .custom-tabs {
      background-color: transparent;
    }

    ::ng-deep .mat-mdc-tab-header {
      border-bottom: 1px solid var(--border-color) !important;
      margin-bottom: 24px;
    }

    .wizard-container {
      display: flex;
      justify-content: center;
      padding: 12px;
    }

    .wizard-card {
      width: 100%;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .wizard-header {
      h2 {
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      p {
        font-size: 0.85rem;
      }
    }

    .step-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }

    .full-width {
      width: 100%;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
    }

    // Capacity gauge
    .capacity-gauge-box {
      background-color: rgba(0, 0, 0, 0.15);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .gauge-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .gauge-overload {
      color: var(--status-red);
      animation: pulse 1s infinite alternate;
    }

    .gauge-bar-bg {
      height: 8px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .gauge-bar {
      height: 100%;
      border-radius: 4px;
      transition: width var(--transition-speed) ease;

      &.gauge-green { background-color: var(--status-green); }
      &.gauge-red { background-color: var(--status-red); }
    }

    .overload-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--status-red);
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 4px;

      mat-icon {
        font-size: 1.15rem;
        width: 18px;
        height: 18px;
      }
    }

    // Compliance Badge Card
    .compliance-badge-card {
      background-color: rgba(34, 197, 94, 0.06);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .comp-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .bold-text {
      font-weight: 600;
      color: var(--text-primary);
    }

    .score-text {
      font-size: 0.95rem;
    }

    .text-green { color: var(--status-green); }
    .text-orange { color: var(--status-orange); }

    // Summary screen
    .confirm-summary {
      background-color: rgba(0, 0, 0, 0.1);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }
    }

    .summary-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 32px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .val {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    // Operations Sidenav Table view
    .operations-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .table-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px !important;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 12px;

      h2 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .table-legend {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .table-card {
      padding: 0 !important;
      overflow: hidden;
    }

    .text-right {
      text-align: right;
    }

    .text-xs {
      font-size: 0.75rem;
    }

    .btn-sm {
      padding: 4px 8px !important;
      min-width: 50px !important;
      height: 28px !important;
      line-height: 20px !important;
      margin-left: 6px;
    }

    .action-buttons-group {
      display: flex;
      justify-content: flex-end;
    }

    .btn-green {
      background-color: var(--status-green) !important;
      color: #12151c !important;
      font-weight: 600 !important;
      border-radius: 4px !important;
    }

    .btn-red {
      color: var(--status-red) !important;
      border: 1px solid var(--status-red) !important;
      border-radius: 4px !important;
      background-color: transparent !important;
    }

    .empty-state {
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .empty-icon {
      font-size: 3rem;
      width: 48px;
      height: 48px;
      color: var(--border-color);
    }

    .ro-icon {
      font-size: 4rem;
      width: 64px;
      height: 64px;
      color: var(--border-color);
      margin-bottom: 16px;
    }

    .padding-32 {
      padding: 48px !important;
    }

    // Modal Complete
    .dialog-container {
      background-color: var(--bg-card);
      color: var(--text-primary);
      padding: 24px;
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      max-width: 420px;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
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

    .comp-row-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .dialog-actions {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @keyframes pulse {
      from { opacity: 0.8; }
      to { opacity: 1; text-shadow: 0 0 6px rgba(239, 68, 68, 0.5); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripsComponent {
  private fleetState = inject(FleetStateService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  @ViewChild('stepper') stepper!: MatStepper;

  displayedColumns: string[] = ['route', 'vehicle', 'driver', 'details', 'revenue', 'status', 'actions'];

  // Form groups for the Wizard steps
  cargoForm: FormGroup = this.fb.group({
    source: ['', Validators.required],
    destination: ['', Validators.required],
    cargoWeight: [null, [Validators.required, Validators.min(1)]],
    plannedDistance: [null, Validators.required],
    revenue: [null, Validators.required]
  });

  vehicleForm: FormGroup = this.fb.group({
    vehicleId: ['', Validators.required]
  });

  driverForm: FormGroup = this.fb.group({
    driverId: ['', Validators.required]
  });

  // Trip Completion Form
  completeForm: FormGroup = this.fb.group({
    endOdometer: [null, Validators.required],
    fuelConsumed: [null, [Validators.required, Validators.min(0)]],
    revenue: [null]
  });

  // Selection state caches
  selectedVehicle = signal<Vehicle | null>(null);
  selectedDriver = signal<Driver | null>(null);

  // Active closure dialog
  activeCompletingTrip = signal<Trip | null>(null);
  dialogRef: any = null;

  // Signal database arrays
  trips = this.fleetState.trips;
  availableVehicles = this.fleetState.availableVehicles;
  availableDrivers = this.fleetState.availableDrivers;

  // RBAC Access
  canWrite = computed(() => this.authService.hasRole(['FleetManager', 'Dispatcher']));

  // Real-time capacity gauge computations
  capacityPercent = computed(() => {
    const v = this.selectedVehicle();
    const cargo = this.cargoForm.value.cargoWeight || 0;
    if (!v) return 0;
    const percent = (cargo / v.maxLoadCapacity) * 100;
    return Math.min(percent, 100);
  });

  isOverloaded = computed(() => {
    const v = this.selectedVehicle();
    const cargo = this.cargoForm.value.cargoWeight || 0;
    if (!v) return false;
    return cargo > v.maxLoadCapacity;
  });

  overloadAmount = computed(() => {
    const v = this.selectedVehicle();
    const cargo = this.cargoForm.value.cargoWeight || 0;
    if (!v) return 0;
    return Math.max(cargo - v.maxLoadCapacity, 0);
  });

  onVehicleChange(id: string): void {
    const v = this.fleetState.vehicles().find(x => x.id === id);
    this.selectedVehicle.set(v || null);
  }

  onDriverChange(id: string): void {
    const d = this.fleetState.drivers().find(x => x.id === id);
    this.selectedDriver.set(d || null);
  }

  // Submit Step 4: Dispatch the Trip
  onDispatchTrip(): void {
    const tripPayload = {
      source: this.cargoForm.value.source,
      destination: this.cargoForm.value.destination,
      vehicleId: this.vehicleForm.value.vehicleId,
      driverId: this.driverForm.value.driverId,
      cargoWeight: this.cargoForm.value.cargoWeight,
      plannedDistance: this.cargoForm.value.plannedDistance,
      revenue: this.cargoForm.value.revenue,
      createdBy: this.authService.currentUser()?.id || 'u_unknown'
    };

    // Step 1: Create trip (starts as Draft)
    const resCreate = this.fleetState.createTrip(tripPayload);
    if (resCreate.success && resCreate.data) {
      // Step 2: Atomic dispatch state machine transition
      const resDispatch = this.fleetState.dispatchTrip(resCreate.data.id);
      if (resDispatch.success) {
        this.snackBar.open(resDispatch.message, 'Close', { duration: 4000, panelClass: ['success-snackbar'] });
        this.resetStepper();
      } else {
        this.snackBar.open(resDispatch.message, 'Close', { duration: 4000 });
      }
    } else {
      this.snackBar.open(resCreate.message, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
    }
  }

  resetStepper(): void {
    this.cargoForm.reset();
    this.vehicleForm.reset();
    this.driverForm.reset();
    this.selectedVehicle.set(null);
    this.selectedDriver.set(null);
    if (this.stepper) {
      this.stepper.reset();
    }
  }

  onTabChange(event: any): void {
    // If switching tabs, clear selected data
    if (event.index === 1) {
      this.resetStepper();
    }
  }

  getVehicleReg(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.registrationNumber : 'Unknown';
  }

  getDriverName(driverId: string): string {
    const d = this.fleetState.drivers().find(x => x.id === driverId);
    return d ? d.name : 'Unknown';
  }

  getTripStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-green';
      case 'Dispatched': return 'status-blue';
      case 'Draft': return 'status-orange';
      case 'Cancelled': return 'status-red';
      default: return '';
    }
  }

  directDispatch(tripId: string): void {
    const res = this.fleetState.dispatchTrip(tripId);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(res.message, 'Close', { duration: 4000 });
    }
  }

  cancelTrip(tripId: string): void {
    if (confirm('Are you sure you want to CANCEL this trip assignment? It will free up the vehicle and driver back to Available.')) {
      const res = this.fleetState.cancelTrip(tripId);
      this.snackBar.open(res.message, 'Close', { duration: 3000 });
    }
  }

  // Complete Trip operations modal dialog
  openCompleteModal(trip: Trip, template: any): void {
    this.activeCompletingTrip.set(trip);
    this.completeForm.reset({
      endOdometer: trip.startOdometer + trip.plannedDistance,
      fuelConsumed: Math.round(trip.plannedDistance * 0.3), // initial guess
      revenue: trip.revenue
    });

    // Custom check: make sure endOdometer is validated against startOdometer
    this.completeForm.get('endOdometer')?.setValidators([Validators.required, Validators.min(trip.startOdometer + 1)]);
    this.completeForm.get('endOdometer')?.updateValueAndValidity();

    this.dialogRef = this.dialog.open(template, {
      width: '420px',
      panelClass: 'custom-dialog-panel'
    });
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
    this.activeCompletingTrip.set(null);
  }

  onSubmitComplete(): void {
    const trip = this.activeCompletingTrip();
    if (this.completeForm.invalid || !trip) return;

    const { endOdometer, fuelConsumed, revenue } = this.completeForm.value;

    const res = this.fleetState.completeTrip(trip.id, endOdometer, fuelConsumed, revenue);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.closeDialog();
    } else {
      this.snackBar.open(res.message, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
    }
  }
}
