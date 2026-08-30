// Solar-term instants — locks the astronomical computation against KASI-derived values, and
// guards against the 0.1.0 defect: the dataset's getSolarTermsByYear returned the 2026 table
// for every year 2020–2030, so "different years must have different instants" is itself a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSolarTermsByYear } from '@fullstackfamily/manseryeok';
import { solarTermsOfYear, jeolgiOfYear, SOLAR_TERM_YEAR_MIN, SOLAR_TERM_YEAR_MAX } from '../src/solar-terms.js';

const kstMin = (t: { year: number; month: number; day: number; hour: number; minute: number }) =>
  Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute) / 60_000;

test('solar terms — 2026: the 12 month-boundary terms match the dataset (KASI-derived) within 1 minute', () => {
  // 2026 is the one year the dataset is right for, so it validates the astronomical computation.
  const lib = (getSolarTermsByYear(2026) as Array<{ name: string; longitude: number; type: string; month: number; day: number; hour: number; minute: number }>)
    .filter((t) => t.type === 'jeolgi');
  const ours = jeolgiOfYear(2026);
  assert.equal(ours.length, 12);
  assert.equal(lib.length, 12);
  for (const l of lib) {
    const o = ours.find((t) => t.longitude === l.longitude);
    assert.ok(o, `${l.name} missing`);
    const diff = kstMin(o) - kstMin({ year: 2026, month: l.month, day: l.day, hour: l.hour, minute: l.minute });
    assert.ok(Math.abs(diff) <= 1, `${l.name}: ${diff} min off`);
  }
});

test('solar terms — real 입춘 instants: 2024 Feb 4 17:26 · 2025 Feb 3 23:10 · 2027 Feb 4 10:46 · 1990 Feb 4 11:13 (KST, ±1 min)', () => {
  const ip = (y: number) => jeolgiOfYear(y).find((t) => t.name === '입춘')!;
  const near = (t: ReturnType<typeof ip>, m: number, d: number, h: number, mi: number) =>
    Math.abs(kstMin(t) - Date.UTC(t.year, m - 1, d, h, mi) / 60_000) <= 1;
  assert.ok(near(ip(2024), 2, 4, 17, 26), `2024 입춘 ${JSON.stringify(ip(2024))}`);
  assert.ok(near(ip(2025), 2, 3, 23, 10), `2025 입춘 ${JSON.stringify(ip(2025))}`);
  assert.ok(near(ip(2027), 2, 4, 10, 46), `2027 입춘 ${JSON.stringify(ip(2027))}`);
  assert.ok(near(ip(1990), 2, 4, 11, 13), `1990 입춘 ${JSON.stringify(ip(1990))}`);
});

test('solar terms — different years give different instants (2026-table regression guard) · 1900–2050: 24 terms, sorted, 입춘 Feb 3–5', () => {
  const a = jeolgiOfYear(2024).map((t) => `${t.month}/${t.day} ${t.hour}:${t.minute}`).join(',');
  const b = jeolgiOfYear(2026).map((t) => `${t.month}/${t.day} ${t.hour}:${t.minute}`).join(',');
  assert.notEqual(a, b, '2024 and 2026 cannot share the same term instants');
  for (let y = SOLAR_TERM_YEAR_MIN; y <= SOLAR_TERM_YEAR_MAX; y += 1) {
    const all = solarTermsOfYear(y);
    assert.equal(all.length, 24, `${y}: 24 terms`);
    for (let i = 1; i < all.length; i += 1) assert.ok(all[i].utcMs > all[i - 1].utcMs, `${y}: sorted`);
    const ip = all.find((t) => t.name === '입춘')!;
    assert.ok(ip.month === 2 && ip.day >= 3 && ip.day <= 5, `${y} 입춘 ${ip.month}/${ip.day}`);
  }
  assert.deepEqual(solarTermsOfYear(1899), []);
  assert.deepEqual(solarTermsOfYear(2051), []);
});
