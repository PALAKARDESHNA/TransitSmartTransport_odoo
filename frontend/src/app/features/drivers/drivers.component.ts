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
import { Driver } from '../../core/models';

@Component({
  selector: 'app-drivers',
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
    <div class="drivers-page animate-fade-in">
      <!-- TOP ACTION BAR -->
      <section class="action-bar custom-card">
        <div class="search-and-filters">
          <div class="search-box-field">
            <mat-icon>search</mat-icon>
            <input type="text" placeholder="Search driver name or license..." [value]="searchQuery()" (input)="onSearchInput($event)">
          </div>

          <mat-form-field appearance="outline" class="slim-field">
            <mat-label>Region</mat-label>
            <mat-select [value]="filterRegion()" (selectionChange)="filterRegion.set($event.value)">
              <mat-option value="ALL">All Regions</mat-option>
              <mat-option value="North">North</mat-option>
              <mat-option value="East">East</mat-option>
              <mat-option value="South">South</mat-option>
              <mat-option value="West">West</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <button mat-flat-button class="btn-accent" *ngIf="canWrite()" (click)="openDriverDialog(dialogTemplate)">
          <mat-icon>person_add</mat-icon> Add Driver
        </button>
      </section>

      <!-- LEGEND & QUICK PILL FILTERS -->
      <section class="status-quick-pills custom-card">
        <span class="pills-label">Quick Filter by Status:</span>
        <div class="pills-container">
          <button class="pill-btn status-all" [class.active]="filterStatus() === 'ALL'" (click)="filterStatus.set('ALL')">
            All
          </button>
          <button class="pill-btn status-green" [class.active]="filterStatus() === 'Available'" (click)="filterStatus.set('Available')">
            Available
          </button>
          <button class="pill-btn status-blue" [class.active]="filterStatus() === 'On Trip'" (click)="filterStatus.set('On Trip')">
            On Trip
          </button>
          <button class="pill-btn status-orange" [class.active]="filterStatus() === 'Off Duty'" (click)="filterStatus.set('Off Duty')">
            Off Duty
          </button>
          <button class="pill-btn status-red" [class.active]="filterStatus() === 'Suspended'" (click)="filterStatus.set('Suspended')">
            Suspended
          </button>
        </div>
      </section>

      <!-- TABLE CONTAINER -->
      <section class="table-card custom-card">
        <table mat-table [dataSource]="filteredDrivers()" class="mat-elevation-z0">
          <!-- Name -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Driver Name</th>
            <td mat-cell *matCellDef="let d" class="bold-text">{{ d.name }}</td>
          </ng-container>

          <!-- License Number -->
          <ng-container matColumnDef="licenseNumber">
            <th mat-header-cell *matHeaderCellDef>License Number</th>
            <td mat-cell *matCellDef="let d">
              <span class="license-pill">{{ d.licenseNumber }} ({{ d.licenseCategory }})</span>
            </td>
          </ng-container>

          <!-- License Expiry -->
          <ng-container matColumnDef="licenseExpiryDate">
            <th mat-header-cell *matHeaderCellDef>License Expiry</th>
            <td mat-cell *matCellDef="let d">
              <span [ngClass]="getLicenseExpiryClass(d.licenseExpiryDate)">
                {{ d.licenseExpiryDate }}
                <span *ngIf="isLicenseExpired(d.licenseExpiryDate)" class="expiry-warn">(Expired)</span>
              </span>
            </td>
          </ng-container>

          <!-- Contact -->
          <ng-container matColumnDef="contactNumber">
            <th mat-header-cell *matHeaderCellDef>Contact</th>
            <td mat-cell *matCellDef="let d">{{ d.contactNumber }}</td>
          </ng-container>

          <!-- Safety Score -->
          <ng-container matColumnDef="safetyScore">
            <th mat-header-cell *matHeaderCellDef>Safety Score</th>
            <td mat-cell *matCellDef="let d">
              <div class="score-container">
                <span class="score-num" [ngClass]="getScoreClass(d.safetyScore)">{{ d.safetyScore }}</span>
                <div class="score-bar-bg">
                  <div class="score-bar" [style.width.%]="d.safetyScore" [ngClass]="getScoreClass(d.safetyScore)"></div>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let d">
              <span class="status-badge" [ngClass]="getStatusClass(d.status)">
                {{ d.status }}
              </span>
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
            <td mat-cell *matCellDef="let d" class="text-right">
              <ng-container *ngIf="canWrite() && d.status !== 'Suspended'">
                <button mat-icon-button color="primary" (click)="editDriver(d, dialogTemplate)" title="Edit Profile">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="suspendDriver(d)" title="Suspend Driver">
                  <mat-icon>gavel</mat-icon>
                </button>
              </ng-container>
              <span *ngIf="!canWrite() || d.status === 'Suspended'" class="text-muted text-xs">Locked</span>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
        </table>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="filteredDrivers().length === 0">
          <mat-icon class="empty-icon">badge</mat-icon>
          <h3>No Drivers Found</h3>
          <p class="text-muted">No driver records matched the active search or status filter.</p>
        </div>
      </section>

      <!-- LEGEND BANNER -->
      <section class="compliance-info">
        <mat-icon class="info-icon">security</mat-icon>
        <span class="info-text">
          <strong>Safety & Compliance Enforcement:</strong> Drivers with expired licenses or suspended statuses are strictly blocked from dispatches. Safe Driving Score target: 85+.
        </span>
      </section>
    </div>

    <!-- DIALOG MODAL TEMPLATE (ADD / EDIT FORM) -->
    <ng-template #dialogTemplate>
      <div class="dialog-container">
        <h2 mat-dialog-title class="dialog-title">
          {{ editingDriverId() ? 'Modify Driver Profile' : 'Add New Driver Profile' }}
        </h2>
        <form [formGroup]="driverForm" (ngSubmit)="onSubmitDriver()" class="dialog-form">
          <mat-dialog-content class="dialog-content">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Driver Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. John Doe">
                <mat-error *ngIf="driverForm.get('name')?.hasError('required')">Name is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>License Number</mat-label>
                <input matInput formControlName="licenseNumber" placeholder="e.g. DL-123456" [readonly]="editingDriverId() !== null">
                <mat-error *ngIf="driverForm.get('licenseNumber')?.hasError('required')">License is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>License Category</mat-label>
                <mat-select formControlName="licenseCategory">
                  <mat-option value="LMV">Light Motor Vehicle (LMV)</mat-option>
                  <mat-option value="HMV">Heavy Motor Vehicle (HMV)</mat-option>
                  <mat-option value="Motorcycle">Motorcycle Delivery</mat-option>
                </mat-select>
                <mat-error *ngIf="driverForm.get('licenseCategory')?.hasError('required')">Category is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>License Expiry Date (YYYY-MM-DD)</mat-label>
                <input matInput formControlName="licenseExpiryDate" placeholder="e.g. 2027-12-31">
                <mat-error *ngIf="driverForm.get('licenseExpiryDate')?.hasError('required')">Expiry date is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Contact Number</mat-label>
                <input matInput formControlName="contactNumber" placeholder="e.g. +1-555-1234">
                <mat-error *ngIf="driverForm.get('contactNumber')?.hasError('required')">Contact is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Safety Driving Score (0-100)</mat-label>
                <input matInput type="number" formControlName="safetyScore" placeholder="e.g. 95">
                <mat-error *ngIf="driverForm.get('safetyScore')?.hasError('required')">Safety score is required</mat-error>
                <mat-error *ngIf="driverForm.get('safetyScore')?.hasError('min')">Must be at least 0</mat-error>
                <mat-error *ngIf="driverForm.get('safetyScore')?.hasError('max')">Max score is 100</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Base Operating Region</mat-label>
                <mat-select formControlName="region">
                  <mat-option value="North">North</mat-option>
                  <mat-option value="East">East</mat-option>
                  <mat-option value="South">South</mat-option>
                  <mat-option value="West">West</mat-option>
                </mat-select>
                <mat-error *ngIf="driverForm.get('region')?.hasError('required')">Region is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="editingDriverId()">
                <mat-label>Driver Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="Available">Available</mat-option>
                  <mat-option value="On Trip">On Trip</mat-option>
                  <mat-option value="Off Duty">Off Duty</mat-option>
                  <mat-option value="Suspended">Suspended</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-dialog-content>

          <mat-dialog-actions class="dialog-actions">
            <button mat-button type="button" class="btn-secondary" (click)="closeDialog()">Cancel</button>
            <button mat-flat-button class="btn-accent" type="submit" [disabled]="driverForm.invalid">
              Save changes
            </button>
          </mat-dialog-actions>
        </form>
      </div>
    </ng-template>
  `,
  styles: [`
    .drivers-page {
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

    // Quick status pills
    .status-quick-pills {
      padding: 14px 20px !important;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .pills-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pills-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pill-btn {
      border: 1px solid var(--border-color);
      background-color: transparent;
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-speed) ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.03);
      }

      &.active {
        color: #12151c !important;
        border-color: transparent !important;
      }

      &.status-all.active { background-color: var(--text-primary); color: #000; }
      &.status-green.active { background-color: var(--status-green); }
      &.status-blue.active { background-color: var(--status-blue); }
      &.status-orange.active { background-color: var(--status-orange); }
      &.status-red.active { background-color: var(--status-red); }
    }

    .table-card {
      padding: 0 !important;
      overflow: hidden;
    }

    .bold-text {
      font-weight: 600;
    }

    .license-pill {
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .expiry-expired {
      color: var(--status-red);
      font-weight: 600;
    }

    .expiry-valid {
      color: var(--status-green);
    }

    .expiry-warn {
      font-size: 0.75rem;
      font-style: italic;
      margin-left: 4px;
    }

    .score-container {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 120px;
    }

    .score-num {
      font-size: 0.85rem;
      font-weight: 700;
      min-width: 24px;

      &.score-excellent { color: var(--status-green); }
      &.score-good { color: #a3e635; }
      &.score-fair { color: var(--status-orange); }
      &.score-poor { color: var(--status-red); }
    }

    .score-bar-bg {
      height: 6px;
      flex: 1;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .score-bar {
      height: 100%;
      border-radius: 3px;

      &.score-excellent { background-color: var(--status-green); }
      &.score-good { background-color: #a3e635; }
      &.score-fair { background-color: var(--status-orange); }
      &.score-poor { background-color: var(--status-red); }
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
      background-color: rgba(34, 197, 94, 0.06);
      border: 1px solid rgba(34, 197, 94, 0.2);
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
        color: var(--status-green);
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
export class DriversComponent {
  private fleetState = inject(FleetStateService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['name', 'licenseNumber', 'licenseExpiryDate', 'contactNumber', 'safetyScore', 'status', 'actions'];

  searchQuery = signal<string>('');
  filterRegion = signal<string>('ALL');
  filterStatus = signal<string>('ALL');

  editingDriverId = signal<string | null>(null);
  dialogRef: MatDialogRef<any> | null = null;

  driverForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    licenseNumber: ['', Validators.required],
    licenseCategory: ['HMV', Validators.required],
    licenseExpiryDate: ['', Validators.required],
    contactNumber: ['', Validators.required],
    safetyScore: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
    region: ['North', Validators.required],
    status: ['Available']
  });

  // Write gate: FleetManager or SafetyOfficer only (RBAC Section 3)
  canWrite = computed(() => this.authService.hasRole(['FleetManager', 'SafetyOfficer']));

  // Filter reactively
  filteredDrivers = computed(() => {
    const list = this.fleetState.drivers();
    const query = this.searchQuery().toLowerCase().trim();
    const region = this.filterRegion();
    const status = this.filterStatus();

    return list.filter(d => {
      const queryMatch = !query || d.name.toLowerCase().includes(query) || d.licenseNumber.toLowerCase().includes(query);
      const regionMatch = region === 'ALL' || d.region === region;
      const statusMatch = status === 'ALL' || d.status === status;
      return queryMatch && regionMatch && statusMatch;
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
      case 'Off Duty': return 'status-orange';
      case 'Suspended': return 'status-red';
      default: return '';
    }
  }

  getLicenseExpiryClass(expiryDate: string): string {
    return this.isLicenseExpired(expiryDate) ? 'expiry-expired' : 'expiry-valid';
  }

  isLicenseExpired(expiryDate: string): boolean {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return expiry <= now;
  }

  getScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
  }

  openDriverDialog(template: TemplateRef<any>): void {
    this.editingDriverId.set(null);
    this.driverForm.reset({
      licenseCategory: 'HMV',
      safetyScore: 100,
      region: 'North',
      status: 'Available'
    });
    this.dialogRef = this.dialog.open(template, {
      width: '560px',
      panelClass: 'custom-dialog-panel'
    });
  }

  editDriver(driver: Driver, template: TemplateRef<any>): void {
    this.editingDriverId.set(driver.id);
    this.driverForm.patchValue(driver);

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

  onSubmitDriver(): void {
    if (this.driverForm.invalid) return;

    const payload = this.driverForm.value;
    if (this.editingDriverId()) {
      payload.id = this.editingDriverId();
    }

    const res = this.fleetState.saveDriver(payload);
    if (res.success) {
      this.snackBar.open(res.message, 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
      this.closeDialog();
    } else {
      this.snackBar.open(res.message, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
    }
  }

  suspendDriver(driver: Driver): void {
    if (confirm(`Are you sure you want to SUSPEND driver ${driver.name}? Suspended drivers cannot be assigned to any trips.`)) {
      this.fleetState.suspendDriver(driver.id);
      this.snackBar.open(`Driver ${driver.name} has been suspended.`, 'Close', { duration: 3000 });
    }
  }
}
