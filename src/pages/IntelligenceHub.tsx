import React, { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  Navigation,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DemandForecastChart } from '../components/Charts';
import { CityMap, RouteOverlay } from '../components/CityMap';
import { useSocket } from '../context/SocketContext';
import { PRESET_LANDMARKS } from '../data/navigation';
import {
  DemandForecastResponse,
  FairAllocationResponse,
  RepositioningResponse,
  RidePoolingResponse,
  RouteOptimizationResponse,
  VehicleTier,
} from '../types/ridenexa';

type ActiveModule = 'ALLOCATION' | 'FORECAST' | 'POOLING' | 'REPOSITION' | 'ROUTE';

export const IntelligenceHub: React.FC = () => {
  const { drivers } = useSocket();
  const [activeMapModule, setActiveMapModule] = useState<ActiveModule>('ALLOCATION');

  // Module 1: Fair Allocation state
  const [allocLandmarkId, setAllocLandmarkId] = useState(PRESET_LANDMARKS[0].id);
  const [efficiencyWeight, setEfficiencyWeight] = useState(0.55);
  const [allocTier, setAllocTier] = useState<'' | VehicleTier>('');
  const [allocResult, setAllocResult] = useState<FairAllocationResponse | null>(null);
  const [allocLoading, setAllocLoading] = useState(false);

  // Module 2: Demand Forecasting state
  const [forecastHorizon, setForecastHorizon] = useState<'NOW' | '+1H' | '+3H' | 'MORNING_PEAK' | 'EVENING_PEAK'>('+1H');
  const [forecastDay, setForecastDay] = useState<'WEEKDAY' | 'WEEKEND'>('WEEKDAY');
  const [forecastWeather, setForecastWeather] = useState<'CLEAR' | 'RAINY'>('CLEAR');
  const [forecastResult, setForecastResult] = useState<DemandForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Module 3: Ride Pooling state
  const [poolRadiusKm, setPoolRadiusKm] = useState(4.5);
  const [poolDetourPct, setPoolDetourPct] = useState(28);
  const [poolResult, setPoolResult] = useState<RidePoolingResponse | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);

  // Module 4: Smart Repositioning state
  const [repoHorizon, setRepoHorizon] = useState<'NOW' | '+1H' | 'EVENING_PEAK'>('+1H');
  const [repoResult, setRepoResult] = useState<RepositioningResponse | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);

  // Module 5: Route Optimization state
  const [routePickupId, setRoutePickupId] = useState(PRESET_LANDMARKS[0].id);
  const [routeDestId, setRouteDestId] = useState(PRESET_LANDMARKS[3].id);
  const [routePeriod, setRoutePeriod] = useState<'OFF_PEAK' | 'MORNING_PEAK' | 'EVENING_PEAK'>('MORNING_PEAK');
  const [routeResult, setRouteResult] = useState<RouteOptimizationResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const runAllocation = useCallback(async () => {
    setAllocLoading(true);
    setError(null);
    try {
      const lm = PRESET_LANDMARKS.find((l) => l.id === allocLandmarkId) || PRESET_LANDMARKS[0];
      const res = await fetch('/api/intelligence/fair-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: lm.coordinates,
          preferredTier: allocTier || undefined,
          efficiencyWeight,
        }),
      });
      const data = (await res.json()) as FairAllocationResponse;
      setAllocResult(data);
    } catch {
      setError('Unable to run Fair Driver Allocation calculation.');
    } finally {
      setAllocLoading(false);
    }
  }, [allocLandmarkId, allocTier, efficiencyWeight]);

  const runForecast = useCallback(async () => {
    setForecastLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intelligence/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizon: forecastHorizon,
          dayType: forecastDay,
          weather: forecastWeather,
        }),
      });
      const data = (await res.json()) as DemandForecastResponse;
      setForecastResult(data);
    } catch {
      setError('Unable to run Demand Forecast calculation.');
    } finally {
      setForecastLoading(false);
    }
  }, [forecastHorizon, forecastDay, forecastWeather]);

  const runPooling = useCallback(async () => {
    setPoolLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intelligence/ride-pooling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxPickupRadiusKm: poolRadiusKm,
          maxDetourPct: poolDetourPct,
        }),
      });
      const data = (await res.json()) as RidePoolingResponse;
      setPoolResult(data);
    } catch {
      setError('Unable to run Ride Pooling match.');
    } finally {
      setPoolLoading(false);
    }
  }, [poolRadiusKm, poolDetourPct]);

  const runReposition = useCallback(async () => {
    setRepoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intelligence/repositioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horizon: repoHorizon }),
      });
      const data = (await res.json()) as RepositioningResponse;
      setRepoResult(data);
    } catch {
      setError('Unable to compute Driver Repositioning guidance.');
    } finally {
      setRepoLoading(false);
    }
  }, [repoHorizon]);

  const runRoute = useCallback(async () => {
    setRouteLoading(true);
    setError(null);
    try {
      const pickup = PRESET_LANDMARKS.find((l) => l.id === routePickupId) || PRESET_LANDMARKS[0];
      const dest = PRESET_LANDMARKS.find((l) => l.id === routeDestId) || PRESET_LANDMARKS[3];
      const res = await fetch('/api/intelligence/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupName: pickup.name,
          destinationName: dest.name,
          pickupCoords: pickup.coordinates,
          destinationCoords: dest.coordinates,
          timePeriod: routePeriod,
        }),
      });
      const data = (await res.json()) as RouteOptimizationResponse;
      setRouteResult(data);
    } catch {
      setError('Unable to compute Route Optimization.');
    } finally {
      setRouteLoading(false);
    }
  }, [routePickupId, routeDestId, routePeriod]);

  useEffect(() => {
    runAllocation();
    runForecast();
    runPooling();
    runReposition();
    runRoute();
  }, []);

  // Build dynamic overlays for the Common City Map
  const mapPickup =
    activeMapModule === 'ALLOCATION' && allocResult
      ? {
          coordinates: allocResult.pickup,
          label: PRESET_LANDMARKS.find((l) => l.id === allocLandmarkId)?.name || 'Pickup',
        }
      : activeMapModule === 'ROUTE' && routeResult
      ? { coordinates: routeResult.pickupCoords, label: routeResult.pickupName }
      : null;

  const mapDestination =
    activeMapModule === 'ROUTE' && routeResult
      ? { coordinates: routeResult.destinationCoords, label: routeResult.destinationName }
      : null;

  const mapRoutes: RouteOverlay[] =
    activeMapModule === 'ROUTE' && routeResult
      ? routeResult.alternatives.map((alt) => ({
          waypoints: alt.waypoints,
          color: alt.isRecommended ? '#009F95' : alt.corridorType === 'ARTERIAL' ? '#0B1220' : '#D97706',
          weight: alt.isRecommended ? 5 : 3,
          dashArray: alt.isRecommended ? undefined : '6, 6',
          label: `${alt.name} (${alt.durationMin} min, ${alt.distanceKm} km)`,
        }))
      : activeMapModule === 'POOLING' && poolResult
      ? poolResult.groups.map((grp, idx) => ({
          waypoints: grp.routeWaypoints,
          color: idx % 2 === 0 ? '#009F95' : '#0B1220',
          weight: 4,
          label: `${grp.groupId}: ${grp.riders.map((r) => r.passengerName).join(' + ')}`,
        }))
      : [];

  const mapHeatmap =
    activeMapModule === 'FORECAST' && forecastResult
      ? forecastResult.zones
      : activeMapModule === 'REPOSITION' && repoResult
      ? repoResult.hotspots
      : [];

  const mapRepositionVectors =
    activeMapModule === 'REPOSITION' && repoResult ? repoResult.recommendations : [];

  const moduleTabs: { id: ActiveModule; label: string; icon: React.ReactNode }[] = [
    { id: 'ALLOCATION', label: '01. Fair Allocation', icon: <Scale className="h-3.5 w-3.5" /> },
    { id: 'FORECAST', label: '02. Demand Forecast', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: 'POOLING', label: '03. Ride Pooling', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'REPOSITION', label: '04. Repositioning', icon: <Compass className="h-3.5 w-3.5" /> },
    { id: 'ROUTE', label: '05. Route Optimizer', icon: <Navigation className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-[#009F95]">Interactive Control Centre</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-[#0B1220] sm:text-3xl">
            RideNexa Intelligence Hub
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Test all five core mobility engines with adjustable parameters, transparent formulas, and live OpenStreetMap visualization. Prototype forecasting and simulated baseline records are explicitly labelled.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Common City Map & Analytics Strip */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1220]">
              Shared Urban Intelligence Map
            </h2>
            <p className="text-xs text-slate-500">
              Select a module layer below to inspect its spatial output over Bengaluru OpenStreetMap corridors.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1">
            {moduleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMapModule(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeMapModule === tab.id
                    ? 'bg-white text-[#0B1220] shadow-sm'
                    : 'text-slate-600 hover:text-[#0B1220]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <CityMap
          heightClass="h-[380px]"
          drivers={drivers}
          selectedDriverId={
            activeMapModule === 'ALLOCATION'
              ? allocResult?.selectedDriver?.driverId
              : undefined
          }
          pickup={mapPickup}
          destination={mapDestination}
          routes={mapRoutes}
          heatmapZones={mapHeatmap}
          repositionVectors={mapRepositionVectors}
          fitToOverlays={activeMapModule === 'ROUTE' || activeMapModule === 'POOLING'}
        />

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4 text-xs">
          <div>
            <div className="text-slate-500">Fairness Allocation</div>
            <div className="mt-0.5 font-mono font-bold text-[#0B1220]">
              {allocResult?.selectedDriver
                ? `${allocResult.selectedDriver.driverName} (${allocResult.selectedDriver.totalAllocationScore} pts)`
                : 'Ready'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Top Forecast Hotspot</div>
            <div className="mt-0.5 font-mono font-bold text-[#0B1220]">
              {forecastResult?.zones[0]
                ? `${forecastResult.zones[0].zoneName.split(' ')[0]} (${forecastResult.zones[0].predictedDemand} req/h)`
                : 'Ready'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Pooled Fare Savings</div>
            <div className="mt-0.5 font-mono font-bold text-[#009F95]">
              {poolResult ? `${poolResult.averageFareSavingsPct}% avg · ${poolResult.totalDistanceSavedKm} km saved` : 'Ready'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Recommended Corridor</div>
            <div className="mt-0.5 font-mono font-bold text-[#0B1220]">
              {routeResult
                ? `${routeResult.recommendedRoute.distanceKm} km · ${routeResult.recommendedRoute.durationMin} min`
                : 'Ready'}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* CARD 1: FAIR DRIVER ALLOCATION                                       */}
      {/* ==================================================================== */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-[#009F95]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B1220]">
                01. Fair Driver Allocation Engine
              </h2>
              <p className="text-xs text-slate-500">
                Algorithm: {allocResult?.algorithm || 'Multi-Factor Fairness-Weighted Dispatch (MF-FWD)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMapModule('ALLOCATION')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap self-start sm:self-auto"
          >
            Focus on Shared Map
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Problem Statement</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Traditional nearest-driver dispatch repeatedly selects drivers parked in high-density clusters, creating uneven trip distribution and starving drivers waiting slightly farther away.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Our Solution</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              RideNexa balances proximity ETA and driver reliability against daily trip workload and idle wait duration, allowing operators to tune the efficiency-vs-fairness trade-off explicitly.
            </p>
          </div>
        </div>

        {/* Interactive Inputs & Demo */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
          <div className="text-xs font-semibold text-[#0B1220]">
            Input Information & Interactive Demonstration
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700">Pickup Zone</label>
              <select
                value={allocLandmarkId}
                onChange={(e) => setAllocLandmarkId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {PRESET_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Vehicle Tier Filter</label>
              <select
                value={allocTier}
                onChange={(e) => setAllocTier(e.target.value as '' | VehicleTier)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="">All Online Tiers</option>
                <option value="EV_COMFORT">EV Comfort</option>
                <option value="CITY_SEDAN">City Sedan</option>
                <option value="ECO_HATCH">Eco Hatch</option>
                <option value="POOL_SHARE">Pool Share</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Fairness Weight: <span className="font-mono font-bold text-[#009F95]">{Math.round((1 - efficiencyWeight) * 100)}%</span>{' '}
                (Efficiency {Math.round(efficiencyWeight * 100)}%)
              </label>
              <input
                type="range"
                min={0.2}
                max={0.9}
                step={0.05}
                value={efficiencyWeight}
                onChange={(e) => setEfficiencyWeight(Number(e.target.value))}
                className="mt-2 w-full accent-[#009F95]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMapModule('ALLOCATION');
                runAllocation();
              }}
              disabled={allocLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#009F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${allocLoading ? 'animate-spin' : ''}`} />
              <span>Run Fair Match</span>
            </button>
          </div>
        </div>

        {/* Result Visualization */}
        {allocResult && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 pr-3">Candidate Driver</th>
                    <th className="py-2.5 pr-3 text-right">Distance / ETA</th>
                    <th className="py-2.5 pr-3 text-right">Trips Today</th>
                    <th className="py-2.5 pr-3 text-right">Idle Wait</th>
                    <th className="py-2.5 pr-3 text-right">Workload Equity</th>
                    <th className="py-2.5 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocResult.candidates.slice(0, 6).map((c) => (
                    <tr
                      key={c.driverId}
                      className={c.isSelected ? 'bg-[#009F95]/10 font-medium' : ''}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#0B1220]">
                          {c.driverName}
                          {c.isSelected && ' (Selected)'}
                          {!c.isSelected && c.isNearestGreedy && ' (Nearest Only)'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.vehicleModel} · {c.areaName}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {c.distanceKm} km · {c.etaMinutes}m
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {c.ridesCompletedToday}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {c.minutesSinceLastRide} min
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {c.workloadEquityScore}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-[#009F95] tabular-nums">
                        {c.totalAllocationScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#009F95]">Explanation of Result</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{allocResult.explanation}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#0B1220]">Real-World Impact</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{allocResult.equityImpactSummary}</p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* ==================================================================== */}
      {/* CARD 2: AI-BASED DEMAND FORECASTING                                  */}
      {/* ==================================================================== */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[#009F95]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B1220]">
                02. AI-Based Demand Forecasting
              </h2>
              <p className="text-xs text-slate-500">
                Model: {forecastResult?.modelName || 'Prototype Spatio-Temporal Forecaster'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMapModule('FORECAST')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap self-start sm:self-auto"
          >
            View Heatmap on Shared Map
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Problem Statement</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Drivers lack forward visibility into where passenger demand will surge, causing localized vehicle shortages, surge pricing spikes, and wasted deadhead cruising.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Our Solution</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              A clearly labelled prototype spatio-temporal forecasting engine evaluates time horizon, weekday/weekend commuter curves, and weather elasticity across 8 city zones (with optional Python FastAPI ML bridge via ML_SERVICE_URL).
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
          <div className="text-xs font-semibold text-[#0B1220]">
            Input Information & Interactive Scenario
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700">Forecast Horizon</label>
              <select
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(e.target.value as typeof forecastHorizon)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="NOW">Immediate (Now)</option>
                <option value="+1H">+1 Hour Horizon</option>
                <option value="+3H">+3 Hours Horizon</option>
                <option value="MORNING_PEAK">Morning Peak (09:00)</option>
                <option value="EVENING_PEAK">Evening Peak (18:00)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Day Pattern</label>
              <select
                value={forecastDay}
                onChange={(e) => setForecastDay(e.target.value as typeof forecastDay)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="WEEKDAY">Weekday Commute</option>
                <option value="WEEKEND">Weekend Leisure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Weather Condition</label>
              <select
                value={forecastWeather}
                onChange={(e) => setForecastWeather(e.target.value as typeof forecastWeather)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="CLEAR">Clear Weather</option>
                <option value="RAINY">Rainy Surge (+28%)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMapModule('FORECAST');
                runForecast();
              }}
              disabled={forecastLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#009F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${forecastLoading ? 'animate-spin' : ''}`} />
              <span>Run Forecast</span>
            </button>
          </div>
        </div>

        {forecastResult && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <DemandForecastChart data={forecastResult.hourlySeries} />
              </div>
              <div className="lg:col-span-5 space-y-2.5">
                <div className="text-xs font-semibold text-slate-500">Top High-Demand Zones (Simulated Prototype)</div>
                {forecastResult.zones.slice(0, 5).map((z) => (
                  <div
                    key={z.zoneId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#0B1220]">{z.zoneName}</div>
                      <div className="text-slate-500">
                        {z.activeDrivers} drivers · Gap: {z.supplyGap} req
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-[#0B1220]">{z.predictedDemand} req/hr</div>
                      <div
                        className={
                          z.intensity === 'CRITICAL'
                            ? 'text-red-700 font-semibold'
                            : z.intensity === 'HIGH'
                            ? 'text-amber-700 font-semibold'
                            : 'text-[#009F95]'
                        }
                      >
                        {z.intensity} · {z.surgeMultiplier}x
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#009F95]">Explanation of Result</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{forecastResult.summary}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#0B1220]">Real-World Impact</div>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Feeds proactive repositioning targets directly into driver dashboards before peak waves hit, smoothing supply deficits and reducing passenger wait spikes.
                </p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* ==================================================================== */}
      {/* CARD 3: INTELLIGENT RIDE POOLING                                     */}
      {/* ==================================================================== */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#009F95]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B1220]">
                03. Intelligent Ride Pooling
              </h2>
              <p className="text-xs text-slate-500">
                Algorithm: {poolResult?.algorithm || 'Corridor Bearing & Detour-Bounded Pooling (CB-DBP)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMapModule('POOLING')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap self-start sm:self-auto"
          >
            Plot Pools on Shared Map
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Problem Statement</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Commuters travelling along overlapping corridors often book separate solo vehicles, inflating individual trip costs, road congestion, and per-passenger emissions.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Our Solution</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              RideNexa evaluates pickup proximity, destination proximity, and directional bearing alignment under a strict maximum detour budget to assemble mutually beneficial shared rides.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
          <div className="text-xs font-semibold text-[#0B1220]">
            Pooling Constraints & Interactive Matching
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Max Pickup Radius: <span className="font-mono font-bold text-[#009F95]">{poolRadiusKm.toFixed(1)} km</span>
              </label>
              <input
                type="range"
                min={1.5}
                max={6.5}
                step={0.5}
                value={poolRadiusKm}
                onChange={(e) => setPoolRadiusKm(Number(e.target.value))}
                className="mt-2 w-full accent-[#009F95]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Max Detour Tolerance: <span className="font-mono font-bold text-[#009F95]">{poolDetourPct}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={40}
                step={2}
                value={poolDetourPct}
                onChange={(e) => setPoolDetourPct(Number(e.target.value))}
                className="mt-2 w-full accent-[#009F95]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMapModule('POOLING');
                runPooling();
              }}
              disabled={poolLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#009F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Find Compatible Rides</span>
            </button>
          </div>
        </div>

        {poolResult && (
          <div className="space-y-4">
            {poolResult.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-600">
                No compatible passenger pairs fit within {poolRadiusKm} km pickup radius and {poolDetourPct}% detour cap. Try widening the constraints.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {poolResult.groups.map((grp) => (
                  <div key={grp.groupId} className="rounded-lg border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#0B1220]">
                        {grp.groupId} · {grp.compatibilityScore}% Match
                      </span>
                      <span className="font-mono text-xs font-bold text-[#009F95]">
                        -{grp.perRiderSavingsPct}% Fare · {grp.co2SavedKg} kg CO2 saved
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      {grp.riders.map((r) => (
                        <div key={r.id} className="flex justify-between gap-2">
                          <span>
                            <strong>{r.passengerName}:</strong> {r.pickupName} → {r.destinationName}
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums shrink-0">
                            Solo ₹{r.soloFare}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs font-mono tabular-nums">
                      <span className="text-slate-500">
                        Shared corridor: {grp.sharedCorridorKm} km · Detour: {grp.detourPenaltyPct}%
                      </span>
                      <span className="font-bold text-[#0B1220]">
                        Combined ₹{grp.combinedSoloFare} → ₹{grp.totalSharedFare}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{grp.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#009F95]">Explanation of Result</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{poolResult.summary}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#0B1220]">Real-World Impact</div>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Converts parallel single-occupancy trips into high-occupancy corridors, lowering daily commuter spend while freeing fleet capacity during peak hours.
                </p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* ==================================================================== */}
      {/* CARD 4: SMART DRIVER REPOSITIONING                                   */}
      {/* ==================================================================== */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#009F95]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B1220]">
                04. Smart Driver Repositioning
              </h2>
              <p className="text-xs text-slate-500">
                Algorithm: {repoResult?.algorithm || 'Supply-Deficit Spatial Repositioning Optimizer (SDS-RO)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMapModule('REPOSITION')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap self-start sm:self-auto"
          >
            Show Vectors on Shared Map
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Problem Statement</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              After completing drop-offs in low-demand neighborhoods, drivers often remain idle for 30+ minutes while adjacent business districts experience severe passenger shortages.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Our Solution</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Pairs idle driver coordinates with forecasted zone supply deficits to compute low-deadhead relocation moves that maximize expected trip capture.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <label className="block text-xs font-medium text-slate-700">Target Demand Window</label>
            <select
              value={repoHorizon}
              onChange={(e) => setRepoHorizon(e.target.value as typeof repoHorizon)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="NOW">Immediate Deficit</option>
              <option value="+1H">+1 Hour Projection</option>
              <option value="EVENING_PEAK">Evening Rush Surge</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveMapModule('REPOSITION');
              runReposition();
            }}
            disabled={repoLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#009F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60 whitespace-nowrap"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Compute Repositioning Plan</span>
          </button>
        </div>

        {repoResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {repoResult.recommendations.slice(0, 4).map((rec) => (
                <div key={rec.driverId} className="rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B1220]">
                      {rec.driverName} · {rec.currentArea} → {rec.targetZoneName}
                    </span>
                    <span className="font-mono font-semibold text-[#009F95]">{rec.priority}</span>
                  </div>
                  <div className="font-mono text-xs text-slate-500 tabular-nums">
                    Relocation: {rec.travelDistanceKm} km ({rec.travelMinutes} min) · Expected wait drop: -{rec.expectedWaitReductionMin} min
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{rec.explanation}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#009F95]">Explanation of Result</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{repoResult.summary}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#0B1220]">Real-World Impact</div>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Improves fleet utilization by an estimated {repoResult.fleetUtilizationGainPct}% while cutting passenger wait times in emerging surge corridors.
                </p>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* ==================================================================== */}
      {/* CARD 5: ROUTE OPTIMIZATION                                           */}
      {/* ==================================================================== */}
      <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Navigation className="h-5 w-5 text-[#009F95]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B1220]">
                05. Route Optimization Service
              </h2>
              <p className="text-xs text-slate-500">
                Solver: Prototype Multi-Corridor Graph Router (OpenStreetMap Coordinates)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMapModule('ROUTE')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 whitespace-nowrap self-start sm:self-auto"
          >
            Compare Routes on Shared Map
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Problem Statement</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Choosing the shortest straight-line street path during rush hours routes vehicles through bottleneck junctions, increasing trip duration, fuel burn, and fare uncertainty.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Our Solution</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              Evaluates three candidate corridors (Express Arterial, Outer Bypass, and Direct Shortcut) against peak congestion indices to select the fastest, most energy-efficient path.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
          <div className="text-xs font-semibold text-[#0B1220]">
            Corridor Inputs & Interactive Comparison
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700">Origin</label>
              <select
                value={routePickupId}
                onChange={(e) => setRoutePickupId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {PRESET_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Destination</label>
              <select
                value={routeDestId}
                onChange={(e) => setRouteDestId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {PRESET_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Traffic Period</label>
              <select
                value={routePeriod}
                onChange={(e) => setRoutePeriod(e.target.value as typeof routePeriod)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="OFF_PEAK">Off-Peak Free Flow</option>
                <option value="MORNING_PEAK">Morning Rush</option>
                <option value="EVENING_PEAK">Evening Heavy Rush</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMapModule('ROUTE');
                runRoute();
              }}
              disabled={routeLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#009F95] px-4 py-2 text-xs font-semibold text-white hover:bg-[#00867d] disabled:opacity-60"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Optimize Route</span>
            </button>
          </div>
        </div>

        {routeResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {routeResult.alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className={`rounded-lg border p-4 space-y-2 ${
                    alt.isRecommended ? 'border-[#009F95] bg-[#009F95]/5' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#0B1220]">{alt.name}</span>
                    {alt.isRecommended && (
                      <span className="font-mono text-xs font-semibold text-[#009F95]">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-600 tabular-nums">
                    {alt.distanceKm} km · {alt.durationMin} min · Est. ₹{alt.estimatedFare}
                  </div>
                  <div className="font-mono text-xs text-slate-500 tabular-nums">
                    Congestion index: {alt.trafficIndex} · Energy score: {alt.fuelEfficiencyScore}/100
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{alt.reason}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#009F95]">Explanation of Result</div>
                <p className="mt-1 text-slate-700 leading-relaxed">{routeResult.explanation}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold text-[#0B1220]">Real-World Impact</div>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Lowers peak travel-time variance, reduces unnecessary idle fuel/EV battery consumption, and increases completed trips per driver hour.
                </p>
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
