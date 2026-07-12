import { Injectable, signal, computed } from '@angular/core';
import { Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense } from './models';

@Injectable({
  providedIn: 'root'
})
export class FleetStateService {
  // --- IN-MEMORY DATABASE STORAGE ---

  // 15 Vehicles Seed (mix of statuses, capacity, cost, regions)
  private vehiclesSignal = signal<Vehicle[]>([
    { id: 'v1', registrationNumber: 'TX-9021-A', name: 'Volvo FH16 Globetrotter', type: 'Truck', maxLoadCapacity: 25000, odometer: 142000, acquisitionCost: 150000, region: 'North', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v2', registrationNumber: 'TX-1188-B', name: 'Scania R500 V8', type: 'Truck', maxLoadCapacity: 22000, odometer: 95500, acquisitionCost: 140000, region: 'East', status: 'On Trip', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v3', registrationNumber: 'TX-4402-C', name: 'Mercedes-Benz Actros', type: 'Truck', maxLoadCapacity: 24000, odometer: 180300, acquisitionCost: 145000, region: 'South', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v4', registrationNumber: 'TX-7766-D', name: 'Ford Transit Cargo Van', type: 'Van', maxLoadCapacity: 3500, odometer: 64200, acquisitionCost: 45000, region: 'West', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v5', registrationNumber: 'TX-2299-E', name: 'Mercedes Sprinter Van', type: 'Van', maxLoadCapacity: 4000, odometer: 122100, acquisitionCost: 48000, region: 'North', status: 'In Shop', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v6', registrationNumber: 'TX-8833-F', name: 'Yamaha Super Ténéré', type: 'Bike', maxLoadCapacity: 150, odometer: 32000, acquisitionCost: 18000, region: 'South', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v7', registrationNumber: 'TX-5511-G', name: 'Honda NC750X Delivery', type: 'Bike', maxLoadCapacity: 120, odometer: 18500, acquisitionCost: 12000, region: 'West', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v8', registrationNumber: 'TX-3377-H', name: 'MAN TGX Heavy Hauler', type: 'Truck', maxLoadCapacity: 30000, odometer: 215000, acquisitionCost: 180000, region: 'East', status: 'Retired', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v9', registrationNumber: 'TX-9900-I', name: 'Krone Dry Liner Trailer', type: 'Trailer', maxLoadCapacity: 28000, odometer: 87000, acquisitionCost: 35000, region: 'North', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v10', registrationNumber: 'TX-6644-J', name: 'Schmitz Cargobull Reef', type: 'Trailer', maxLoadCapacity: 27000, odometer: 104000, acquisitionCost: 42000, region: 'South', status: 'On Trip', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v11', registrationNumber: 'TX-1155-K', name: 'Iveco Daily Light Truck', type: 'Van', maxLoadCapacity: 5000, odometer: 135400, acquisitionCost: 38000, region: 'East', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v12', registrationNumber: 'TX-4488-L', name: 'BYD Electric Delivery Van', type: 'Van', maxLoadCapacity: 3000, odometer: 42000, acquisitionCost: 55000, region: 'West', status: 'In Shop', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v13', registrationNumber: 'TX-8800-M', name: 'Alexander Dennis Enviro', type: 'Bus', maxLoadCapacity: 12000, odometer: 258000, acquisitionCost: 220000, region: 'South', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v14', registrationNumber: 'TX-2211-N', name: 'Volvo 9700 Luxury Coach', type: 'Bus', maxLoadCapacity: 14000, odometer: 112000, acquisitionCost: 280000, region: 'North', status: 'Available', createdAt: new Date(), updatedAt: new Date() },
    { id: 'v15', registrationNumber: 'TX-7733-O', name: 'Kässbohrer Car Transporter', type: 'Trailer', maxLoadCapacity: 20000, odometer: 324000, acquisitionCost: 65000, region: 'East', status: 'Retired', createdAt: new Date(), updatedAt: new Date() }
  ]);

  // 15 Drivers Seed (expired, suspended, active)
  private driversSignal = signal<Driver[]>([
    { id: 'd1', name: 'John Doe', licenseNumber: 'DL-908821', licenseCategory: 'HMV', licenseExpiryDate: '2027-10-15', contactNumber: '+1-555-0192', safetyScore: 98, status: 'Available', region: 'North', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd2', name: 'Robert Smith', licenseNumber: 'DL-110293', licenseCategory: 'HMV', licenseExpiryDate: '2028-04-20', contactNumber: '+1-555-0143', safetyScore: 92, status: 'On Trip', region: 'East', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd3', name: 'Alice Johnson', licenseNumber: 'DL-448821', licenseCategory: 'LMV', licenseExpiryDate: '2026-12-05', contactNumber: '+1-555-0177', safetyScore: 85, status: 'Available', region: 'South', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd4', name: 'Michael Brown', licenseNumber: 'DL-229910', licenseCategory: 'HMV', licenseExpiryDate: '2023-01-10', contactNumber: '+1-555-0182', safetyScore: 78, status: 'Available', region: 'West', createdAt: new Date(), updatedAt: new Date() }, // Expired license
    { id: 'd5', name: 'David Wilson', licenseNumber: 'DL-883391', licenseCategory: 'LMV', licenseExpiryDate: '2027-02-14', contactNumber: '+1-555-0155', safetyScore: 95, status: 'Suspended', region: 'North', createdAt: new Date(), updatedAt: new Date() }, // Suspended
    { id: 'd6', name: 'Jessica Taylor', licenseNumber: 'DL-552210', licenseCategory: 'Motorcycle', licenseExpiryDate: '2026-11-22', contactNumber: '+1-555-0160', safetyScore: 100, status: 'Available', region: 'South', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd7', name: 'James Martinez', licenseNumber: 'DL-334419', licenseCategory: 'Motorcycle', licenseExpiryDate: '2028-09-30', contactNumber: '+1-555-0111', safetyScore: 89, status: 'Available', region: 'West', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd8', name: 'William Jones', licenseNumber: 'DL-990088', licenseCategory: 'HMV', licenseExpiryDate: '2025-06-18', contactNumber: '+1-555-0188', safetyScore: 82, status: 'Off Duty', region: 'North', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd9', name: 'Emily Davis', licenseNumber: 'DL-773344', licenseCategory: 'HMV', licenseExpiryDate: '2027-07-25', contactNumber: '+1-555-0133', safetyScore: 97, status: 'On Trip', region: 'South', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd10', name: 'Charles Thomas', licenseNumber: 'DL-116633', licenseCategory: 'LMV', licenseExpiryDate: '2029-01-05', contactNumber: '+1-555-0122', safetyScore: 91, status: 'Available', region: 'East', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd11', name: 'Sarah Miller', licenseNumber: 'DL-884422', licenseCategory: 'HMV', licenseExpiryDate: '2024-05-12', contactNumber: '+1-555-0199', safetyScore: 94, status: 'Suspended', region: 'West', createdAt: new Date(), updatedAt: new Date() }, // Expired + Suspended
    { id: 'd12', name: 'Thomas Anderson', licenseNumber: 'DL-661122', licenseCategory: 'LMV', licenseExpiryDate: '2029-08-14', contactNumber: '+1-555-0100', safetyScore: 96, status: 'Available', region: 'East', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd13', name: 'Patricia Jackson', licenseNumber: 'DL-338877', licenseCategory: 'HMV', licenseExpiryDate: '2028-03-24', contactNumber: '+1-555-0105', safetyScore: 84, status: 'Available', region: 'South', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd14', name: 'Daniel White', licenseNumber: 'DL-224488', licenseCategory: 'HMV', licenseExpiryDate: '2027-12-10', contactNumber: '+1-555-0107', safetyScore: 90, status: 'Available', region: 'West', createdAt: new Date(), updatedAt: new Date() },
    { id: 'd15', name: 'Elizabeth Harris', licenseNumber: 'DL-558833', licenseCategory: 'HMV', licenseExpiryDate: '2028-11-19', contactNumber: '+1-555-0109', safetyScore: 93, status: 'Available', region: 'North', createdAt: new Date(), updatedAt: new Date() }
  ]);

  // 12 Trips Seed (mix of states, spread over 30 days)
  private tripsSignal = signal<Trip[]>([
    { id: 't1', source: 'Chicago Depot', destination: 'Detroit Logistics Center', vehicleId: 'v2', driverId: 'd2', cargoWeight: 18000, plannedDistance: 280, status: 'Dispatched', revenue: 2400, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), updatedAt: new Date().toISOString(), startOdometer: 95500 },
    { id: 't2', source: 'Houston Terminal', destination: 'Dallas Hub', vehicleId: 'v10', driverId: 'd9', cargoWeight: 15000, plannedDistance: 240, status: 'Dispatched', revenue: 1850, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), updatedAt: new Date().toISOString(), startOdometer: 104000 },
    { id: 't3', source: 'Atlanta Distribution', destination: 'Miami Port', vehicleId: 'v3', driverId: 'd3', cargoWeight: 22000, plannedDistance: 660, actualDistance: 665, fuelConsumed: 220, startOdometer: 179635, endOdometer: 180300, status: 'Completed', revenue: 4800, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't4', source: 'Denver Outpost', destination: 'Salt Lake Storage', vehicleId: 'v4', driverId: 'd1', cargoWeight: 2800, plannedDistance: 520, actualDistance: 520, fuelConsumed: 65, startOdometer: 63680, endOdometer: 64200, status: 'Completed', revenue: 1900, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 98).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't5', source: 'Seattle Port', destination: 'Portland Warehouse', vehicleId: 'v7', driverId: 'd7', cargoWeight: 80, plannedDistance: 175, actualDistance: 175, fuelConsumed: 12, startOdometer: 18325, endOdometer: 18500, status: 'Completed', revenue: 450, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 115).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 122).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't6', source: 'Chicago Depot', destination: 'Indianapolis Station', vehicleId: 'v1', driverId: 'd10', cargoWeight: 14000, plannedDistance: 180, status: 'Draft', revenue: 1200, startOdometer: 142000, createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't7', source: 'Los Angeles Depot', destination: 'San Francisco Hub', vehicleId: 'v14', driverId: 'd12', cargoWeight: 8000, plannedDistance: 380, status: 'Draft', revenue: 3200, startOdometer: 112000, createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't8', source: 'New York Depot', destination: 'Boston Center', vehicleId: 'v9', driverId: 'd15', cargoWeight: 20000, plannedDistance: 215, status: 'Cancelled', revenue: 1700, cancelledAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), updatedAt: new Date().toISOString(), startOdometer: 87000 },
    { id: 't9', source: 'St. Louis Terminal', destination: 'Kansas City Facility', vehicleId: 'v11', driverId: 'd13', cargoWeight: 4500, plannedDistance: 250, actualDistance: 252, fuelConsumed: 38, startOdometer: 135148, endOdometer: 135400, status: 'Completed', revenue: 1550, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 152).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't10', source: 'Phoenix Hub', destination: 'Tucson Branch', vehicleId: 'v6', driverId: 'd6', cargoWeight: 50, plannedDistance: 110, actualDistance: 110, fuelConsumed: 6, startOdometer: 31890, endOdometer: 32000, status: 'Completed', revenue: 300, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 198).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 202).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't11', source: 'Orlando Depot', destination: 'Tampa Facility', vehicleId: 'v13', driverId: 'd14', cargoWeight: 6000, plannedDistance: 85, actualDistance: 85, fuelConsumed: 25, startOdometer: 257915, endOdometer: 258000, status: 'Completed', revenue: 850, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 250).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 248).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 252).toISOString(), updatedAt: new Date().toISOString() },
    { id: 't12', source: 'Las Vegas Depot', destination: 'Salt Lake Storage', vehicleId: 'v4', driverId: 'd7', cargoWeight: 1200, plannedDistance: 420, actualDistance: 420, fuelConsumed: 52, startOdometer: 63260, endOdometer: 63680, status: 'Completed', revenue: 1500, dispatchedAt: new Date(Date.now() - 1000 * 60 * 60 * 300).toISOString(), completedAt: new Date(Date.now() - 1000 * 60 * 60 * 290).toISOString(), createdBy: 'u2', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 302).toISOString(), updatedAt: new Date().toISOString() }
  ]);

  // Maintenance logs Seed
  private maintenanceSignal = signal<MaintenanceLog[]>([
    { id: 'm1', vehicleId: 'v5', type: 'Oil Change & Filters', description: 'Scheduled major servicing. Replaced engine oil, fuel filters, and cabin filters.', cost: 850, status: 'Active', startDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), createdBy: 'u3', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { id: 'm2', vehicleId: 'v12', type: 'Brake Pad Replacement', description: 'Electric motors inspection, front brake pad replacement, and brake fluid top-up.', cost: 650, status: 'Active', startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), createdBy: 'u3', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: 'm3', vehicleId: 'v1', type: 'Tire Rotation', description: 'All-wheel tire rotation, front alignment check.', cost: 350, status: 'Closed', startDate: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), closedDate: new Date(Date.now() - 1000 * 60 * 60 * 160).toISOString(), createdBy: 'u3', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString() }
  ]);

  // Fuel logs Seed
  private fuelLogsSignal = signal<FuelLog[]>([
    { id: 'f1', vehicleId: 'v3', tripId: 't3', liters: 220, cost: 396, date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
    { id: 'f2', vehicleId: 'v4', tripId: 't4', liters: 65, cost: 110, date: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString() },
    { id: 'f3', vehicleId: 'v7', tripId: 't5', liters: 12, cost: 24, date: new Date(Date.now() - 1000 * 60 * 60 * 115).toISOString() },
    { id: 'f4', vehicleId: 'v11', tripId: 't9', liters: 38, cost: 72, date: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString() },
    { id: 'f5', vehicleId: 'v6', tripId: 't10', liters: 6, cost: 12, date: new Date(Date.now() - 1000 * 60 * 60 * 198).toISOString() },
    { id: 'f6', vehicleId: 'v13', tripId: 't11', liters: 25, cost: 50, date: new Date(Date.now() - 1000 * 60 * 60 * 248).toISOString() },
    { id: 'f7', vehicleId: 'v4', tripId: 't12', liters: 52, cost: 93, date: new Date(Date.now() - 1000 * 60 * 60 * 290).toISOString() }
  ]);

  // Expenses Seed (Toll & Others)
  private expensesSignal = signal<Expense[]>([
    { id: 'e1', vehicleId: 'v3', type: 'Toll', amount: 45, date: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(), notes: 'I-95 South tolls' },
    { id: 'e2', vehicleId: 'v4', type: 'Other', amount: 80, date: new Date(Date.now() - 1000 * 60 * 60 * 90).toISOString(), notes: 'Permit application fee' },
    { id: 'e3', vehicleId: 'v11', type: 'Toll', amount: 35, date: new Date(Date.now() - 1000 * 60 * 60 * 145).toISOString(), notes: 'State line tolls' }
  ]);

  constructor() {
    // Check if we have state persisted in localStorage (for persistent demo play)
    this.loadStateFromStorage();
  }

  // --- PERSISTENCE HELPERS ---
  private saveStateToStorage() {
    localStorage.setItem('transitops_vehicles', JSON.stringify(this.vehiclesSignal()));
    localStorage.setItem('transitops_drivers', JSON.stringify(this.driversSignal()));
    localStorage.setItem('transitops_trips', JSON.stringify(this.tripsSignal()));
    localStorage.setItem('transitops_maintenance', JSON.stringify(this.maintenanceSignal()));
    localStorage.setItem('transitops_fuel_logs', JSON.stringify(this.fuelLogsSignal()));
    localStorage.setItem('transitops_expenses', JSON.stringify(this.expensesSignal()));
  }

  private loadStateFromStorage() {
    const v = localStorage.getItem('transitops_vehicles');
    const d = localStorage.getItem('transitops_drivers');
    const t = localStorage.getItem('transitops_trips');
    const m = localStorage.getItem('transitops_maintenance');
    const f = localStorage.getItem('transitops_fuel_logs');
    const e = localStorage.getItem('transitops_expenses');

    if (v) this.vehiclesSignal.set(JSON.parse(v));
    if (d) this.driversSignal.set(JSON.parse(d));
    if (t) this.tripsSignal.set(JSON.parse(t));
    if (m) this.maintenanceSignal.set(JSON.parse(m));
    if (f) this.fuelLogsSignal.set(JSON.parse(f));
    if (e) this.expensesSignal.set(JSON.parse(e));
  }

  resetDemoSeed() {
    localStorage.removeItem('transitops_vehicles');
    localStorage.removeItem('transitops_drivers');
    localStorage.removeItem('transitops_trips');
    localStorage.removeItem('transitops_maintenance');
    localStorage.removeItem('transitops_fuel_logs');
    localStorage.removeItem('transitops_expenses');
    window.location.reload();
  }

  // --- SIGNAL EXPOSURES ---
  vehicles = this.vehiclesSignal.asReadonly();
  drivers = this.driversSignal.asReadonly();
  trips = this.tripsSignal.asReadonly();
  maintenance = this.maintenanceSignal.asReadonly();
  fuelLogs = this.fuelLogsSignal.asReadonly();
  expenses = this.expensesSignal.asReadonly();

  // --- QUERY ELIGIBILITY (RULE 4.2) ---

  // Vehicles eligible for dispatch (excludes On Trip, In Shop, Retired)
  availableVehicles = computed(() => {
    return this.vehiclesSignal().filter(v => v.status === 'Available');
  });

  // Drivers eligible for dispatch (excludes On Trip, Off Duty, Suspended, and expired license)
  availableDrivers = computed(() => {
    const now = new Date();
    return this.driversSignal().filter(d => {
      const expiry = new Date(d.licenseExpiryDate);
      return d.status === 'Available' && d.safetyScore > 0 && expiry > now;
    });
  });

  // --- MUTATION METHODS ---

  // Add / Edit Vehicles
  saveVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): { success: boolean; message: string } {
    const list = this.vehiclesSignal();

    // Enforce uniqueness of registrationNumber (Rule 4.1)
    const exists = list.some(v => v.registrationNumber.toLowerCase() === vehicle.registrationNumber.toLowerCase() && v.id !== vehicle.id);
    if (exists) {
      return { success: false, message: `Registration number ${vehicle.registrationNumber} already exists in the system!` };
    }

    if (vehicle.id) {
      // EDIT
      this.vehiclesSignal.set(list.map(v => v.id === vehicle.id ? {
        ...v,
        ...vehicle,
        updatedAt: new Date()
      } as Vehicle : v));
    } else {
      // ADD
      const newV: Vehicle = {
        ...vehicle,
        id: 'v_' + Math.random().toString(36).substr(2, 9),
        status: vehicle.status || 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.vehiclesSignal.set([...list, newV]);
    }

    this.saveStateToStorage();
    return { success: true, message: 'Vehicle saved successfully!' };
  }

  // Soft delete vehicle (Retire it - Section 5)
  retireVehicle(id: string) {
    this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === id ? { ...v, status: 'Retired', updatedAt: new Date() } : v));
    this.saveStateToStorage();
  }

  // Add / Edit Drivers
  saveDriver(driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): { success: boolean; message: string } {
    const list = this.driversSignal();

    // Check unique license number
    const exists = list.some(d => d.licenseNumber.toLowerCase() === driver.licenseNumber.toLowerCase() && d.id !== driver.id);
    if (exists) {
      return { success: false, message: `License number ${driver.licenseNumber} is already registered!` };
    }

    if (driver.id) {
      // EDIT
      this.driversSignal.set(list.map(d => d.id === driver.id ? {
        ...d,
        ...driver,
        updatedAt: new Date()
      } as Driver : d));
    } else {
      // ADD
      const newD: Driver = {
        ...driver,
        id: 'd_' + Math.random().toString(36).substr(2, 9),
        status: driver.status || 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.driversSignal.set([...list, newD]);
    }

    this.saveStateToStorage();
    return { success: true, message: 'Driver profile saved successfully!' };
  }

  // Soft delete / suspend driver
  suspendDriver(id: string) {
    this.driversSignal.set(this.driversSignal().map(d => d.id === id ? { ...d, status: 'Suspended', updatedAt: new Date() } : d));
    this.saveStateToStorage();
  }

  // --- TRIP LIFECYCLE (RULES 4.3 - 4.6) ---

  // Trip Validation (Rule 4.3)
  validateTrip(vehicleId: string, driverId: string, cargoWeight: number): { valid: boolean; message?: string } {
    const vehicle = this.vehiclesSignal().find(v => v.id === vehicleId);
    const driver = this.driversSignal().find(d => d.id === driverId);

    if (!vehicle) return { valid: false, message: 'Selected vehicle does not exist.' };
    if (!driver) return { valid: false, message: 'Selected driver does not exist.' };

    if (vehicle.status !== 'Available') {
      return { valid: false, message: `Vehicle ${vehicle.registrationNumber} is not available (Current status: ${vehicle.status})` };
    }
    if (driver.status !== 'Available') {
      return { valid: false, message: `Driver ${driver.name} is not available (Current status: ${driver.status})` };
    }

    // License expiry validation
    const now = new Date();
    const expiry = new Date(driver.licenseExpiryDate);
    if (expiry <= now) {
      return { valid: false, message: `Driver's license expired on ${driver.licenseExpiryDate}` };
    }

    // Cargo weight capacity validation
    if (cargoWeight > vehicle.maxLoadCapacity) {
      return { valid: false, message: `Cargo weight exceeds vehicle capacity of ${vehicle.maxLoadCapacity} kg` };
    }

    return { valid: true };
  }

  // Create Trip (starts in Draft - Rule 4.3)
  createTrip(trip: Omit<Trip, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'startOdometer'> & { startOdometer?: number }): { success: boolean; message: string; data?: Trip } {
    // Validate if it isn't verified yet
    const validation = this.validateTrip(trip.vehicleId, trip.driverId, trip.cargoWeight);
    if (!validation.valid) {
      return { success: false, message: validation.message || 'Validation failed' };
    }

    const vehicle = this.vehiclesSignal().find(v => v.id === trip.vehicleId)!;

    const newTrip: Trip = {
      ...trip,
      id: 't_' + Math.random().toString(36).substr(2, 9),
      status: 'Draft',
      startOdometer: vehicle.odometer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tripsSignal.set([...this.tripsSignal(), newTrip]);
    this.saveStateToStorage();

    return { success: true, message: 'Trip created successfully as Draft!', data: newTrip };
  }

  // Dispatch Trip (Rule 4.4)
  dispatchTrip(tripId: string): { success: boolean; message: string } {
    const trips = this.tripsSignal();
    const tripIdx = trips.findIndex(t => t.id === tripId);
    if (tripIdx === -1) return { success: false, message: 'Trip not found.' };

    const trip = trips[tripIdx];

    // Re-verify availability
    const vehicle = this.vehiclesSignal().find(v => v.id === trip.vehicleId);
    const driver = this.driversSignal().find(d => d.id === trip.driverId);

    if (!vehicle || vehicle.status !== 'Available') {
      return { success: false, message: 'Vehicle is no longer Available for dispatch.' };
    }
    if (!driver || driver.status !== 'Available') {
      return { success: false, message: 'Driver is no longer Available for dispatch.' };
    }

    // UPDATE STATES ATOMICALLY (MOCK TRANSACTION)
    // 1. Trip status -> Dispatched
    const updatedTrip: Trip = {
      ...trip,
      status: 'Dispatched',
      dispatchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 2. Vehicle status -> On Trip
    this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === trip.vehicleId ? { ...v, status: 'On Trip', updatedAt: new Date() } : v));

    // 3. Driver status -> On Trip
    this.driversSignal.set(this.driversSignal().map(d => d.id === trip.driverId ? { ...d, status: 'On Trip', updatedAt: new Date() } : d));

    // Update trips list
    this.tripsSignal.set(trips.map(t => t.id === tripId ? updatedTrip : t));

    this.saveStateToStorage();
    return { success: true, message: 'Trip successfully Dispatched! Fleet status updated.' };
  }

  // Complete Trip (Rule 4.5)
  completeTrip(tripId: string, endOdometer: number, fuelConsumed: number, revenue?: number): { success: boolean; message: string } {
    const trips = this.tripsSignal();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, message: 'Trip not found.' };

    if (trip.status !== 'Dispatched') {
      return { success: false, message: 'Only Dispatched trips can be Completed.' };
    }

    if (endOdometer <= trip.startOdometer) {
      return { success: false, message: `End odometer (${endOdometer}) must be greater than start odometer (${trip.startOdometer})` };
    }

    const actualDist = endOdometer - trip.startOdometer;

    // UPDATE STATES ATOMICALLY
    // 1. Trip details
    const updatedTrip: Trip = {
      ...trip,
      status: 'Completed',
      completedAt: new Date().toISOString(),
      actualDistance: actualDist,
      fuelConsumed: fuelConsumed,
      endOdometer: endOdometer,
      revenue: revenue !== undefined ? revenue : trip.revenue,
      updatedAt: new Date().toISOString()
    };

    // 2. Vehicle details: Odometer & status Available
    this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === trip.vehicleId ? {
      ...v,
      status: 'Available',
      odometer: endOdometer,
      updatedAt: new Date()
    } : v));

    // 3. Driver details: status Available
    this.driversSignal.set(this.driversSignal().map(d => d.id === trip.driverId ? {
      ...d,
      status: 'Available',
      updatedAt: new Date()
    } : d));

    // 4. Auto-create FuelLog entry
    if (fuelConsumed > 0) {
      const avgCostPerLiter = 1.8; // mock fuel price
      const newFuelLog: FuelLog = {
        id: 'f_' + Math.random().toString(36).substr(2, 9),
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        liters: fuelConsumed,
        cost: Math.round(fuelConsumed * avgCostPerLiter * 100) / 100,
        date: new Date().toISOString()
      };
      this.fuelLogsSignal.set([...this.fuelLogsSignal(), newFuelLog]);
    }

    // Update trips list
    this.tripsSignal.set(trips.map(t => t.id === tripId ? updatedTrip : t));

    this.saveStateToStorage();
    return { success: true, message: 'Trip Completed successfully! Odometer and status rolled back to Available.' };
  }

  // Cancel Trip (Rule 4.6)
  cancelTrip(tripId: string): { success: boolean; message: string } {
    const trips = this.tripsSignal();
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, message: 'Trip not found.' };

    if (trip.status !== 'Dispatched' && trip.status !== 'Draft') {
      return { success: false, message: 'Can only cancel Draft or Dispatched trips.' };
    }

    const wasDispatched = trip.status === 'Dispatched';

    // 1. Trip status -> Cancelled
    const updatedTrip: Trip = {
      ...trip,
      status: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (wasDispatched) {
      // Restore vehicle and driver to Available (since they were set to On Trip on Dispatch)
      this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === trip.vehicleId ? { ...v, status: 'Available', updatedAt: new Date() } : v));
      this.driversSignal.set(this.driversSignal().map(d => d.id === trip.driverId ? { ...d, status: 'Available', updatedAt: new Date() } : d));
    }

    this.tripsSignal.set(trips.map(t => t.id === tripId ? updatedTrip : t));
    this.saveStateToStorage();

    return { success: true, message: 'Trip Cancelled successfully. Resources freed.' };
  }

  // --- MAINTENANCE OPERATIONS (RULE 4.7) ---

  logMaintenance(log: Omit<MaintenanceLog, 'id' | 'status' | 'startDate' | 'createdAt'>): { success: boolean; message: string } {
    const vehicle = this.vehiclesSignal().find(v => v.id === log.vehicleId);
    if (!vehicle) return { success: false, message: 'Vehicle not found.' };

    // Reject maintenance if vehicle currently On Trip
    if (vehicle.status === 'On Trip') {
      return { success: false, message: 'Cannot place vehicle in maintenance while it is On Trip!' };
    }

    const newLog: MaintenanceLog = {
      ...log,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      status: 'Active',
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // 1. Save maintenance log
    this.maintenanceSignal.set([...this.maintenanceSignal(), newLog]);

    // 2. Set vehicle status to In Shop
    this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === log.vehicleId ? { ...v, status: 'In Shop', updatedAt: new Date() } : v));

    this.saveStateToStorage();
    return { success: true, message: 'Maintenance record logged. Vehicle status updated to In Shop.' };
  }

  closeMaintenance(logId: string, cost?: number): { success: boolean; message: string } {
    const logs = this.maintenanceSignal();
    const log = logs.find(m => m.id === logId);
    if (!log) return { success: false, message: 'Maintenance record not found.' };

    const closedLog: MaintenanceLog = {
      ...log,
      status: 'Closed',
      closedDate: new Date().toISOString(),
      cost: cost !== undefined ? cost : log.cost
    };

    // Update maintenance list
    this.maintenanceSignal.set(logs.map(m => m.id === logId ? closedLog : m));

    // Update vehicle status back to Available (unless status is Retired)
    const vehicle = this.vehiclesSignal().find(v => v.id === log.vehicleId);
    if (vehicle && vehicle.status !== 'Retired') {
      this.vehiclesSignal.set(this.vehiclesSignal().map(v => v.id === log.vehicleId ? { ...v, status: 'Available', updatedAt: new Date() } : v));

      // Also create an Expense entry for Maintenance
      const maintenanceExpense: Expense = {
        id: 'e_' + Math.random().toString(36).substr(2, 9),
        vehicleId: log.vehicleId,
        type: 'Maintenance',
        amount: cost !== undefined ? cost : log.cost,
        date: new Date().toISOString(),
        notes: `Maintenance log: ${log.type} closed.`
      };
      this.expensesSignal.set([...this.expensesSignal(), maintenanceExpense]);
    }

    this.saveStateToStorage();
    return { success: true, message: 'Maintenance record closed. Vehicle set back to Available.' };
  }

  // --- FUEL & EXPENSE ACTIONS ---

  logFuel(log: Omit<FuelLog, 'id' | 'date'> & { date?: string }): { success: boolean; message: string } {
    const newLog: FuelLog = {
      ...log,
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      date: log.date || new Date().toISOString()
    };
    this.fuelLogsSignal.set([...this.fuelLogsSignal(), newLog]);
    this.saveStateToStorage();
    return { success: true, message: 'Fuel refuel logged successfully.' };
  }

  logExpense(expense: Omit<Expense, 'id' | 'date'> & { date?: string }): { success: boolean; message: string } {
    const newExp: Expense = {
      ...expense,
      id: 'e_' + Math.random().toString(36).substr(2, 9),
      date: expense.date || new Date().toISOString()
    };
    this.expensesSignal.set([...this.expensesSignal(), newExp]);
    this.saveStateToStorage();
    return { success: true, message: 'Expense logged successfully.' };
  }

  // --- REPORT FORMULAS & CALCULATIONS (RULES 4.8 & 4.9) ---

  // Get total operational cost rollup for a vehicle (Rule 4.8)
  getVehicleTotalOperationalCost(vehicleId: string): number {
    const fuelCost = this.fuelLogsSignal()
      .filter(f => f.vehicleId === vehicleId)
      .reduce((sum, f) => sum + f.cost, 0);

    const maintenanceCost = this.maintenanceSignal()
      .filter(m => m.vehicleId === vehicleId)
      .reduce((sum, m) => sum + m.cost, 0);

    const expenseCost = this.expensesSignal()
      .filter(e => e.vehicleId === vehicleId)
      .reduce((sum, e) => sum + e.amount, 0);

    return fuelCost + maintenanceCost + expenseCost;
  }

  // Get aggregate costs rollups
  getOperationalCostsRollup(): { fuel: number; maintenance: number; other: number; total: number } {
    const fuel = this.fuelLogsSignal().reduce((sum, f) => sum + f.cost, 0);
    const maintenance = this.maintenanceSignal().reduce((sum, m) => sum + m.cost, 0);
    const other = this.expensesSignal().reduce((sum, e) => sum + e.amount, 0);
    return {
      fuel,
      maintenance,
      other,
      total: fuel + maintenance + other
    };
  }

  // KPI Computations for Dashboard
  dashboardKpis = computed(() => {
    const vehicles = this.vehiclesSignal();
    const trips = this.tripsSignal();
    const drivers = this.driversSignal();

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
    const driversOnDuty = drivers.filter(d => d.status === 'On Trip' || d.status === 'Available').length;

    return {
      utilization,
      activeTrips,
      pendingTrips,
      activeVehicles,
      availableVehiclesCount,
      driversOnDuty
    };
  });

  // ROI & Fuel Efficiency Analytics per Vehicle (Rule 4.9)
  vehicleReports = computed(() => {
    return this.vehiclesSignal().map(v => {
      const vTrips = this.tripsSignal().filter(t => t.vehicleId === v.id && t.status === 'Completed');

      // 1. Total Distance
      const totalDistance = vTrips.reduce((sum, t) => sum + (t.actualDistance || 0), 0);

      // 2. Total Fuel Liters
      const totalFuelLiters = vTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);

      // Fuel Efficiency: totalDistance / totalFuelLiters (km/L)
      const fuelEfficiency = totalFuelLiters > 0
        ? Math.round((totalDistance / totalFuelLiters) * 10) / 10
        : 0;

      // 3. Operational Cost (Fuel cost + Maintenance cost + Expenses)
      const totalFuelCost = this.fuelLogsSignal().filter(f => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0);
      const totalMaintenanceCost = this.maintenanceSignal().filter(m => m.vehicleId === v.id).reduce((sum, m) => sum + m.cost, 0);
      const totalOtherExpense = this.expensesSignal().filter(e => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0);
      const opCost = totalFuelCost + totalMaintenanceCost + totalOtherExpense;

      // 4. Vehicle ROI = (Revenue - (Maintenance + Fuel + Expenses)) / Acquisition Cost * 100
      const totalRevenue = vTrips.reduce((sum, t) => sum + t.revenue, 0);
      const roi = v.acquisitionCost > 0
        ? Math.round(((totalRevenue - opCost) / v.acquisitionCost) * 100 * 10) / 10
        : 0;

      return {
        vehicle: v,
        totalDistance,
        totalFuelLiters,
        fuelEfficiency,
        operationalCost: opCost,
        totalRevenue,
        roi
      };
    });
  });

  // General fleet metrics averages
  fleetReports = computed(() => {
    const reports = this.vehicleReports();
    const validFE = reports.filter(r => r.fuelEfficiency > 0);
    const avgFuelEfficiency = validFE.length > 0
      ? Math.round((validFE.reduce((sum, r) => sum + r.fuelEfficiency, 0) / validFE.length) * 10) / 10
      : 8.5; // fallback average

    const totalOpCost = reports.reduce((sum, r) => sum + r.operationalCost, 0);
    const totalRev = reports.reduce((sum, r) => sum + r.totalRevenue, 0);
    const avgRoi = reports.length > 0
      ? Math.round((reports.reduce((sum, r) => sum + r.roi, 0) / reports.length) * 10) / 10
      : 0;

    return {
      avgFuelEfficiency,
      totalOperationalCost: totalOpCost,
      totalRevenue: totalRev,
      avgRoi
    };
  });
}
