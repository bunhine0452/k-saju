// Golden tests — boundary cases locked against verified almanac (만세력) values.
// These encode the four traps most calculators get wrong; see README "Why this exists".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSaju } from '../src/saju.js';

const sj = (date: string, time: string | undefined, calendar: 'solar' | 'lunar', leap = false) =>
  deriveSaju({ date, time, calendar, isLeapMonth: leap });
const pillars = (s: ReturnType<typeof deriveSaju>) =>
  `${s.year.hanja}${s.month.hanja}${s.day.hanja}${s.hour?.hanja ?? ''}`;

// ── 1. Solar-term boundary: 입춘 (start of spring) 2024 = Feb 4, 05:02 KST.
//      The year AND month pillars flip at that minute — not at midnight.
test('solar-term boundary (입춘) — year/month pillars flip at the exact minute', () => {
  const before = sj('2024-02-04', '04:00', 'solar'); // before the term
  const justBefore = sj('2024-02-04', '05:01', 'solar'); // 1 minute before
  const after = sj('2024-02-04', '05:03', 'solar'); // just after
  assert.equal(before.year.hanja, '癸卯', 'before the term the year pillar is still 癸卯 (2023)');
  assert.equal(before.month.hanja, '乙丑', 'before the term the month pillar is 乙丑');
  assert.equal(before.solarTermAdjusted, true);
  assert.equal(justBefore.year.hanja, '癸卯', 'one minute before: still 癸卯');
  assert.equal(after.year.hanja, '甲辰', 'right after: 甲辰 (2024)');
  assert.equal(after.month.hanja, '丙寅', 'right after: month 丙寅');
  // The day pillar ignores solar terms — same 戊戌 all day.
  assert.equal(before.day.hanja, '戊戌');
  assert.equal(after.day.hanja, '戊戌');
});

// ── 2. Midnight (자시) boundary under the standard −30 min correction: 子 starts 23:30.
//      Late 子 (야자시, 23:30–23:59): day pillar stays, hour stem uses the next day's stem.
test('자시 boundary — hour pillar at corrected 23:30, day pillar at clock midnight', () => {
  const a = sj('2000-05-15', '23:29', 'solar');
  const b = sj('2000-05-15', '23:31', 'solar');
  const c = sj('2000-05-16', '00:30', 'solar');
  // 23:29 — end of 亥 (21:30–23:29) → hour 癸亥, day stays 癸酉.
  assert.equal(a.day.hanja, '癸酉');
  assert.equal(a.hour?.hanja, '癸亥', '23:29 → end of 亥');
  // 23:31 — late 子: day pillar unchanged, hour pillar from the NEXT day stem (甲) → 甲子.
  assert.equal(b.day.hanja, '癸酉', 'late 子 — day pillar keeps the clock date');
  assert.equal(b.hour?.hanja, '甲子', '23:31 → late 子 (next-day stem 甲子)');
  // 00:30 next day — day pillar flips, early 子 甲子.
  assert.equal(c.day.hanja, '甲戌', 'day pillar flips after midnight');
  assert.equal(c.hour?.hanja, '甲子', '00:30 → early 子');
  // Hour-branch boundary lock: 巳 = 09:30–11:29 (matches reference almanacs).
  assert.equal(sj('2000-05-05', '09:29', 'solar').hour?.hanja, '丙辰', '09:29 → end of 辰');
  assert.equal(sj('2000-05-05', '09:30', 'solar').hour?.hanja, '丁巳', '09:30 → start of 巳');
  assert.equal(sj('2000-05-05', '11:29', 'solar').hour?.hanja, '丁巳', '11:29 → end of 巳');
  assert.equal(sj('2000-05-05', '11:30', 'solar').hour?.hanja, '戊午', '11:30 → start of 午');
});

// ── 2b. True solar time: without longitude → standard (legacy) −30 min;
//       with longitude → (lon − 135)×4 + equation of time. 2000-05-05 09:30 sits on the
//       辰/巳 boundary in true solar time, so the birth longitude decides the hour pillar.
test('true solar time — birth longitude splits the hour pillar (EoT included)', () => {
  const at = (lon?: number) => deriveSaju({ date: '2000-05-05', time: '09:30', calendar: 'solar', longitude: lon });
  assert.equal(at(undefined).hour?.hanja, '丁巳', 'no longitude (standard manseryeok) → 丁巳');
  assert.equal(at(undefined).trueSolarApplied, false, 'no longitude → true solar not applied');
  assert.equal(at(126.98).hour?.hanja, '丁巳', 'Seoul (east) → 巳 hour 丁巳');
  assert.equal(at(129.08).hour?.hanja, '丁巳', 'Busan (east) → 巳 hour 丁巳');
  assert.equal(at(124.7).hour?.hanja, '丙辰', 'Baengnyeong Island (west) → 辰 hour 丙辰');
  assert.equal(at(126.98).trueSolarApplied, true, 'longitude given → true solar applied');
  assert.equal(at(126.98).hourCorrectionMin, -29, 'Seoul 09:30 correction ≈ −29 min');
});

// ── 3. Leap month: lunar leap vs regular month resolve to different Gregorian dates & pillars.
test('leap month — lunar 윤4월 vs regular 4월', () => {
  const leap = sj('2020-04-15', '09:00', 'lunar', true); // 2020 leap 4/15 → Jun 6
  const normal = sj('2020-04-15', '09:00', 'lunar', false); // regular 4/15 → May 7
  assert.equal(leap.year.hanja, '庚子');
  assert.equal(leap.month.hanja, '壬午', 'leap 4th month = 壬午 (午 month)');
  assert.equal(normal.month.hanja, '辛巳', 'regular 4th month = 辛巳 (巳 month)');
  assert.notEqual(leap.day.hanja, normal.day.hanja, 'leap flag changes the day pillar');
});

// ── 4. Unknown time: 3 pillars, hour null, no errors.
test('unknown birth time — clean 3-pillar chart', () => {
  const s = sj('1995-03-20', undefined, 'solar');
  assert.equal(s.timeKnown, false);
  assert.equal(s.hour, null);
  assert.equal(pillars(s), '乙亥己卯庚戌', '3-pillar ganji');
});
