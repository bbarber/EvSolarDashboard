import { describe, expect, it } from 'vitest';
import { rangeAddedByVin } from '@/lib/data/range-added';
import { type RangeReadingRow } from '@/lib/data/types';

const row = (vin: string, minute: number, miles: number): RangeReadingRow => ({
  vin,
  reading_at: `2026-08-23T${String(10 + Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00Z`,
  miles,
});

describe('rangeAddedByVin', () => {
  it('sums a straightforward charge', () => {
    const added = rangeAddedByVin([
      row('A', 0, 100),
      row('A', 20, 120),
      row('A', 40, 145),
    ]);
    expect(added.get('A')).toBeCloseTo(45);
  });

  // The case a last-minus-first subtraction gets wrong: a car that charged 40 miles and then drove
  // 30 has still added 40, not 10.
  it('does not let driving cancel out charging', () => {
    const added = rangeAddedByVin([
      row('A', 0, 100),
      row('A', 20, 140), // charged 40
      row('A', 40, 110), // drove 30
    ]);
    expect(added.get('A')).toBeCloseTo(40);
  });

  // The reported figure drifts by a fraction as the pack warms; over an idle day that would
  // otherwise accumulate into a gain the car never made.
  it('ignores jitter below half a mile', () => {
    const added = rangeAddedByVin([
      row('A', 0, 200),
      row('A', 20, 200.3),
      row('A', 40, 200.1),
      row('A', 60, 200.4),
    ]);
    expect(added.has('A')).toBe(false);
  });

  it('keeps the cars apart', () => {
    const added = rangeAddedByVin([
      row('A', 0, 100),
      row('B', 0, 50),
      row('A', 20, 130),
      row('B', 20, 60),
    ]);
    expect(added.get('A')).toBeCloseTo(30);
    expect(added.get('B')).toBeCloseTo(10);
  });

  it('reports nothing for a car that only sat there', () => {
    expect(rangeAddedByVin([row('A', 0, 180)]).size).toBe(0);
    expect(rangeAddedByVin([]).size).toBe(0);
  });
});
