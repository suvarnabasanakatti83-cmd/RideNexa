import React, { useCallback, useEffect, useState } from 'react';
import { ActivityBarChart } from '../components/Charts';
import { CityMap } from '../components/CityMap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { AdminAnalyticsResponse } from '../types/ridenexa';

export const AdminDashboard: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const { drivers, lastRideEvent } = useSocket();
  const [dateFilter, setDateFilter] = useState<'TODAY' | '7_DAYS' | '30_DAYS'>('TODAY');
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AdminAnalyticsResponse>(
        `/api/admin/analytics?dateFilter=${dateFilter}`
      );
      setAnalytics(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, dateFilter, user]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (lastRideEvent) {
      loadAnalytics();
    }
  }, [lastRideEvent, loadAnalytics]);

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1220]">
            Admin Command Centre
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Platform throughput, driver fairness distribution, and demand analytics.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-200/70 p-1 self-start sm:self-auto">
          {(
            [
              { id: 'TODAY', label: 'Today' },
              { id: '7_DAYS', label: '7 Days' },
              { id: '30_DAYS', label: '30 Days' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateFilter(tab.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                dateFilter === tab.id
                  ? 'bg-white text-[#0B1220] shadow-sm'
                  : 'text-slate-600 hover:text-[#0B1220]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {analytics && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong className="text-[#0B1220]">Data Transparency:</strong>{' '}
            {analytics.dataSourceSummary.liveDatabaseRides} live ride records from{' '}
            <span className="font-mono font-semibold text-[#0B1220]">
              {analytics.dataSourceSummary.databaseMode === 'MONGODB'
                ? 'MongoDB (Mongoose)'
                : 'Persistent Local Demo Store'}
            </span>{' '}
            combined with {analytics.dataSourceSummary.simulatedBaselineRides} clearly identified simulated historical baseline rides.
          </div>
        </div>
      )}

      {loading && !analytics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white border border-slate-200" />
          ))}
        </div>
      ) : (
        analytics && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Total Rides</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
                  {analytics.kpis.totalRides.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {analytics.kpis.completedRides.toLocaleString()} completed
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Available / Online Drivers</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
                  {analytics.kpis.availableDrivers} / {analytics.kpis.onlineDrivers}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {analytics.kpis.activePassengers} active passengers
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Avg Wait & Utilization</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#009F95] tabular-nums">
                  {analytics.kpis.avgWaitTimeMin} min
                </div>
                <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                  {analytics.kpis.driverUtilizationPct}% driver utilization
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">Completion Rate</div>
                <div className="mt-1 font-mono text-2xl font-bold text-[#0B1220] tabular-nums">
                  {analytics.kpis.completionRatePct}%
                </div>
                <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                  +{analytics.kpis.fairnessGiniImprovementPct}% equity index
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1220]">
                  Ride Activity Overview
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                  Completed vs cooperative pooled ride volume across the selected period.
                </p>
                <ActivityBarChart data={analytics.activitySeries} />
              </div>

              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1220]">
                  Demand Distribution by Zone
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                  Simulated zone share and average pickup wait times.
                </p>
                <div className="space-y-3.5">
                  {analytics.demandDistribution.map((z) => (
                    <div key={z.zone} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0B1220] truncate pr-2">{z.zone}</span>
                        <span className="font-mono text-slate-600 tabular-nums shrink-0">
                          {z.requests} req ({z.sharePct}%) · {z.avgWaitMin}m wait
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#009F95]"
                          style={{ width: `${Math.min(100, z.sharePct * 3.8)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Driver Allocation Equity + Live Fleet Map */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-[#0B1220]">
                  Driver Allocation Analytics
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                  Live fleet trip counts, fairness alignment scores, and daily earnings.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 pr-3">Driver</th>
                        <th className="py-2.5 pr-3">Sector</th>
                        <th className="py-2.5 pr-3 text-right">Trips</th>
                        <th className="py-2.5 pr-3 text-right">Utilization</th>
                        <th className="py-2.5 pr-3 text-right">Fairness</th>
                        <th className="py-2.5 text-right">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {analytics.driverAllocationAnalytics.map((d) => (
                        <tr key={d.driverName} className="hover:bg-slate-50/70">
                          <td className="py-2.5 pr-3 font-semibold text-[#0B1220]">{d.driverName}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{d.area}</td>
                          <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{d.ridesToday}</td>
                          <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                            {d.utilizationPct}%
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono font-semibold text-[#009F95] tabular-nums">
                            {d.fairnessScore}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums">
                            ₹{d.earnings.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 flex flex-col">
                <h2 className="font-display text-lg font-bold text-[#0B1220]">Live Fleet Overview</h2>
                <p className="mb-3 text-xs text-slate-500">
                  Real-time Socket.IO positions across the metropolitan grid.
                </p>
                <div className="flex-1 min-h-[320px]">
                  <CityMap heightClass="h-full min-h-[320px]" drivers={drivers} />
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
};
