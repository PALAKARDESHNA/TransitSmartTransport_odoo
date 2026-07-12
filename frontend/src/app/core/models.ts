export interface User {
  id: string;
  name: string;
  email: string;
  role: 'FleetManager' | 'Dispatcher' | 'SafetyOfficer' | 'FinancialAnalyst';
  status: 'Active' | 'Inactive';
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: 'Truck' | 'Van' | 'Bike' | 'Trailer' | 'Bus';
  maxLoadCapacity: number; // kg
  odometer: number;
  acquisitionCost: number;
  region: string;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string; // ISO Date String
  contactNumber: string;
  safetyScore: number;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
  region: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance?: number;
  fuelConsumed?: number; // liters
  startOdometer: number;
  endOdometer?: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  revenue: number;
  dispatchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  cost: number;
  status: 'Active' | 'Closed';
  startDate: string;
  closedDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  liters: number;
  cost: number;
  date: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  type: 'Toll' | 'Maintenance' | 'Other';
  amount: number;
  date: string;
  notes: string;
}
