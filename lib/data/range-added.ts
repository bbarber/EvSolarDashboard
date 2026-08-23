import { type RangeReadingRow } from '@/lib/data/types';

/**
 * How much rated range a day's charging added, per car.
 *
 * Sums only the increases. A plain last-minus-first would be wrong for any day the car was also
 * driven: range falls while driving, and the subtraction would quietly net the driving off against
 * the charging, reporting a car that gained 40 miles and spent 30 as if it had gained 10.
 *
 * The figure carries the car's own display unit. Nothing here converts, because nothing here knows
 * whether the car is set to miles or kilometres.
 */
export function rangeAddedByVin(
  ranges: RangeReadingRow[],
): Map<string, number> {
  const byVin = new Map<string, RangeReadingRow[]>();
  for (const r of ranges) {
    const rows = byVin.get(r.vin);
    if (rows) rows.push(r);
    else byVin.set(r.vin, [r]);
  }

  const added = new Map<string, number>();
  for (const [vin, rows] of byVin) {
    rows.sort((a, b) => a.reading_at.localeCompare(b.reading_at));
    let total = 0;
    for (let i = 1; i < rows.length; i++) {
      const delta = rows[i].miles - rows[i - 1].miles;
      // Only gains, and only real ones: the reported figure jitters by a mile or so as the pack
      // warms, which would otherwise accumulate into a phantom gain over a long idle day.
      if (delta > 0.5) total += delta;
    }
    if (total > 0) added.set(vin, total);
  }
  return added;
}
