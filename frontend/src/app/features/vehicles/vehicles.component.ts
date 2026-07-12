import { Component, ChangeDetectionStrategy, inject, signal, computed, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FleetStateService } from '../../core/fleet-state.service';
import { AuthService } from '../../core/auth.service';
import { Vehicle } from '../../core/models';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="vehicles-page animate-fade-in">
      <!-- TOP ACTION BAR -->
      <section class="action-bar custom-card">
        <div class="search-and-filters">
          <div class="search-box-field">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search registration or model..." [value]="searchQuery()" (input)="onSearchInput($event)">
          </div>

          <mat-form-field appearance="outline" class="slim-field">
            <mat-label>Type</mat-label>
            <mat-select [value]="filterType()" (selectionChange)="filterType.set($event.value)">
              <mat-option value="ALL">All Types</mat-option>
              <mat-option value="Truck">Truck</mat-option>
              <mat-option value="Van">Van</mat-option>
              <mat-option value="Bike">Bike</mat-option>
              <mat-option value="Trailer">Trailer</mat-option>
              <mat-option value="Bus">Bus</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="slim-field">
            <mat-label>Status</mat-label>
            <mat-select [value]="filterStatus()" (selectionChange)="filterStatus.set($event.value)">
              <mat-option value="ALL">All Statuses</mat-option>
              <mat-option value="Available">Available</mat-option>
              <mat-option value="On Trip">On Trip</mat-option>
              <mat-option value="In Shop">In Shop</mat-option>
              <mat-option value="Retired">Retired</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <button mat-flat-button class="btn-accent" *ngIf="canWrite()" (click)="openVehicleDialog(dialogTemplate)">
          <mat-icon>add</mat-icon> Add Vehicle
        </button>
      </section>

      <!-- TABLE CONTAINER -->
      <section class="table-card custom-card">
        <table mat-table [dataSource]="filteredVehicles()" class="mat-elevation-z0">
          <!-- Reg Number -->
          <ng-container matColumnDef="registrationNumber">
            <th mat-header-cell *matHeaderCellDef>Registration</th>
            <td mat-cell *matCellDef="let v" class="bold-text">{{ v.registrationNumber }}</td>
          </ng-container>

          <!-- Model/Name -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name / Model</th>
            <td mat-cell *matCellDef="let v">{{ v.name }}</td>
          </ng-container>

          <!-- Type -->
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let v">
              <span class="type-pill">{{ v.type }}</span>
            </td>
          </ng-container>

          <!-- Capacity -->
          <ng-container matColumnDef="maxLoadCapacity">
            <th mat-header-cell *matHeaderCellDef>Capacity (kg)</th>
            <td mat-cell *matCellDef="let v">{{ v.maxLoadCapacity | number }} kg</td>
          </ng-container>

          <!-- Odometer -->
          <ng-container matColumnDef="odometer">
            <th mat-header-cell *matHeaderCellDef>Odometer</th>
            <td mat-cell *matCellDef="let v">{{ v.odometer | number }} km</td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let v">
              <span class="status-badge" [ngClass]="getStatusClass(v.status)">
                {{ v.status }}
              </span>
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
            <td mat-cell *matCellDef="let v" class="text-right">
              <ng-container *ngIf="canWrite() && v.status !== 'Retired'">
                <button mat-icon-button color="primary" (click)="editVehicle(v, dialogTemplate)" title="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="retireVehicle(v)" title="Retire Vehicle">
                  <mat-icon>no_sim</mat-icon>
                </button>
              </ng-container>
              <span *ngIf="!canWrite() || v.status === 'Retired'" class="text-muted text-xs">Locked</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
        </table>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="filteredVehicles().length === 0">
          <mat-icon class="empty-icon">local_shipping</mat-icon>
          <h3>No Vehicles Found</h3>
          <p class="text-muted">No vehicles matched the search criteria or active filters.</p>
        </div>
      </section>

      <!-- LEGEND BANNER -->
      <section class="compliance-info">
        <mat-icon class="info-icon">info</mat-icon>
        <span class="info-text">
          <strong>Dispatch Eligibility Compliance:</strong> Retired (Red) and In Shop (Orange) vehicles are automatically filtered and excluded from the Trip Dispatcher selection.
        </span>
      </section>
    </div>

    <!-- DIALOG MODAL TEMPLATE (ADD / EDIT FORM) -->
    <ng-template #dialogTemplate>
      <div class="dialog-container">
        <h2 mat-dialog-title class="dialog-title">
          {{ editingVehicleId() ? 'Modify Fleet Asset' : 'Add New Fleet Asset' }}
        </h2>
        <form [formGroup]="vehicleForm" (ngSubmit)="onSubmitVehicle()" class="dialog-form">
          <mat-dialog-content class="dialog-content">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Registration Number</mat-label>
                <input matInput formControlName="registrationNumber" placeholder="e.g. TX-9021-A" [readonly]="editingVehicleId() !== null">
                <mat-error *ngIf="vehicleForm.get('registrationNumber')?.hasError('required')">Registration is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Vehicle Model / Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Volvo FH16">
                <mat-error *ngIf="vehicleForm.get('name')?.hasError('required')">Model name is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Vehicle Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="Truck">Truck</mat-option>
                  <mat-option value="Van">Van</mat-option>
                  <mat-option value="Bike">Bike</mat-option>
                  <mat-option value="Trailer">Trailer</mat-option>
                  <mat-option value="Bus">Bus</mat-option>
                </mat-select>
                <mat-error *ngIf="vehicleForm.get('type')?.hasError('required')">Type is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Max Capacity (kg)</mat-label>
                <input matInput type="number" formControlName="maxLoadCapacity" placeholder="e.g. 24000">
                <mat-error *ngIf="vehicleForm.get('maxLoadCapacity')?.hasError('required')">Capacity is required</mat-error>
                <mat-error *ngIf="vehicleForm.get('maxLoadCapacity')?.hasError('min')">Must be greater than 0</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Odometer Reading (km)</mat-label>
                <input matInput type="number" formControlName="odometer" placeholder="e.g. 120000">
                <mat-error *ngIf="vehicleForm.get('odometer')?.hasError('required')">Odometer is required</mat-error>
                <mat-error *ngIf="vehicleForm.get('odometer')?.hasError('min')">Must be positive</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Acquisition Cost ($)</mat-label>
                <input matInput type="number" formControlName="acquisitionCost" placeholder="e.g. 145000">
                <mat-error *ngIf="vehicleForm.get('acquisitionCost')?.hasError('required')">Acquisition cost is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Operating Region</mat-label>
                <mat-select formControlName="region">
                  <mat-option value="North">North</mat-option>
                  <mat-option value="East">East</mat-option>
                  <mat-option value="South">South</mat-option>
                  <mat-option value="West">West</mat-option>
                </mat-select>
                <mat-error *ngIf="vehicleForm.get('region')?.hasError('required')">Region is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="editingVehicleId()">
                <mat-label>Operational Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="Available">Available</mat-option>
                  <mat-option value="On Trip">On Trip</mat-option>
                  <mat-option value="In Shop">In Shop</mat-option>
                  <mat-option value="Retired">Retired</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-dialog-content>

          <mat-dialog-actions class="dialog-actions">
            <button mat-button type="button" class="btn-secondary" (click)="closeDialog()">Cancel</button>
            <button mat-flat-button class="btn-accent" type="submit" [disabled]="vehicleForm.invalid">
              Save changes
            </button>
          </mat-dialog-actions>
        </form>
      </div>
    </ng-template>
  `,
  styles: [`
    .vehicles-page {
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
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box-field {
      display: flex;
      align-items: center;
      background-color: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 4px 14px;
      width: 260px;
      height: 48px;

      mat-icon {
        color: var(--text-secondary);
        margin-right: 8px;
      }

      input {
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-family: var(--font-family);
        outline: none;
        font-size: 0.85rem;
        width: 100%;
      }
    }

    ::ng-deep .slim-field {
      width: 150px !important;
      margin-bottom: 0 !important;
      .mat-mdc-form-field-flex {
        height: 48px !important;
      }
    }

    .table-card {
      padding: 0 !important;
      overflow: hidden;
    }

    .bold-text {
      font-weight: 600;
    }

    .type-pill {
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .text-right {
      text-align: right;
    }

    .text-xs {
      font-size: 0.75rem;
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

    // Modal styles
    .dialog-container {
      background-color: var(--bg-card);
      color: var(--text-primary);
      padding: 24px;
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      max-width: 560px;
    }

    .dialog-title {
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-content {
      padding: 0 !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 60vh;
      overflow-y: auto;
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

    .dialog-actions {
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehiclesComponent {
  private fleetState = inject(FleetStateService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['registrationNumber', 'name', 'type', 'maxLoadCapacity', 'odometer', 'status', 'actions'];

  // Signals for query filters
  searchQuery = signal<string>('');
  filterType = signal<string>('ALL');
  filterStatus = signal<string>('ALL');

  // Track the item being edited
  editingVehicleId = signal<string | null>(null);
  dialogRef: MatDialogRef<any> | null = null;

  vehicleForm: FormGroup = this.fb.group({
    registrationNumber: ['', Validators.required],
    name: ['', Validators.required],
    type: ['Truck', Validators.required],
    maxLoadCapacity: [null, [Validators.required, Validators.min(1)]],
    odometer: [null, [Validators.required, Validators.min(0)]],
    acquisitionCost: [null, Validators.required],
    region: ['North', Validators.required],
    status: ['Available']
  });

  // Check role write authorization: FleetManager only (RBAC Section 3)
  canWrite = computed(() => this.authService.hasRole(['FleetManager']));

  // Reactively filter vehicles based on signals
  filteredVehicles = computed(() => {
    const list = this.fleetState.vehicles();
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();
    const status = this.filterStatus();

    return list.filter(v => {
      const queryMatch = !query || v.registrationNumber.toLowerCase().includes(query) || v.name.toLowerCase().includes(query);
      const typeMatch = type === 'ALL' || v.type === type;
      const statusMatch = status === 'ALL' || v.status === status;
      return queryMatch && typeMatch && statusMatch;
    });
  });

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Available': return 'status-green';
      case 'On Trip': return 'status-blue';
      case 'In Shop': return 'status-orange';
      case 'Retired': return 'status-red';
      default: return '';
    }
  }

  openVehicleDialog(template: TemplateRef<any>): void {
    this.editingVehicleId.set(null);
    this.vehicleForm.reset({
      type: 'Truck',
      region: 'North',
      status: 'Available'
    });
    this.dialogRef = this.dialog.open(template, {
      width: '560px',
      panelClass: 'custom-dialog-panel'
    });
  }

  editVehicle(vehicle: Vehicle, template: TemplateRef<any>): void {
    this.editingVehicleId.set(vehicle.id);
    this.vehicleForm.patchValue(vehicle);

    this.dialogRef = this.dialog.open(template, {
      width: '560px',
      panelClass: 'custom-dialog-panel'
    });
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  onSubmitVehicle(): void {
    if (this.vehicleForm.invalid) return;

    const payload = this.vehicleForm.value;
    if (this.editingVehicleId()) {
      payload.id = this.editingVehicleId();
    }

    const res = this.fleetState.saveVehicle(payload);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.closeDialog();
    } else {
      this.snackBar.open(res.message, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
    }
  }

  retireVehicle(vehicle: Vehicle): void {
    if (confirm(`Are you sure you want to Retire vehicle ${vehicle.registrationNumber}? This will permanently remove it from dispatcher availability.`)) {
      this.fleetState.retireVehicle(vehicle.id);
      this.snackBar.open(`Vehicle ${vehicle.registrationNumber} retired.`, 'Close', { duration: 3000 });
    }
  }
}
