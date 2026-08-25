// Luck pillars (대운) — direction (year-stem polarity × gender), sexagenary walk, and
// starting age (days to term ÷ 3). 2020–2030 cross-checked against the library's term table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSolarTermsByYear } from '@fullstackfamily/manseryeok';
import { analyzeDaeun } from '../src/daeun.js';
import { deriveSaju } from '../src/saju.js';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
function ganjiIndex(g: string): number {
  for (let i = 0; i < 60; i++) if (STEMS[i % 10] + BRANCHES[i % 12] === g) return i;
  return -1;
}

const birth2024 = { date: '2024-03-10', time: '10:00', calendar: 'solar' as const };

test('direction — 甲辰 year (yang stem): men forward, women reverse; first pillar = month ±1', () => {
  const saju = deriveSaju(birth2024);
  assert.equal(saju.year.stem, '甲'); // 2024 = 甲辰, yang stem
  const m = analyzeDaeun(birth2024, saju, 'M')!;
  const f = analyzeDaeun(birth2024, saju, 'F')!;
  assert.equal(m.direction, '순행');
  assert.equal(f.direction, '역행');
  const mi = ganjiIndex(saju.month.hanja);
  assert.equal(ganjiIndex(m.pillars[0].ganji), (mi + 1) % 60);
  assert.equal(ganjiIndex(f.pillars[0].ganji), (mi + 59) % 60);
});

test('starting age — cross-checked against the 2024 term table (noon-sampling convention)', () => {
  const saju = deriveSaju(birth2024);
  const terms = (getSolarTermsByYear(2024) as Array<{ type: string; month: number; day: number; hour: number }>)
    .filter((t) => t.type === 'jeolgi');
  // Effective term day = next day when the term time is past noon (same convention as
  // the engine's noon sampling).
  const effectiveUtc = (t: { month: number; day: number; hour: number }) =>
    Date.UTC(2024, t.month - 1, t.day) + (t.hour >= 12 ? 86_400_000 : 0);
  const birthUtc = Date.UTC(2024, 2, 10);
  // Forward (M): days to the first term after Mar 10 (청명 Apr 5 03:39 → effective Apr 5).
  const next = terms.find((t) => effectiveUtc(t) > birthUtc)!;
  const daysF = Math.round((effectiveUtc(next) - birthUtc) / 86_400_000);
  const m = analyzeDaeun(birth2024, saju, 'M')!;
  assert.equal(m.daysToTerm, daysF);
  assert.equal(m.daeunsu, Math.max(1, Math.min(10, Math.round(daysF / 3))));
  // Reverse (F): days from the previous term (경칩 Mar 5 22:58 → effective Mar 6) to Mar 10.
  const prev = [...terms].reverse().find((t) => effectiveUtc(t) <= birthUtc)!;
  const daysB = Math.round((birthUtc - effectiveUtc(prev)) / 86_400_000);
  const f = analyzeDaeun(birth2024, saju, 'F')!;
  assert.equal(f.daysToTerm, daysB);
  assert.equal(f.daeunsu, Math.max(1, Math.min(10, Math.round(daysB / 3))));
});

test('properties — 8 pillars · 10-year gaps · sexagenary continuity · determinism · out-of-range year (1985)', () => {
  for (const [birth, gender] of [
    [birth2024, 'M'],
    [{ date: '1985-07-01', calendar: 'solar' as const }, 'F'],
    [{ date: '1955-01-06', time: '02:00', calendar: 'solar' as const }, 'N'],
  ] as const) {
    const saju = deriveSaju(birth);
    const a = analyzeDaeun(birth, saju, gender)!;
    assert.ok(a, `${birth.date} luck pillars null`);
    assert.equal(a.pillars.length, 8);
    assert.ok(a.daeunsu >= 1 && a.daeunsu <= 10);
    const dir = a.direction === '순행' ? 1 : -1;
    a.pillars.forEach((p, i) => {
      assert.equal(p.startAge, a.daeunsu + 10 * i);
      assert.equal(ganjiIndex(p.ganji), (((ganjiIndex(saju.month.hanja) + dir * (i + 1)) % 60) + 60) % 60);
      assert.ok(p.stemElement && p.branchElement);
    });
    // Determinism — same input, same output.
    assert.deepEqual(analyzeDaeun(birth, saju, gender), a);
  }
});

test('lunar input converts to Gregorian, then the same rules apply', () => {
  const lunar = { date: '1990-04-21', calendar: 'lunar' as const };
  const saju = deriveSaju(lunar);
  const a = analyzeDaeun(lunar, saju, 'M');
  assert.ok(a);
  assert.equal(a!.pillars.length, 8);
});
