'use client';

import {
  CONTROLLER_TIME_ZONE,
  vehicleColors,
  vehicleName,
  type ChargeReadingRow,
  type SolarReadingRow,
} from '@/lib/data/types';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  type Chart as ChartType,
  type ChartDataset,
  type Plugin,
} from 'chart.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler);

/**
 * Today's production against each car's charge current.
 *
 * Two axes on purpose: solar is watts (left), the cars are amps (right). Amps
 * are what the controller actually commands and what the Tesla app shows, so
 * plotting the cars in watts made the reader convert in their head to check the
 * system's work.
 *
 * The selected values are reported in a fixed-height row above the plot rather
 * than a floating tooltip: a tooltip covers the data it describes, and on a
 * phone it sits under your thumb. The row's height is reserved whether or not a
 * point is selected, so touching the chart never reflows the page.
 */

const HOUR_MIN = 6;
const HOUR_MAX = 21;

interface Pt {
  x: number;
  y: number;
}

interface CarSeries {
  vin: string;
  pts: Pt[];
}

interface Selection {
  hour: number;
  solar: Pt | null;
  cars: { vin: string; pt: Pt }[];
}

/** Reads a shadcn HSL triplet (`0 0% 3.9%`) into a canvas-usable color. */
function cssHsl(name: string, alpha = 1): string {
  if (typeof window === 'undefined') return '#888';
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return '#888';
  return alpha === 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

function nearest(pts: Pt[], hour: number): Pt | null {
  let best: Pt | null = null;
  let bestD = Infinity;
  for (const p of pts) {
    const d = Math.abs(p.x - hour);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function SolarChart({
  readings,
  charge,
}: {
  readings: SolarReadingRow[];
  charge: ChargeReadingRow[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartType | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  const solarPts = useMemo<Pt[]>(
    () => readings.map((r) => ({ x: hourOf(r.reading_at), y: r.watts })),
    [readings, hourOf],
  );

  // One series per vehicle, in the order each first appears today.
  const carSeries = useMemo<CarSeries[]>(() => {
    const byVin = new Map<string, Pt[]>();
    for (const r of charge) {
      const pt = {
        x: Math.min(Math.max(hourOf(r.reading_at), HOUR_MIN), HOUR_MAX),
        y: r.amps,
      };
      const pts = byVin.get(r.vin);
      if (pts) pts.push(pt);
      else byVin.set(r.vin, [pt]);
    }
    return [...byVin.entries()].map(([vin, pts]) => ({ vin, pts }));
  }, [charge, hourOf]);

  // Telemetry is on-change, so the last sample still describes the car right
  // now — but only up to now. Set after mount so the server and the first
  // client render agree.
  const [nowHour, setNowHour] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: CONTROLLER_TIME_ZONE,
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
      const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
      setNowHour(Math.min(Math.max((h % 24) + m / 60, HOUR_MIN), HOUR_MAX));
    };
    read();
    const t = setInterval(read, 60_000);
    return () => clearInterval(t);
  }, []);

  const [showSolar, setShowSolar] = useState(true);
  const [hiddenCars, setHiddenCars] = useState<Record<string, boolean>>({});
  const carShown = useCallback((vin: string) => !hiddenCars[vin], [hiddenCars]);

  // Carry each series forward to now, so the drawn line covers every moment the
  // readout is willing to report a value for.
  const shownCars = useMemo(
    () =>
      carSeries
        .filter((s) => carShown(s.vin))
        .map((s) => {
          const last = s.pts[s.pts.length - 1];
          if (nowHour == null || !last || last.x >= nowHour) return s;
          return { vin: s.vin, pts: [...s.pts, { x: nowHour, y: last.y }] };
        }),
    [carSeries, carShown, nowHour],
  );

  const maxWatts = useMemo(
    () =>
      Math.ceil(
        Math.max(4000, ...(showSolar ? solarPts.map((p) => p.y) : [])) / 500,
      ) * 500,
    [solarPts, showSolar],
  );
  const maxAmps = useMemo(
    () =>
      Math.max(
        16,
        Math.ceil(
          Math.max(0, ...shownCars.flatMap((s) => s.pts.map((p) => p.y))) / 4,
        ) * 4,
      ),
    [shownCars],
  );

  // Track the theme so canvas colors — which cannot come from CSS classes —
  // follow the toggle and the OS setting.
  useEffect(() => {
    const read = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => mo.disconnect();
  }, []);

  const timeLabel = useMemo(() => {
    return (hour: number) => {
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60);
      const hh = ((h + 11) % 12) + 1;
      return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
  }, []);

  const hourLabel = (v: number) => {
    const h = Math.round(v);
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  // The crosshair and dots are drawn from the same selection the readout row
  // reports, so the mark on the plot and the number above it cannot disagree.
  const markerPlugin = useMemo<Plugin<'line'>>(
    () => ({
      id: 'selectionMarker',
      afterDatasetsDraw(chart) {
        const sel = selectionRef.current;
        if (!sel) return;
        const { ctx, chartArea: area, scales } = chart;
        const px = scales.x.getPixelForValue(sel.hour);
        if (px < area.left || px > area.right) return;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = cssHsl('--muted-foreground', 0.7);
        ctx.lineWidth = 1;
        ctx.moveTo(px, area.top);
        ctx.lineTo(px, area.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        const halo = cssHsl('--card');
        const dot = (x: number, y: number, scaleId: string, color: string) => {
          ctx.beginPath();
          ctx.arc(
            scales.x.getPixelForValue(x),
            scales[scaleId].getPixelForValue(y),
            4.5,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = halo;
          ctx.stroke();
        };

        if (sel.solar) {
          dot(sel.solar.x, sel.solar.y, 'y', cssHsl('--foreground'));
        }
        for (const c of sel.cars) {
          const colors = vehicleColors(c.vin);
          dot(c.pt.x, c.pt.y, 'yAmps', isDark ? colors.dark : colors.light);
        }
        ctx.restore();
      },
    }),
    [isDark],
  );

  // Build (and rebuild) the chart when the data, visibility or theme changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ink = cssHsl('--foreground');
    const muted = cssHsl('--muted-foreground');
    const grid = cssHsl('--muted-foreground', 0.2);

    const datasets: ChartDataset<'line', Pt[]>[] = [];
    if (showSolar) {
      datasets.push({
        label: 'Solar',
        data: solarPts,
        borderColor: ink,
        backgroundColor: cssHsl('--foreground', 0.1),
        fill: 'origin',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        yAxisID: 'y',
      });
    }
    for (const s of shownCars) {
      const colors = vehicleColors(s.vin);
      datasets.push({
        label: vehicleName(s.vin),
        data: s.pts,
        borderColor: isDark ? colors.dark : colors.light,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        stepped: true,
        yAxisID: 'yAmps',
      });
    }

    const chart = new Chart(canvas, {
      type: 'line',
      data: { datasets },
      plugins: [markerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        // Our own pointer handler owns the selection; Chart.js's hover
        // highlighting would only ever be a second, disagreeing indicator.
        hover: { mode: undefined },
        scales: {
          x: {
            type: 'linear',
            min: HOUR_MIN,
            max: HOUR_MAX,
            ticks: {
              stepSize: 3,
              callback: (v) => hourLabel(Number(v)),
              color: muted,
              font: { size: 10 },
            },
            grid: { color: grid },
            border: { display: false },
          },
          y: {
            position: 'left',
            min: 0,
            max: maxWatts,
            title: {
              display: true,
              text: 'watts',
              color: muted,
              font: { size: 10 },
            },
            ticks: {
              callback: (v) => Number(v).toLocaleString('en-US'),
              color: muted,
              font: { size: 10 },
            },
            grid: { color: grid },
            border: { display: false },
          },
          yAmps: {
            position: 'right',
            min: 0,
            max: maxAmps,
            title: {
              display: true,
              text: 'amps',
              color: muted,
              font: { size: 10 },
            },
            ticks: { color: muted, font: { size: 10 }, stepSize: 4 },
            grid: { display: false },
            border: { display: false },
          },
        },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });

    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [solarPts, shownCars, showSolar, maxWatts, maxAmps, isDark, markerPlugin]);

  // Keep the drawn marker in step with the reported selection.
  useEffect(() => {
    selectionRef.current = selection;
    chartRef.current?.render();
  }, [selection]);

  const select = useCallback(
    (clientX: number | null) => {
      const chart = chartRef.current;
      if (!chart || clientX == null) {
        setSelection(null);
        return;
      }
      const rect = chart.canvas.getBoundingClientRect();
      const raw = chart.scales.x.getValueForPixel(clientX - rect.left);
      if (raw == null || Number.isNaN(raw)) {
        setSelection(null);
        return;
      }
      // The canvas is wider than the plot — the axes own the margins — so a
      // touch in the gutter maps past the domain and would report a time the
      // chart never plots, with no marker to match it.
      const hour = Math.min(Math.max(raw, HOUR_MIN), HOUR_MAX);

      // A series is only reported where it actually has data. Reporting the
      // nearest sample regardless would claim "0 A" hours before a car was
      // plugged in — a reading the chart never drew.
      const inSolar =
        showSolar &&
        solarPts.length > 0 &&
        hour >= solarPts[0].x - 0.25 &&
        hour <= solarPts[solarPts.length - 1].x + 0.25;
      const solarSample = inSolar ? nearest(solarPts, hour) : null;

      // Solar is sampled every ~20 minutes, so the crosshair snaps to a reading
      // and "selecting a point" means something exact. With no solar in range
      // it follows the pointer instead.
      const at = solarSample ? solarSample.x : hour;

      // The car line is stepped: its value at a moment is the last sample at or
      // before it, held. Drawing the dot on the sample's own time would fling
      // the marker hours away from the crosshair once a session ended — the
      // held value belongs at the time being asked about.
      const cars = shownCars
        .map((s) => {
          const last = s.pts[s.pts.length - 1];
          if (!last || at > last.x + 1e-6) return null; // beyond the drawn line
          let held: Pt | null = null;
          for (const p of s.pts) {
            if (p.x <= at + 1e-6) held = p;
            else break;
          }
          return held ? { vin: s.vin, pt: { x: at, y: held.y } } : null;
        })
        .filter((c): c is { vin: string; pt: Pt } => c != null);

      if (!solarSample && cars.length === 0) {
        setSelection(null);
        return;
      }
      setSelection({ hour: at, solar: solarSample, cars });
    },
    [solarPts, shownCars, showSolar],
  );

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) =>
    select(e.clientX);

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
            <i className="h-2 w-3 rounded-sm bg-foreground" aria-hidden />
            solar
          </button>
          {carSeries.map((s) => {
            const colors = vehicleColors(s.vin);
            return (
              <button
                key={s.vin}
                type="button"
                aria-pressed={carShown(s.vin)}
                onClick={() =>
                  setHiddenCars((prev) => ({ ...prev, [s.vin]: !prev[s.vin] }))
                }
                className={chip(carShown(s.vin))}
              >
                <i
                  className="h-2 w-3 rounded-sm"
                  style={{
                    backgroundColor: isDark ? colors.dark : colors.light,
                  }}
                  aria-hidden
                />
                {vehicleName(s.vin)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Height is reserved whether or not a point is selected, so touching the
          chart never reflows the page under the reader's thumb. */}
      <div
        aria-live="polite"
        className="flex min-h-6 items-baseline gap-3 overflow-hidden whitespace-nowrap text-sm tabular-nums"
      >
        {selection ? (
          <>
            <span className="text-muted-foreground">
              {timeLabel(selection.hour)}
            </span>
            {selection.solar && (
              <span className="font-semibold">
                {Math.round(selection.solar.y).toLocaleString('en-US')} W
              </span>
            )}
            {selection.cars.map((c) => {
              const colors = vehicleColors(c.vin);
              return (
                <span
                  key={c.vin}
                  className="font-semibold"
                  style={{ color: isDark ? colors.dark : colors.light }}
                >
                  {vehicleName(c.vin)} {c.pt.y} A
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            touch the chart for values
          </span>
        )}
      </div>

      <div className="h-[260px] w-full touch-none select-none">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Solar production in watts and each car's charge current in amps, by hour"
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerCancel={() => select(null)}
        />
      </div>

      {solarPts.length === 0 && carSeries.length === 0 && (
        <p className="pt-2 text-center text-sm text-muted-foreground">
          No readings yet today — polling runs 9 AM–6 PM
        </p>
      )}

      <figcaption className="sr-only">
        Solar production in watts and each car&apos;s charge current in amps
        across today; legend chips toggle each series, touch or hover for
        values.
      </figcaption>
    </figure>
  );
}
