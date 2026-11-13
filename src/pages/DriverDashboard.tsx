import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Compass,
  LocateFixed,
  Navigation,
  Power,
  Star,
  X,
} from 'lucide-react';
import { CityMap } from '../components/CityMap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PRESET_LANDMARKS } from '../data/navigation';
import {
  DriverRecord,
  RepositioningResponse,
  RideRecord,
  RideStatus,
} from '../types/ridenexa';

interface DriverWorkspacePayload {
  driver: DriverRecord;
  activeRide: RideRecord | null;
  incomingRides: RideRecord[];
  rideHistory: RideRecord[];
  repositioning: RepositioningResponse;
  driverResponseTimeoutSec: number;
}

export const DriverDashboard: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const { drivers, lastRideEvent, emitDriverLocation } = useSocket();

  const [workspace, setWorkspace] = useState<DriverWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(45);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<DriverWorkspacePayload>('/api/drivers/me');
      setWorkspace(data);
      setCountdown(data.driverResponseTimeoutSec || 45);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (lastRideEvent) {
      loadWorkspace();
    }
  }, [lastRideEvent, loadWorkspace]);

  useEffect(() => {
    if (!workspace?.incomingRides.length) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : workspace.driverResponseTimeoutSec || 45));
    }, 1000);
    return () => clearInterval(timer);
  }, [workspace?.incomingRides.length, workspace?.driverResponseTimeoutSec]);

  const handleToggleOnline = async () => {
    if (!workspace) return;
    setError(null);
    setBusyAction('toggle');
    try {
      const nextState = !workspace.driver.isOnline;
      await apiFetch('/api/drivers/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ isOnline: nextState, driverId: workspace.driver.id }),
      });
      setNotice(nextState ? 'You are now Online and eligible for fair dispatch.' : 'You are now Offline.');
      await loadWorkspace();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleMoveToLandmark = async (landmarkId: string) => {
    const lm = PRESET_LANDMARKS.find((l) => l.id === landmarkId);
    if (!lm || !workspace) return;
    setError(null);
    try {
      await apiFetch('/api/drivers/me/location', {
        method: 'PATCH',
        body: JSON.stringify({
          driverId: workspace.driver.id,
          coordinates: lm.coordinates,
          areaName: lm.name,
          isSimulatedLocation: true,
        }),
      });
      setNotice(`Updated demonstration driver position to ${lm.name}.`);
      await loadWorkspace();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUseBrowserGps = () => {
    if (!workspace || !navigator.geolocation) {
      setError('Browser geolocation is unavailable on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        try {
          await apiFetch('/api/drivers/me/location', {
            method: 'PATCH',
            body: JSON.stringify({
              driverId: workspace.driver.id,
              coordinates: coords,
              areaName: 'Live Browser GPS',
              isSimulatedLocation: false,
            }),
          });
          emitDriverLocation(workspace.driver.id, coords, 'Live Browser GPS');
          setNotice('Synced live GPS coordinates from your browser.');
          await loadWorkspace();
        } catch (err) {
          setError((err as Error).message);
        }
      },
      () => {
        setError('Location permission denied or unavailable. You can select a city sector instead.');
      }
    );
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!workspace) return;
    setError(null);
    setBusyAction(`accept-${rideId}`);
    try {
      await apiFetch(`/api/rides/${rideId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ driverId: workspace.driver.id }),
      });
      setNotice('Ride accepted! Passenger has been notified in real time.');
      await loadWorkspace();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRejectRide = async (rideId: string) => {
    setError(null);
    setBusyAction(`reject-${rideId}`);
    try {
      const res = await apiFetch<{ reassignedTo: string | null }>(`/api/rides/${rideId}/reject`, {
        method: 'POST',
      });
      setNotice(
        res.reassignedTo
          ? `Ride passed and fairly reassigned to ${res.reassignedTo}.`
          : 'Ride returned to dispatch queue.'
      );
      await loadWorkspace();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateRideStatus = async (rideId: string, status: RideStatus) => {
    setError(null);
    setBusyAction(`status-${status}`);
    try {
      await apiFetch(`/api/rides/${rideId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(`Trip status updated to ${status.replace('_', ' ')}.`);
      await loadWorkspace();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading || !workspace) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-white border border-slate-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white border border-slate-200" />
      </div>
    );
  }

  const { driver, activeRide, incomingRides, rideHistory, repositioning } = workspace;
  const driverRec = repositioning.recommendations[0] || null;

  return (
    <div className="space-y-6">
      {/* Driver Top Header & Online Toggle */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-xs font-semibold text-[#009F95]">Driver Workspace</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#0B1220]">
            {driver.name} · {driver.vehicleModel}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-mono">{driver.plateNumber}</span>
            <span aria-hidden="true">·</span>
            <span>Sector: {driver.areaName}</span>
            <span aria-hidden="true">·</span>
            <span>{driver.isSimulatedLocation ? 'Simulated location' : 'Live GPS'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleUseBrowserGps}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap"
          >
            <LocateFixed className="h-3.5 w-3.5 text-[#009F95]" />
            <span>Sync GPS</span>
          </button>

          <button
            type="button"
            disabled={busyAction === 'toggle'}
            onClick={handleToggleOnline}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap ${
              driver.isOnline ? 'bg-[#009F95] hover:bg-[#00867d]' : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{driver.isOnline ? 'Online · Accepting Rides' : 'Offline · Go Online'}</span>
          </button>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Daily Earnings</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
            ₹{driver.dailyEarnings.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Completed Today</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
            {driver.ridesCompletedToday} trips
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Driver Rating</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
            <span>{driver.rating.toFixed(2)}</span>
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Acceptance Rate</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#009F95] tabular-nums">
            {Math.round(driver.acceptanceRate * 100)}%
          </div>
        </div>
      </div>

      {/* Main Split: Incoming/Active Rides + Repositioning Map */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          {/* Active Trip */}
          {activeRide && (
            <div className="rounded-xl border border-[#009F95] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#009F95]">Active Trip</div>
                  <h2 className="font-display text-lg font-bold text-[#0B1220]">
                    Passenger: {activeRide.passengerName}
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold text-[#0B1220]">
                  ₹{activeRide.estimatedFare}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-700">
                <div>
                  <strong className="text-[#0B1220]">Pickup:</strong> {activeRide.pickupAddress}
                </div>
                <div>
                  <strong className="text-[#0B1220]">Drop-off:</strong> {activeRide.destinationAddress}
                </div>
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {activeRide.distanceKm} km · Est. {activeRide.durationMin} min · Current stage:{' '}
                  {activeRide.status.replace('_', ' ')}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {activeRide.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleUpdateRideStatus(activeRide.id, 'EN_ROUTE')}
                    className="flex-1 rounded-lg bg-[#0B1220] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Mark En Route to Pickup
                  </button>
                )}
                {activeRide.status === 'EN_ROUTE' && (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleUpdateRideStatus(activeRide.id, 'IN_PROGRESS')}
                    className="flex-1 rounded-lg bg-[#0B1220] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Start Passenger Trip
                  </button>
                )}
                {activeRide.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleUpdateRideStatus(activeRide.id, 'COMPLETED')}
                    className="flex-1 rounded-lg bg-[#009F95] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#00867d]"
                  >
                    Complete Trip & Collect ₹{activeRide.estimatedFare}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Incoming Requests */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#0B1220]">
                Incoming Ride Requests
              </h2>
              {incomingRides.length > 0 && (
                <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                  Respond in {countdown}s
                </span>
              )}
            </div>

            {incomingRides.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-200 py-8 px-4 text-center">
                <Navigation className="mx-auto h-5 w-5 text-slate-400" />
                <div className="mt-2 text-sm font-semibold text-[#0B1220]">No pending requests</div>
                <p className="mt-1 text-xs text-slate-500">
                  Book a trip from the Passenger Workspace or stay online to receive fair-matched dispatches.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {incomingRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-[#0B1220]">
                          {ride.passengerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {ride.vehicleTier.replace('_', ' ')} · {ride.distanceKm} km ({ride.durationMin} min)
                        </div>
                      </div>
                      <div className="font-mono text-base font-bold text-[#009F95] tabular-nums">
                        ₹{ride.estimatedFare}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <div>
                        <strong>Pickup:</strong> {ride.pickupAddress}
                      </div>
                      <div>
                        <strong>Destination:</strong> {ride.destinationAddress}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleAcceptRide(ride.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#009F95] px-3 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleRejectRide(ride.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Sector Relocation Control */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <label className="block text-xs font-semibold text-slate-700">
                Simulate Driver Location Sector
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleMoveToLandmark(e.target.value);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#009F95] focus:outline-none"
              >
                <option value="">Move vehicle to city sector...</option>
                {PRESET_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name} ({lm.area})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Smart Repositioning Map & Recommendation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-[#009F95]" />
                <h2 className="font-display text-lg font-bold text-[#0B1220]">
                  Smart Repositioning Guidance
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Projected +1h demand vs active driver supply
              </span>
            </div>

            {driverRec && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-[#0B1220]">
                    Recommended Target: {driverRec.targetZoneName}
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#009F95] tabular-nums">
                    {driverRec.travelDistanceKm} km ({driverRec.travelMinutes} min) · Priority {driverRec.priority}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{driverRec.explanation}</p>
              </div>
            )}

            <CityMap
              heightClass="h-[380px]"
              drivers={drivers}
              selectedDriverId={driver.id}
              heatmapZones={repositioning.hotspots}
              repositionVectors={driverRec ? [driverRec] : []}
              pickup={
                activeRide
                  ? { coordinates: activeRide.pickupCoords, label: activeRide.pickupAddress }
                  : null
              }
              destination={
                activeRide
                  ? { coordinates: activeRide.destinationCoords, label: activeRide.destinationAddress }
                  : null
              }
              routes={
                activeRide
                  ? [{ waypoints: activeRide.routePath, color: '#009F95', weight: 4, label: 'Active Trip' }]
                  : []
              }
            />
          </div>
        </div>
      </div>

      {/* Driver Ride History */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-[#0B1220]">Completed & Past Trips</h2>
        {rideHistory.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No completed trips recorded for this driver yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Passenger</th>
                  <th className="py-2.5 pr-4">Corridor</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4 text-right">Distance</th>
                  <th className="py-2.5 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {rideHistory.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4 font-semibold text-[#0B1220]">{r.passengerName}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {r.pickupAddress} → {r.destinationAddress}
                    </td>
                    <td className="py-3 pr-4 font-medium text-emerald-700">{r.status}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums">{r.distanceKm} km</td>
                    <td className="py-3 text-right font-mono font-semibold tabular-nums">
                      ₹{r.estimatedFare}
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
