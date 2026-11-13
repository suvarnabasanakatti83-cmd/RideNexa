import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Radio,
  Scale,
  Server,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppRoute } from '../data/navigation';
import aboutCityTransitImg from '../assets/images/about_city_transit_1794558216541.jpg';
import evFleetShowcaseImg from '../assets/images/ev_fleet_showcase_1794558217244.jpg';

interface PageProps {
  onNavigate: (route: AppRoute) => void;
}

export const AboutPage: React.FC<PageProps> = ({ onNavigate }) => {
  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold text-[#009F95]">About RideNexa</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B1220] sm:text-4xl [text-wrap:balance]">
              Rebuilding urban ride-hailing around fairness, foresight, and shared efficiency
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              RideNexa was engineered to solve the two-sided failure of modern urban ride-hailing: riders waiting unpredictably during demand shifts while drivers experience uneven earnings due to greedy nearest-only dispatch.
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Every matching, forecasting, pooling, repositioning, and routing decision inside RideNexa is transparent, auditable, and designed to improve city-wide throughput.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/intelligence')}
                className="rounded-lg bg-[#009F95] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00867d]"
              >
                Explore Intelligence Hub
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1220] hover:bg-slate-50"
              >
                Contact Our Team
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
              <img
                src={aboutCityTransitImg}
                alt="RideNexa urban mobility operations studio overlooking city transit corridor"
                referrerPolicy="no-referrer"
                className="h-80 w-full object-cover sm:h-96"
              />
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Equitable Driver Income',
              metric: '+34.2% fairness index',
              desc: 'Daily workload balancing and idle-time weights prevent top-clustered vehicles from starving nearby drivers.',
            },
            {
              title: 'Proactive Fleet Supply',
              metric: '1–3 hr foresight',
              desc: 'Zone-level demand forecasting guides idle vehicles into emerging corridors before surge bottlenecks form.',
            },
            {
              title: 'Lower Per-Trip Emissions',
              metric: 'Up to 34% shared savings',
              desc: 'Directional ride pooling combines compatible urban commuters along overlapping arterial corridors.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="font-mono text-sm font-semibold text-[#009F95]">{item.metric}</div>
              <h2 className="mt-2 font-display text-xl font-bold text-[#0B1220]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const HowItWorksPage: React.FC<PageProps> = ({ onNavigate }) => {
  const [activePersona, setActivePersona] = useState<'PASSENGER' | 'DRIVER' | 'ADMIN'>('PASSENGER');

  const workflows = {
    PASSENGER: [
      {
        step: '01',
        title: 'Set Pickup & Destination',
        detail: 'Pick an urban landmark or click directly on the OpenStreetMap canvas to place your pickup and drop-off points.',
      },
      {
        step: '02',
        title: 'Review Fair Driver Match & Fare',
        detail: 'RideNexa computes the optimal corridor, fare across vehicle tiers, and shows why your matched driver was chosen.',
      },
      {
        step: '03',
        title: 'Confirm & Track Live Progress',
        detail: 'Your booking streams via Socket.IO to the driver. Track status transitions from Assigned to En Route, In Progress, and Completed.',
      },
    ],
    DRIVER: [
      {
        step: '01',
        title: 'Toggle Online Availability',
        detail: 'Manage your live shift status and update your current sector or browser GPS coordinates.',
      },
      {
        step: '02',
        title: 'Accept Fairly Routed Requests',
        detail: 'Incoming trips display passenger pickup, distance, ETA, and fare with explicit Accept or Reject controls.',
      },
      {
        step: '03',
        title: 'Follow Smart Repositioning',
        detail: 'Between trips, view high-deficit demand zones on your map with explanations of projected passenger volume.',
      },
    ],
    ADMIN: [
      {
        step: '01',
        title: 'Monitor Live City Supply',
        detail: 'Observe all online drivers, completed trips, and zone-level wait times across Today, 7-Day, and 30-Day windows.',
      },
      {
        step: '02',
        title: 'Audit Allocation Equity',
        detail: 'Verify that trips are distributed fairly across the fleet rather than concentrated on a handful of drivers.',
      },
      {
        step: '03',
        title: 'Run What-If Intelligence',
        detail: 'Adjust fairness weights, rainy-weather demand scenarios, and pooling detour caps inside the Intelligence Hub.',
      },
    ],
  };

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-[#009F95]">Platform Workflow</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B1220] sm:text-4xl">
            How RideNexa works for every participant
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Select a role below to inspect the end-to-end operational loop from trip request to completion.
          </p>
        </div>

        <div className="mt-8 inline-flex rounded-lg bg-slate-200/70 p-1">
          {(['PASSENGER', 'DRIVER', 'ADMIN'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActivePersona(role)}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activePersona === role
                  ? 'bg-white text-[#0B1220] shadow-sm'
                  : 'text-slate-600 hover:text-[#0B1220]'
              }`}
            >
              {role === 'PASSENGER' ? 'Passenger Flow' : role === 'DRIVER' ? 'Driver Flow' : 'Admin Operations'}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {workflows[activePersona].map((item) => (
            <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="font-mono text-sm font-bold text-[#009F95]">Step {item.step}</div>
              <h2 className="mt-2 font-display text-xl font-bold text-[#0B1220]">{item.title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-xl font-bold text-[#0B1220]">
              Ready to try the live booking and dispatch loop?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with our 1-click Passenger, Driver, or Admin demo accounts to experience every role.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/signin')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#009F95] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#00867d] whitespace-nowrap shrink-0"
          >
            <span>Open Demo Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const FeaturesPage: React.FC<PageProps> = ({ onNavigate }) => {
  const features = [
    {
      icon: <Scale className="h-5 w-5 text-[#009F95]" />,
      title: 'Fair Driver Allocation Engine',
      summary: 'Multi-factor scoring across distance, daily trip count, idle duration, and driver rating.',
      points: [
        'Prevents starvation of drivers in outer blocks',
        'Compares RideNexa selection against nearest-only greedy dispatch',
        'Displays transparent factor breakdown per candidate driver',
      ],
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-[#009F95]" />,
      title: 'AI-Based Demand Forecasting',
      summary: 'Zone-level hourly demand estimation with weather and day-type elasticity.',
      points: [
        'Visualizes critical demand hotspots on OpenStreetMap',
        'Compares historical baseline against projected supply capacity',
        'Connects to external FastAPI ML endpoint when configured',
      ],
    },
    {
      icon: <Users className="h-5 w-5 text-[#009F95]" />,
      title: 'Intelligent Ride Pooling',
      summary: 'Directional bearing alignment and bounded detour matching for parallel passengers.',
      points: [
        'Groups live & queued requests within pickup/drop-off thresholds',
        'Calculates shared corridor distance and per-rider fare savings',
        'Estimates CO2 avoided through consolidated trips',
      ],
    },
    {
      icon: <Compass className="h-5 w-5 text-[#009F95]" />,
      title: 'Smart Driver Repositioning',
      summary: 'Spatial supply-deficit guidance for idle drivers between bookings.',
      points: [
        'Calculates relocation distance and travel time to target hotspots',
        'Estimates passenger wait-time reduction per relocation',
        'Embedded directly in the Driver Workspace map',
      ],
    },
    {
      icon: <Navigation className="h-5 w-5 text-[#009F95]" />,
      title: 'Multi-Corridor Route Optimization',
      summary: 'Compares express arterial routes, bypasses, and inner-city shortcuts.',
      points: [
        'Evaluates peak-hour traffic index alongside geometric distance',
        'Renders alternative polylines directly on Leaflet maps',
        'Explains why the recommended route beats shorter congested streets',
      ],
    },
  ];

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-[#009F95]">Platform Capabilities</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B1220] sm:text-4xl">
              Five core innovations engineered as working software modules
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Every capability below runs against live backend endpoints and interactive OpenStreetMap layers inside the RideNexa Intelligence Hub.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
              <img
                src={evFleetShowcaseImg}
                alt="RideNexa electric vehicle fleet pickup bay"
                referrerPolicy="no-referrer"
                className="h-52 w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                {f.icon}
                <h2 className="font-display text-xl font-bold text-[#0B1220]">{f.title}</h2>
              </div>
              <p className="mt-2.5 text-sm text-slate-600">{f.summary}</p>
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
                {f.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#009F95]" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => onNavigate('/intelligence')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1220] px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <span>Test All 5 Modules in Intelligence Hub</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const TechnologyPage: React.FC<PageProps> = ({ onNavigate }) => {
  const stack = [
    {
      icon: <MapPin className="h-5 w-5 text-[#009F95]" />,
      layer: 'Frontend & Geospatial UI',
      tech: 'React 19 · TypeScript · Tailwind CSS · OpenStreetMap · Leaflet',
      desc: 'Responsive role-based dashboards with live Leaflet markers, route polylines, interactive zone heatmaps, and tabular SVG telemetry.',
    },
    {
      icon: <Radio className="h-5 w-5 text-[#009F95]" />,
      layer: 'Real-Time Event Layer',
      tech: 'Socket.IO Server & Client',
      desc: 'Bi-directional event channels synchronize ride requests, driver acceptance, trip status transitions, and fleet coordinates.',
    },
    {
      icon: <Server className="h-5 w-5 text-[#009F95]" />,
      layer: 'API & Dispatch Engine',
      tech: 'Node.js · Express.js',
      desc: 'RESTful API orchestrating fare calculation, fair driver scoring, pooling compatibility, repositioning, and route evaluation.',
    },
    {
      icon: <Database className="h-5 w-5 text-[#009F95]" />,
      layer: 'Persistence Layer',
      tech: 'MongoDB & Mongoose (with persistent local demo fallback)',
      desc: 'Connects to MongoDB via MONGODB_URI in production and falls back cleanly to a persistent local JSON store when unconfigured.',
    },
    {
      icon: <Cpu className="h-5 w-5 text-[#009F95]" />,
      layer: 'ML Microservice Bridge',
      tech: 'Python & FastAPI (ML_SERVICE_URL)',
      desc: 'Queries an external FastAPI forecasting service when configured, or executes the clearly labelled prototype spatio-temporal model.',
    },
    {
      icon: <Lock className="h-5 w-5 text-[#009F95]" />,
      layer: 'Security & RBAC',
      tech: 'JWT · bcryptjs · Role Middleware',
      desc: 'Password hashing, signed Bearer tokens, server-side role enforcement (PASSENGER, DRIVER, ADMIN), and zero exposed secrets.',
    },
  ];

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-[#009F95]">System Architecture</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B1220] sm:text-4xl">
            Clean, portable architecture built for reliability and explainability
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Every layer separates client visualization from server-authoritative dispatch state and optional external ML or database services.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stack.map((item) => (
            <div key={item.layer} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2.5">
                {item.icon}
                <h2 className="font-display text-lg font-bold text-[#0B1220]">{item.layer}</h2>
              </div>
              <div className="mt-2 font-mono text-xs font-medium text-[#009F95]">{item.tech}</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-slate-200 bg-[#0B1220] p-6 sm:p-8 text-white">
          <h3 className="font-display text-xl font-bold">Configured Environment Variables</h3>
          <p className="mt-2 text-sm text-slate-300">
            All credentials remain strictly server-side inside Node.js process environment variables.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-[#009F95]">JWT_SECRET</div>
              <div className="mt-1 text-slate-400">HS256 token signing key</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-[#009F95]">MONGODB_URI</div>
              <div className="mt-1 text-slate-400">Optional Mongoose connection</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-[#009F95]">ML_SERVICE_URL</div>
              <div className="mt-1 text-slate-400">Optional FastAPI ML endpoint</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <div className="text-[#009F95]">DRIVER_RESPONSE_TIMEOUT</div>
              <div className="mt-1 text-slate-400">Dispatch accept window (sec)</div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => onNavigate('/intelligence')}
              className="rounded-lg bg-[#009F95] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00867d]"
            >
              Inspect Live Algorithms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC<PageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [topic, setTopic] = useState('City Pilot & Fleet Partnership');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmation(null);

    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter a message with at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, organization, topic, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit inquiry.');
      setConfirmation(data.confirmation);
      setName('');
      setEmail('');
      setOrganization('');
      setMessage('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold text-[#009F95]">Get in Touch</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#0B1220]">
              Partner with RideNexa
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Reach out regarding municipal mobility pilots, fleet onboarding, API integration, or technical evaluation.
            </p>

            <div className="mt-8 space-y-5 border-t border-slate-200 pt-6 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-[#009F95]" />
                <div>
                  <div className="font-semibold text-[#0B1220]">Operations Desk</div>
                  <div className="text-slate-600">mobility@ridenexa.io</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#009F95]" />
                <div>
                  <div className="font-semibold text-[#0B1220]">Engineering Hub</div>
                  <div className="text-slate-600">MG Road Corridor, Bengaluru</div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => onNavigate('/signin')}
                className="text-sm font-semibold text-[#009F95] hover:text-[#00867d]"
              >
                Or sign in to test the platform →
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {confirmation && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {confirmation}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Nair"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@organization.org"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Organization (Optional)</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Metro Transit Authority"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Inquiry Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                  >
                    <option>City Pilot & Fleet Partnership</option>
                    <option>Algorithm & ML Architecture</option>
                    <option>Driver Cooperative Onboarding</option>
                    <option>General Platform Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share details about your city corridor, fleet size, or technical inquiry..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#009F95] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#009F95] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#00867d] disabled:opacity-60"
              >
                {submitting ? 'Sending Inquiry...' : 'Submit Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
