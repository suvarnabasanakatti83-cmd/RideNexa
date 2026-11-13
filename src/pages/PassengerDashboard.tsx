import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { CityMap } from '../components/CityMap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { AppRoute, PRESET_LANDMARKS } from '../data/navigation';
import {
  Coordinates,
  FairAllocationResponse,
  RideRecord,
  RouteOptimizationResponse,
  VehicleTier,
} from '../types/ridenexa';

interface PassengerDashboardProps {
  onNavigate: (route: AppRoute) => void;
}

interface EstimatePayload {
  route: RouteOptimizationResponse;
  allocation: FairAllocationResponse;
  faresByTier: Record<VehicleTier, number>;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedPickupMin: number;
}

const VEHICLE_TIERS: { id: VehicleTier; name: string; seats: string; desc: string }[] = [
  { id: 'ECO_HATCH', name: 'Eco Hatch', seats: '4 seats', desc: 'Compact urban trips' },
  { id: 'CITY_SEDAN', name: 'City Sedan', seats: '4 seats', desc: 'Comfortable daily commute' },
  { id: 'EV_COMFORT', name: 'EV Comfort', seats: '4 seats', desc: 'Zero-emission electric fleet' },
  { id: 'POOL_SHARE', name: 'Pool Share', seats: '1–2 seats', desc: 'Shared corridor savings' },
];

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({ onNavigate }) => {
  const { user, apiFetch } = useAuth();
  const { drivers, isSimulatedFleet, lastRideEvent } = useSocket();

  const [pickupName, setPickupName] = useState(PRESET_LANDMARKS[0].name);
  const [pickupCoords, setPickupCoords] = useState<Coordinates>(PRESET_LANDMARKS[0].coordinates);
  const [destName, setDestName] = useState(PRESET_LANDMARKS[3].name);
  const [destCoords, setDestCoords] = useState<Coordinates>(PRESET_LANDMARKS[3].coordinates);
  const [mapClickTarget, setMapClickTarget] = useState<'NONE' | 'PICKUP' | 'DESTINATION'>('NONE');

  const [selectedTier, setSelectedTier] = useState<VehicleTier>('EV_COMFORT');
  const [estimate, setEstimate] = useState<EstimatePayload | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [booking, setBooking] = useState(false);

  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [historyQuery, setHistoryQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRides = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<{ rides: RideRecord[] }>('/api/rides');
      setRides(data.rides);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingRides(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  useEffect(() => {
    if (lastRideEvent) {
      loadRides();
    }
  }, [lastRideEvent, loadRides]);

  const activeRide = useMemo(
    () =>
      rides.find(
        (r) =>
          !r.isSimulatedDemo &&
          (r.status === 'REQUESTED' ||
            r.status === 'ASSIGNED' ||
            r.status === 'EN_ROUTE' ||
            r.status === 'IN_PROGRESS')
      ) || null,
    [rides]
  );

  const filteredHistory = useMemo(() => {
    return rides.filter((r) => {
      if (historyFilter !== 'ALL' && r.status !== historyFilter) return false;
      if (historyQuery.trim()) {
        const q = historyQuery.toLowerCase();
        return (
          r.pickupAddress.toLowerCase().includes(q) ||
          r.destinationAddress.toLowerCase().includes(q) ||
          (r.driverName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rides, historyFilter, historyQuery]);

  const handleFindRide = async () => {
    setError(null);
    setNotice(null);
    setEstimating(true);
    try {
      const res = await apiFetch<EstimatePayload>('/api/rides/estimate', {
        method: 'POST',
        body: JSON.stringify({
          pickupAddress: pickupName,
          destinationAddress: destName,
          pickupCoords,
          destinationCoords: destCoords,
          vehicleTier: selectedTier,
          efficiencyWeight: 0.55,
        }),
      });
      setEstimate(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEstimating(false);
    }
  };

  const handleConfirmBooking = async () => {
    setError(null);
    setNotice(null);
    setBooking(true);
    try {
      const res = await apiFetch<{ ride: RideRecord }>('/api/rides', {
        method: 'POST',
        body: JSON.stringify({
          pickupAddress: pickupName,
          destinationAddress: destName,
          pickupCoords,
          destinationCoords: destCoords,
          vehicleTier: selectedTier,
          efficiencyWeight: 0.55,
        }),
      });
      setNotice(`Ride ${res.ride.id} confirmed and dispatched to ${res.ride.driverName || 'available fleet'}.`);
      setEstimate(null);
      await loadRides();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBooking(false);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    setError(null);
    try {
      await apiFetch(`/api/rides/${rideId}/cancel`, { method: 'POST' });
      setNotice('Ride cancelled.');
      await loadRides();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAdvanceDemoStatus = async (ride: RideRecord) => {
    const nextMap: Record<string, string> = {
      REQUESTED: 'ASSIGNED',
      ASSIGNED: 'EN_ROUTE',
      EN_ROUTE: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
    };
    const nextStatus = nextMap[ride.status];
    if (!nextStatus) return;
    try {
      if (ride.status === 'REQUESTED') {
        await apiFetch(`/api/rides/${ride.id}/accept`, {
          method: 'POST',
          body: JSON.stringify({ driverId: ride.driverId }),
        });
      } else {
        await apiFetch(`/api/rides/${ride.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
      }
      await loadRides();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMapClick = (coords: Coordinates) => {
    if (mapClickTarget === 'PICKUP') {
      setPickupCoords(coords);
      setPickupName(`Map Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      setMapClickTarget('NONE');
      setEstimate(null);
    } else if (mapClickTarget === 'DESTINATION') {
      setDestCoords(coords);
      setDestName(`Map Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      setMapClickTarget('NONE');
      setEstimate(null);
    }
  };

  const availableDriversCount = drivers.filter((d) => d.isOnline && d.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1220]">
            Passenger Ride Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Book trips with transparent fair-driver matching, live Socket.IO tracking, and OpenStreetMap routing.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
          <span>{availableDriversCount} available vehicles</span>
          <span aria-hidden="true">·</span>
          <span>{isSimulatedFleet ? 'Simulated fleet locations' : 'Live GPS fleet'}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {/* Main Booking & Live Map Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-5">
          {/* Active Trip Tracking Card */}
          {activeRide ? (
            <div className="rounded-xl border border-[#009F95] bg-white p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#009F95]">Active Booking</div>
                  <h2 className="mt-0.5 font-display text-xl font-bold text-[#0B1220]">
                    {activeRide.status.replace('_', ' ')}
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-500">{activeRide.id}</span>
              </div>

              {/* Stepper */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium">
                {(['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'] as const).map((step, idx) => {
                  const order = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'];
                  const reached = order.indexOf(activeRide.status) >= idx;
                  return (
                    <div key={step} className="space-y-1.5">
                      <div className={`h-1.5 rounded-full ${reached ? 'bg-[#009F95]' : 'bg-slate-200'}`} />
                      <div className={reached ? 'text-[#0B1220] font-semibold' : 'text-slate-400'}>
                        {step.replace('_', ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Pickup</span>
                  <span className="font-medium text-right text-[#0B1220]">{activeRide.pickupAddress}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Destination</span>
                  <span className="font-medium text-right text-[#0B1220]">{activeRide.destinationAddress}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Assigned Driver</span>
                  <span className="font-medium text-right text-[#0B1220]">
                    {activeRide.driverName || 'Matching'} · {activeRide.vehicleModel || activeRide.vehicleTier}
                  </span>
                </div>
                <div className="flex justify-between gap-2 font-mono tabular-nums">
                  <span className="font-sans text-slate-500">Fare & Distance</span>
                  <span className="font-semibold text-[#0B1220]">
                    ₹{activeRide.estimatedFare} · {activeRide.distanceKm} km ({activeRide.durationMin} min)
                  </span>
                </div>
              </div>

              {activeRide.allocationReason && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <strong className="text-[#0B1220]">Fair Dispatch Note:</strong> {activeRide.allocationReason}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleAdvanceDemoStatus(activeRide)}
                  className="flex-1 rounded-lg bg-[#0B1220] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Advance Trip Stage (Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelRide(activeRide.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 whitespace-nowrap"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancel Ride</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-[#0B1220]">Plan Your Trip</h2>

              {/* Pickup Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Pickup Location</label>
                  <button
                    type="button"
                    onClick={() => setMapClickTarget(mapClickTarget === 'PICKUP' ? 'NONE' : 'PICKUP')}
                    className={`text-xs font-semibold ${
                      mapClickTarget === 'PICKUP' ? 'text-[#009F95]' : 'text-slate-500 hover:text-[#0B1220]'
                    }`}
                  >
                    {mapClickTarget === 'PICKUP' ? 'Click on map now...' : 'Pick on map'}
                  </button>
                </div>
                <select
                  value={PRESET_LANDMARKS.some((l) => l.name === pickupName) ? pickupName : 'CUSTOM'}
                  onChange={(e) => {
                    const lm = PRESET_LANDMARKS.find((l) => l.name === e.target.value);
                    if (lm) {
                      setPickupName(lm.name);
                      setPickupCoords(lm.coordinates);
                      setEstimate(null);
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                >
                  {PRESET_LANDMARKS.map((lm) => (
                    <option key={lm.id} value={lm.name}>
                      {lm.name} ({lm.area})
                    </option>
                  ))}
                  {!PRESET_LANDMARKS.some((l) => l.name === pickupName) && (
                    <option value="CUSTOM">{pickupName}</option>
                  )}
                </select>
              </div>

              {/* Destination Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Destination</label>
                  <button
                    type="button"
                    onClick={() => setMapClickTarget(mapClickTarget === 'DESTINATION' ? 'NONE' : 'DESTINATION')}
                    className={`text-xs font-semibold ${
                      mapClickTarget === 'DESTINATION' ? 'text-[#009F95]' : 'text-slate-500 hover:text-[#0B1220]'
                    }`}
                  >
                    {mapClickTarget === 'DESTINATION' ? 'Click on map now...' : 'Pick on map'}
                  </button>
                </div>
                <select
                  value={PRESET_LANDMARKS.some((l) => l.name === destName) ? destName : 'CUSTOM'}
                  onChange={(e) => {
                    const lm = PRESET_LANDMARKS.find((l) => l.name === e.target.value);
                    if (lm) {
                      setDestName(lm.name);
                      setDestCoords(lm.coordinates);
                      setEstimate(null);
                    }
                  }}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                >
                  {PRESET_LANDMARKS.map((lm) => (
                    <option key={lm.id} value={lm.name}>
                      {lm.name} ({lm.area})
                    </option>
                  ))}
                  {!PRESET_LANDMARKS.some((l) => l.name === destName) && (
                    <option value="CUSTOM">{destName}</option>
                  )}
                </select>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Vehicle Tier</label>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {VEHICLE_TIERS.map((tier) => {
                    const tierFare = estimate?.faresByTier[tier.id];
                    const active = selectedTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTier(tier.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          active
                            ? 'border-[#009F95] bg-[#009F95]/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0B1220]">{tier.name}</span>
                          {tierFare !== undefined && (
                            <span className="font-mono text-xs font-bold text-[#009F95] tabular-nums">
                              ₹{tierFare}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {tier.seats} · {tier.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFindRide}
                disabled={estimating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1220] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                <Navigation className="h-4 w-4" />
                <span>{estimating ? 'Matching Fair Driver...' : 'Find My Ride'}</span>
              </button>

              {/* Estimate & Fair Driver Match Preview */}
              {estimate && (
                <div className="space-y-4 border-t border-slate-200 pt-5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] text-slate-500">Distance</div>
                      <div className="font-mono text-sm font-bold text-[#0B1220] tabular-nums">
                        {estimate.estimatedDistanceKm} km
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] text-slate-500">Pickup ETA</div>
                      <div className="font-mono text-sm font-bold text-[#0B1220] tabular-nums">
                        {estimate.estimatedPickupMin} min
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <div className="text-[11px] text-slate-500">Fare</div>
                      <div className="font-mono text-sm font-bold text-[#009F95] tabular-nums">
                        ₹{estimate.faresByTier[selectedTier]}
                      </div>
                    </div>
                  </div>

                  {estimate.allocation.selectedDriver && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-[#0B1220]">
                        <span>Matched Driver: {estimate.allocation.selectedDriver.driverName}</span>
                        <span className="font-mono text-[#009F95] tabular-nums">
                          Score {estimate.allocation.selectedDriver.totalAllocationScore}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        {estimate.allocation.selectedDriver.vehicleModel} · Rating{' '}
                        {estimate.allocation.selectedDriver.rating.toFixed(2)} ·{' '}
                        {estimate.allocation.selectedDriver.distanceKm} km away
                      </div>
                      <div className="text-slate-600 leading-relaxed pt-1">
                        {estimate.allocation.explanation}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={booking}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{booking ? 'Confirming Booking...' : 'Confirm Booking'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive City Map */}
        <div className="lg:col-span-7 flex flex-col">
          <CityMap
            heightClass="h-[440px] lg:h-full lg:min-h-[540px]"
            drivers={drivers}
            selectedDriverId={
              activeRide?.driverId || estimate?.allocation.selectedDriver?.driverId
            }
            pickup={{
              coordinates: activeRide ? activeRide.pickupCoords : pickupCoords,
              label: activeRide ? activeRide.pickupAddress : pickupName,
            }}
            destination={{
              coordinates: activeRide ? activeRide.destinationCoords : destCoords,
              label: activeRide ? activeRide.destinationAddress : destName,
            }}
            routes={
              activeRide
                ? [{ waypoints: activeRide.routePath, color: '#009F95', weight: 4, label: 'Active Ride Route' }]
                : estimate
                ? [
                    {
                      waypoints: estimate.route.recommendedRoute.waypoints,
                      color: '#009F95',
                      weight: 4,
                      label: estimate.route.recommendedRoute.name,
                    },
                  ]
                : []
            }
            onMapClick={handleMapClick}
            fitToOverlays={Boolean(estimate || activeRide)}
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {mapClickTarget !== 'NONE'
                ? `Click anywhere on the map to set ${mapClickTarget.toLowerCase()} point.`
                : 'OpenStreetMap live driver view · Click markers to inspect driver fairness metrics.'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/intelligence')}
              className="inline-flex items-center gap-1 font-semibold text-[#009F95] hover:text-[#00867d]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explore Intelligence Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ride History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1220]">Ride History</h2>
            <p className="text-xs text-slate-500">
              Completed, active, and demonstration trips associated with your account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search corridor or driver..."
                className="rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-[#009F95] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setHistoryFilter(status)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    historyFilter === status
                      ? 'bg-white text-[#0B1220] shadow-sm'
                      : 'text-slate-600 hover:text-[#0B1220]'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingRides ? (
          <div className="mt-6 space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-200 py-10 text-center">
            <MapPin className="mx-auto h-6 w-6 text-slate-400" />
            <div className="mt-2 text-sm font-semibold text-[#0B1220]">No matching trips found</div>
            <p className="mt-1 text-xs text-slate-500">
              Adjust your search filter or book a new ride above.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Route</th>
                  <th className="py-3 pr-4">Driver & Vehicle</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4 text-right">Distance</th>
                  <th className="py-3 pr-4 text-right">Fare</th>
                  <th className="py-3 text-right">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredHistory.map((ride) => (
                  <tr key={ride.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-[#0B1220]">
                        {ride.pickupAddress} → {ride.destinationAddress}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ride.isSimulatedDemo ? 'Demo seed record' : 'Live user booking'}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {ride.driverName || 'Pending'} · {ride.vehicleModel || ride.vehicleTier}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      <span
                        className={
                          ride.status === 'COMPLETED'
                            ? 'text-emerald-700'
                            : ride.status === 'CANCELLED'
                            ? 'text-red-700'
                            : 'text-[#009F95]'
                        }
                      >
                        {ride.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-700">
                      {ride.distanceKm} km
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-[#0B1220]">
                      ₹{ride.estimatedFare}
                    </td>
                    <td className="py-3 text-right font-mono text-xs tabular-nums text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ride.requestedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
