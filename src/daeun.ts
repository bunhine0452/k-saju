// Luck pillars (대운 · 大運) — the 10-year cycles. Deterministic.
//   Rules (standard practice):
//   · Direction — yang year stem (甲丙戊庚壬): men forward, women reverse; yin stem: the
//     opposite. Gender 'N' follows the year-stem polarity alone (yang → forward).
//   · Pillars — walk the sexagenary cycle from the month pillar, +1 (forward) or −1
//     (reverse) per step, 8 pillars (80 years).
//   · Starting age (대운수) — days from birth to the next (forward) / previous (reverse)
//     month-boundary solar term, ÷ 3, rounded, clamped to 1–10.
//   ⚠ Minute-level term times exist for 2020–2030 only, so the term boundary is found at
//     day granularity by noon sampling: the first date whose noon month pillar changes.
//     A term falling after noon slides to the next day (≤ ±1 day), so the starting age can
//     differ from paper almanacs by up to ±1 year — daysToTerm is published for auditing.
import { calculateSaju, lunarToSolar } from '@fullstackfamily/manseryeok';
import type { BirthInput, DaeunInfo, DaeunPillar, Saju } from './types.js';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEMS, BRANCHES } from './maps.js';

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

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

  // Days to the governing term — day-granularity boundary (the date the month pillar changes).
  //  · If the library's day-granular month pillar differs from the chart's (term-day birth
  //    before the term time = solarTermAdjusted), the true boundary is the birth day itself → 0 days.
  const pillarAtBirth = monthPillarAt(y, m, d);
  let days = 0;
  if (pillarAtBirth === saju.month.hanja) {
    if (forward) {
      for (let n = 1; n <= MAX_WALK; n++) {
        const [ny, nm, nd] = addDays(y, m, d, n);
        if (monthPillarAt(ny, nm, nd) !== pillarAtBirth) { days = n; break; }
      }
    } else {
      for (let n = 1; n <= MAX_WALK; n++) {
        const [py, pm, pd] = addDays(y, m, d, -n);
        if (monthPillarAt(py, pm, pd) !== pillarAtBirth) { days = n - 1; break; }
      }
    }
  }
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
