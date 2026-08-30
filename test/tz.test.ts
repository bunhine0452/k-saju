// Births outside KST (tzOffsetMin) — boundary tests.
// Principle: date/time are the birth-place wall clock. Solar terms (KST astronomical
// instants) are converted to local time to re-judge the year/month pillars; day/hour
// pillars follow the local date & time (local-time school).
// 입춘 2024 = Feb 4, 17:26 KST (corrected in 0.1.1 — the old 05:02 was the dataset's 2026 value)
// → New York (EST, −300) Feb 4, 03:26.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSaju } from '../src/saju.js';

const NY = { tzOffsetMin: -300, longitude: -74 }; // New York in February = EST (UTC−5)

test('tz — omitted tz keeps the classic KST behavior (golden-compatible)', () => {
  const a = deriveSaju({ date: '1995-07-15', time: '08:30', calendar: 'solar' });
  const b = deriveSaju({ date: '1995-07-15', time: '08:30', calendar: 'solar', tzOffsetMin: undefined });
  assert.equal(
    `${a.year.hanja}${a.month.hanja}${a.day.hanja}${a.hour?.hanja}`,
    `${b.year.hanja}${b.month.hanja}${b.day.hanja}${b.hour?.hanja}`,
  );
});

test('tz — New York 입춘 boundary: before local Feb 4 03:26 stays 癸卯, after flips 甲辰', () => {
  // Local Feb 3, 14:00 (= KST Feb 4, 04:00 — before the term) → 癸卯.
  // Here the dataset's day-granular judgment happens to agree.
  const before = deriveSaju({ date: '2024-02-03', time: '14:00', calendar: 'solar', ...NY });
  assert.equal(before.year.hanja, '癸卯', 'before the (locally converted) term → 癸卯 year');
  assert.equal(before.month.hanja, '乙丑', 'before the term → 丑 month');

  // Local Feb 3, 16:00 (= KST Feb 4, 06:00) is still before the true 입춘 (17:26) → still 癸卯.
  // (0.1.0 expected 甲辰 here — that expectation came from the wrong 05:02 instant.)
  const stillBefore = deriveSaju({ date: '2024-02-03', time: '16:00', calendar: 'solar', ...NY });
  assert.equal(stillBefore.year.hanja, '癸卯', 'KST 06:00 is before 입춘 17:26 → 癸卯 year');

  // Local Feb 4, 04:00 (= KST Feb 4, 18:00 — after the term) → 甲辰. The local date equals the
  // term date so the dataset also says 甲辰, but the judgment is made on absolute instants.
  const after = deriveSaju({ date: '2024-02-04', time: '04:00', calendar: 'solar', ...NY });
  assert.equal(after.year.hanja, '甲辰', 'after the (locally converted) term → 甲辰 year');
  assert.equal(after.month.hanja, '丙寅', 'after the term → 寅 month');

  // Day pillar follows the local date — equal to KST Feb 4's day pillar.
  const kstSameDate = deriveSaju({ date: '2024-02-04', time: '12:00', calendar: 'solar' });
  assert.equal(after.day.hanja, kstSameDate.day.hanja, 'day pillar follows the local date');
});

test('tz — the reverse direction (dataset flipped early) is corrected too', () => {
  // Local Feb 4, 00:30 (= KST Feb 4, 14:30 — before 입춘 17:26) → 癸卯. The local date (Feb 4)
  // equals the term date, so the dataset says 甲辰 by date — the absolute-instant comparison
  // must correct it back to 癸卯 (the branch this engine adds).
  const a = deriveSaju({ date: '2024-02-04', time: '00:30', calendar: 'solar', ...NY });
  assert.equal(a.year.hanja, '癸卯', 'New York early Feb 4 = KST afternoon before the term → 癸卯');
  assert.equal(a.solarTermAdjusted, true, 'solar-term adjustment flagged');
  // Sydney (February AEDT, +660): the term converts to local Feb 4, 19:26. Local Feb 4,
  // 06:00 (= KST Feb 4, 04:00 — before the term): the dataset flips by date (Feb 4) to 甲辰
  // but the truth is 癸卯 — corrected in the reverse direction.
  const syd = deriveSaju({ date: '2024-02-04', time: '06:00', calendar: 'solar', tzOffsetMin: 660, longitude: 151.2 });
  assert.equal(syd.year.hanja, '癸卯', 'Sydney before the local term → 癸卯');
  assert.equal(syd.solarTermAdjusted, true);
});

test('tz — hour pillar under true solar time (longitude · EoT · local offset)', () => {
  const s = deriveSaju({ date: '1995-07-15', time: '08:30', calendar: 'solar', ...NY });
  assert.equal(s.timeKnown, true);
  assert.equal(s.trueSolarApplied, true);
  // New York in July with the fixed EST offset used here: corr = −296+300+EoT(−6) ≈ −2 min
  // → 08:30 stays in 辰 (07:00–09:00).
  assert.equal(s.hour?.branch, '辰');
});
