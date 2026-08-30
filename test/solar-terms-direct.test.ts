// Year & month pillars computed from the solar-term instants (0.1.2) — regression guard for the
// day-lag defect: the calendar dataset's day-level month table switches months on the day AFTER
// the astronomical instant at many terms (경칩 2024 = Mar 5 11:22 KST → table flips Mar 6), so a
// birth after the instant but before the table's flip kept the old month. Expected values are
// derived from the KASI-grade term instants in src/solar-terms.ts and the standard rules
// (year = 입춘 boundary, month = last term passed + five-tigers stem).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSaju } from '@fullstackfamily/manseryeok';
import { deriveSaju } from '../src/saju.js';
import { analyzeDaeun } from '../src/daeun.js';
import { jeolgiOfYear } from '../src/solar-terms.js';
import type { BirthInput } from '../src/types.js';

const sj = (date: string, time: string | undefined, extra: Partial<BirthInput> = {}) =>
  deriveSaju({ date, time, calendar: 'solar', ...extra });
const ym = (s: ReturnType<typeof deriveSaju>) => `${s.year.hanja} ${s.month.hanja}`;

test('direct — after the term instant the new month applies, even where the dataset flips a day late', () => {
  // 경칩 2024 = Mar 5 11:22 KST; the dataset switches 寅 → 卯 on Mar 6.
  assert.equal(ym(sj('2024-03-05', '12:00')), '甲辰 丁卯', 'after 경칩 → 卯 month');
  assert.equal(ym(sj('2024-03-05', '11:00')), '甲辰 丙寅', 'before 경칩 → still 寅 month');
  // 입동 2024 = Nov 7 07:19 KST; the dataset switches 戌 → 亥 on Nov 8.
  assert.equal(ym(sj('2024-11-07', '12:00')), '甲辰 乙亥', 'after 입동 → 亥 month');
  // 입춘 2025 = Feb 3 23:10 KST; the dataset switches year and month on Feb 4.
  assert.equal(ym(sj('2025-02-03', '23:30')), '乙巳 戊寅', 'after 입춘 → 乙巳 year, 寅 month');
  assert.equal(ym(sj('2025-02-03', '22:30')), '甲辰 丁丑', 'before 입춘 → 甲辰 year, 丑 month');
  // The flag reports disagreement with the dataset's day-granular value — nothing more.
  const lib = calculateSaju(2024, 3, 5, 12, 0).monthPillarHanja;
  assert.equal(sj('2024-03-05', '12:00').solarTermAdjusted, lib !== '丁卯');
  assert.equal(sj('2024-03-05', '12:00').day.hanja, calculateSaju(2024, 3, 5, 12, 0).dayPillarHanja, 'day pillar stays the dataset\'s');
});

test('direct — foreign births compare the local wall clock as an absolute instant', () => {
  const ny = { tzOffsetMin: -300, longitude: -74 };
  assert.equal(ym(sj('2025-02-03', '10:00', ny)), '乙巳 戊寅', 'New York Feb 3 10:00 EST = KST Feb 4 00:00 → after 입춘 (23:10)');
  assert.equal(ym(sj('2025-02-03', '08:00', ny)), '甲辰 丁丑', 'New York Feb 3 08:00 EST = KST Feb 3 22:00 → before 입춘');
});

test('direct — early January: between the previous year\'s 대설 and 소한, the year is still the previous one', () => {
  assert.equal(ym(sj('2025-01-03', '12:00')), '甲辰 丙子', 'before 소한 (Jan 5) → 甲辰 year, 子 month');
  assert.equal(ym(sj('2025-01-10', '12:00')), '甲辰 丁丑', 'after 소한 → 甲辰 year, 丑 month');
  assert.equal(ym(sj('2024-12-31', '23:00')), '甲辰 丙子');
});

test('direct — unknown time is judged at noon: a term before noon gives the new month, after noon the old one', () => {
  assert.equal(sj('2024-03-05', undefined).month.hanja, '丁卯', '경칩 11:22 < noon → 卯 month');
  assert.equal(sj('2024-02-04', undefined).year.hanja, '癸卯', '입춘 17:26 > noon → still 癸卯 year');
  assert.equal(sj('2024-03-05', undefined).timeKnown, false);
});

test('direct — starting age (대운수) from the term instants: forward ceil, reverse floor', () => {
  // 1995-03-16 07:30 — 乙亥 year (yin stem): men reverse, women forward.
  //   forward → 청명 1995 = Apr 5 15:07 KST: 20 d 7 h 37 m away → ceil → 21 days → 7.
  //   reverse → 경칩 1995 = Mar 6 10:16 KST: 9 d 21 h 14 m ago → floor → 9 days → 3.
  const birth: BirthInput = { date: '1995-03-16', time: '07:30', calendar: 'solar' };
  const s = deriveSaju(birth);
  const m = analyzeDaeun(birth, s, 'M');
  const f = analyzeDaeun(birth, s, 'F');
  assert.ok(m && f);
  assert.equal(m.direction, '역행');
  assert.equal(f.direction, '순행');
  assert.equal(f.daysToTerm, 21, '20 days 7 h to 청명 → ceil 21');
  assert.equal(f.daeunsu, 7);
  assert.equal(m.daysToTerm, 9, '9 days 21 h since 경칩 → floor 9');
  assert.equal(m.daeunsu, 3);
});

test('direct — outside the solar-term range the dataset\'s pillars are kept (no adjustment flag)', () => {
  // 1900 needs the 1899 terms for its January — outside the astronomical range → dataset fallback.
  const s = sj('1900-06-15', '12:00');
  const lib = calculateSaju(1900, 6, 15, 12, 0);
  assert.equal(ym(s), `${lib.yearPillarHanja} ${lib.monthPillarHanja}`);
  assert.equal(s.solarTermAdjusted, false);
});

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

test('direct — away from the boundaries the dataset and the instant computation agree (1905–2049, ±36 h excluded)', () => {
  // Cross-check: every day at noon KST, skipping days within 36 h of a month-boundary term
  // (the dataset's lag is ≤ 1 day) and Dec 31 (the dataset's own defect — next test). Zero
  // mismatches means the direct computation changes nothing except the days it was written to fix.
  const WINDOW_MS = 36 * 3_600_000;
  const KST_MS = 9 * 3_600_000;
  let sampled = 0;
  const mismatches: string[] = [];
  for (let y = 1905; y <= 2049; y += 1) {
    const terms = [...jeolgiOfYear(y - 1), ...jeolgiOfYear(y), ...jeolgiOfYear(y + 1)];
    for (let m = 1; m <= 12; m += 1) {
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= daysInMonth; d += 1) {
        if (m === 12 && d === 31) continue;
        const noonAbs = Date.UTC(y, m - 1, d, 12, 0) - KST_MS;
        if (terms.some((t) => Math.abs(t.utcMs - noonAbs) <= WINDOW_MS)) continue;
        sampled += 1;
        const lib = calculateSaju(y, m, d, 12, 0);
        const ours = deriveSaju({ date: ymd(y, m, d), time: '12:00', calendar: 'solar' });
        if (ours.year.hanja !== lib.yearPillarHanja || ours.month.hanja !== lib.monthPillarHanja || ours.solarTermAdjusted) {
          mismatches.push(`${ymd(y, m, d)}: ours ${ours.year.hanja} ${ours.month.hanja} / dataset ${lib.yearPillarHanja} ${lib.monthPillarHanja}`);
        }
      }
    }
  }
  assert.ok(sampled > 40_000, `sample is large (${sampled})`);
  assert.deepEqual(mismatches.slice(0, 10), [], `${mismatches.length} mismatches of ${sampled}`);
});

test('direct — Dec 31: the dataset\'s year/month pillars are corrupt in 12 years; ours carry Dec 30 forward', () => {
  // Found by the sweep above. @fullstackfamily/manseryeok 1.0.8 returns a wrong year stem on
  // Dec 31 of these years (e.g. 1908-12-31 → 壬申 壬子; Dec 30 is 戊申 甲子 and no term falls on
  // Dec 31, so nothing can change). 1956-12-31 throws "Invalid solar date" outright — a hole in
  // the dataset that also stops deriveSaju (the day pillar still comes from the dataset). The
  // direct computation sidesteps the corruption because it no longer reads those pillars.
  // The list is locked against dataset 1.0.8 — if an upstream release fixes it, shorten it.
  const DATASET_HOLE = 1956;
  const datasetWrong: number[] = [];
  for (let y = 1905; y <= 2049; y += 1) {
    if (y === DATASET_HOLE) {
      assert.throws(() => calculateSaju(y, 12, 31, 12, 0), /Invalid solar date/);
      continue;
    }
    const dec30 = deriveSaju({ date: ymd(y, 12, 30), time: '12:00', calendar: 'solar' });
    const dec31 = deriveSaju({ date: ymd(y, 12, 31), time: '12:00', calendar: 'solar' });
    assert.equal(ym(dec31), ym(dec30), `${y}: Dec 31 must carry Dec 30's year/month pillars`);
    const lib = calculateSaju(y, 12, 31, 12, 0);
    if (lib.yearPillarHanja !== dec31.year.hanja || lib.monthPillarHanja !== dec31.month.hanja) datasetWrong.push(y);
    assert.equal(dec31.solarTermAdjusted, datasetWrong.includes(y), `${y}: flag mirrors the dataset disagreement`);
  }
  assert.deepEqual(datasetWrong, [1908, 1912, 1948, 1949, 1950, 1951, 1955, 1957, 1958, 1959, 1960, 1961]);
});
