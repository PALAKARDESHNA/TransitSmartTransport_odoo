import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FleetStateService } from '../../core/fleet-state.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="analytics-page animate-fade-in">
      <!-- TOP ACTION BAR -->
      <section class="action-bar custom-card">
        <div class="title-area">
          <h2>Fleet Performance & ROI Analytics</h2>
          <p class="text-muted">Real-time reports derived from completed trips, fuel refuels, and maintenance invoices.</p>
        </div>

        <div class="action-buttons">
          <button mat-flat-button class="btn-accent" (click)="exportCSV()">
            <mat-icon>download</mat-icon> Export ROI Report (CSV)
          </button>
        </div>
      </section>

      <!-- KPI ROW -->
      <section class="kpi-grid grid-container grid-cols-4 animate-slide-up">
        <!-- Fuel Efficiency -->
        <div class="kpi-card border-green">
          <span class="lbl">Avg Fuel Efficiency</span>
          <div class="kpi-val">{{ fleetReports().avgFuelEfficiency }} km/L</div>
          <span class="subtext">Completed trips mileage rollup</span>
        </div>

        <!-- Fleet Utilization -->
        <div class="kpi-card border-blue">
          <span class="lbl">Fleet Utilization</span>
          <div class="kpi-val">{{ kpiStats().utilization }}%</div>
          <span class="subtext">Active dispatches vs total registry</span>
        </div>

        <!-- Total Operational Cost -->
        <div class="kpi-card border-orange">
          <span class="lbl">Operational Cost Rollup</span>
          <div class="kpi-val">\${{ fleetReports().totalOperationalCost | number:'1.0-0' }}</div>
          <span class="subtext">Fuel + repairs + tolls total</span>
        </div>

        <!-- Vehicle ROI -->
        <div class="kpi-card border-purple">
          <span class="lbl">Average Fleet ROI</span>
          <div class="kpi-val">{{ fleetReports().avgRoi }}%</div>
          <span class="subtext">Return relative to acquisition cost</span>
        </div>
      </section>

      <!-- CHART VISUALIZATIONS ROW -->
      <section class="charts-row grid-container grid-cols-2">
        <!-- Monthly Dispatches (SVG Bar Chart) -->
        <div class="custom-card chart-card">
          <div class="chart-header">
            <h3>Monthly Dispatch Overview</h3>
            <span class="text-muted text-xs">Total trips completed per month</span>
          </div>
          <div class="chart-body">
            <div class="svg-chart-container">
              <!-- Custom responsive SVG bar chart -->
              <svg viewBox="0 0 400 200" class="svg-chart">
                <!-- Grid Lines -->
                <line x1="40" y1="20" x2="380" y2="20" stroke="#2a2f3c" stroke-dasharray="4" />
                <line x1="40" y1="70" x2="380" y2="70" stroke="#2a2f3c" stroke-dasharray="4" />
                <line x1="40" y1="120" x2="380" y2="120" stroke="#2a2f3c" stroke-dasharray="4" />
                <line x1="40" y1="170" x2="380" y2="170" stroke="#2a2f3c" />

                <!-- Bar 1: Feb -->
                <rect x="70" y="110" width="36" height="60" fill="#3b82f6" rx="3" class="chart-bar" />
                <text x="88" y="185" fill="#9ca3af" font-size="10" text-anchor="middle">Feb</text>
                <text x="88" y="100" fill="#e5e7eb" font-size="10" font-weight="600" text-anchor="middle">3 trips</text>

                <!-- Bar 2: Mar -->
                <rect x="150" y="80" width="36" height="90" fill="#3b82f6" rx="3" class="chart-bar" />
                <text x="168" y="185" fill="#9ca3af" font-size="10" text-anchor="middle">Mar</text>
                <text x="168" y="70" fill="#e5e7eb" font-size="10" font-weight="600" text-anchor="middle">5 trips</text>

                <!-- Bar 3: Apr -->
                <rect x="230" y="90" width="36" height="80" fill="#3b82f6" rx="3" class="chart-bar" />
                <text x="248" y="185" fill="#9ca3af" font-size="10" text-anchor="middle">Apr</text>
                <text x="248" y="80" fill="#e5e7eb" font-size="10" font-weight="600" text-anchor="middle">4 trips</text>

                <!-- Bar 4: May (Current/Peak) -->
                <rect x="310" y="50" width="36" height="120" fill="#d97706" rx="3" class="chart-bar-accent" />
                <text x="328" y="185" fill="#9ca3af" font-size="10" text-anchor="middle">May (Active)</text>
                <text x="328" y="40" fill="#e5e7eb" font-size="10" font-weight="600" text-anchor="middle">8 trips</text>

                <!-- Y Axis Labels -->
                <text x="32" y="24" fill="#9ca3af" font-size="8" text-anchor="end">10</text>
                <text x="32" y="74" fill="#9ca3af" font-size="8" text-anchor="end">5</text>
                <text x="32" y="124" fill="#9ca3af" font-size="8" text-anchor="end">2</text>
                <text x="32" y="174" fill="#9ca3af" font-size="8" text-anchor="end">0</text>
              </svg>
            </div>
          </div>
        </div>

        <!-- Top Vehicles by ROI (Horizontal Bar Chart) -->
        <div class="custom-card chart-card">
          <div class="chart-header">
            <h3>Top Performing Vehicles by ROI</h3>
            <span class="text-muted text-xs">ROI rating relative to acquisition cost</span>
          </div>
          <div class="chart-body">
            <div class="horizontal-bars-container">
              <div class="horiz-bar-row" *ngFor="let rep of topRoiVehicles()">
                <div class="bar-info">
                  <span class="reg-num bold-text">{{ rep.vehicle.registrationNumber }}</span>
                  <span class="name text-muted">{{ rep.vehicle.name }}</span>
                </div>
                <div class="bar-visual-container">
                  <!-- Width proportional to ROI -->
                  <div class="bar-visual"
                       [style.width.%]="getRoiWidthPercent(rep.roi)"
                       [ngClass]="rep.roi > 5 ? 'roi-high' : 'roi-mod'">
                  </div>
                  <span class="roi-num font-semibold" [ngClass]="rep.roi >= 0 ? 'text-green' : 'text-red'">
                    {{ rep.roi }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- DATA AUDIT GRID TABLE -->
      <section class="custom-card flex-column table-section">
        <div class="panel-header">
          <h2>Registry ROI Financial Performance Audit Table</h2>
          <p class="text-muted">Exact metrics used for calculations. All currency shown in USD ($).</p>
        </div>

        <div class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th>Vehicle Asset</th>
                <th>Distance Run</th>
                <th>Fuel Efficiency</th>
                <th>Acquisition Cost</th>
                <th>Operating Cost Rollup</th>
                <th>Trip Revenues</th>
                <th>Asset ROI</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of vehicleReports()" class="table-row">
                <td>
                  <div class="vehicle-cell">
                    <strong>{{ r.vehicle.registrationNumber }}</strong>
                    <span class="subtext">{{ r.vehicle.name }} ({{ r.vehicle.type }})</span>
                  </div>
                </td>
                <td>{{ r.totalDistance | number }} km</td>
                <td>
                  <span *ngIf="r.fuelEfficiency > 0; else noFe" class="bold-text">
                    {{ r.fuelEfficiency }} km/L
                  </span>
                  <ng-template #noFe><span class="text-muted">&mdash;</span></ng-template>
                </td>
                <td>\${{ r.vehicle.acquisitionCost | number }}</td>
                <td class="text-orange font-medium">\${{ r.operationalCost | number:'1.2-2' }}</td>
                <td class="text-green font-medium">\${{ r.totalRevenue | number:'1.2-2' }}</td>
                <td>
                  <span class="roi-badge" [ngClass]="r.roi >= 0 ? 'roi-pos' : 'roi-neg'">
                    {{ r.roi >= 0 ? '+' : '' }}{{ r.roi }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .analytics-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .action-bar {
      padding: 20px 24px !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .title-area {
      h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      p {
        font-size: 0.8rem;
      }
    }

    .flex-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-header {
      h2 {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-primary);
      }
      p {
        font-size: 0.8rem;
      }
    }

    // KPI row
    .kpi-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--card-radius);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-top-width: 4px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);

      &.border-green { border-top-color: var(--status-green) !important; }
      &.border-blue { border-top-color: var(--status-blue) !important; }
      &.border-orange { border-top-color: var(--status-orange) !important; }
      &.border-purple { border-top-color: #a855f7 !important; }

      .lbl {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.5px;
      }

      .kpi-val {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text-primary);
      }

      .subtext {
        font-size: 0.7rem;
        color: var(--text-secondary);
      }
    }

    // Chart layouts
    .chart-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .chart-body {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 220px;
    }

    .svg-chart-container {
      width: 100%;
      height: 100%;
    }

    .svg-chart {
      width: 100%;
      height: 100%;

      .chart-bar {
        transition: height 0.4s ease;
        &:hover {
          fill: #60a5fa;
        }
      }

      .chart-bar-accent {
        transition: height 0.4s ease;
        &:hover {
          fill: #fbbf24;
        }
      }
    }

    // Horizontal bars
    .horizontal-bars-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .horiz-bar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .bar-info {
      width: 160px;
      display: flex;
      flex-direction: column;
      min-width: 0;

      .reg-num {
        font-size: 0.85rem;
        color: var(--text-primary);
      }

      .name {
        font-size: 0.75rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .bar-visual-container {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-visual {
      height: 14px;
      border-radius: 4px;
      transition: width 0.5s ease-in-out;

      &.roi-high { background: linear-gradient(90deg, #ec4899, #f43f5e); } // Warm pink-orange gradient
      &.roi-mod { background: linear-gradient(90deg, #f59e0b, #d97706); }
    }

    .roi-num {
      font-size: 0.8rem;
      min-width: 48px;
    }

    // Tables
    .table-section {
      padding: 0 !important;
      overflow: hidden;
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        padding: 12px 16px;
        color: var(--text-secondary);
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background-color: rgba(22, 26, 35, 0.4);
      }

      td {
        padding: 14px 16px;
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

    .vehicle-cell {
      display: flex;
      flex-direction: column;
      .subtext {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
    }

    .text-orange { color: var(--status-orange); }
    .text-green { color: var(--status-green); }
    .text-red { color: var(--status-red); }

    .roi-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;

      &.roi-pos {
        background-color: var(--status-green-bg);
        color: var(--status-green);
      }

      &.roi-neg {
        background-color: var(--status-red-bg);
        color: var(--status-red);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsComponent {
  private fleetState = inject(FleetStateService);

  // DB collections
  vehicleReports = this.fleetState.vehicleReports;
  fleetReports = this.fleetState.fleetReports;
  kpiStats = this.fleetState.dashboardKpis;

  // Top 5 vehicles by ROI sorted descending
  topRoiVehicles = computed(() => {
    return [...this.vehicleReports()]
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);
  });

  getVehicleReg(vehicleId: string): string {
    const v = this.fleetState.vehicles().find(x => x.id === vehicleId);
    return v ? v.registrationNumber : 'Unknown';
  }

  // Calculate width percent for ROI visual scaling (cap at 100%)
  getRoiWidthPercent(roi: number): number {
    if (roi <= 0) return 2;
    // Map highest ROI to max 90% for visual aesthetics
    const maxRoi = Math.max(...this.vehicleReports().map(r => r.roi));
    if (maxRoi <= 0) return 50;
    return Math.max(10, Math.min((roi / maxRoi) * 90, 95));
  }

  // Export tables as CSV (browser client-side download)
  exportCSV(): void {
    const data = this.vehicleReports();
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Header row
    csvContent += 'Registration,Model,Type,Total Distance (km),Fuel Efficiency (km/L),Acquisition Cost ($),Operational Cost ($),Revenues ($),ROI (%)\n';

    // Rows
    data.forEach(r => {
      const row = [
        r.vehicle.registrationNumber,
        `"${r.vehicle.name}"`,
        r.vehicle.type,
        r.totalDistance,
        r.fuelEfficiency,
        r.vehicle.acquisitionCost,
        r.operationalCost,
        r.totalRevenue,
        `${r.roi}%`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transitops_fleet_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  }
}
