// Luck pillars (대운) — direction (year-stem polarity × gender), sexagenary walk, and
// starting age (days to term ÷ 3, day-granular: the calendar dataset's month-pillar change).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDaeun } from '../src/daeun.js';
import { deriveSaju } from '../src/saju.js';
import { jeolgiOfYear } from '../src/solar-terms.js';

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

test('starting age — 2024-03-10: day-granular term boundary of the calendar dataset (±1 day vs the instant)', () => {
  // The starting age walks the dataset's noon month pillar, not the astronomical instants
  // (that would change these locked values — a separate change). Both are shown here so the
  // ±1-day caveat is visible:
  //   경칩 2024 = Mar 5 11:22 KST, the dataset changes the month pillar on Mar 6 → 4 days back.
  //   청명 2024 = Apr 4 16:02 KST, the dataset changes the month pillar on Apr 5 → 26 days ahead.
  // (0.1.0 "cross-checked" these against the dataset's term table, which was the 2026 table —
  //  경칩 Mar 5 22:58 / 청명 Apr 5 03:39 — and matched by coincidence.)
  const terms = jeolgiOfYear(2024);
  const gyeongchip = terms.find((t) => t.name === '경칩')!;
  const cheongmyeong = terms.find((t) => t.name === '청명')!;
  assert.equal(`${gyeongchip.month}/${gyeongchip.day} ${gyeongchip.hour}:${gyeongchip.minute}`, '3/5 11:22');
  assert.equal(`${cheongmyeong.month}/${cheongmyeong.day} ${cheongmyeong.hour}:${cheongmyeong.minute}`, '4/4 16:2');

  const saju = deriveSaju(birth2024);
  assert.equal(saju.month.hanja, '丁卯');
  const m = analyzeDaeun(birth2024, saju, 'M')!; // forward: Mar 10 → Apr 5
  assert.equal(m.daysToTerm, 26);
  assert.equal(m.daeunsu, 9);
  const f = analyzeDaeun(birth2024, saju, 'F')!; // reverse: Mar 6 → Mar 10
  assert.equal(f.daysToTerm, 4);
  assert.equal(f.daeunsu, 1);
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
