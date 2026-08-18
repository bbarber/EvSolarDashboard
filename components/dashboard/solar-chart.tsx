import { CONTROLLER_TIME_ZONE, type SolarReadingRow } from '@/lib/data/today';

/**
 * Today's production as a server-rendered SVG — no client charting library for
 * a single series with at most 27 points. Colors ride the design system's
 * tokens so light and dark both work; the one meaningful hue is the primary.
 */
export function SolarChart({ readings }: { readings: SolarReadingRow[] }) {
  const W = 720;
  const H = 220;
  const M = { l: 44, r: 12, t: 12, b: 26 };
  const plotW = W - M.l - M.r;
  const plotH = H - M.t - M.b;

  const maxW = Math.max(4000, ...readings.map((r) => r.watts));
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

  const x = (hour: number) => M.l + (hour / 24) * plotW;
  const y = (watts: number) => M.t + plotH - (watts / maxW) * plotH;

  const points = readings.map((r) => ({ h: hourOf(r.reading_at), w: r.watts }));
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.h).toFixed(1)} ${y(p.w).toFixed(1)}`)
    .join(' ');
  const area =
    points.length > 0
      ? `${line} L ${x(points[points.length - 1].h).toFixed(1)} ${y(0)} L ${x(points[0].h).toFixed(1)} ${y(0)} Z`
      : '';

  const gridWatts = [0, 1000, 2000, 3000, 4000].filter((v) => v <= maxW);

  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Solar production today, watts by hour"
        className="min-w-[560px] text-muted-foreground"
      >
        {/* polling window band */}
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
              {v >= 1000 ? `${v / 1000}k` : v}
            </text>
          </g>
        ))}
        {[0, 6, 9, 12, 15, 18, 24].map((h) => (
          <text
            key={h}
            x={x(h)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
          >
            {String(h).padStart(2, '0')}:00
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
        {points.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            No readings yet today — polling runs 09:00–18:00
          </text>
        )}
      </svg>
      <figcaption className="sr-only">
        Solar production in watts across today, shaded where the controller polls.
      </figcaption>
    </figure>
  );
}
