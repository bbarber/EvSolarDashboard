import { CONTROLLER_TIME_ZONE } from '@/lib/data/types';
import { shiftDay } from '@/lib/data/today';
import Link from 'next/link';

/**
 * Steps the dashboard back and forth a day at a time.
 *
 * Plain links rather than a date picker or client state: the day already lives
 * in the URL, so each arrow is a normal navigation that can be shared, opened
 * in a new tab, and reached by the browser's own back button.
 */
export function DayNav({ day, today }: { day: string; today: string }) {
  const label =
    day === today
      ? 'Solar today'
      : new Intl.DateTimeFormat('en-US', {
          timeZone: CONTROLLER_TIME_ZONE,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(new Date(`${day}T12:00:00Z`));

  const prev = shiftDay(day, -1);
  const next = shiftDay(day, 1);
  const atToday = day === today;

  const arrow =
    'flex h-7 w-7 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <span className="flex items-center gap-2">
      <Link
        href={`/?d=${prev}`}
        aria-label={`Previous day, ${prev}`}
        className={arrow}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M10 3 5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <span className="min-w-0">{label}</span>

      {atToday ? (
        // No next day exists, so the control is present but inert rather than
        // vanishing and shifting the header.
        <span aria-hidden className={`${arrow} pointer-events-none opacity-30`}>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <Link
          href={next === today ? '/' : `/?d=${next}`}
          aria-label={`Next day, ${next}`}
          className={arrow}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M6 3l5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
    </span>
  );
}
