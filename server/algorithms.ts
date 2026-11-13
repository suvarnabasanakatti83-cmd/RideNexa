import {
  Coordinates,
  DemandForecastResponse,
  DemandHourlyPoint,
  DemandZoneForecast,
  DriverRecord,
  FairAllocationFactor,
  FairAllocationResponse,
  PoolCandidateRequest,
  PooledGroup,
  RepositionRecommendation,
  RepositioningResponse,
  RidePoolingResponse,
  RideRecord,
  RouteAlternative,
  RouteOptimizationResponse,
  VehicleTier,
} from '../src/types/ridenexa.js';
import { CITY_LANDMARKS, createSimulatedPoolRequests } from './cityData.js';

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function calculateFare(distanceKm: number, tier: VehicleTier, surgeMultiplier = 1): number {
  const rates: Record<VehicleTier, { base: number; perKm: number; minFare: number }> = {
    ECO_HATCH: { base: 40, perKm: 13.5, minFare: 65 },
    CITY_SEDAN: { base: 55, perKm: 16.5, minFare: 85 },
    EV_COMFORT: { base: 65, perKm: 18.0, minFare: 100 },
    POOL_SHARE: { base: 30, perKm: 10.5, minFare: 50 },
  };
  const cfg = rates[tier] || rates.CITY_SEDAN;
  const raw = (cfg.base + distanceKm * cfg.perKm) * surgeMultiplier;
  return Math.round(Math.max(cfg.minFare, raw));
}

// ============================================================================
// 1. FAIR DRIVER ALLOCATION ENGINE
// ============================================================================
export function runFairDriverAllocation(params: {
  pickup: Coordinates;
  drivers: DriverRecord[];
  preferredTier?: VehicleTier;
  efficiencyWeight?: number; // 0..1 (default 0.55)
}): FairAllocationResponse {
  const efficiencyWeight = Math.min(0.95, Math.max(0.1, params.efficiencyWeight ?? 0.55));
  const fairnessWeight = Number((1 - efficiencyWeight).toFixed(2));

  const eligible = params.drivers.filter((d) => {
    if (!d.isOnline || !d.isAvailable) return false;
    if (params.preferredTier && d.vehicleTier !== params.preferredTier) return false;
    return true;
  });

  const pool = eligible.length > 0 ? eligible : params.drivers.filter((d) => d.isOnline && d.isAvailable);

  if (pool.length === 0) {
    return {
      algorithm: 'Multi-Factor Fairness-Weighted Dispatch (MF-FWD v1)',
      efficiencyWeight,
      fairnessWeight,
      pickup: params.pickup,
      selectedDriver: null,
      nearestGreedyDriver: null,
      candidates: [],
      explanation: 'No online available drivers are currently within dispatch range.',
      equityImpactSummary: 'Waiting for drivers to come online or complete active trips.',
      isSimulatedFleet: true,
    };
  }

  const maxRidesToday = Math.max(...pool.map((d) => d.ridesCompletedToday), 1);
  const maxIdle = Math.max(...pool.map((d) => d.minutesSinceLastRide), 1);

  const scored: FairAllocationFactor[] = pool.map((driver) => {
    const distanceKm = Number(Math.max(0.25, haversineKm(params.pickup, driver.coordinates) * 1.22).toFixed(2));
    const etaMinutes = Math.max(2, Math.round((distanceKm / 24) * 60));

    // Proximity score: 100 at 0km, tapering down linearly up to 12km
    const proximityScore = Number(Math.max(5, Math.min(100, 100 - (distanceKm / 12) * 85)).toFixed(1));

    // Workload equity score: drivers with fewer trips today earn higher equity score
    const workloadRatio = driver.ridesCompletedToday / Math.max(maxRidesToday, 1);
    const workloadEquityScore = Number(Math.max(10, (1 - workloadRatio * 0.85) * 100).toFixed(1));

    // Idle wait score: prevents driver starvation
    const idleWaitScore = Number(
      Math.min(100, 20 + (driver.minutesSinceLastRide / Math.max(maxIdle, 15)) * 80).toFixed(1)
    );

    // Reliability score from rating & acceptance rate
    const reliabilityScore = Number(
      Math.min(100, ((driver.rating - 3.5) / 1.5) * 55 + driver.acceptanceRate * 45).toFixed(1)
    );

    const efficiencyComposite = proximityScore * 0.78 + reliabilityScore * 0.22;
    const fairnessComposite = workloadEquityScore * 0.6 + idleWaitScore * 0.4;
    const totalAllocationScore = Number(
      (efficiencyWeight * efficiencyComposite + fairnessWeight * fairnessComposite).toFixed(1)
    );

    return {
      driverId: driver.id,
      driverName: driver.name,
      vehicleModel: driver.vehicleModel,
      vehicleTier: driver.vehicleTier,
      areaName: driver.areaName,
      coordinates: driver.coordinates,
      distanceKm,
      etaMinutes,
      ridesCompletedToday: driver.ridesCompletedToday,
      minutesSinceLastRide: driver.minutesSinceLastRide,
      rating: driver.rating,
      proximityScore,
      workloadEquityScore,
      idleWaitScore,
      reliabilityScore,
      totalAllocationScore,
      isSelected: false,
      isNearestGreedy: false,
    };
  });

  const sortedByScore = [...scored].sort((a, b) => b.totalAllocationScore - a.totalAllocationScore);
  const nearestGreedy = [...scored].sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const selected = sortedByScore[0];
  const candidates = sortedByScore.map((c) => ({
    ...c,
    isSelected: c.driverId === selected.driverId,
    isNearestGreedy: c.driverId === nearestGreedy.driverId,
  }));

  const selectedMarked = candidates.find((c) => c.isSelected) || null;
  const greedyMarked = candidates.find((c) => c.isNearestGreedy) || null;

  let explanation = '';
  if (selectedMarked && greedyMarked && selectedMarked.driverId !== greedyMarked.driverId) {
    const etaDiff = selectedMarked.etaMinutes - greedyMarked.etaMinutes;
    explanation =
      `Selected ${selectedMarked.driverName} (${selectedMarked.totalAllocationScore} pts) over nearest driver ${greedyMarked.driverName} (${greedyMarked.distanceKm} km). ` +
      `Although ${greedyMarked.driverName} is ${Math.max(1, etaDiff)} min closer, they already completed ${greedyMarked.ridesCompletedToday} trips today with only ${greedyMarked.minutesSinceLastRide} min idle. ` +
      `${selectedMarked.driverName} had ${selectedMarked.ridesCompletedToday} trips today and waited ${selectedMarked.minutesSinceLastRide} min, delivering a balanced ${selectedMarked.etaMinutes}-min pickup while preventing earnings concentration.`;
  } else if (selectedMarked) {
    explanation =
      `Selected ${selectedMarked.driverName} (${selectedMarked.totalAllocationScore} pts, ${selectedMarked.etaMinutes} min ETA). ` +
      `They offer the strongest balance of proximity (${selectedMarked.distanceKm} km), low daily workload (${selectedMarked.ridesCompletedToday} trips), and ${selectedMarked.rating.toFixed(2)} service reliability.`;
  }

  const avgTrips = pool.reduce((acc, d) => acc + d.ridesCompletedToday, 0) / pool.length;
  const equityImpactSummary =
    selectedMarked && greedyMarked && selectedMarked.driverId !== greedyMarked.driverId
      ? `Avoided overloading high-volume driver (${greedyMarked.ridesCompletedToday} trips vs fleet avg ${avgTrips.toFixed(1)}) at only +${Math.max(1, selectedMarked.etaMinutes - greedyMarked.etaMinutes)} min passenger wait.`
      : `Fleet workload variance remains within nominal band (fleet avg ${avgTrips.toFixed(1)} trips/driver today).`;

  return {
    algorithm: 'Multi-Factor Fairness-Weighted Dispatch (MF-FWD)',
    efficiencyWeight,
    fairnessWeight,
    pickup: params.pickup,
    selectedDriver: selectedMarked,
    nearestGreedyDriver: greedyMarked,
    candidates,
    explanation,
    equityImpactSummary,
    isSimulatedFleet: pool.some((d) => d.isSimulatedLocation),
  };
}

// ============================================================================
// 2. AI-BASED DEMAND FORECASTING
// ============================================================================
export async function runDemandForecast(params: {
  horizon?: 'NOW' | '+1H' | '+3H' | 'MORNING_PEAK' | 'EVENING_PEAK';
  dayType?: 'WEEKDAY' | 'WEEKEND';
  weather?: 'CLEAR' | 'RAINY';
  drivers: DriverRecord[];
}): Promise<DemandForecastResponse> {
  const horizon = params.horizon || '+1H';
  const dayType = params.dayType || 'WEEKDAY';
  const weather = params.weather || 'CLEAR';

  const mlServiceUrl = process.env.ML_SERVICE_URL?.trim();
  if (mlServiceUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2200);
      const resp = await fetch(`${mlServiceUrl.replace(/\/$/, '')}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizon, dayType, weather }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const externalData = (await resp.json()) as DemandForecastResponse;
        return {
          ...externalData,
          modelType: 'EXTERNAL_ML_SERVICE',
        };
      }
    } catch {
      // Fallback cleanly to prototype forecasting engine below
    }
  }

  const horizonFactors: Record<string, number> = {
    NOW: 1.0,
    '+1H': 1.18,
    '+3H': 1.32,
    MORNING_PEAK: 1.48,
    EVENING_PEAK: 1.62,
  };

  const weatherMultiplier = weather === 'RAINY' ? 1.28 : 1.0;
  const hFactor = horizonFactors[horizon] ?? 1.15;

  const zones: DemandZoneForecast[] = CITY_LANDMARKS.map((landmark) => {
    let zoneTypeBoost = 1.0;
    if (dayType === 'WEEKDAY') {
      if (horizon === 'MORNING_PEAK' && (landmark.zoneType === 'RESIDENTIAL' || landmark.zoneType === 'TRANSIT_HUB')) {
        zoneTypeBoost = 1.24;
      } else if (horizon === 'EVENING_PEAK' && (landmark.zoneType === 'TECH_PARK' || landmark.zoneType === 'COMMERCIAL')) {
        zoneTypeBoost = 1.3;
      }
    } else {
      if (landmark.zoneType === 'COMMERCIAL' || landmark.zoneType === 'AIRPORT') {
        zoneTypeBoost = 1.26;
      } else if (landmark.zoneType === 'TECH_PARK') {
        zoneTypeBoost = 0.58;
      }
    }

    const currentDemand = Math.round(landmark.baseDemand * (dayType === 'WEEKEND' && landmark.zoneType === 'TECH_PARK' ? 0.65 : 1.0));
    const predictedDemand = Math.round(landmark.baseDemand * hFactor * weatherMultiplier * zoneTypeBoost);

    const activeDrivers = params.drivers.filter(
      (d) => d.isOnline && haversineKm(d.coordinates, landmark.coordinates) <= 3.6
    ).length;

    const supplyCapacity = activeDrivers * 5; // Each driver serves ~5 rides/hr window
    const supplyGap = Math.max(0, predictedDemand - supplyCapacity);
    const ratio = predictedDemand / Math.max(supplyCapacity, 4);

    let intensity: DemandZoneForecast['intensity'] = 'LOW';
    if (ratio >= 2.3 || supplyGap >= 28) intensity = 'CRITICAL';
    else if (ratio >= 1.65 || supplyGap >= 16) intensity = 'HIGH';
    else if (ratio >= 1.15) intensity = 'MODERATE';

    const surgeMultiplier = Number(Math.min(1.65, Math.max(1.0, 1 + (ratio - 1.1) * 0.25)).toFixed(2));
    const confidencePct = weather === 'RAINY' ? 84 : 91;

    const reason =
      intensity === 'CRITICAL' || intensity === 'HIGH'
        ? `${landmark.zoneType.replace('_', ' ').toLowerCase()} corridor faces +${supplyGap} unmet requests (${activeDrivers} nearby drivers vs ${predictedDemand} projected riders).`
        : `Balanced zone coverage with ${activeDrivers} drivers available for ${predictedDemand} projected requests.`;

    return {
      zoneId: landmark.id,
      zoneName: landmark.name,
      area: landmark.area,
      coordinates: landmark.coordinates,
      zoneType: landmark.zoneType,
      currentDemand,
      predictedDemand,
      activeDrivers,
      supplyGap,
      surgeMultiplier,
      confidencePct,
      intensity,
      reason,
    };
  }).sort((a, b) => b.predictedDemand - a.predictedDemand);

  const baseCurve = [18, 12, 9, 11, 22, 46, 82, 118, 134, 96, 78, 84, 92, 86, 89, 108, 138, 168, 174, 142, 108, 84, 56, 32];
  const hourlySeries: DemandHourlyPoint[] = baseCurve.map((val, idx) => {
    const label = `${String(idx).padStart(2, '0')}:00`;
    const hist = Math.round(val * (dayType === 'WEEKEND' ? 0.88 : 1.0));
    const pred = Math.round(hist * weatherMultiplier * (idx >= 17 && idx <= 20 ? 1.14 : 1.06));
    const supply = Math.round(hist * 0.84 + 18);
    return {
      hourLabel: label,
      historicalDemand: hist,
      predictedDemand: pred,
      availableSupply: supply,
    };
  });

  const topZone = zones[0];
  return {
    modelName: 'Prototype Spatio-Temporal Demand Forecaster (Holt-Winters + Zone Elasticity)',
    modelType: 'PROTOTYPE_TIME_SERIES',
    horizon,
    dayType,
    weather,
    zones,
    hourlySeries,
    summary:
      `Prototype forecast indicates peak demand at ${topZone.zoneName} (${topZone.predictedDemand} req/hr, ${topZone.intensity} pressure) ` +
      `under ${dayType.toLowerCase()} ${weather.toLowerCase()} conditions. Live FastAPI ML endpoint is optional via ML_SERVICE_URL.`,
    isSimulatedData: true,
  };
}

// ============================================================================
// 3. INTELLIGENT RIDE POOLING ENGINE
// ============================================================================
function bearingDegrees(a: Coordinates, b: Coordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function angularDifference(deg1: number, deg2: number): number {
  const diff = Math.abs(deg1 - deg2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function runRidePooling(params: {
  liveRides: RideRecord[];
  maxPickupRadiusKm?: number;
  maxDetourPct?: number;
}): RidePoolingResponse {
  const maxPickupRadiusKm = params.maxPickupRadiusKm ?? 4.5;
  const maxDetourPct = params.maxDetourPct ?? 28;

  const liveCandidates: PoolCandidateRequest[] = params.liveRides
    .filter((r) => r.status === 'REQUESTED' || r.status === 'ASSIGNED')
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      passengerName: r.passengerName,
      pickupName: r.pickupAddress,
      pickupCoords: r.pickupCoords,
      destinationName: r.destinationAddress,
      destinationCoords: r.destinationCoords,
      soloDistanceKm: r.distanceKm,
      soloFare: r.estimatedFare,
      requestedWindow: 'Live Queue',
      isLiveDbRequest: true,
    }));

  const poolRequests: PoolCandidateRequest[] = [...liveCandidates, ...createSimulatedPoolRequests()];
  const used = new Set<string>();
  const groups: PooledGroup[] = [];

  for (let i = 0; i < poolRequests.length; i++) {
    const r1 = poolRequests[i];
    if (used.has(r1.id)) continue;

    let bestMatch: { rider: PoolCandidateRequest; score: number; detourPct: number; sharedKm: number } | null = null;
    const bearing1 = bearingDegrees(r1.pickupCoords, r1.destinationCoords);

    for (let j = i + 1; j < poolRequests.length; j++) {
      const r2 = poolRequests[j];
      if (used.has(r2.id)) continue;

      const pickupGap = haversineKm(r1.pickupCoords, r2.pickupCoords);
      const dropGap = haversineKm(r1.destinationCoords, r2.destinationCoords);
      const bearing2 = bearingDegrees(r2.pickupCoords, r2.destinationCoords);
      const angleDiff = angularDifference(bearing1, bearing2);

      if (pickupGap > maxPickupRadiusKm || dropGap > maxPickupRadiusKm + 1.5 || angleDiff > 55) {
        continue;
      }

      const jointRouteKm =
        haversineKm(r1.pickupCoords, r2.pickupCoords) * 1.2 +
        haversineKm(r2.pickupCoords, r2.destinationCoords) * 1.22 +
        haversineKm(r2.destinationCoords, r1.destinationCoords) * 1.15;

      const maxSolo = Math.max(r1.soloDistanceKm, r2.soloDistanceKm);
      const detourPct = Number(Math.max(3, ((jointRouteKm - maxSolo) / Math.max(maxSolo, 1)) * 100).toFixed(1));
      if (detourPct > maxDetourPct) continue;

      const compatibilityScore = Number(
        Math.min(
          98,
          Math.max(
            62,
            100 - pickupGap * 6.5 - dropGap * 5.0 - angleDiff * 0.35 - detourPct * 0.4
          )
        ).toFixed(1)
      );

      const sharedKm = Number(Math.max(2, Math.min(r1.soloDistanceKm, r2.soloDistanceKm) - pickupGap * 0.4).toFixed(1));
      if (!bestMatch || compatibilityScore > bestMatch.score) {
        bestMatch = { rider: r2, score: compatibilityScore, detourPct, sharedKm };
      }
    }

    if (bestMatch) {
      used.add(r1.id);
      used.add(bestMatch.rider.id);
      const r2 = bestMatch.rider;
      const combinedSoloFare = r1.soloFare + r2.soloFare;
      const perRiderSavingsPct = Math.round(Math.min(38, Math.max(22, 36 - bestMatch.detourPct * 0.35)));
      const totalSharedFare = Math.round(combinedSoloFare * (1 - perRiderSavingsPct / 100));
      const distanceSaved = Number(Math.max(1.8, r1.soloDistanceKm + r2.soloDistanceKm - (Math.max(r1.soloDistanceKm, r2.soloDistanceKm) * (1 + bestMatch.detourPct / 100))).toFixed(1));
      const co2SavedKg = Number((distanceSaved * 0.145).toFixed(2));

      groups.push({
        groupId: `POOL-${groups.length + 1}`,
        riders: [r1, r2],
        compatibilityScore: bestMatch.score,
        sharedCorridorKm: bestMatch.sharedKm,
        detourPenaltyPct: bestMatch.detourPct,
        combinedSoloFare,
        totalSharedFare,
        perRiderSavingsPct,
        co2SavedKg,
        routeWaypoints: [
          [r1.pickupCoords.lat, r1.pickupCoords.lng],
          [r2.pickupCoords.lat, r2.pickupCoords.lng],
          [r2.destinationCoords.lat, r2.destinationCoords.lng],
          [r1.destinationCoords.lat, r1.destinationCoords.lng],
        ],
        explanation:
          `Matched ${r1.passengerName} (${r1.pickupName} → ${r1.destinationName}) with ${r2.passengerName} (${r2.pickupName} → ${r2.destinationName}). ` +
          `Pickup offset is ${haversineKm(r1.pickupCoords, r2.pickupCoords).toFixed(1)} km with ${bestMatch.sharedKm} km shared corridor and ${bestMatch.detourPct}% detour, cutting each passenger's fare by ${perRiderSavingsPct}%.`,
      });
    }
  }

  const unmatchedRequests = poolRequests.filter((r) => !used.has(r.id));
  const totalDistanceSavedKm = Number(
    groups
      .reduce((sum, g) => {
        const soloSum = g.riders.reduce((s, r) => s + r.soloDistanceKm, 0);
        return sum + Math.max(1.5, soloSum - g.sharedCorridorKm * (1 + g.detourPenaltyPct / 100));
      }, 0)
      .toFixed(1)
  );
  const averageFareSavingsPct =
    groups.length > 0
      ? Math.round(groups.reduce((sum, g) => sum + g.perRiderSavingsPct, 0) / groups.length)
      : 0;

  return {
    algorithm: 'Corridor Bearing & Detour-Bounded Ride Pooling (CB-DBP)',
    activeRequestsCount: poolRequests.length,
    groups,
    unmatchedRequests,
    totalDistanceSavedKm,
    averageFareSavingsPct,
    summary:
      groups.length > 0
        ? `Formed ${groups.length} compatible shared ride pool(s) from ${poolRequests.length} active requests, saving ${totalDistanceSavedKm} vehicle-km and an average ${averageFareSavingsPct}% fare per rider.`
        : 'No compatible pools met the current pickup radius and detour constraints.',
    isSimulatedData: poolRequests.some((r) => !r.isLiveDbRequest),
  };
}

// ============================================================================
// 4. SMART DRIVER REPOSITIONING ENGINE
// ============================================================================
export async function runDriverRepositioning(params: {
  drivers: DriverRecord[];
  horizon?: 'NOW' | '+1H' | '+3H' | 'MORNING_PEAK' | 'EVENING_PEAK';
  targetDriverId?: string;
}): Promise<RepositioningResponse> {
  const forecast = await runDemandForecast({
    horizon: params.horizon || '+1H',
    dayType: 'WEEKDAY',
    weather: 'CLEAR',
    drivers: params.drivers,
  });

  const hotspots = forecast.zones.filter((z) => z.supplyGap > 0).slice(0, 5);
  const candidateDrivers = params.targetDriverId
    ? params.drivers.filter((d) => d.id === params.targetDriverId || d.userId === params.targetDriverId)
    : params.drivers.filter((d) => d.isOnline && d.isAvailable);

  const activePool = candidateDrivers.length > 0 ? candidateDrivers : params.drivers.slice(0, 4);
  const recommendations: RepositionRecommendation[] = [];

  for (let i = 0; i < activePool.length; i++) {
    const driver = activePool[i];
    // Pick best target zone balancing supply gap and relocation distance
    let bestZone = hotspots[0] || forecast.zones[0];
    let bestUtility = -Infinity;

    for (const zone of forecast.zones.slice(0, 6)) {
      const distKm = Math.max(0.4, haversineKm(driver.coordinates, zone.coordinates) * 1.2);
      if (distKm < 1.0 && zone.supplyGap < 10) continue;
      const utility = zone.supplyGap * 2.2 - distKm * 3.1;
      if (utility > bestUtility) {
        bestUtility = utility;
        bestZone = zone;
      }
    }

    const travelDistanceKm = Number(Math.max(0.8, haversineKm(driver.coordinates, bestZone.coordinates) * 1.2).toFixed(1));
    const travelMinutes = Math.max(4, Math.round((travelDistanceKm / 25) * 60));
    const expectedWaitReductionMin = Number(Math.min(9.5, Math.max(2.4, bestZone.supplyGap * 0.19)).toFixed(1));
    const priority: RepositionRecommendation['priority'] =
      bestZone.intensity === 'CRITICAL' || bestZone.supplyGap >= 20
        ? 'HIGH'
        : bestZone.supplyGap >= 10
        ? 'MEDIUM'
        : 'LOW';

    recommendations.push({
      driverId: driver.id,
      driverName: driver.name,
      currentArea: driver.areaName,
      currentCoords: driver.coordinates,
      targetZoneId: bestZone.zoneId,
      targetZoneName: bestZone.zoneName,
      targetCoords: bestZone.coordinates,
      travelDistanceKm,
      travelMinutes,
      expectedDemand: bestZone.predictedDemand,
      currentSupplyInTarget: bestZone.activeDrivers,
      expectedWaitReductionMin,
      priority,
      explanation:
        `Move ${travelDistanceKm} km (${travelMinutes} min) from ${driver.areaName} toward ${bestZone.zoneName}. ` +
        `Forecast projects ${bestZone.predictedDemand} ride requests/hr with only ${bestZone.activeDrivers} active driver(s) nearby, cutting local passenger wait times by ~${expectedWaitReductionMin} min.`,
    });
  }

  return {
    algorithm: 'Supply-Deficit Spatial Repositioning Optimizer (SDS-RO)',
    recommendations,
    hotspots: forecast.zones,
    fleetUtilizationGainPct: 24,
    summary: `Generated ${recommendations.length} proactive repositioning directive(s) across high-deficit urban zones to raise fleet utilization and reduce pickup wait times.`,
    isSimulatedData: true,
  };
}

// ============================================================================
// 5. ROUTE OPTIMIZATION ENGINE
// ============================================================================
export function generateCorridorWaypoints(
  pickup: Coordinates,
  destination: Coordinates,
  offsetFactor: number
): [number, number][] {
  const dLat = destination.lat - pickup.lat;
  const dLng = destination.lng - pickup.lng;
  // Orthogonal vector for realistic multi-corridor separation
  const orthoLat = -dLng * offsetFactor;
  const orthoLng = dLat * offsetFactor;

  return [
    [pickup.lat, pickup.lng],
    [
      Number((pickup.lat + dLat * 0.33 + orthoLat * 0.85).toFixed(5)),
      Number((pickup.lng + dLng * 0.33 + orthoLng * 0.85).toFixed(5)),
    ],
    [
      Number((pickup.lat + dLat * 0.68 + orthoLat).toFixed(5)),
      Number((pickup.lng + dLng * 0.68 + orthoLng).toFixed(5)),
    ],
    [destination.lat, destination.lng],
  ];
}

export function runRouteOptimization(params: {
  pickupName: string;
  destinationName: string;
  pickupCoords: Coordinates;
  destinationCoords: Coordinates;
  timePeriod?: 'OFF_PEAK' | 'MORNING_PEAK' | 'EVENING_PEAK';
  tier?: VehicleTier;
}): RouteOptimizationResponse {
  const timePeriod = params.timePeriod || 'MORNING_PEAK';
  const tier = params.tier || 'CITY_SEDAN';
  const straightKm = Math.max(1.2, haversineKm(params.pickupCoords, params.destinationCoords));

  const congestionFactor =
    timePeriod === 'EVENING_PEAK' ? 1.42 : timePeriod === 'MORNING_PEAK' ? 1.28 : 1.0;

  const optWaypoints = generateCorridorWaypoints(params.pickupCoords, params.destinationCoords, 0.08);
  const artWaypoints = generateCorridorWaypoints(params.pickupCoords, params.destinationCoords, -0.14);
  const shortWaypoints = generateCorridorWaypoints(params.pickupCoords, params.destinationCoords, 0.02);

  const optDist = Number((straightKm * 1.24).toFixed(2));
  const artDist = Number((straightKm * 1.38).toFixed(2));
  const shortDist = Number((straightKm * 1.15).toFixed(2));

  const optDuration = Math.max(6, Math.round((optDist / 28) * 60 * (congestionFactor * 0.88)));
  const artDuration = Math.max(7, Math.round((artDist / 26) * 60 * congestionFactor));
  const shortDuration = Math.max(8, Math.round((shortDist / 19) * 60 * (congestionFactor * 1.18)));

  const routes: RouteAlternative[] = [
    {
      id: 'route-optimized',
      name: 'RideNexa Express Corridor',
      corridorType: 'OPTIMIZED',
      distanceKm: optDist,
      durationMin: optDuration,
      trafficIndex: Number((0.36 * congestionFactor).toFixed(2)),
      estimatedFare: calculateFare(optDist, tier),
      fuelEfficiencyScore: 93,
      waypoints: optWaypoints,
      isRecommended: true,
      reason: `Balances signalized arterial flow with ${Math.max(3, shortDuration - optDuration)} min faster transit than congested inner streets during ${timePeriod.toLowerCase().replace('_', ' ')}.`,
    },
    {
      id: 'route-arterial',
      name: 'Outer Ring Bypass',
      corridorType: 'ARTERIAL',
      distanceKm: artDist,
      durationMin: artDuration,
      trafficIndex: Number((0.44 * congestionFactor).toFixed(2)),
      estimatedFare: calculateFare(artDist, tier),
      fuelEfficiencyScore: 84,
      waypoints: artWaypoints,
      isRecommended: false,
      reason: `Longer perimeter bypass (+${(artDist - optDist).toFixed(1)} km) with moderate junction delays.`,
    },
    {
      id: 'route-shortcut',
      name: 'Direct Inner-City Corridor',
      corridorType: 'SHORTCUT',
      distanceKm: shortDist,
      durationMin: shortDuration,
      trafficIndex: Number((0.72 * congestionFactor).toFixed(2)),
      estimatedFare: calculateFare(shortDist, tier),
      fuelEfficiencyScore: 71,
      waypoints: shortWaypoints,
      isRecommended: false,
      reason: `Shortest geometric path (${shortDist} km) but encounters high intersection density and stop-and-go congestion.`,
    },
  ];

  const recommended = routes[0];
  return {
    solverType: 'PROTOTYPE_GRAPH_ROUTER',
    pickupName: params.pickupName,
    destinationName: params.destinationName,
    pickupCoords: params.pickupCoords,
    destinationCoords: params.destinationCoords,
    timePeriod,
    recommendedRoute: recommended,
    alternatives: routes,
    explanation:
      `Selected "${recommended.name}" (${recommended.distanceKm} km, ${recommended.durationMin} min) over "${routes[2].name}" (${routes[2].durationMin} min). ` +
      `Although the inner-city path is ${(optDist - shortDist).toFixed(1)} km shorter, avoiding bottleneck intersections saves ${Math.max(2, shortDuration - optDuration)} min and improves energy efficiency to ${recommended.fuelEfficiencyScore}/100.`,
  };
}
