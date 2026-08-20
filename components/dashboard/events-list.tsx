import { Badge } from '@/components/ui/badge';
import {
  CONTROLLER_TIME_ZONE,
  VEHICLE_NICKNAMES,
  vehicleName,
  type EventRow,
} from '@/lib/data/types';

const KIND_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  decision: 'secondary',
  connectivity: 'outline',
  wake: 'default',
  command: 'default',
  error: 'destructive',
};

/**
 * VINs appear inside the controller's own sentences, which are written for a log
 * file. The car already has a name in the row beside them, so spell it there too
 * rather than making the reader match a 17-character string against a nickname.
 */
function humanize(text: string | null): string | null {
  if (!text) return text;
  let out = text;
  for (const [vin, name] of Object.entries(VEHICLE_NICKNAMES)) {
    out = out.split(vin).join(name);
  }
  return out;
}

/**
 * A decision and the command that carries it out are recorded separately and
 * share a sentence, so the feed showed each action two or three times over. Rank
 * kinds by what actually happened — a command is the event, the decision behind
 * it is the explanation — and keep one row per action.
 */
const KIND_RANK: Record<string, number> = {
  error: 4,
  command: 3,
  wake: 2,
  decision: 1,
  connectivity: 0,
};

const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

function dedupe(events: EventRow[]): EventRow[] {
  const kept: EventRow[] = [];
  for (const e of events) {
    const key = `${e.vin ?? ''}|${e.reason ?? e.action ?? ''}`;
    const twin = kept.find(
      (k) =>
        `${k.vin ?? ''}|${k.reason ?? k.action ?? ''}` === key &&
        Math.abs(new Date(k.at).getTime() - new Date(e.at).getTime()) <
          DEDUPE_WINDOW_MS,
    );
    if (!twin) {
      kept.push(e);
      continue;
    }
    // Same moment, same explanation: keep whichever row says more about what
    // happened, and prefer the earlier timestamp so ordering stays honest.
    if ((KIND_RANK[e.kind] ?? 0) > (KIND_RANK[twin.kind] ?? 0)) {
      kept[kept.indexOf(twin)] = { ...e, at: twin.at };
    }
  }
  return kept;
}

export function EventsList({ events }: { events: EventRow[] }) {
  const rows = dedupe(events);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened yet today.
      </p>
    );
  }

  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: CONTROLLER_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ul className="divide-y divide-border">
      {rows.map((e) => (
        <li key={e.id} className="flex items-baseline gap-3 py-2 text-sm">
          <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
            {time.format(new Date(e.at))}
          </span>
          <Badge variant={KIND_VARIANT[e.kind] ?? 'outline'}>{e.kind}</Badge>
          {e.vin && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {vehicleName(e.vin)}
            </span>
          )}
          <span className="min-w-0 break-words">
            {e.action && (
              <span className="font-medium">{humanize(e.action)}</span>
            )}
            {e.reason && (
              <span className="text-muted-foreground">
                {' '}
                — {humanize(e.reason)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
