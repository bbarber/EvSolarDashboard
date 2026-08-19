import { Badge } from '@/components/ui/badge';
import {
  CONTROLLER_TIME_ZONE,
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

export function EventsList({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
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
      {events.map((e) => (
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
            {e.action && <span className="font-medium">{e.action}</span>}
            {e.reason && (
              <span className="text-muted-foreground"> — {e.reason}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
