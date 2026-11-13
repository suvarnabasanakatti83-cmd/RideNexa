import crypto from 'crypto';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import {
  calculateFare,
  haversineKm,
  runDemandForecast,
  runDriverRepositioning,
  runFairDriverAllocation,
  runRidePooling,
  runRouteOptimization,
} from './server/algorithms.js';
import {
  AuthenticatedRequest,
  hashPassword,
  requireAuth,
  requireRole,
  signToken,
  verifyPassword,
} from './server/auth.js';
import { CITY_LANDMARKS } from './server/cityData.js';
import { store } from './server/store.js';
import {
  AdminAnalyticsResponse,
  Coordinates,
  RideRecord,
  RideStatus,
  UserRole,
  VehicleTier,
} from './src/types/ridenexa.js';

dotenv.config();

const PORT = 3000;
const DRIVER_RESPONSE_TIMEOUT_SEC = Number(process.env.DRIVER_RESPONSE_TIMEOUT || 45);

async function bootstrap() {
  await store.init();

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  app.use(express.json({ limit: '1mb' }));

  // Periodically move simulated fleet vehicles slightly along city streets so maps stay lively
  // Only updates drivers marked isSimulatedLocation === true
  setInterval(async () => {
    const drivers = store.getDrivers();
    const updatedPositions: { id: string; coordinates: Coordinates; isSimulatedLocation: boolean }[] = [];
    for (const drv of drivers) {
      if (!drv.isOnline || !drv.isAvailable || !drv.isSimulatedLocation) continue;
      const deltaLat = (Math.random() - 0.5) * 0.0018;
      const deltaLng = (Math.random() - 0.5) * 0.0018;
      const nextCoords = {
        lat: Number(Math.min(13.06, Math.max(12.83, drv.coordinates.lat + deltaLat)).toFixed(5)),
        lng: Number(Math.min(77.77, Math.max(77.52, drv.coordinates.lng + deltaLng)).toFixed(5)),
      };
      await store.updateDriver(drv.id, { coordinates: nextCoords });
      updatedPositions.push({
        id: drv.id,
        coordinates: nextCoords,
        isSimulatedLocation: true,
      });
    }
    if (updatedPositions.length > 0) {
      io.emit('fleet:positions', { drivers: updatedPositions, isSimulatedFleet: true });
    }
  }, 4500);

  io.on('connection', (socket) => {
    socket.emit('fleet:sync', {
      drivers: store.getDrivers(),
      isSimulatedFleet: store.getDrivers().some((d) => d.isSimulatedLocation),
    });

    socket.on('driver:ping_location', async (payload: { driverId: string; coordinates: Coordinates; areaName?: string }) => {
      if (!payload?.driverId || !payload?.coordinates) return;
      const updated = await store.updateDriver(payload.driverId, {
        coordinates: payload.coordinates,
        areaName: payload.areaName || 'Live GPS Position',
        isSimulatedLocation: false,
      });
      if (updated) {
        io.emit('driver:updated', updated);
      }
    });
  });

  // ============================================================================
  // HEALTH & CITY DATA
  // ============================================================================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      databaseMode: store.databaseMode,
      driverResponseTimeoutSec: DRIVER_RESPONSE_TIMEOUT_SEC,
      mlServiceConfigured: Boolean(process.env.ML_SERVICE_URL?.trim()),
    });
  });

  app.get('/api/landmarks', (_req, res) => {
    res.json({ landmarks: CITY_LANDMARKS });
  });

  // ============================================================================
  // AUTHENTICATION & ROLE MANAGEMENT
  // ============================================================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role, phone, vehicleModel, plateNumber } = req.body as {
        name?: string;
        email?: string;
        password?: string;
        role?: UserRole;
        phone?: string;
        vehicleModel?: string;
        plateNumber?: string;
      };

      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }
      if (role === 'ADMIN') {
        res.status(403).json({
          error: 'Admin accounts cannot be created through public registration.',
        });
        return;
      }
      const validRole: 'PASSENGER' | 'DRIVER' = role === 'DRIVER' ? 'DRIVER' : 'PASSENGER';

      if (store.findUserByEmail(email)) {
        res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const created = await store.createUser({
        name,
        email,
        passwordHash,
        role: validRole,
        phone,
        vehicleModel,
        plateNumber,
      });

      const userSafe = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        phone: created.phone,
        createdAt: created.createdAt,
      };
      const token = signToken(userSafe);
      const driverProfile = validRole === 'DRIVER' ? store.getDriverByUserIdOrId(created.id) || null : null;

      res.status(201).json({ token, user: userSafe, driverProfile });
    } catch (err) {
      res.status(500).json({ error: 'Unable to register account right now.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const existing = store.findUserByEmail(email);
      if (!existing) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const valid = await verifyPassword(password, existing.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const userSafe = {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        phone: existing.phone,
        createdAt: existing.createdAt,
      };
      const token = signToken(userSafe);
      const driverProfile = existing.role === 'DRIVER' ? store.getDriverByUserIdOrId(existing.id) || null : null;

      res.json({ token, user: userSafe, driverProfile });
    } catch {
      res.status(500).json({ error: 'Authentication service error.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = store.findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }
    const userSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
    };
    const driverProfile = user.role === 'DRIVER' ? store.getDriverByUserIdOrId(user.id) || null : null;
    res.json({ user: userSafe, driverProfile });
  });

  app.get('/api/auth/admin-status', (_req, res) => {
    res.json({ adminProvisioned: store.hasAdminUser() });
  });

  // ============================================================================
  // FLEET & DRIVER ENDPOINTS
  // ============================================================================
  app.get('/api/fleet/drivers', (_req, res) => {
    const drivers = store.getDrivers();
    res.json({
      drivers,
      isSimulatedFleet: drivers.some((d) => d.isSimulatedLocation),
    });
  });

  app.get('/api/drivers/me', requireAuth, requireRole('DRIVER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const requestedDriverId = (req.query.driverId as string) || '';
    const driver =
      (requestedDriverId ? store.getDriverByUserIdOrId(requestedDriverId) : undefined) ||
      store.getDriverByUserIdOrId(req.user!.id) ||
      store.getDrivers()[0];

    if (!driver) {
      res.status(404).json({ error: 'Driver profile not found.' });
      return;
    }

    const allRides = store.getRides();
    const incomingRides = allRides.filter(
      (r) =>
        r.status === 'REQUESTED' &&
        (!r.driverId || r.driverId === driver.id)
    );
    const activeRide = allRides.find(
      (r) =>
        r.driverId === driver.id &&
        (r.status === 'ASSIGNED' || r.status === 'EN_ROUTE' || r.status === 'IN_PROGRESS')
    ) || null;
    const rideHistory = allRides.filter(
      (r) => r.driverId === driver.id && (r.status === 'COMPLETED' || r.status === 'CANCELLED')
    );

    const repositioning = await runDriverRepositioning({
      drivers: store.getDrivers(),
      horizon: '+1H',
      targetDriverId: driver.id,
    });

    res.json({
      driver,
      activeRide,
      incomingRides,
      rideHistory,
      repositioning,
      driverResponseTimeoutSec: DRIVER_RESPONSE_TIMEOUT_SEC,
    });
  });

  app.patch('/api/drivers/me/status', requireAuth, requireRole('DRIVER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const { isOnline, driverId } = req.body as { isOnline?: boolean; driverId?: string };
    const driver =
      (driverId ? store.getDriverByUserIdOrId(driverId) : undefined) ||
      store.getDriverByUserIdOrId(req.user!.id) ||
      store.getDrivers()[0];
    if (!driver) {
      res.status(404).json({ error: 'Driver profile not found.' });
      return;
    }
    const updated = await store.updateDriver(driver.id, {
      isOnline: Boolean(isOnline),
      isAvailable: Boolean(isOnline),
    });
    if (updated) io.emit('driver:updated', updated);
    res.json({ driver: updated });
  });

  app.patch('/api/drivers/me/location', requireAuth, requireRole('DRIVER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const { coordinates, areaName, isSimulatedLocation, driverId } = req.body as {
      coordinates?: Coordinates;
      areaName?: string;
      isSimulatedLocation?: boolean;
      driverId?: string;
    };
    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
      return;
    }
    const driver =
      (driverId ? store.getDriverByUserIdOrId(driverId) : undefined) ||
      store.getDriverByUserIdOrId(req.user!.id) ||
      store.getDrivers()[0];
    if (!driver) {
      res.status(404).json({ error: 'Driver profile not found.' });
      return;
    }
    const updated = await store.updateDriver(driver.id, {
      coordinates,
      areaName: areaName || 'Updated Driver Location',
      isSimulatedLocation: Boolean(isSimulatedLocation),
    });
    if (updated) io.emit('driver:updated', updated);
    res.json({ driver: updated });
  });

  // ============================================================================
  // RIDE BOOKING & WORKFLOW ENDPOINTS
  // ============================================================================
  app.post('/api/rides/estimate', (req, res) => {
    const {
      pickupAddress,
      destinationAddress,
      pickupCoords,
      destinationCoords,
      vehicleTier,
      efficiencyWeight,
    } = req.body as {
      pickupAddress?: string;
      destinationAddress?: string;
      pickupCoords?: Coordinates;
      destinationCoords?: Coordinates;
      vehicleTier?: VehicleTier;
      efficiencyWeight?: number;
    };

    if (!pickupCoords || !destinationCoords) {
      res.status(400).json({ error: 'Pickup and destination coordinates are required.' });
      return;
    }

    const tier: VehicleTier = vehicleTier || 'EV_COMFORT';
    const route = runRouteOptimization({
      pickupName: pickupAddress || 'Selected Pickup',
      destinationName: destinationAddress || 'Selected Destination',
      pickupCoords,
      destinationCoords,
      tier,
    });

    const allocation = runFairDriverAllocation({
      pickup: pickupCoords,
      drivers: store.getDrivers(),
      preferredTier: tier,
      efficiencyWeight: efficiencyWeight ?? 0.55,
    });

    const dist = route.recommendedRoute.distanceKm;
    const faresByTier: Record<VehicleTier, number> = {
      ECO_HATCH: calculateFare(dist, 'ECO_HATCH'),
      CITY_SEDAN: calculateFare(dist, 'CITY_SEDAN'),
      EV_COMFORT: calculateFare(dist, 'EV_COMFORT'),
      POOL_SHARE: calculateFare(dist, 'POOL_SHARE'),
    };

    res.json({
      route,
      allocation,
      faresByTier,
      estimatedDistanceKm: dist,
      estimatedDurationMin: route.recommendedRoute.durationMin,
      estimatedPickupMin: allocation.selectedDriver?.etaMinutes ?? 5,
    });
  });

  app.get('/api/rides', requireAuth, (req: AuthenticatedRequest, res) => {
    const all = store.getRides();
    if (req.user!.role === 'ADMIN') {
      res.json({ rides: all });
      return;
    }
    if (req.user!.role === 'DRIVER') {
      const driver = store.getDriverByUserIdOrId(req.user!.id);
      const rides = all.filter((r) => !driver || r.driverId === driver.id || r.status === 'REQUESTED');
      res.json({ rides });
      return;
    }
    const passengerRides = all.filter((r) => r.passengerId === req.user!.id || r.isSimulatedDemo);
    res.json({ rides: passengerRides });
  });

  app.post('/api/rides', requireAuth, requireRole('PASSENGER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const {
      pickupAddress,
      destinationAddress,
      pickupCoords,
      destinationCoords,
      vehicleTier,
      efficiencyWeight,
    } = req.body as {
      pickupAddress?: string;
      destinationAddress?: string;
      pickupCoords?: Coordinates;
      destinationCoords?: Coordinates;
      vehicleTier?: VehicleTier;
      efficiencyWeight?: number;
    };

    if (!pickupAddress || !destinationAddress || !pickupCoords || !destinationCoords) {
      res.status(400).json({ error: 'Pickup address, destination address, and coordinates are required.' });
      return;
    }

    if (haversineKm(pickupCoords, destinationCoords) < 0.2) {
      res.status(400).json({ error: 'Pickup and destination must be at least 200 meters apart.' });
      return;
    }

    const tier: VehicleTier = vehicleTier || 'EV_COMFORT';
    const route = runRouteOptimization({
      pickupName: pickupAddress,
      destinationName: destinationAddress,
      pickupCoords,
      destinationCoords,
      tier,
    });

    const allocation = runFairDriverAllocation({
      pickup: pickupCoords,
      drivers: store.getDrivers(),
      preferredTier: tier,
      efficiencyWeight: efficiencyWeight ?? 0.55,
    });

    const selected = allocation.selectedDriver;
    const matchedDriver = selected ? store.getDriverByUserIdOrId(selected.driverId) : undefined;

    const ride: RideRecord = {
      id: `ride-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      passengerId: req.user!.id,
      passengerName: req.user!.name,
      driverId: matchedDriver?.id,
      driverName: matchedDriver?.name,
      vehicleModel: matchedDriver?.vehicleModel,
      plateNumber: matchedDriver?.plateNumber,
      vehicleTier: tier,
      pickupAddress: pickupAddress.trim(),
      pickupCoords,
      destinationAddress: destinationAddress.trim(),
      destinationCoords,
      distanceKm: route.recommendedRoute.distanceKm,
      durationMin: route.recommendedRoute.durationMin,
      estimatedFare: calculateFare(route.recommendedRoute.distanceKm, tier),
      pooledDiscountFare:
        tier === 'POOL_SHARE'
          ? calculateFare(route.recommendedRoute.distanceKm, 'POOL_SHARE')
          : Math.round(calculateFare(route.recommendedRoute.distanceKm, tier) * 0.72),
      status: 'REQUESTED',
      allocationReason: allocation.explanation,
      allocationScore: selected?.totalAllocationScore,
      routePath: route.recommendedRoute.waypoints,
      requestedAt: new Date().toISOString(),
      isSimulatedDemo: false,
    };

    await store.createRide(ride);
    io.emit('ride:created', ride);
    res.status(201).json({ ride, allocation, route });
  });

  app.post('/api/rides/:id/accept', requireAuth, requireRole('DRIVER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const ride = store.getRideById(req.params.id);
    if (!ride) {
      res.status(404).json({ error: 'Ride request not found.' });
      return;
    }
    if (ride.status !== 'REQUESTED') {
      res.status(409).json({ error: `Ride is already ${ride.status.toLowerCase()}.` });
      return;
    }

    const requestedDriverId = (req.body as { driverId?: string })?.driverId;
    const driver =
      (requestedDriverId ? store.getDriverByUserIdOrId(requestedDriverId) : undefined) ||
      store.getDriverByUserIdOrId(req.user!.id) ||
      (ride.driverId ? store.getDriverByUserIdOrId(ride.driverId) : undefined) ||
      store.getDrivers()[0];

    if (!driver) {
      res.status(404).json({ error: 'No active driver profile found.' });
      return;
    }

    const updatedRide = await store.updateRide(ride.id, {
      status: 'ASSIGNED',
      driverId: driver.id,
      driverName: driver.name,
      vehicleModel: driver.vehicleModel,
      plateNumber: driver.plateNumber,
      assignedAt: new Date().toISOString(),
    });
    const updatedDriver = await store.updateDriver(driver.id, { isAvailable: false });

    if (updatedRide) io.emit('ride:updated', updatedRide);
    if (updatedDriver) io.emit('driver:updated', updatedDriver);

    res.json({ ride: updatedRide, driver: updatedDriver });
  });

  app.post('/api/rides/:id/reject', requireAuth, requireRole('DRIVER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const ride = store.getRideById(req.params.id);
    if (!ride) {
      res.status(404).json({ error: 'Ride request not found.' });
      return;
    }
    const rejectingDriver = store.getDriverByUserIdOrId(req.user!.id);
    const otherDrivers = store.getDrivers().filter((d) => d.id !== rejectingDriver?.id);
    const reallocation = runFairDriverAllocation({
      pickup: ride.pickupCoords,
      drivers: otherDrivers,
      preferredTier: ride.vehicleTier,
    });
    const nextDriver = reallocation.selectedDriver
      ? store.getDriverByUserIdOrId(reallocation.selectedDriver.driverId)
      : undefined;

    const updated = await store.updateRide(ride.id, {
      driverId: nextDriver?.id,
      driverName: nextDriver?.name,
      vehicleModel: nextDriver?.vehicleModel,
      plateNumber: nextDriver?.plateNumber,
      allocationReason: reallocation.explanation,
      allocationScore: reallocation.selectedDriver?.totalAllocationScore,
    });

    if (updated) io.emit('ride:updated', updated);
    res.json({ ride: updated, reassignedTo: nextDriver?.name || null });
  });

  app.patch('/api/rides/:id/status', requireAuth, requireRole('DRIVER', 'ADMIN', 'PASSENGER'), async (req: AuthenticatedRequest, res) => {
    const ride = store.getRideById(req.params.id);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found.' });
      return;
    }

    const { status } = req.body as { status?: RideStatus };
    const allowed: RideStatus[] = ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'Invalid ride status transition.' });
      return;
    }

    const patch: Partial<RideRecord> = { status };
    if (status === 'COMPLETED') {
      patch.completedAt = new Date().toISOString();
      if (ride.driverId) {
        const drv = store.getDriverByUserIdOrId(ride.driverId);
        if (drv) {
          const updatedDrv = await store.updateDriver(drv.id, {
            isAvailable: true,
            ridesCompletedToday: drv.ridesCompletedToday + 1,
            totalRidesCompleted: drv.totalRidesCompleted + 1,
            dailyEarnings: drv.dailyEarnings + ride.estimatedFare,
            minutesSinceLastRide: 0,
          });
          if (updatedDrv) io.emit('driver:updated', updatedDrv);
        }
      }
    }

    const updated = await store.updateRide(ride.id, patch);
    if (updated) io.emit('ride:updated', updated);
    res.json({ ride: updated });
  });

  app.post('/api/rides/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
    const ride = store.getRideById(req.params.id);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found.' });
      return;
    }
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      res.status(409).json({ error: `Cannot cancel a ride that is already ${ride.status.toLowerCase()}.` });
      return;
    }

    if (req.user!.role === 'PASSENGER' && ride.passengerId !== req.user!.id) {
      res.status(403).json({ error: 'You can only cancel your own rides.' });
      return;
    }

    if (ride.driverId) {
      const drv = store.getDriverByUserIdOrId(ride.driverId);
      if (drv) {
        const updatedDrv = await store.updateDriver(drv.id, { isAvailable: true });
        if (updatedDrv) io.emit('driver:updated', updatedDrv);
      }
    }

    const updated = await store.updateRide(ride.id, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    });
    if (updated) io.emit('ride:updated', updated);
    res.json({ ride: updated });
  });

  // ============================================================================
  // FIVE CORE INTELLIGENCE ENDPOINTS
  // ============================================================================
  app.post('/api/intelligence/fair-allocation', (req, res) => {
    const { pickup, preferredTier, efficiencyWeight } = req.body as {
      pickup?: Coordinates;
      preferredTier?: VehicleTier;
      efficiencyWeight?: number;
    };
    const result = runFairDriverAllocation({
      pickup: pickup || CITY_LANDMARKS[0].coordinates,
      drivers: store.getDrivers(),
      preferredTier,
      efficiencyWeight,
    });
    res.json(result);
  });

  app.post('/api/intelligence/demand-forecast', async (req, res) => {
    const { horizon, dayType, weather } = req.body as {
      horizon?: 'NOW' | '+1H' | '+3H' | 'MORNING_PEAK' | 'EVENING_PEAK';
      dayType?: 'WEEKDAY' | 'WEEKEND';
      weather?: 'CLEAR' | 'RAINY';
    };
    const result = await runDemandForecast({
      horizon,
      dayType,
      weather,
      drivers: store.getDrivers(),
    });
    res.json(result);
  });

  app.post('/api/intelligence/ride-pooling', (req, res) => {
    const { maxPickupRadiusKm, maxDetourPct } = req.body as {
      maxPickupRadiusKm?: number;
      maxDetourPct?: number;
    };
    const result = runRidePooling({
      liveRides: store.getRides(),
      maxPickupRadiusKm,
      maxDetourPct,
    });
    res.json(result);
  });

  app.post('/api/intelligence/repositioning', async (req, res) => {
    const { horizon, targetDriverId } = req.body as {
      horizon?: 'NOW' | '+1H' | '+3H' | 'MORNING_PEAK' | 'EVENING_PEAK';
      targetDriverId?: string;
    };
    const result = await runDriverRepositioning({
      drivers: store.getDrivers(),
      horizon,
      targetDriverId,
    });
    res.json(result);
  });

  app.post('/api/intelligence/route-optimization', (req, res) => {
    const { pickupName, destinationName, pickupCoords, destinationCoords, timePeriod, tier } = req.body as {
      pickupName?: string;
      destinationName?: string;
      pickupCoords?: Coordinates;
      destinationCoords?: Coordinates;
      timePeriod?: 'OFF_PEAK' | 'MORNING_PEAK' | 'EVENING_PEAK';
      tier?: VehicleTier;
    };

    const result = runRouteOptimization({
      pickupName: pickupName || CITY_LANDMARKS[0].name,
      destinationName: destinationName || CITY_LANDMARKS[3].name,
      pickupCoords: pickupCoords || CITY_LANDMARKS[0].coordinates,
      destinationCoords: destinationCoords || CITY_LANDMARKS[3].coordinates,
      timePeriod,
      tier,
    });
    res.json(result);
  });

  // ============================================================================
  // ADMIN ANALYTICS, PROTECTED PROVISIONING & CONTACT
  // ============================================================================
  app.post('/api/admin/setup', async (req, res) => {
    const setupSecret = process.env.ADMIN_SETUP_SECRET?.trim();
    if (!setupSecret) {
      res.status(403).json({
        error: 'Server-side Admin setup endpoint is disabled (ADMIN_SETUP_SECRET not configured).',
      });
      return;
    }

    const providedSecret = String(req.headers['x-admin-setup-secret'] || '');
    const expectedBuf = Buffer.from(setupSecret);
    const providedBuf = Buffer.from(providedSecret);
    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      res.status(401).json({ error: 'Invalid Admin setup authorization secret.' });
      return;
    }

    if (store.hasAdminUser()) {
      res.status(409).json({ error: 'An Admin account is already provisioned.' });
      return;
    }

    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Valid Admin email is required.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Admin password must be at least 8 characters long.' });
      return;
    }

    const admin = await store.provisionAdmin({ email, password, name });
    res.status(201).json({
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    });
  });

  app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), (_req, res) => {
    res.json({ users: store.getAllUsersSafe() });
  });

  app.get('/api/admin/analytics', requireAuth, requireRole('ADMIN'), (_req, res) => {
    const filter = ((_req.query.dateFilter as string) || 'TODAY') as AdminAnalyticsResponse['dateFilter'];
    const rides = store.getRides();
    const drivers = store.getDrivers();

    const multiplier = filter === '30_DAYS' ? 28 : filter === '7_DAYS' ? 7 : 1;
    const completedDb = rides.filter((r) => r.status === 'COMPLETED').length;
    const onlineDrivers = drivers.filter((d) => d.isOnline).length;
    const availableDrivers = drivers.filter((d) => d.isOnline && d.isAvailable).length;

    const simulatedBaselineRides = 42 * multiplier;
    const totalRides = rides.length + simulatedBaselineRides;
    const completedRides = completedDb + 38 * multiplier;

    const activitySeries =
      filter === 'TODAY'
        ? [
            { label: '06:00', completed: 14, pooled: 4, cancelled: 1 },
            { label: '09:00', completed: 48, pooled: 18, cancelled: 2 },
            { label: '12:00', completed: 31, pooled: 11, cancelled: 1 },
            { label: '15:00', completed: 29, pooled: 10, cancelled: 2 },
            { label: '18:00', completed: 56, pooled: 22, cancelled: 3 },
            { label: '21:00', completed: 38, pooled: 14, cancelled: 1 },
          ]
        : filter === '7_DAYS'
        ? [
            { label: 'Mon', completed: 210, pooled: 74, cancelled: 8 },
            { label: 'Tue', completed: 228, pooled: 81, cancelled: 7 },
            { label: 'Wed', completed: 245, pooled: 92, cancelled: 9 },
            { label: 'Thu', completed: 252, pooled: 95, cancelled: 6 },
            { label: 'Fri', completed: 279, pooled: 108, cancelled: 11 },
            { label: 'Sat', completed: 198, pooled: 78, cancelled: 5 },
            { label: 'Sun', completed: 174, pooled: 66, cancelled: 4 },
          ]
        : [
            { label: 'Week 1', completed: 1420, pooled: 510, cancelled: 42 },
            { label: 'Week 2', completed: 1580, pooled: 590, cancelled: 39 },
            { label: 'Week 3', completed: 1690, pooled: 645, cancelled: 35 },
            { label: 'Week 4', completed: 1810, pooled: 712, cancelled: 31 },
          ];

    const totalZoneRequests = CITY_LANDMARKS.reduce((sum, l) => sum + l.baseDemand * multiplier, 0);
    const demandDistribution = CITY_LANDMARKS.slice(0, 6).map((l) => {
      const reqCount = l.baseDemand * multiplier;
      return {
        zone: l.name,
        requests: reqCount,
        sharePct: Number(((reqCount / totalZoneRequests) * 100).toFixed(1)),
        avgWaitMin: Number((2.8 + (l.baseDemand % 5) * 0.45).toFixed(1)),
      };
    });

    const maxTrips = Math.max(...drivers.map((d) => d.ridesCompletedToday), 1);
    const driverAllocationAnalytics = drivers.map((d) => ({
      driverName: d.name,
      area: d.areaName,
      ridesToday: d.ridesCompletedToday,
      utilizationPct: Math.min(96, Math.round(48 + (d.ridesCompletedToday / maxTrips) * 44)),
      fairnessScore: Number((95 - Math.abs(d.ridesCompletedToday - 5.4) * 3.8).toFixed(1)),
      earnings: d.dailyEarnings,
    }));

    const payload: AdminAnalyticsResponse = {
      dateFilter: filter,
      dataSourceSummary: {
        databaseMode: store.databaseMode,
        liveDatabaseRides: rides.length,
        simulatedBaselineRides,
      },
      kpis: {
        totalRides,
        activePassengers: store.getUsersCountByRole('PASSENGER') + 18,
        availableDrivers,
        onlineDrivers,
        completedRides,
        avgWaitTimeMin: 4.1,
        driverUtilizationPct: 81.4,
        completionRatePct: Number(((completedRides / Math.max(totalRides, 1)) * 100).toFixed(1)),
        fairnessGiniImprovementPct: 34.2,
      },
      activitySeries,
      demandDistribution,
      driverAllocationAnalytics,
      recentRides: rides.slice(0, 10),
    };

    res.json(payload);
  });

  app.post('/api/contact', async (req, res) => {
    const { name, email, organization, topic, message } = req.body as {
      name?: string;
      email?: string;
      organization?: string;
      topic?: string;
      message?: string;
    };

    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!message || message.trim().length < 10) {
      res.status(400).json({ error: 'Please enter a message of at least 10 characters.' });
      return;
    }

    const saved = await store.createContact({
      id: `msg-${Date.now().toString(36)}`,
      name: name.trim(),
      email: email.trim(),
      organization: organization?.trim() || 'Independent',
      topic: topic?.trim() || 'Platform Inquiry',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      submission: saved,
      confirmation: 'Thank you. Your inquiry has been logged and routed to the RideNexa mobility team.',
    });
  });

  // ============================================================================
  // VITE DEV / PRODUCTION STATIC SERVING
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RideNexa] Server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[RideNexa] Fatal startup error:', err);
  process.exit(1);
});
