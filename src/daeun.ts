// Luck pillars (대운 · 大運) — the 10-year cycles. Deterministic.
//   Rules (standard practice):
//   · Direction — yang year stem (甲丙戊庚壬): men forward, women reverse; yin stem: the
//     opposite. Gender 'N' follows the year-stem polarity alone (yang → forward).
//   · Pillars — walk the sexagenary cycle from the month pillar, +1 (forward) or −1
//     (reverse) per step, 8 pillars (80 years).
//   · Starting age (대운수) — days from birth to the next (forward) / previous (reverse)
//     month-boundary solar term, ÷ 3, rounded, clamped to 1–10.
//   Days to the term are measured against the astronomical term instants (solar-terms.ts):
//   forward = ceil(days until the next term) — a started day counts; reverse = floor(days
//   since the previous term) — only full days count. Unknown time → noon. These integer
//   conventions reproduce the classic "effective term day" almanac values wherever the
//   calendar dataset's day table is right, and fix the terms where it is a day late.
//   ⚠ 0.1.1 walked that table by noon sampling instead: at 경칩 2024 (Mar 5 11:22 KST) the
//     table flips on Mar 6, so the day count was off by one there, and a birth whose pillars
//     already disagreed with the table collapsed to 0 days. The walk is now only the fallback
//     outside 1900–2050. Schools still differ by ±1 year on where a luck pillar begins —
//     daysToTerm is published so the division is auditable.
import { calculateSaju, lunarToSolar } from '@fullstackfamily/manseryeok';
import { jeolgiOfYear } from './solar-terms.js';
import type { BirthInput, DaeunInfo, DaeunPillar, Saju } from './types.js';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEMS, BRANCHES } from './maps.js';

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);
const KST_OFFSET_MIN = 540;
const DAY_MS = 86_400_000;

// Sexagenary index (甲子 = 0); −1 when invalid.
function ganjiIndex(ganji: string): number {
  for (let i = 0; i < 60; i++) {
    if (STEMS[i % 10] + BRANCHES[i % 12] === ganji) return i;
  }
  return -1;
}
function ganjiAt(i: number): string {
  const n = ((i % 60) + 60) % 60;
  return STEMS[n % 10] + BRANCHES[n % 12];
}

function addDays(y: number, m: number, d: number, n: number): [number, number, number] {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

function monthPillarAt(y: number, m: number, d: number): string {
  return calculateSaju(y, m, d, 12, 0).monthPillarHanja;
}

const MAX_WALK = 35; // solar terms are ~30 days apart — a boundary must appear within 35 days

/**
 * Days from birth to the governing term, from the astronomical instants. Returns null when the
 * term range does not cover the birth year (±1 year needed for the neighbouring terms).
 */
function daysToTermFromInstants(birthAbsMs: number, y: number, forward: boolean): number | null {
  const terms = [...jeolgiOfYear(y - 1), ...jeolgiOfYear(y), ...jeolgiOfYear(y + 1)];
  if (terms.length < 24) return null;
  if (forward) {
    const next = terms.find((t) => t.utcMs > birthAbsMs);
    return next ? Math.ceil((next.utcMs - birthAbsMs) / DAY_MS) : 0;
  }
  const prev = [...terms].reverse().find((t) => t.utcMs <= birthAbsMs);
  return prev ? Math.floor((birthAbsMs - prev.utcMs) / DAY_MS) : 0;
}

/** Fallback outside the solar-term range: walk the dataset's noon month pillar (day granularity). */
function daysToTermByWalk(y: number, m: number, d: number, monthPillar: string, forward: boolean): number {
  // If the dataset's day-granular month pillar differs from the chart's, the boundary is the
  // birth day itself → 0 days.
  const pillarAtBirth = monthPillarAt(y, m, d);
  if (pillarAtBirth !== monthPillar) return 0;
  for (let n = 1; n <= MAX_WALK; n++) {
    const [ny, nm, nd] = addDays(y, m, d, forward ? n : -n);
    if (monthPillarAt(ny, nm, nd) !== pillarAtBirth) return forward ? n : n - 1;
  }
  return 0;
}

/**
 * Luck pillars from birth date (solar/lunar), chart (year stem + month pillar), and gender.
 * Returns null when the year stem / month pillar is invalid (defensive; unreachable in
 * normal use).
 */
export function analyzeDaeun(birth: BirthInput, saju: Saju, gender: 'M' | 'F' | 'N'): DaeunInfo | null {
  const monthIdx = ganjiIndex(saju.month.hanja);
  if (monthIdx < 0 || !saju.year.stem) return null;

  let [y, m, d] = birth.date.split('-').map(Number);
  if (birth.calendar === 'lunar') {
    try {
      const s = lunarToSolar(y, m, d, birth.isLeapMonth ?? false).solar;
      y = s.year; m = s.month; d = s.day;
    } catch {
      return null;
    }
  }

  const yang = YANG_STEMS.has(saju.year.stem);
  const forward = gender === 'F' ? !yang : yang; // M and N: yang → forward

  // Birth as an absolute instant (local wall clock − tz offset; unknown time → noon).
  const [hh, mi] = birth.time && /^\d{2}:\d{2}$/.test(birth.time) ? birth.time.split(':').map(Number) : [12, 0];
  const birthAbsMs = Date.UTC(y, m - 1, d, hh, mi) - (birth.tzOffsetMin ?? KST_OFFSET_MIN) * 60_000;
  const days = daysToTermFromInstants(birthAbsMs, y, forward) ?? daysToTermByWalk(y, m, d, saju.month.hanja, forward);
  const daeunsu = Math.max(1, Math.min(10, Math.round(days / 3)));

  const pillars: DaeunPillar[] = Array.from({ length: 8 }, (_, i) => {
    const ganji = ganjiAt(monthIdx + (forward ? i + 1 : -(i + 1)));
    return {
      order: i + 1,
      startAge: daeunsu + 10 * i,
      ganji,
      stem: ganji[0],
      branch: ganji[1],
      stemElement: STEM_ELEMENT[ganji[0]],
      branchElement: BRANCH_ELEMENT[ganji[1]],
    };
  });

  return { direction: forward ? '순행' : '역행', daeunsu, daysToTerm: days, pillars };
}
