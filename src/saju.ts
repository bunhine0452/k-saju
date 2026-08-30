// Manseryeok (만세력) → four pillars, with the boundary corrections most calculators skip.
// Calendar dataset: @fullstackfamily/manseryeok (MIT, KASI-derived, 1900–2050) — used for the
// sexagenary pillars and lunar↔solar conversion only. Solar-term *instants* come from
// solar-terms.ts (astronomical computation), not from the dataset.
import { calculateSaju, lunarToSolar, type SajuResult } from '@fullstackfamily/manseryeok';
import type { BirthInput, Pillar, Saju } from './types.js';
import { jeolgiOfYear } from './solar-terms.js';
import { STEMS, STEMS_KO, BRANCHES, BRANCHES_KO } from './maps.js';

function toPillar(korean: string, hanja: string): Pillar {
  return { korean, hanja, stem: hanja.charAt(0), branch: hanja.charAt(1) };
}

function parseYmd(date: string): [number, number, number] {
  const parts = date.split('-').map(Number);
  return [parts[0], parts[1], parts[2]];
}

function parseHm(time?: string): [number | undefined, number | undefined] {
  if (!time) return [undefined, undefined];
  const parts = time.split(':').map(Number);
  return [parts[0], parts[1]];
}

/** Gregorian day ± n, safe across month/year boundaries. */
function addDays(y: number, m: number, d: number, n: number): [number, number, number] {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

// ── Hour pillar (시주), computed here on purpose ─────────────────────────────
// ⚠ The library's hour pillar compares a clock already shifted by the longitude-127
//   correction (−30 min) against boundaries that are ALSO shifted +30 min, so hour
//   branches flip 30 minutes late (e.g. 巳 becomes 10:00–11:59). We therefore compute
//   the hour pillar ourselves.
// Clock correction for the hour boundary:
//   · No birth longitude → standard manseryeok (−30 min ≈ 127.5°E, no equation of time).
//   · Birth longitude given → true solar time = clock + (lon − 135)×4 min + equation of time.
//   Hour branches anchor at true-solar 子 23:00: 子 [23:00,01:00) · 丑 [01:00,03:00) · … · 巳 [09:00,11:00) …

/** Day of year (1–366) — input to the equation of time. */
function dayOfYear(y: number, m: number, d: number): number {
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
}
/** Equation of time in minutes — true solar = mean solar + EoT. Standard approximation (±0.5 min). */
function equationOfTimeMin(y: number, m: number, d: number): number {
  const b = (2 * Math.PI * (dayOfYear(y, m, d) - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}
/**
 * Clock correction (minutes) for the hour-pillar boundary.
 * No longitude → standard −30 (manseryeok-compatible); longitude → true solar time.
 * With tzOffsetMin (born outside KST) the wall clock isn't KST, so the general form is
 * lon×4 − tzOffset + EoT (for KST +540 this equals (lon − 135)×4). Unknown longitude → 0.
 */
function hourCorrectionMin(
  longitude: number | undefined,
  y: number,
  m: number,
  d: number,
  tzOffsetMin?: number,
): number {
  if (tzOffsetMin != null) {
    if (longitude == null) return 0;
    return Math.round(longitude * 4 - tzOffsetMin + equationOfTimeMin(y, m, d));
  }
  if (longitude == null) return -30; // ≈127.5°E, no EoT — classic manseryeok behavior (golden-locked)
  return Math.round((longitude - 135) * 4 + equationOfTimeMin(y, m, d));
}

/**
 * Five-rats rule (오자시법): day stem 甲/己 → 甲子 hour, 乙/庚 → 丙子 … 戊/癸 → 壬子, forward.
 * Late 子 hour (야자시 — 子 falling in the PM of the clock day) takes the NEXT day's stem
 * for the hour stem, while the day pillar stays anchored to clock midnight.
 */
function hourPillarOf(y: number, m: number, d: number, hour: number, minute: number, dayStem: string, corrMin: number): Pillar | null {
  const mins = hour * 60 + minute;
  // Corrected clock → align 子 to [23:00, 01:00) by +60; normalize with modulo.
  const adjusted = (((mins + corrMin + 60) % 1440) + 1440) % 1440;
  const branchIdx = Math.floor(adjusted / 120);
  let baseStem = dayStem;
  if (branchIdx === 0 && mins >= 12 * 60) {
    const [ny, nm, nd] = addDays(y, m, d, 1);
    baseStem = calculateSaju(ny, nm, nd, 12, 0).dayPillarHanja.charAt(0);
  }
  const dayIdx = STEMS.indexOf(baseStem);
  if (dayIdx < 0) return null;
  const stemIdx = ((dayIdx % 5) * 2 + branchIdx) % 10;
  return {
    korean: STEMS_KO[stemIdx] + BRANCHES_KO[branchIdx],
    hanja: STEMS[stemIdx] + BRANCHES[branchIdx],
    stem: STEMS[stemIdx],
    branch: BRANCHES[branchIdx],
  };
}

interface Jeolgi {
  month: number;
  day: number;
  hour: number;
  minute: number;
}
/**
 * The year's 12 month-boundary terms (절기) as KST instants — solar-terms.ts (astronomical,
 * 1900–2050; 입춘 also bounds the year pillar). Outside that range → [] → day-granularity fallback.
 * ⚠ Until 0.1.1 this read the dataset's `getSolarTermsByYear`, which returns the 2026 table for
 *   every year 2020–2030 (입춘 fixed at Feb 4 05:02) — see solar-terms.ts.
 */
function jeolgiOf(year: number): Jeolgi[] {
  return jeolgiOfYear(year);
}

/**
 * Birth date/time → four pillars (사주).
 * - Lunar input is converted to Gregorian first (leap months honored).
 * - **Minute-exact solar-term correction**: the library applies solar terms at day
 *   granularity, so a birth on a term day but before the exact term time gets the next
 *   term's year/month pillar. We correct that: before the term time, the year/month
 *   pillars are taken from the previous day (day/hour pillars keep the actual date).
 *   Term instants are computed astronomically (solar-terms.ts, KST, 1900–2050).
 * - The hour pillar is computed here (see hourPillarOf) — not by the library, whose
 *   boundary is double-shifted. Unknown time → hour pillar null.
 * ⚠ Unknown time + term-day birth cannot be minute-corrected (stays day-granular).
 */
export function deriveSaju(birth: BirthInput): Saju {
  let [year, month, day] = parseYmd(birth.date);
  if (birth.calendar === 'lunar') {
    const s = lunarToSolar(year, month, day, birth.isLeapMonth ?? false).solar;
    year = s.year;
    month = s.month;
    day = s.day;
  }
  const [hour, minute] = parseHm(birth.time);
  const r: SajuResult = calculateSaju(year, month, day, hour, minute);

  // Minute-exact solar-term boundary correction — only when the time is known.
  let yearPillar = r.yearPillar;
  let yearPillarHanja = r.yearPillarHanja;
  let monthPillar = r.monthPillar;
  let monthPillarHanja = r.monthPillarHanja;
  let solarTermAdjusted = false;
  const tzOff = birth.tzOffsetMin;
  if (hour != null && tzOff != null && tzOff !== 540) {
    // Born outside KST: input is the local wall clock, term data are KST astronomical
    // times → convert term times to local and compare absolute instants. The library
    // already decided at day granularity ('local date ≥ KST term date'), so we only
    // recompute the year/month pillars when that decision disagrees with the true
    // boundary. Day/hour pillars stay on the local date/time (local-time school —
    // the convention of Western BaZi tools).
    const birthLocalMs = Date.UTC(year, month - 1, day, hour, minute ?? 0);
    for (const t of jeolgiOf(year)) {
      const termLocalMs = Date.UTC(year, t.month - 1, t.day, t.hour, t.minute) + (tzOff - 540) * 60_000;
      if (Math.abs(birthLocalMs - termLocalMs) > 2 * 86_400_000) continue; // adjacent terms only
      const libNew = Date.UTC(year, month - 1, day) >= Date.UTC(year, t.month - 1, t.day);
      const trueNew = birthLocalMs >= termLocalMs;
      if (libNew === trueNew) continue;
      const [ay, am, ad] = trueNew ? [year, t.month, t.day] : addDays(year, t.month, t.day, -1);
      const ar = calculateSaju(ay, am, ad, 12, 0); // anchor: term date (new month) or the day before (previous month), at noon
      yearPillar = ar.yearPillar;
      yearPillarHanja = ar.yearPillarHanja;
      monthPillar = ar.monthPillar;
      monthPillarHanja = ar.monthPillarHanja;
      solarTermAdjusted = true;
      break;
    }
  } else if (hour != null) {
    const onTerm = jeolgiOf(year).find((t) => t.month === month && t.day === day);
    if (onTerm) {
      const beforeTerm =
        hour < onTerm.hour || (hour === onTerm.hour && (minute ?? 0) < onTerm.minute);
      if (beforeTerm) {
        const [py, pm, pd] = addDays(year, month, day, -1);
        const pr = calculateSaju(py, pm, pd, 12, 0); // previous day at noon → previous year/month pillars
        yearPillar = pr.yearPillar;
        yearPillarHanja = pr.yearPillarHanja;
        monthPillar = pr.monthPillar;
        monthPillarHanja = pr.monthPillarHanja;
        solarTermAdjusted = true;
      }
    }
  }

  // Hour pillar computed here (library boundary is double-shifted) — see hourPillarOf.
  const corrMin = hourCorrectionMin(birth.longitude, year, month, day, birth.tzOffsetMin);
  const hourPillar =
    hour != null ? hourPillarOf(year, month, day, hour, minute ?? 0, r.dayPillarHanja.charAt(0), corrMin) : null;
  const trueSolar = hourPillar != null && birth.longitude != null;

  return {
    year: toPillar(yearPillar, yearPillarHanja),
    month: toPillar(monthPillar, monthPillarHanja),
    day: toPillar(r.dayPillar, r.dayPillarHanja),
    hour: hourPillar,
    timeKnown: hourPillar != null,
    isTimeCorrected: hourPillar != null,
    solarTermAdjusted,
    trueSolarApplied: trueSolar,
    ...(trueSolar ? { hourCorrectionMin: corrMin } : {}),
  };
}
