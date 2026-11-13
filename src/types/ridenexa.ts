export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export type VehicleTier = 'ECO_HATCH' | 'CITY_SEDAN' | 'EV_COMFORT' | 'POOL_SHARE';

export type RideStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CityLandmark {
  id: string;
  name: string;
  area: string;
  coordinates: Coordinates;
  baseDemand: number;
  zoneType: 'TRANSIT_HUB' | 'TECH_PARK' | 'COMMERCIAL' | 'RESIDENTIAL' | 'AIRPORT';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface DriverRecord {
  id: string;
  userId?: string;
  name: string;
  vehicleModel: string;
  vehicleTier: VehicleTier;
  plateNumber: string;
  rating: number;
  isOnline: boolean;
  isAvailable: boolean;
  coordinates: Coordinates;
  areaName: string;
  ridesCompletedToday: number;
  totalRidesCompleted: number;
  dailyEarnings: number;
  minutesSinceLastRide: number;
  acceptanceRate: number;
  isSimulatedLocation: boolean;
  lastUpdatedAt: string;
}

export interface FairAllocationFactor {
  driverId: string;
  driverName: string;
  vehicleModel: string;
  vehicleTier: VehicleTier;
  areaName: string;
  coordinates: Coordinates;
  distanceKm: number;
  etaMinutes: number;
  ridesCompletedToday: number;
  minutesSinceLastRide: number;
  rating: number;
  proximityScore: number;
  workloadEquityScore: number;
  idleWaitScore: number;
  reliabilityScore: number;
  totalAllocationScore: number;
  isSelected: boolean;
  isNearestGreedy: boolean;
}

export interface FairAllocationResponse {
  algorithm: string;
  efficiencyWeight: number;
  fairnessWeight: number;
  pickup: Coordinates;
  selectedDriver: FairAllocationFactor | null;
  nearestGreedyDriver: FairAllocationFactor | null;
  candidates: FairAllocationFactor[];
  explanation: string;
  equityImpactSummary: string;
  isSimulatedFleet: boolean;
}

export interface RideRecord {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  vehicleModel?: string;
  plateNumber?: string;
  vehicleTier: VehicleTier;
  pickupAddress: string;
  pickupCoords: Coordinates;
  destinationAddress: string;
  destinationCoords: Coordinates;
  distanceKm: number;
  durationMin: number;
  estimatedFare: number;
  pooledDiscountFare?: number;
  status: RideStatus;
  allocationReason?: string;
  allocationScore?: number;
  routePath: [number, number][];
  requestedAt: string;
  assignedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  isSimulatedDemo?: boolean;
}

export interface DemandZoneForecast {
  zoneId: string;
  zoneName: string;
  area: string;
  coordinates: Coordinates;
  zoneType: string;
  currentDemand: number;
  predictedDemand: number;
  activeDrivers: number;
  supplyGap: number;
  surgeMultiplier: number;
  confidencePct: number;
  intensity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  reason: string;
}

export interface DemandHourlyPoint {
  hourLabel: string;
  historicalDemand: number;
  predictedDemand: number;
  availableSupply: number;
}

export interface DemandForecastResponse {
  modelName: string;
  modelType: 'EXTERNAL_ML_SERVICE' | 'PROTOTYPE_TIME_SERIES';
  horizon: string;
  dayType: 'WEEKDAY' | 'WEEKEND';
  weather: 'CLEAR' | 'RAINY';
  zones: DemandZoneForecast[];
  hourlySeries: DemandHourlyPoint[];
  summary: string;
  isSimulatedData: boolean;
}

export interface PoolCandidateRequest {
  id: string;
  passengerName: string;
  pickupName: string;
  pickupCoords: Coordinates;
  destinationName: string;
  destinationCoords: Coordinates;
  soloDistanceKm: number;
  soloFare: number;
  requestedWindow: string;
  isLiveDbRequest: boolean;
}

export interface PooledGroup {
  groupId: string;
  riders: PoolCandidateRequest[];
  compatibilityScore: number;
  sharedCorridorKm: number;
  detourPenaltyPct: number;
  combinedSoloFare: number;
  totalSharedFare: number;
  perRiderSavingsPct: number;
  co2SavedKg: number;
  routeWaypoints: [number, number][];
  explanation: string;
}

export interface RidePoolingResponse {
  algorithm: string;
  activeRequestsCount: number;
  groups: PooledGroup[];
  unmatchedRequests: PoolCandidateRequest[];
  totalDistanceSavedKm: number;
  averageFareSavingsPct: number;
  summary: string;
  isSimulatedData: boolean;
}

export interface RepositionRecommendation {
  driverId: string;
  driverName: string;
  currentArea: string;
  currentCoords: Coordinates;
  targetZoneId: string;
  targetZoneName: string;
  targetCoords: Coordinates;
  travelDistanceKm: number;
  travelMinutes: number;
  expectedDemand: number;
  currentSupplyInTarget: number;
  expectedWaitReductionMin: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export interface RepositioningResponse {
  algorithm: string;
  recommendations: RepositionRecommendation[];
  hotspots: DemandZoneForecast[];
  fleetUtilizationGainPct: number;
  summary: string;
  isSimulatedData: boolean;
}

export interface RouteAlternative {
  id: string;
  name: string;
  corridorType: 'OPTIMIZED' | 'ARTERIAL' | 'SHORTCUT';
  distanceKm: number;
  durationMin: number;
  trafficIndex: number;
  estimatedFare: number;
  fuelEfficiencyScore: number;
  waypoints: [number, number][];
  isRecommended: boolean;
  reason: string;
}

export interface RouteOptimizationResponse {
  solverType: 'EXTERNAL_ROUTING' | 'PROTOTYPE_GRAPH_ROUTER';
  pickupName: string;
  destinationName: string;
  pickupCoords: Coordinates;
  destinationCoords: Coordinates;
  timePeriod: 'OFF_PEAK' | 'MORNING_PEAK' | 'EVENING_PEAK';
  recommendedRoute: RouteAlternative;
  alternatives: RouteAlternative[];
  explanation: string;
}

export interface AdminAnalyticsResponse {
  dateFilter: 'TODAY' | '7_DAYS' | '30_DAYS';
  dataSourceSummary: {
    databaseMode: 'MONGODB' | 'LOCAL_DEMO_STORE';
    liveDatabaseRides: number;
    simulatedBaselineRides: number;
  };
  kpis: {
    totalRides: number;
    activePassengers: number;
    availableDrivers: number;
    onlineDrivers: number;
    completedRides: number;
    avgWaitTimeMin: number;
    driverUtilizationPct: number;
    completionRatePct: number;
    fairnessGiniImprovementPct: number;
  };
  activitySeries: {
    label: string;
    completed: number;
    pooled: number;
    cancelled: number;
  }[];
  demandDistribution: {
    zone: string;
    requests: number;
    sharePct: number;
    avgWaitMin: number;
  }[];
  driverAllocationAnalytics: {
    driverName: string;
    area: string;
    ridesToday: number;
    utilizationPct: number;
    fairnessScore: number;
    earnings: number;
  }[];
  recentRides: RideRecord[];
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  organization: string;
  topic: string;
  message: string;
  createdAt: string;
}
