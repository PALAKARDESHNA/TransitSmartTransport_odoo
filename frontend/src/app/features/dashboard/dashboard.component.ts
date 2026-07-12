import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FleetStateService } from '../../core/fleet-state.service';
import { Trip, Vehicle } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="dashboard-page animate-fade-in">
      <!-- TOP FILTER BAR -->
      <section class="filter-bar custom-card">
        <div class="filter-title">
          <mat-icon class="filter-icon">tune</mat-icon>
          <span>Fleet Filters</span>
        </div>
        <div class="filters-inputs">
          <mat-form-field appearance="outline" class="slim-field">
            <mat-label>Vehicle Type</mat-label>
            <mat-select [value]="selectedType()" (selectionChange)="selectedType.set($event.value)">
              <mat-option value="ALL">All Types</mat-option>
              <mat-option value="Truck">Trucks</mat-option>
              <mat-option value="Van">Vans</mat-option>
              <mat-option value="Bike">Bikes</mat-option>
              <mat-option value="Trailer">Trailers</mat-option>
              <mat-option value="Bus">Buses</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="slim-field">
            <mat-label>Region</mat-label>
            <mat-select [value]="selectedRegion()" (selectionChange)="selectedRegion.set($event.value)">
              <mat-option value="ALL">All Regions</mat-option>
              <mat-option value="North">North</mat-option>
              <mat-option value="East">East</mat-option>
              <mat-option value="South">South</mat-option>
              <mat-option value="West">West</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <!-- KPI ROW -->
      <section class="kpi-grid grid-container grid-cols-6 animate-slide-up">
        <!-- KPI 1: Fleet Utilization -->
        <div class="kpi-card border-blue hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Fleet Utilization</span>
            <mat-icon class="kpi-icon icon-blue">analytics</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().utilization }}%</div>
          <div class="kpi-indicator">Active trips vs total fleet</div>
        </div>

        <!-- KPI 2: Active Trips -->
        <div class="kpi-card border-green hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Active Trips</span>
            <mat-icon class="kpi-icon icon-green">route</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().activeTrips }}</div>
          <div class="kpi-indicator">Vehicles currently on road</div>
        </div>

        <!-- KPI 3: Pending Trips -->
        <div class="kpi-card border-orange hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Pending / Draft</span>
            <mat-icon class="kpi-icon icon-orange">pending_actions</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().pendingTrips }}</div>
          <div class="kpi-indicator">Awaiting dispatcher approval</div>
        </div>

        <!-- KPI 4: Active Vehicles -->
        <div class="kpi-card border-blue hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Active Vehicles</span>
            <mat-icon class="kpi-icon icon-blue">local_shipping</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().activeVehicles }}</div>
          <div class="kpi-indicator">Excluding retired fleet</div>
        </div>

        <!-- KPI 5: Available Vehicles -->
        <div class="kpi-card border-green hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Available Fleet</span>
            <mat-icon class="kpi-icon icon-green">check_circle_outline</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().availableVehiclesCount }}</div>
          <div class="kpi-indicator">Ready for dispatch assignment</div>
        </div>

        <!-- KPI 6: Drivers On Duty -->
        <div class="kpi-card border-orange hoverable">
          <div class="kpi-header">
            <span class="kpi-label">Drivers On Duty</span>
            <mat-icon class="kpi-icon icon-orange">badge</mat-icon>
          </div>
          <div class="kpi-value">{{ kpiStats().driversOnDuty }}</div>
          <div class="kpi-indicator">Available or currently on route</div>
        </div>
      </section>

      <!-- TWO SIDE-BY-SIDE PANELS -->
      <section class="panels-grid grid-container grid-cols-2">
        <!-- Recent Trips Table -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Recent Activity</h2>
            <button mat-button class="btn-secondary text-accent" routerLink="/trips">View All</button>
          </div>
          <div class="table-container">
            <table class="recent-trips-table">
              <thead>
                <tr>
                  <th>Origin & Destination</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let trip of recentTrips()" class="table-row">
                  <td>
                    <div class="trip-route-info">
                      <span class="route-point">{{ trip.source }}</span>
                      <mat-icon class="arrow-icon">arrow_right_alt</mat-icon>
                      <span class="route-point">{{ trip.destination }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="vehicle-info-cell">
                      <strong>{{ getVehicleReg(trip.vehicleId) }}</strong>
                      <span class="subtext">{{ getVehicleName(trip.vehicleId) }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="getTripStatusClass(trip.status)">
                      {{ trip.status }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="recentTrips().length === 0">
                  <td colspan="3" class="empty-cell">No recent trips match selection.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vehicles by Status Stacked Segmented Bar -->
        <div class="custom-card flex-column">
          <div class="panel-header">
            <h2>Vehicles by Status</h2>
          </div>
          <div class="status-charts-container">
            <!-- Segmented Bar Visualization -->
            <div class="segmented-bar-wrapper">
              <div class="bar-labels">
                <span class="bar-title">Registry Distribution</span>
                <span class="bar-total">Total: {{ filteredVehicles().length }} Vehicles</span>
              </div>
              <div class="segmented-bar">
                <div class="bar-segment seg-available"
                     [style.width.%]="getStatusPercentage('Available')"
                     [title]="'Available: ' + getStatusCount('Available')"
                     *ngIf="getStatusCount('Available') > 0">
                </div>
                <div class="bar-segment seg-trip"
                     [style.width.%]="getStatusPercentage('On Trip')"
                     [title]="'On Trip: ' + getStatusCount('On Trip')"
                     *ngIf="getStatusCount('On Trip') > 0">
                </div>
                <div class="bar-segment seg-shop"
                     [style.width.%]="getStatusPercentage('In Shop')"
                     [title]="'In Shop: ' + getStatusCount('In Shop')"
                     *ngIf="getStatusCount('In Shop') > 0">
                </div>
                <div class="bar-segment seg-retired"
                     [style.width.%]="getStatusPercentage('Retired')"
                     [title]="'Retired: ' + getStatusCount('Retired')"
                     *ngIf="getStatusCount('Retired') > 0">
                </div>
              </div>
            </div>

            <!-- Legends and Counters -->
            <div class="status-legend-list">
              <div class="legend-row">
                <div class="legend-indicator dot-green"></div>
                <span class="legend-label">Available</span>
                <span class="legend-badge badge-green">{{ getStatusCount('Available') }}</span>
              </div>
              <div class="legend-row">
                <div class="legend-indicator dot-blue"></div>
                <span class="legend-label">On Trip</span>
                <span class="legend-badge badge-blue">{{ getStatusCount('On Trip') }}</span>
              </div>
              <div class="legend-row">
                <div class="legend-indicator dot-orange"></div>
                <span class="legend-label">In Shop (Maintenance)</span>
                <span class="legend-badge badge-orange">{{ getStatusCount('In Shop') }}</span>
              </div>
              <div class="legend-row">
                <div class="legend-indicator dot-red"></div>
                <span class="legend-label">Retired</span>
                <span class="legend-badge badge-red">{{ getStatusCount('Retired') }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    // Filter Bar
    .filter-bar {
      padding: 16px 24px !important;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .filter-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .filter-icon {
      color: var(--primary-accent);
    }

    .filters-inputs {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    ::ng-deep .slim-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0 !important;
    }

    ::ng-deep .slim-field {
      width: 180px !important;
      .mat-mdc-form-field-flex {
        height: 48px !important;
        align-items: center !important;
      }
      .mat-mdc-form-field-infix {
        padding-top: 12px !important;
        padding-bottom: 12px !important;
      }
    }

    // KPI Cards
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      padding: 16px 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all var(--transition-speed) ease;
      position: relative;
      border-left-width: 4px !important;

      &.border-green { border-left-color: var(--status-green) !important; }
      &.border-blue { border-left-color: var(--status-blue) !important; }
      &.border-orange { border-left-color: var(--status-orange) !important; }
      &.border-red { border-left-color: var(--status-red) !important; }
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .kpi-icon {
      font-size: 1.25rem;
      width: 20px;
      height: 20px;
    }

    .icon-green { color: var(--status-green); }
    .icon-blue { color: var(--status-blue); }
    .icon-orange { color: var(--status-orange); }

    .kpi-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .kpi-indicator {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    // Panels Layout
    .flex-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h2 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    // Tables
    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .recent-trips-table {
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

    .trip-route-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-point {
      font-weight: 600;
      color: var(--text-primary);
    }

    .arrow-icon {
      font-size: 1.15rem;
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
    }

    .vehicle-info-cell {
      display: flex;
      flex-direction: column;
      .subtext {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
    }

    .empty-cell {
      text-align: center;
      color: var(--text-secondary);
      padding: 32px !important;
    }

    // Stacked Segmented Bar Chart CSS
    .status-charts-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 10px 0;
    }

    .segmented-bar-wrapper {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .bar-title {
      font-weight: 600;
      color: var(--text-primary);
    }

    .bar-total {
      color: var(--text-secondary);
    }

    .segmented-bar {
      height: 24px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      display: flex;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .bar-segment {
      height: 100%;
      transition: width 0.5s ease-in-out;

      &.seg-available { background-color: var(--status-green); }
      &.seg-trip { background-color: var(--status-blue); }
      &.seg-shop { background-color: var(--status-orange); }
      &.seg-retired { background-color: var(--status-red); }
    }

    .status-legend-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .legend-row {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
    }

    .legend-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 12px;

      &.dot-green { background-color: var(--status-green); }
      &.dot-blue { background-color: var(--status-blue); }
      &.dot-orange { background-color: var(--status-orange); }
      &.dot-red { background-color: var(--status-red); }
    }

    .legend-label {
      flex: 1;
      color: var(--text-secondary);
    }

    .legend-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      min-width: 24px;
      text-align: center;

      &.badge-green { background-color: var(--status-green-bg); color: var(--status-green); }
      &.badge-blue { background-color: var(--status-blue-bg); color: var(--status-blue); }
      &.badge-orange { background-color: var(--status-orange-bg); color: var(--status-orange); }
      &.badge-red { background-color: var(--status-red-bg); color: var(--status-red); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private fleetState = inject(FleetStateService);

  // Selected filters
  selectedType = signal<string>('ALL');
  selectedRegion = signal<string>('ALL');

  // Compute filtered list of vehicles
  filteredVehicles = computed(() => {
    const list = this.fleetState.vehicles();
    const type = this.selectedType();
    const region = this.selectedRegion();

    return list.filter(v => {
      const typeMatch = type === 'ALL' || v.type === type;
      const regionMatch = region === 'ALL' || v.region === region;
      return typeMatch && regionMatch;
    });
  });

  // Compute filtered list of trips
  filteredTrips = computed(() => {
    const list = this.fleetState.trips();
    const type = this.selectedType();
    const region = this.selectedRegion();

    return list.filter(t => {
      const v = this.fleetState.vehicles().find(x => x.id === t.vehicleId);
      if (!v) return false;

      const typeMatch = type === 'ALL' || v.type === type;
      const regionMatch = region === 'ALL' || v.region === region;
      return typeMatch && regionMatch;
    });
  });

  // KPI Computations based on filters
  kpiStats = computed(() => {
    const vehicles = this.filteredVehicles();
    const trips = this.filteredTrips();
    const drivers = this.fleetState.drivers(); // drivers aren't filtered by vehicle type, but by region

    const nonRetiredVehicles = vehicles.filter(v => v.status !== 'Retired');
    const onTripVehicles = vehicles.filter(v => v.status === 'On Trip');

    // Fleet Utilization: (vehicles On Trip / non-retired vehicles) * 100
    const utilization = nonRetiredVehicles.length > 0
      ? Math.round((onTripVehicles.length / nonRetiredVehicles.length) * 100)
      : 0;

    const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
    const pendingTrips = trips.filter(t => t.status === 'Draft').length;
    const activeVehicles = nonRetiredVehicles.length;
    const availableVehiclesCount = vehicles.filter(v => v.status === 'Available').length;

    // Filter drivers on duty by region if region filter active
    const region = this.selectedRegion();
    const regionDrivers = region === 'ALL' ? drivers : drivers.filter(d => d.region === region);
    const driversOnDuty = regionDrivers.filter(d => d.status === 'On Trip' || d.status === 'Available').length;

    return {
      utilization,
      activeTrips,
      pendingTrips,
      activeVehicles,
      availableVehiclesCount,
      driversOnDuty
    };
  });

  // Recent trips showing max 5 rows
  recentTrips = computed(() => {
    return this.filteredTrips()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  getVehicleReg(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.registrationNumber : 'Unknown';
  }

  getVehicleName(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.name : 'Unknown Vehicle';
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

  // Count vehicles by status in filtered collection
  getStatusCount(status: 'Available' | 'On Trip' | 'In Shop' | 'Retired'): number {
    return this.filteredVehicles().filter(v => v.status === status).length;
  }

  // Get percentage width for status bar
  getStatusPercentage(status: 'Available' | 'On Trip' | 'In Shop' | 'Retired'): number {
    const total = this.filteredVehicles().length;
    if (total === 0) return 0;
    return (this.getStatusCount(status) / total) * 100;
  }
}
