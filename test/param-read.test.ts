// Parameter-read probes — every parameter the public API accepts must demonstrably
// reach the result.
//
// Why this file exists, separately from the correctness tests:
//
// 0.1.0 shipped a solar-term lookup that ignored its `year` argument and returned the
// 2026 table for every year. The regression guard for that lives in solar-terms.test.ts
// and is a *variance* assertion — "different inputs must produce different outputs".
// That assertion catches an argument ignored entirely, but it weakens as arity grows:
// a function of six fields passes it while reading only one of them. A lookup or cache
// keyed on a subset of its inputs, or a forgotten field in a spread, sails straight
// through — the output keeps changing, just not because of the parameter you dropped.
//
// The complement is one probe per parameter: hold everything else constant, vary the
// single field, require the output to move. A dropped field then fails exactly one test
// and names itself.
//
// Every assertion here states a *relationship*, never a value. That is deliberate: these
// need no astronomical ground truth, so they cannot be contaminated by fixtures derived
// from the engine they are testing. Whether the values are *right* is the job of
// solar-terms.test.ts, pillars.test.ts and tz.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSaju } from '../src/saju.js';
import { analyzeDaeun } from '../src/daeun.js';
import { analyzeElements } from '../src/elements.js';
import { analyzeSipseong, sipseongOf, sipseongOfElement, sipseongDetail } from '../src/sipseong.js';
import { iljuInfo, twelveStage } from '../src/ilju.js';
import type { BirthInput, Saju } from '../src/types.js';

/** Whole-chart fingerprint — any pillar moving is enough to prove the field was read. */
const fp = (s: Saju) => `${s.year.hanja}${s.month.hanja}${s.day.hanja}${s.hour?.hanja ?? '—'}`;

// ── BirthInput: one probe per field ──────────────────────────────────────────────

test('BirthInput.date is read', () => {
  const base = { time: '09:30', calendar: 'solar' } as const;
  assert.notEqual(
    fp(deriveSaju({ ...base, date: '2000-05-05' })),
    fp(deriveSaju({ ...base, date: '2000-05-06' })),
  );
});

test('BirthInput.time is read — and omitting it is not silently defaulted', () => {
  const base = { date: '2000-05-05', calendar: 'solar' } as const;
  // 09:30 and 13:30 sit in different two-hour branches.
  assert.notEqual(fp(deriveSaju({ ...base, time: '09:30' })), fp(deriveSaju({ ...base, time: '13:30' })));
  // An omitted time must produce a 3-pillar chart, not a chart secretly computed at some
  // default hour — the failure mode where a missing argument is replaced rather than honored.
  const unknown = deriveSaju(base);
  assert.equal(unknown.timeKnown, false);
  assert.equal(unknown.hour, null);
});

test('BirthInput.calendar is read — the same numerals mean different days', () => {
  const base = { date: '2020-04-15', time: '09:00' } as const;
  assert.notEqual(
    fp(deriveSaju({ ...base, calendar: 'solar' })),
    fp(deriveSaju({ ...base, calendar: 'lunar' })),
  );
});

test('BirthInput.isLeapMonth is read — 2020 had a leap 4th month', () => {
  const base = { date: '2020-04-15', time: '09:00', calendar: 'lunar' } as const;
  assert.notEqual(
    fp(deriveSaju({ ...base, isLeapMonth: false })),
    fp(deriveSaju({ ...base, isLeapMonth: true })),
  );
});

test('BirthInput.longitude is read — true solar time moves the hour boundary', () => {
  const base = { date: '2000-05-05', time: '09:30', calendar: 'solar' } as const;
  const seoul = deriveSaju({ ...base, longitude: 126.98 });
  const west = deriveSaju({ ...base, longitude: 124.7 }); // ~2.3° west — enough to cross 09:00
  assert.notEqual(seoul.hour?.hanja, west.hour?.hanja, 'longitude must move the hour pillar');
  // Supplying the field at all must switch modes away from the fixed-offset convention.
  assert.equal(deriveSaju(base).trueSolarApplied ?? false, false, 'omitted → classic manseryeok offset');
  assert.equal(seoul.trueSolarApplied, true, 'provided → true solar time');
  assert.notEqual(seoul.hourCorrectionMin, west.hourCorrectionMin);
});

test('BirthInput.tzOffsetMin is read — same wall clock, different absolute instant', () => {
  // 입춘 2024 = Feb 4, 17:26 KST. Read as KST, 04:00 is before it; read as New York
  // local time the same wall clock is KST 18:00 — after it. The year pillar must differ.
  const base = { date: '2024-02-04', time: '04:00', calendar: 'solar' } as const;
  assert.notEqual(
    deriveSaju(base).year.hanja,
    deriveSaju({ ...base, tzOffsetMin: -300 }).year.hanja,
    'tzOffsetMin must re-judge the solar-term boundary',
  );
});

// ── analyzeDaeun(birth, saju, gender): three parameters, three probes ─────────────

test('analyzeDaeun.gender is read — direction flips against the year stem', () => {
  const birth: BirthInput = { date: '1990-06-15', time: '08:30', calendar: 'solar' };
  const saju = deriveSaju(birth);
  const m = analyzeDaeun(birth, saju, 'M')!;
  const f = analyzeDaeun(birth, saju, 'F')!;
  assert.notEqual(m.direction, f.direction, 'M and F cannot share a direction for one year stem');
  assert.notEqual(m.pillars[0].ganji, f.pillars[0].ganji);
  // 'N' following 'M' is a documented rule, not a dropped argument — pinned so the
  // probe above can never be "satisfied" by gender collapsing to a single branch.
  assert.equal(analyzeDaeun(birth, saju, 'N')!.direction, m.direction);
});

test('analyzeDaeun reads both `birth` and `saju`, not just one of them', () => {
  const a: BirthInput = { date: '1990-06-15', time: '08:30', calendar: 'solar' };
  const b: BirthInput = { date: '1991-11-02', time: '08:30', calendar: 'solar' };
  const sa = deriveSaju(a);
  const sb = deriveSaju(b);

  // `saju` alone: same birth, a different chart must move the luck pillars. The pairing is
  // deliberately mismatched — that is the only way to isolate this parameter.
  assert.notEqual(analyzeDaeun(a, sa, 'M')!.pillars[0].ganji, analyzeDaeun(a, sb, 'M')!.pillars[0].ganji);

  // `birth` alone: same chart, a different birth instant must move the distance to the term.
  assert.notEqual(analyzeDaeun(a, sa, 'M')!.daysToTerm, analyzeDaeun(b, sa, 'M')!.daysToTerm);
});

test('analyzeDaeun reads BirthInput.time — the birth instant is not rounded to the day', () => {
  const saju = deriveSaju({ date: '1990-06-15', time: '08:30', calendar: 'solar' });
  const early = analyzeDaeun({ date: '1990-06-15', time: '00:10', calendar: 'solar' }, saju, 'M')!;
  const late = analyzeDaeun({ date: '1990-06-15', time: '23:50', calendar: 'solar' }, saju, 'M')!;
  assert.notEqual(early.daysToTerm, late.daysToTerm, 'hours within the birth day must count');
});

// ── Two-argument pure functions: vary one argument at a time ──────────────────────

test('sipseongOf reads both the day stem and the target stem', () => {
  assert.notEqual(sipseongOf('甲', '丙'), sipseongOf('丙', '丙'), 'day stem is read');
  assert.notEqual(sipseongOf('甲', '丙'), sipseongOf('甲', '庚'), 'target stem is read');
});

test('sipseongDetail reads the target stem down to its polarity', () => {
  // 丙 and 丁 are the same element; only yin/yang separates them. A detail function that
  // dropped polarity would still pass a category-level check.
  assert.notEqual(sipseongDetail('甲', '丙'), sipseongDetail('甲', '丁'), 'polarity is read');
  assert.notEqual(sipseongDetail('甲', '丙'), sipseongDetail('乙', '丙'), 'day stem polarity is read');
});

test('sipseongOfElement reads both the day stem and the element', () => {
  assert.notEqual(sipseongOfElement('甲', '火'), sipseongOfElement('甲', '金'), 'element is read');
  assert.notEqual(sipseongOfElement('甲', '火'), sipseongOfElement('庚', '火'), 'day stem is read');
});

test('twelveStage reads both the day stem and the branch', () => {
  assert.notEqual(twelveStage('甲', '子'), twelveStage('甲', '午'), 'branch is read');
  assert.notEqual(twelveStage('甲', '子'), twelveStage('庚', '子'), 'day stem is read');
});

// ── Single-argument analyzers: the classic variance check still applies ───────────

test('single-argument analyzers vary with their chart', () => {
  const a = deriveSaju({ date: '1990-06-15', time: '08:30', calendar: 'solar' });
  const b = deriveSaju({ date: '1975-01-20', time: '21:10', calendar: 'solar' });
  assert.notEqual(JSON.stringify(analyzeElements(a)), JSON.stringify(analyzeElements(b)));
  assert.notEqual(JSON.stringify(analyzeSipseong(a)), JSON.stringify(analyzeSipseong(b)));
  assert.notEqual(JSON.stringify(iljuInfo(a)), JSON.stringify(iljuInfo(b)));
});
