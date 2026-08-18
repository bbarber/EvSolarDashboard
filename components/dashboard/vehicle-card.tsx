import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTROLLER_TIME_ZONE, type VehicleStatusRow } from '@/lib/data/types';

const NICKNAMES: Record<string, string> = {
  '5YJ3E1EA3KF428848': 'Tessie',
  '7SAYGDEEXPA069171': 'Bessie',
};

function timeIn(tz: string, iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function VehicleCard({ vehicle }: { vehicle: VehicleStatusRow }) {
  const name = NICKNAMES[vehicle.vin] ?? vehicle.vin;
  const charging = vehicle.charging_state === 'Charging';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
        <div className="flex gap-1.5">
          <Badge variant={vehicle.online ? 'default' : 'secondary'}>
            {vehicle.online ? 'Online' : 'Asleep'}
          </Badge>
          {vehicle.at_home != null && (
            <Badge variant={vehicle.at_home ? 'default' : 'outline'}>
              {vehicle.at_home ? 'Home' : 'Away'}
            </Badge>
          )}
          {vehicle.fast_charger && <Badge variant="destructive">DC</Badge>}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
        <span className="text-muted-foreground">Battery</span>
        <span className="text-right font-medium">
          {vehicle.battery_level != null ? `${vehicle.battery_level}%` : '—'}
        </span>
        <span className="text-muted-foreground">State</span>
        <span className="text-right font-medium">{vehicle.charging_state}</span>
        <span className="text-muted-foreground">Drawing</span>
        <span className="text-right font-medium">
          {charging && vehicle.charge_amps != null
            ? `${vehicle.charge_amps} A`
            : '—'}
        </span>
        <span className="text-muted-foreground">Session</span>
        <span className="text-right font-medium">{vehicle.session}</span>
        <span className="text-muted-foreground">We last set</span>
        <span className="text-right font-medium">
          {vehicle.last_set_amps != null ? `${vehicle.last_set_amps} A` : '—'}
        </span>
        <span className="text-muted-foreground">Last heard</span>
        <span className="text-right font-medium">
          {timeIn(CONTROLLER_TIME_ZONE, vehicle.last_updated)}
        </span>
      </CardContent>
    </Card>
  );
}
