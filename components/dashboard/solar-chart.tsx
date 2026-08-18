'use client';

import { CONTROLLER_TIME_ZONE, type SolarReadingRow } from '@/lib/data/today';
import { useMemo, useState } from 'react';

/**
 * Today's production, with a touch/hover readout. Client component only for the
 * pointer handling — the data is still fetched on the server and passed down.
 */
export function SolarChart({ readings }: { readings: SolarReadingRow[] }) {
  const W = 720;
  const H = 232;
  const M = { l: 56, r: 12, t: 24, b: 26 };
  const plotW = W - M.l - M.r;
  const plotH = H - M.t - M.b;

  const maxW = Math.max(4000, ...readings.map((r) => r.watts));

  const points = useMemo(() => {
    const hourOf = (iso: string) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: CONTROLLER_TIME_ZONE,
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
      }).formatToParts(new Date(iso));
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
      const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
      return (h % 24) + m / 60;
    };
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: CONTROLLER_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
    });
    return readings.map((r) => ({
      h: hourOf(r.reading_at),
      w: r.watts,
      amps: r.amps,
      time: label.format(new Date(r.reading_at)),
    }));
  }, [readings]);

  const [active, setActive] = useState<number | null>(null);

  const x = (hour: number) => M.l + (hour / 24) * plotW;
  const y = (watts: number) => M.t + plotH - (watts / maxW) * plotH;

  const line = points
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.h).toFixed(1)} ${y(p.w).toFixed(1)}`,
    )
    .join(' ');
  const area =
    points.length > 0
      ? `${line} L ${x(points[points.length - 1].h).toFixed(1)} ${y(0)} L ${x(points[0].h).toFixed(1)} ${y(0)} Z`
      : '';

  const gridWatts = [0, 1000, 2000, 3000, 4000].filter((v) => v <= maxW);
  // 12-hour labels; midnight at either end stays unlabeled on purpose.
  const hourTicks = [
    { h: 6, label: '6 AM' },
    { h: 9, label: '9 AM' },
    { h: 12, label: '12 PM' },
    { h: 15, label: '3 PM' },
    { h: 18, label: '6 PM' },
    { h: 21, label: '9 PM' },
  ];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const hour = Math.max(0, Math.min(24, ((px - M.l) / plotW) * 24));
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].h - hour) < Math.abs(points[best].h - hour)) best = i;
    }
    setActive(best);
  }

  const a = active != null ? points[active] : null;
  // Keep the readout box inside the plot near the edges.
  const boxW = 128;
  const boxX = a ? Math.min(Math.max(x(a.h) - boxW / 2, M.l), W - M.r - boxW) : 0;

  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Solar production today, watts by hour"
        className="min-w-[560px] touch-none text-muted-foreground"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <text x={M.l} y={12} fontSize="11" fill="currentColor">
          watts
        </text>
        <rect
          x={x(9)}
          y={M.t}
          width={x(18) - x(9)}
          height={plotH}
          className="fill-muted"
          rx="2"
        />
        {gridWatts.map((v) => (
          <g key={v}>
            <line
              x1={M.l}
              y1={y(v)}
              x2={W - M.r}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity="0.15"
            />
            <text
              x={M.l - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
            >
              {v.toLocaleString('en-US')}
            </text>
          </g>
        ))}
        {hourTicks.map((t) => (
          <text
            key={t.h}
            x={x(t.h)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
          >
            {t.label}
          </text>
        ))}
        {points.length > 0 && (
          <>
            <path d={area} className="fill-primary/15" />
            <path
              d={line}
              className="stroke-primary"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />
            <circle
              cx={x(points[points.length - 1].h)}
              cy={y(points[points.length - 1].w)}
              r="3.5"
              className="fill-primary stroke-background"
              strokeWidth="2"
            />
          </>
        )}
        {a && (
          <g>
            <line
              x1={x(a.h)}
              y1={M.t}
              x2={x(a.h)}
              y2={M.t + plotH}
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(a.h)}
              cy={y(a.w)}
              r="4"
              className="fill-primary stroke-background"
              strokeWidth="2"
            />
            <g transform={`translate(${boxX}, ${M.t + 2})`}>
              <rect
                width={boxW}
                height="34"
                rx="4"
                className="fill-background stroke-border"
              />
              <text x="8" y="14" fontSize="10" fill="currentColor">
                {a.time}
              </text>
              <text
                x="8"
                y="27"
                fontSize="11"
                fontWeight="600"
                className="fill-foreground"
              >
                {Math.round(a.w).toLocaleString('en-US')} W · {a.amps.toFixed(1)} A
              </text>
            </g>
          </g>
        )}
        {points.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            No readings yet today — polling runs 9 AM–6 PM
          </text>
        )}
      </svg>
      <figcaption className="sr-only">
        Solar production in watts across today; touch or hover for the value at a
        point in time.
      </figcaption>
    </figure>
  );
}
