import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  GitBranch,
  Layers,
  MapPin,
  Navigation,
  Scale,
  TrendingUp,
  Users,
} from 'lucide-react';
import { CityMap } from '../components/CityMap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { AppRoute, PRESET_LANDMARKS } from '../data/navigation';
import heroUrbanMobilityImg from '../assets/images/hero_urban_mobility_1794558215579.jpg';
import evFleetShowcaseImg from '../assets/images/ev_fleet_showcase_1794558217244.jpg';

interface HomePageProps {
  onNavigate: (route: AppRoute) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { drivers, isSimulatedFleet, connected } = useSocket();
  const [selectedCorridorIdx, setSelectedCorridorIdx] = useState(0);

  const corridors = [
    {
      label: 'MG Road → Whitefield Tech Park',
      pickup: PRESET_LANDMARKS[0],
      destination: PRESET_LANDMARKS[3],
      waypoints: [
        [12.9756, 77.6066],
        [12.9784, 77.6408],
        [12.9688, 77.7012],
        [12.9698, 77.7499],
      ] as [number, number][],
      distanceKm: '16.4 km',
      etaMin: '34 min',
    },
    {
      label: 'Koramangala → Electronic City',
      pickup: PRESET_LANDMARKS[2],
      destination: PRESET_LANDMARKS[7],
      waypoints: [
        [12.9352, 77.6245],
        [12.9012, 77.6388],
        [12.8698, 77.6512],
        [12.8452, 77.6602],
      ] as [number, number][],
      distanceKm: '11.4 km',
      etaMin: '24 min',
    },
    {
      label: 'Jayanagar → Hebbal Airport Link',
      pickup: PRESET_LANDMARKS[4],
      destination: PRESET_LANDMARKS[5],
      waypoints: [
        [12.925, 77.5938],
        [12.9756, 77.6066],
        [13.0085, 77.6012],
        [13.0358, 77.597],
      ] as [number, number][],
      distanceKm: '13.8 km',
      etaMin: '29 min',
    },
  ];

  const activeCorridor = corridors[selectedCorridorIdx];
  const onlineCount = useMemo(() => drivers.filter((d) => d.isOnline).length, [drivers]);

  const innovations = [
    {
      num: '01',
      title: 'Fair Driver Allocation',
      problem: 'Nearest-driver dispatch concentrates rides among a small cluster of vehicles.',
      impact: 'Balances pickup ETA with daily workload equity and idle-wait prevention.',
      icon: <Scale className="h-5 w-5 text-[#009F95]" />,
      span: 'lg:col-span-2',
    },
    {
      num: '02',
      title: 'AI-Based Demand Forecasting',
      problem: 'Drivers wait blindly in saturated blocks while adjacent corridors surge.',
      impact: 'Time-series & spatial zone forecasts surface demand 1–3 hours ahead.',
      icon: <TrendingUp className="h-5 w-5 text-[#009F95]" />,
      span: 'lg:col-span-1',
    },
    {
      num: '03',
      title: 'Intelligent Ride Pooling',
      problem: 'Parallel solo commuters multiply urban congestion and per-rider cost.',
      impact: 'Matches compatible directional corridors to cut fares by up to 34%.',
      icon: <Users className="h-5 w-5 text-[#009F95]" />,
      span: 'lg:col-span-1',
    },
    {
      num: '04',
      title: 'Smart Driver Repositioning',
      problem: 'Idle vehicles remain parked in low-demand residential zones after drop-offs.',
      impact: 'Directs idle drivers to projected supply-deficit zones with explainable reasoning.',
      icon: <Compass className="h-5 w-5 text-[#009F95]" />,
      span: 'lg:col-span-1',
    },
    {
      num: '05',
      title: 'Route Optimization',
      problem: 'Shortest geometric paths often stall in signalized inner-city bottlenecks.',
      impact: 'Evaluates arterial corridors vs shortcuts for predictable travel times.',
      icon: <Navigation className="h-5 w-5 text-[#009F95]" />,
      span: 'lg:col-span-1',
    },
  ];

  return (
    <div>
      {/* HERO SECTION */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-between lg:col-span-5">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#009F95]">
                  Urban Mobility Platform · Fair Dispatch & Demand Intelligence
                </p>
                <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-[#0B1220] sm:text-5xl [text-wrap:balance]">
                  Move Smarter. Ride Fairer.
                </h1>
                <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
                  Experience intelligent mobility through smarter ride matching, predictive demand intelligence, fair driver allocation and optimized journeys.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate(user ? '/passenger' : '/signin')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] whitespace-nowrap"
                  >
                    <span>Book a Ride</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('/features')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-slate-50 whitespace-nowrap"
                  >
                    <span>Explore Features</span>
                  </button>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-200 pt-6">
                <div className="text-xs font-medium text-slate-500">Preview active corridor on live map</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {corridors.map((c, idx) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setSelectedCorridorIdx(idx)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        idx === selectedCorridorIdx
                          ? 'bg-[#0B1220] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
                  <span>{activeCorridor.distanceKm}</span>
                  <span aria-hidden="true">·</span>
                  <span>Est. {activeCorridor.etaMin}</span>
                  <span aria-hidden="true">·</span>
                  <span>{onlineCount} active vehicles</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col">
              <div className="flex-1 min-h-[380px]">
                <CityMap
                  heightClass="h-full min-h-[380px] lg:min-h-[460px]"
                  drivers={drivers}
                  pickup={{ coordinates: activeCorridor.pickup.coordinates, label: activeCorridor.pickup.name }}
                  destination={{
                    coordinates: activeCorridor.destination.coordinates,
                    label: activeCorridor.destination.name,
                  }}
                  routes={[
                    {
                      waypoints: activeCorridor.waypoints,
                      color: '#009F95',
                      weight: 4,
                      label: activeCorridor.label,
                    },
                  ]}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {isSimulatedFleet
                    ? 'Simulated demonstration fleet · OpenStreetMap street layer'
                    : 'Live fleet telemetry · OpenStreetMap'}
                </span>
                <span className="font-mono">
                  {connected ? 'Socket.IO stream connected' : 'Connecting real-time stream'}
                </span>
              </div>
            </div>
          </div>

          {/* 4-COLUMN METRIC STRIP BELOW HERO SPLIT */}
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 lg:grid-cols-4">
            <div>
              <div className="font-mono text-2xl font-bold text-[#0B1220] tabular-nums sm:text-3xl">
                34.2%
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Lower driver earnings variance via fair dispatch
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#0B1220] tabular-nums sm:text-3xl">
                4.1 min
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Average urban pickup wait in active zones
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#0B1220] tabular-nums sm:text-3xl">
                Up to 34%
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Fare reduction on compatible pooled corridors
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#0B1220] tabular-nums sm:text-3xl">
                5 Engines
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Explainable intelligence modules live in-app
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FIVE CORE INNOVATIONS */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#009F95]">Core Intelligence</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0B1220] [text-wrap:balance]">
                Five explainable systems built for riders and drivers
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/intelligence')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#009F95] hover:text-[#00867d] whitespace-nowrap"
            >
              <span>Open Intelligence Hub</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {innovations.map((item) => (
              <div
                key={item.num}
                className={`${item.span} flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-slate-400">{item.num}</span>
                    {item.icon}
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-[#0B1220]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    <strong className="font-semibold text-[#0B1220]">Challenge:</strong> {item.problem}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <strong className="font-semibold text-[#0B1220]">Approach:</strong> {item.impact}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onNavigate('/intelligence')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#009F95] hover:text-[#00867d]"
                  >
                    <span>Test live module</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#009F95]">End-to-End Dispatch</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0B1220]">
              How RideNexa coordinates every trip
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01. Request & Route',
                body: 'Passenger selects pickup and destination on OpenStreetMap. The corridor router computes distance, ETA, and transparent fares across tiers.',
              },
              {
                step: '02. Fair Match Scoring',
                body: 'The allocation engine scores online drivers across proximity, daily ride equity, idle wait time, and reliability—preventing dispatch starvation.',
              },
              {
                step: '03. Driver Acceptance',
                body: 'Matched drivers receive instant Socket.IO trip requests with pickup context and response countdowns inside the Driver Workspace.',
              },
              {
                step: '04. Adaptive Tracking',
                body: 'Live trip statuses stream back to passengers while idle vehicles receive demand-forecasted repositioning guidance.',
              },
            ].map((item) => (
              <div key={item.step} className="border-t-2 border-slate-200 pt-5">
                <h3 className="font-display text-lg font-bold text-[#0B1220]">{item.step}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE RIDENEXA + VISUAL SHOWCASE */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold text-[#009F95]">Why RideNexa</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0B1220] [text-wrap:balance]">
                Designed around transparent economics, not black-box dispatch
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Conventional ride-hailing algorithms optimize solely for the nearest vehicle, leaving drivers clustered in saturated hubs while riders in emerging zones wait longer.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex gap-4">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#009F95]" />
                  <div>
                    <h3 className="text-base font-bold text-[#0B1220]">Explainable Decisions</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Every driver assignment, pool pairing, and route choice surfaces plain-language reasoning and factor weights.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-[#009F95]" />
                  <div>
                    <h3 className="text-base font-bold text-[#0B1220]">Cooperative Ride Pooling</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Bearing-aligned co-rider matching reduces urban vehicle-kilometers without excessive detours.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Layers className="mt-0.5 h-5 w-5 shrink-0 text-[#009F95]" />
                  <div>
                    <h3 className="text-base font-bold text-[#0B1220]">Modular Full-Stack Architecture</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Connects React, Leaflet, Socket.IO, Express, MongoDB/Mongoose, and optional Python FastAPI ML services.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                <img
                  src={heroUrbanMobilityImg}
                  alt="Electric ride-hailing vehicle operating along a modern urban corridor"
                  referrerPolicy="no-referrer"
                  className="h-60 w-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                <img
                  src={evFleetShowcaseImg}
                  alt="Electric ride-share fleet vehicle waiting at a structured urban pickup bay"
                  referrerPolicy="no-referrer"
                  className="h-44 w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-between rounded-xl bg-[#0B1220] p-6 text-white">
                <div>
                  <div className="text-xs font-medium text-[#009F95]">Role Workspaces</div>
                  <div className="mt-2 font-display text-xl font-bold">
                    Test all three platform roles immediately
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/signin')}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#009F95]"
                >
                  <span>Sign in with Demo Accounts</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY OVERVIEW & FINAL CTA */}
      <section className="border-t border-slate-200 bg-[#0B1220] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#009F95]">Production-Ready Stack</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight [text-wrap:balance]">
                Built with real-time Socket.IO telemetry, JWT security, and OpenStreetMap routing
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Explore the interactive Intelligence Hub to adjust fairness weights, inspect demand heatmaps, cluster pooled riders, and compare route corridors in real time.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/intelligence')}
                className="rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] whitespace-nowrap"
              >
                Launch Intelligence Hub
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/technology')}
                className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
              >
                View Architecture
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
