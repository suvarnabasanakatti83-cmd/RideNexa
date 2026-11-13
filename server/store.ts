import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  AuthUser,
  ContactSubmission,
  DriverRecord,
  RideRecord,
  UserRole,
} from '../src/types/ridenexa.js';
import { hashPassword } from './auth.js';
import { createSeedDrivers, createSeedRides } from './cityData.js';

export interface StoredUser extends AuthUser {
  passwordHash: string;
}

interface PersistedState {
  users: StoredUser[];
  drivers: DriverRecord[];
  rides: RideRecord[];
  contacts: ContactSubmission[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'ridenexa-db.json');

// Mongoose Schemas (used when MONGODB_URI is configured)
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PASSENGER', 'DRIVER', 'ADMIN'], required: true },
  phone: String,
  createdAt: { type: String, required: true },
});

const DriverSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: String,
  name: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  vehicleTier: { type: String, required: true },
  plateNumber: { type: String, required: true },
  rating: Number,
  isOnline: Boolean,
  isAvailable: Boolean,
  coordinates: { lat: Number, lng: Number },
  areaName: String,
  ridesCompletedToday: Number,
  totalRidesCompleted: Number,
  dailyEarnings: Number,
  minutesSinceLastRide: Number,
  acceptanceRate: Number,
  isSimulatedLocation: Boolean,
  lastUpdatedAt: String,
});

const RideSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  passengerId: String,
  passengerName: String,
  driverId: String,
  driverName: String,
  vehicleModel: String,
  plateNumber: String,
  vehicleTier: String,
  pickupAddress: String,
  pickupCoords: { lat: Number, lng: Number },
  destinationAddress: String,
  destinationCoords: { lat: Number, lng: Number },
  distanceKm: Number,
  durationMin: Number,
  estimatedFare: Number,
  pooledDiscountFare: Number,
  status: String,
  allocationReason: String,
  allocationScore: Number,
  routePath: [[Number]],
  requestedAt: String,
  assignedAt: String,
  completedAt: String,
  cancelledAt: String,
  isSimulatedDemo: Boolean,
});

const ContactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  organization: String,
  topic: String,
  message: String,
  createdAt: String,
});

const UserModel = mongoose.models.RnUser || mongoose.model('RnUser', UserSchema);
const DriverModel = mongoose.models.RnDriver || mongoose.model('RnDriver', DriverSchema);
const RideModel = mongoose.models.RnRide || mongoose.model('RnRide', RideSchema);
const ContactModel = mongoose.models.RnContact || mongoose.model('RnContact', ContactSchema);

class RideNexaStore {
  public databaseMode: 'MONGODB' | 'LOCAL_DEMO_STORE' = 'LOCAL_DEMO_STORE';
  private state: PersistedState = {
    users: [],
    drivers: [],
    rides: [],
    contacts: [],
  };
  private initialized = false;
  private lastLoadedMtimeMs = 0;

  async init(): Promise<void> {
    if (this.initialized) return;

    const mongoUri = process.env.MONGODB_URI?.trim();
    if (mongoUri) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
        this.databaseMode = 'MONGODB';
        await this.seedMongoIfEmpty();
        await this.syncCacheFromMongo();
        await this.reconcileAdminProvisioning();
        this.initialized = true;
        console.log('[RideNexa] Connected to MongoDB via Mongoose.');
        return;
      } catch (err) {
        console.warn(
          '[RideNexa] MongoDB connection unavailable, using persistent local demo store:',
          (err as Error).message
        );
      }
    }

    this.databaseMode = 'LOCAL_DEMO_STORE';
    await this.loadOrSeedLocalStore();
    await this.reconcileAdminProvisioning();
    this.initialized = true;
    console.log('[RideNexa] Initialized persistent local demo store at .data/ridenexa-db.json');
  }

  private async buildDefaultDemoUsers(): Promise<StoredUser[]> {
    // Only Passenger & Driver demonstration accounts are seeded automatically.
    // Admin accounts are NEVER hardcoded and must be provisioned server-side via environment variables or protected setup.
    const defaultPasswordHash = await hashPassword('RideNexa123!');
    const now = new Date().toISOString();
    return [
      {
        id: 'user-passenger-demo',
        name: 'Aarav Sharma',
        email: 'passenger@ridenexa.io',
        passwordHash: defaultPasswordHash,
        role: 'PASSENGER',
        phone: '+91 98450 11223',
        createdAt: now,
      },
      {
        id: 'user-driver-demo',
        name: 'Arjun Nair',
        email: 'driver@ridenexa.io',
        passwordHash: defaultPasswordHash,
        role: 'DRIVER',
        phone: '+91 98450 44556',
        createdAt: now,
      },
    ];
  }

  private async seedMongoIfEmpty(): Promise<void> {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      const users = await this.buildDefaultDemoUsers();
      await UserModel.insertMany(users);
    }
    const driverCount = await DriverModel.countDocuments();
    if (driverCount === 0) {
      await DriverModel.insertMany(createSeedDrivers());
    }
    const rideCount = await RideModel.countDocuments();
    if (rideCount === 0) {
      await RideModel.insertMany(createSeedRides());
    }
  }

  private async syncCacheFromMongo(): Promise<void> {
    const [users, drivers, rides, contacts] = await Promise.all([
      UserModel.find().lean(),
      DriverModel.find().lean(),
      RideModel.find().lean(),
      ContactModel.find().lean(),
    ]);
    this.state = {
      users: users as unknown as StoredUser[],
      drivers: drivers as unknown as DriverRecord[],
      rides: rides as unknown as RideRecord[],
      contacts: contacts as unknown as ContactSubmission[],
    };
  }

  private async loadOrSeedLocalStore(): Promise<void> {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const stat = fs.statSync(STORE_FILE);
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.users?.length && parsed.drivers?.length) {
          this.state = {
            users: parsed.users,
            drivers: parsed.drivers,
            rides: parsed.rides || [],
            contacts: parsed.contacts || [],
          };
          this.lastLoadedMtimeMs = stat.mtimeMs;
          return;
        }
      }
    } catch {
      // Fall back to fresh seed
    }

    this.state = {
      users: await this.buildDefaultDemoUsers(),
      drivers: createSeedDrivers(),
      rides: createSeedRides(),
      contacts: [],
    };
    this.persistLocal();
  }

  private async reconcileAdminProvisioning(): Promise<void> {
    // Clean up any legacy hardcoded admin account from prior runs if it exists
    const hadLegacyAdmin = this.state.users.some((u) => u.id === 'user-admin-demo');
    if (hadLegacyAdmin) {
      this.state.users = this.state.users.filter((u) => u.id !== 'user-admin-demo');
      if (this.databaseMode === 'MONGODB') {
        await UserModel.deleteOne({ id: 'user-admin-demo' });
      }
      this.persistLocal();
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME?.trim() || 'RideNexa Administrator';

    if (adminEmail && adminPassword && adminPassword.length >= 8) {
      await this.provisionAdmin({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      });
    }
  }

  async provisionAdmin(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<StoredUser> {
    this.syncIfLocalChanged();
    const emailNorm = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const existingIdx = this.state.users.findIndex((u) => u.email.toLowerCase() === emailNorm);

    if (existingIdx !== -1) {
      const updated: StoredUser = {
        ...this.state.users[existingIdx],
        name: input.name?.trim() || this.state.users[existingIdx].name,
        passwordHash,
        role: 'ADMIN',
      };
      this.state.users[existingIdx] = updated;
      if (this.databaseMode === 'MONGODB') {
        await UserModel.updateOne(
          { id: updated.id },
          { $set: { name: updated.name, passwordHash: updated.passwordHash, role: 'ADMIN' } }
        );
      }
      this.persistLocal();
      return updated;
    }

    const adminUser: StoredUser = {
      id: `user-admin-${Date.now().toString(36)}`,
      name: input.name?.trim() || 'RideNexa Administrator',
      email: emailNorm,
      passwordHash,
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };
    this.state.users.push(adminUser);
    if (this.databaseMode === 'MONGODB') {
      await UserModel.create(adminUser);
    }
    this.persistLocal();
    return adminUser;
  }

  hasAdminUser(): boolean {
    this.syncIfLocalChanged();
    return this.state.users.some((u) => u.role === 'ADMIN');
  }

  private persistLocal(): void {
    if (this.databaseMode !== 'LOCAL_DEMO_STORE') return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
      this.lastLoadedMtimeMs = fs.statSync(STORE_FILE).mtimeMs;
    } catch (err) {
      console.error('[RideNexa] Failed to persist local store:', err);
    }
  }

  private syncIfLocalChanged(): void {
    if (this.databaseMode !== 'LOCAL_DEMO_STORE') return;
    try {
      if (!fs.existsSync(STORE_FILE)) return;
      const stat = fs.statSync(STORE_FILE);
      if (stat.mtimeMs > this.lastLoadedMtimeMs) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.users?.length) {
          this.state = {
            users: parsed.users,
            drivers: parsed.drivers || this.state.drivers,
            rides: parsed.rides || this.state.rides,
            contacts: parsed.contacts || this.state.contacts,
          };
          this.lastLoadedMtimeMs = stat.mtimeMs;
        }
      }
    } catch {
      // Ignore transient read error
    }
  }

  // USERS
  findUserByEmail(email: string): StoredUser | undefined {
    this.syncIfLocalChanged();
    const norm = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.toLowerCase() === norm);
  }

  findUserById(id: string): StoredUser | undefined {
    this.syncIfLocalChanged();
    return this.state.users.find((u) => u.id === id);
  }

  getAllUsersSafe(): AuthUser[] {
    this.syncIfLocalChanged();
    return this.state.users.map(({ passwordHash: _ph, ...safe }) => safe);
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role: 'PASSENGER' | 'DRIVER';
    phone?: string;
    vehicleModel?: string;
    plateNumber?: string;
  }): Promise<StoredUser> {
    const safeRole: 'PASSENGER' | 'DRIVER' = input.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';

    const user: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      role: safeRole,
      phone: input.phone?.trim(),
      createdAt: new Date().toISOString(),
    };

    this.state.users.push(user);
    if (this.databaseMode === 'MONGODB') {
      await UserModel.create(user);
    }

    if (safeRole === 'DRIVER') {
      const driver: DriverRecord = {
        id: `drv-${Date.now().toString().slice(-5)}`,
        userId: user.id,
        name: user.name,
        vehicleModel: input.vehicleModel?.trim() || 'Tata Nexon EV',
        vehicleTier: 'EV_COMFORT',
        plateNumber: input.plateNumber?.trim() || `KA-01-RN-${Math.floor(1000 + Math.random() * 8999)}`,
        rating: 4.9,
        isOnline: true,
        isAvailable: true,
        coordinates: { lat: 12.9722, lng: 77.6012 },
        areaName: 'MG Road Transit Hub',
        ridesCompletedToday: 0,
        totalRidesCompleted: 0,
        dailyEarnings: 0,
        minutesSinceLastRide: 35,
        acceptanceRate: 1.0,
        isSimulatedLocation: true,
        lastUpdatedAt: new Date().toISOString(),
      };
      this.state.drivers.push(driver);
      if (this.databaseMode === 'MONGODB') {
        await DriverModel.create(driver);
      }
    }

    this.persistLocal();
    return user;
  }

  // DRIVERS
  getDrivers(): DriverRecord[] {
    return this.state.drivers;
  }

  getDriverByUserIdOrId(userIdOrId: string): DriverRecord | undefined {
    return this.state.drivers.find((d) => d.userId === userIdOrId || d.id === userIdOrId);
  }

  async updateDriver(driverId: string, patch: Partial<DriverRecord>): Promise<DriverRecord | null> {
    this.syncIfLocalChanged();
    const idx = this.state.drivers.findIndex((d) => d.id === driverId || d.userId === driverId);
    if (idx === -1) return null;

    const updated: DriverRecord = {
      ...this.state.drivers[idx],
      ...patch,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.state.drivers[idx] = updated;
    if (this.databaseMode === 'MONGODB') {
      await DriverModel.updateOne({ id: updated.id }, { $set: updated });
    }
    this.persistLocal();
    return updated;
  }

  // RIDES
  getRides(): RideRecord[] {
    return [...this.state.rides].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  getRideById(id: string): RideRecord | undefined {
    return this.state.rides.find((r) => r.id === id);
  }

  async createRide(ride: RideRecord): Promise<RideRecord> {
    this.state.rides.unshift(ride);
    if (this.databaseMode === 'MONGODB') {
      await RideModel.create(ride);
    }
    this.persistLocal();
    return ride;
  }

  async updateRide(id: string, patch: Partial<RideRecord>): Promise<RideRecord | null> {
    const idx = this.state.rides.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated: RideRecord = { ...this.state.rides[idx], ...patch };
    this.state.rides[idx] = updated;
    if (this.databaseMode === 'MONGODB') {
      await RideModel.updateOne({ id }, { $set: updated });
    }
    this.persistLocal();
    return updated;
  }

  // CONTACTS
  async createContact(submission: ContactSubmission): Promise<ContactSubmission> {
    this.state.contacts.unshift(submission);
    if (this.databaseMode === 'MONGODB') {
      await ContactModel.create(submission);
    }
    this.persistLocal();
    return submission;
  }

  getUsersCountByRole(role: UserRole): number {
    this.syncIfLocalChanged();
    return this.state.users.filter((u) => u.role === role).length;
  }
}

export const store = new RideNexaStore();
