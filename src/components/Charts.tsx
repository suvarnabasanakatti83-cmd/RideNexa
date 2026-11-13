import React, { useState } from 'react';
import { DemandHourlyPoint } from '../types/ridenexa';

export const DemandForecastChart: React.FC<{ data: DemandHourlyPoint[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data.length) return null;

  const width = 680;
  const height = 220;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.predictedDemand, d.historicalDemand, d.availableSupply)),
    10
  );

  const toX = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * plotW;
  const toY = (v: number) => padT + plotH - (v / maxVal) * plotH;

  const predPoints = data.map((d, i) => `${toX(i)},${toY(d.predictedDemand)}`).join(' ');
  const histPoints = data.map((d, i) => `${toX(i)},${toY(d.historicalDemand)}`).join(' ');
  const supplyPoints = data.map((d, i) => `${toX(i)},${toY(d.availableSupply)}`).join(' ');

  const areaPath = `M ${toX(0)},${padT + plotH} L ${data
    .map((d, i) => `${toX(i)},${toY(d.predictedDemand)}`)
    .join(' L ')} L ${toX(data.length - 1)},${padT + plotH} Z`;

  const active = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#0B1220]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#009F95]" />
            Predicted Demand
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 bg-[#0B1220]" />
            Historical Baseline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 border-t border-dashed border-amber-600" />
            Projected Supply Capacity
          </span>
        </div>
        {active && (
          <div className="font-mono text-xs text-[#0B1220] tabular-nums">
            {active.hourLabel} · Pred: {active.predictedDemand} · Hist: {active.historicalDemand} · Supply: {active.availableSupply}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          const labelVal = Math.round(maxVal * t);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400 font-mono text-[10px]">
                {labelVal}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="#009F95" fillOpacity="0.1" />
        <polyline fill="none" stroke="#0B1220" strokeWidth="1.75" strokeOpacity="0.55" points={histPoints} />
        <polyline fill="none" stroke="#D97706" strokeWidth="1.75" strokeDasharray="4 4" points={supplyPoints} />
        <polyline fill="none" stroke="#009F95" strokeWidth="2.5" points={predPoints} />

        {data.map((d, i) => {
          const x = toX(i);
          return (
            <g key={d.hourLabel}>
              {i % 3 === 0 && (
                <text x={x} y={height - 8} textAnchor="middle" className="fill-slate-500 font-mono text-[10px]">
                  {d.hourLabel}
                </text>
              )}
              <rect
                x={x - plotW / data.length / 2}
                y={padT}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              {hoverIdx === i && (
                <>
                  <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#94A3B8" strokeDasharray="3 3" />
                  <circle cx={x} cy={toY(d.predictedDemand)} r="4.5" fill="#009F95" stroke="#FFFFFF" strokeWidth="2" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const ActivityBarChart: React.FC<{
  data: { label: string; completed: number; pooled: number; cancelled: number }[];
}> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (!data.length) return null;

  const width = 620;
  const height = 220;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.completed + d.pooled), 10);
  const slotW = plotW / data.length;
  const barW = Math.min(28, slotW * 0.42);
  const active = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#0B1220]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0B1220]" />
            Completed Rides
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#009F95]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#009F95]" />
            Pooled Rides
          </span>
        </div>
        {active && (
          <div className="font-mono text-xs text-[#0B1220] tabular-nums">
            {active.label} · Completed: {active.completed} · Pooled: {active.pooled} · Cancelled: {active.cancelled}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400 font-mono text-[10px]">
                {Math.round(maxVal * t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padL + i * slotW + slotW / 2;
          const completedH = (d.completed / maxVal) * plotH;
          const pooledH = (d.pooled / maxVal) * plotH;

          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={cx - barW - 2}
                y={padT + plotH - completedH}
                width={barW}
                height={completedH}
                rx="3"
                fill="#0B1220"
                fillOpacity={hoverIdx === i ? 1 : 0.88}
              />
              <rect
                x={cx + 2}
                y={padT + plotH - pooledH}
                width={barW}
                height={pooledH}
                rx="3"
                fill="#009F95"
                fillOpacity={hoverIdx === i ? 1 : 0.88}
              />
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-slate-500 font-mono text-[11px]">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
