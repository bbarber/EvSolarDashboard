'use client';

import {
  CONTROLLER_TIME_ZONE,
  FALLBACK_CHART_CLASSES,
  VEHICLE_CHART_CLASSES,
  vehicleName,
  type ChargeReadingRow,
  type SolarReadingRow,
} from '@/lib/data/types';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Today's production and each car's draw on one watts axis — the draw arrives
 * from the VM already converted at the real service voltage. One series per
 * vehicle, and clicking a legend chip toggles its series.
 */

interface Pt {
  h: number;
  w: number;
  amps: number;
  time: string;
}

function chartClasses(vin: string) {
  return VEHICLE_CHART_CLASSES[vin] ?? FALLBACK_CHART_CLASSES;
}

export function SolarChart({
  readings,
  charge,
}: {
  readings: SolarReadingRow[];
  charge: ChargeReadingRow[];
}) {
  // The chart draws at the container's real pixel width, so text stays a
  // readable size on every screen instead of shrinking with a scaled viewBox
  // (tiny on phones) or forcing a horizontal scroll (hides the afternoon).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setW(Math.max(300, Math.round(el.clientWidth))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 232;
  const M = { l: 46, r: 8, t: 18, b: 26 };
  const plotW = W - M.l - M.r;
  const plotH = H - M.t - M.b;

  // The plot spans 6 AM–9 PM: the hours outside are permanently dark. Solar cannot land outside
  // the polling window; charge samples can (an evening manual charge), so those clamp to the edge
  // rather than vanish.
  const HOUR_MIN = 6;
  const HOUR_MAX = 21;

  const hourOf = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: CONTROLLER_TIME_ZONE,
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
    });
    return (iso: string) => {
      const parts = fmt.formatToParts(new Date(iso));
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
      const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
      return (h % 24) + m / 60;
    };
  }, []);

  const timeLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: CONTROLLER_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
    });
    return (iso: string) => fmt.format(new Date(iso));
  }, []);

  const solarPts: Pt[] = useMemo(
    () =>
      readings.map((r) => ({
        h: hourOf(r.reading_at),
        w: r.watts,
        amps: r.amps,
        time: timeLabel(r.reading_at),
      })),
    [readings, hourOf, timeLabel],
  );

  // One series per vehicle, in the order each first appears today.
  const carSeries = useMemo(() => {
    const byVin = new Map<string, Pt[]>();
    for (const r of charge) {
      const pt: Pt = {
        h: Math.min(Math.max(hourOf(r.reading_at), HOUR_MIN), HOUR_MAX),
        w: r.watts,
        amps: r.amps,
        time: timeLabel(r.reading_at),
      };
      const pts = byVin.get(r.vin);
      if (pts) pts.push(pt);
      else byVin.set(r.vin, [pt]);
    }
    return [...byVin.entries()].map(([vin, pts]) => ({ vin, pts }));
  }, [charge, hourOf, timeLabel]);

  const [showSolar, setShowSolar] = useState(true);
  const [hiddenCars, setHiddenCars] = useState<Record<string, boolean>>({});
  const carShown = (vin: string) => !hiddenCars[vin];
  const toggleCar = (vin: string) =>
    setHiddenCars((prev) => ({ ...prev, [vin]: !prev[vin] }));

  const [active, setActive] = useState<number | null>(null);

  const maxW = Math.max(
    4000,
    ...(showSolar ? solarPts.map((p) => p.w) : []),
    ...carSeries
      .filter((s) => carShown(s.vin))
      .flatMap((s) => s.pts.map((p) => p.w)),
  );

  const x = (hour: number) =>
    M.l + ((hour - HOUR_MIN) / (HOUR_MAX - HOUR_MIN)) * plotW;
  const y = (watts: number) => M.t + plotH - (watts / maxW) * plotH;

  const solarLine = solarPts
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${x(p.h).toFixed(1)} ${y(p.w).toFixed(1)}`,
    )
    .join(' ');
  const solarArea =
    solarPts.length > 0
      ? `${solarLine} L ${x(solarPts[solarPts.length - 1].h).toFixed(1)} ${y(0)} L ${x(solarPts[0].h).toFixed(1)} ${y(0)} Z`
      : '';

  // Stepped: draw holds its value until the next sample says otherwise.
  const stepPath = (pts: Pt[]) =>
    pts
      .map((p, i, arr) =>
        i === 0
          ? `M ${x(p.h).toFixed(1)} ${y(p.w).toFixed(1)}`
          : `L ${x(p.h).toFixed(1)} ${y(arr[i - 1].w).toFixed(1)} L ${x(p.h).toFixed(1)} ${y(p.w).toFixed(1)}`,
      )
      .join(' ');

  const gridWatts = [0, 1000, 2000, 3000, 4000, 5000].filter((v) => v <= maxW);
  const hourTicks = [
    { h: 6, label: '6 AM' },
    { h: 9, label: '9 AM' },
    { h: 12, label: '12 PM' },
    { h: 15, label: '3 PM' },
    { h: 18, label: '6 PM' },
    { h: 21, label: '9 PM' },
  ];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const hour = Math.max(
      HOUR_MIN,
      Math.min(
        HOUR_MAX,
        HOUR_MIN + ((px - M.l) / plotW) * (HOUR_MAX - HOUR_MIN),
      ),
    );
    setActive(hour);
  }

  const nearest = (pts: Pt[], hour: number | null) => {
    if (hour == null || pts.length === 0) return null;
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].h - hour) < Math.abs(pts[best].h - hour)) best = i;
    }
    return pts[best];
  };
  const aSolar = showSolar ? nearest(solarPts, active) : null;
  const aCars = carSeries
    .filter((s) => carShown(s.vin))
    .map((s) => ({ vin: s.vin, pt: nearest(s.pts, active) }))
    .filter((a): a is { vin: string; pt: Pt } => a.pt != null);
  const crosshairAt = aSolar?.h ?? aCars[0]?.pt.h ?? null;

  const chip = (on: boolean) =>
    `flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs transition-opacity ${on ? '' : 'opacity-40 line-through'}`;

  return (
    <figure className="w-full">
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={showSolar}
            onClick={() => setShowSolar((v) => !v)}
            className={chip(showSolar)}
          >
            <i className="h-2 w-3 rounded-sm bg-primary" aria-hidden />
            solar
          </button>
          {carSeries.map((s) => (
            <button
              key={s.vin}
              type="button"
              aria-pressed={carShown(s.vin)}
              onClick={() => toggleCar(s.vin)}
              className={chip(carShown(s.vin))}
            >
              <i
                className={`h-2 w-3 rounded-sm ${chartClasses(s.vin).chip}`}
                aria-hidden
              />
              {vehicleName(s.vin)}
            </button>
          ))}
        </div>
        <div
          aria-live="polite"
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm tabular-nums"
        >
          {aSolar && (
            <span>
              <span className="text-muted-foreground">{aSolar.time} · </span>
              <span className="font-semibold">
                {Math.round(aSolar.w).toLocaleString('en-US')} W
              </span>
            </span>
          )}
          {aCars.map((a) => (
            <span key={a.vin} className={chartClasses(a.vin).text}>
              {vehicleName(a.vin)} {a.pt.amps} A
            </span>
          ))}
          {!aSolar && aCars.length === 0 && (
            <span className="text-xs text-muted-foreground">
              touch the chart for values
            </span>
          )}
        </div>
      </div>
      <div ref={wrapRef} className="w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label="Solar production and car draw today, watts by hour"
          className="touch-none text-muted-foreground"
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
          {showSolar && solarPts.length > 0 && (
            <>
              <path d={solarArea} className="fill-primary/15" />
              <path
                d={solarLine}
                className="stroke-primary"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
              />
            </>
          )}
          {carSeries
            .filter((s) => carShown(s.vin) && s.pts.length > 0)
            .map((s) => (
              <path
                key={s.vin}
                d={stepPath(s.pts)}
                className={chartClasses(s.vin).stroke}
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
              />
            ))}
          {crosshairAt != null && (
            <line
              x1={x(crosshairAt)}
              y1={M.t}
              x2={x(crosshairAt)}
              y2={M.t + plotH}
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeDasharray="3 3"
            />
          )}
          {aSolar && (
            <circle
              cx={x(aSolar.h)}
              cy={y(aSolar.w)}
              r="4"
              className="fill-primary stroke-background"
              strokeWidth="2"
            />
          )}
          {aCars.map((a) => (
            <circle
              key={a.vin}
              cx={x(a.pt.h)}
              cy={y(a.pt.w)}
              r="4"
              className={`${chartClasses(a.vin).fill} stroke-background`}
              strokeWidth="2"
            />
          ))}
          {solarPts.length === 0 && carSeries.length === 0 && (
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
      </div>
      <figcaption className="sr-only">
        Solar production and each car&apos;s draw in watts across today; legend
        chips toggle each series, touch or hover for values.
      </figcaption>
    </figure>
  );
}
