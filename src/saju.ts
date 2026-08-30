// Manseryeok (만세력) → four pillars, with the boundary corrections most calculators skip.
// Calendar dataset: @fullstackfamily/manseryeok (MIT, KASI-derived, 1900–2050) — used for the
// day pillar and lunar↔solar conversion only. The year and month pillars are computed here
// from the solar-term *instants* in solar-terms.ts (astronomical) — see yearMonthFromInstants
// for why the dataset's day-level month table cannot be patched into correctness.
import { calculateSaju, lunarToSolar, type SajuResult } from '@fullstackfamily/manseryeok';
import type { BirthInput, Pillar, Saju } from './types.js';
import { jeolgiOfYear, type SolarTerm } from './solar-terms.js';
import { STEMS, STEMS_KO, BRANCHES, BRANCHES_KO } from './maps.js';

const KST_OFFSET_MIN = 540; // input is read as KST (Asia/Seoul) when tzOffsetMin is omitted
const SEXAGENARY_EPOCH_YEAR = 1984; // a 甲子 year — anchor for the year-pillar modulo

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

// ── Year & month pillars, computed from the solar-term instants ─────────────
type Jeolgi = SolarTerm;
/**
 * The year's 12 month-boundary terms (절기) as absolute instants — solar-terms.ts (astronomical,
 * 1900–2050; 입춘 also bounds the year pillar). Outside that range → [] → the dataset's
 * day-granular pillars are kept.
 * ⚠ Until 0.1.1 this read the dataset's `getSolarTermsByYear`, which returns the 2026 table for
 *   every year 2020–2030 (입춘 fixed at Feb 4 05:02) — see solar-terms.ts.
 */
function jeolgiOf(year: number): Jeolgi[] {
  return jeolgiOfYear(year);
}

/** Hanja ganji → Korean reading ('甲子' → '갑자'). */
function ganjiKo(hanja: string): string {
  return STEMS_KO[STEMS.indexOf(hanja.charAt(0))] + BRANCHES_KO[BRANCHES.indexOf(hanja.charAt(1))];
}

/**
 * Year and month pillars straight from the solar-term instants (0.1.2).
 *
 * Why the dataset's pillars are not used: its month pillar is a day-level table, and at many
 * terms that table switches to the new month on the day AFTER the astronomical instant
 * (measured: 경칩 2024 = Mar 5 11:22 KST, table flips Mar 6 · 입동 2024 = Nov 7 07:19, flips
 * Nov 8 · 입춘 2025 = Feb 3 23:10, flips Feb 4 · 소한 2025 = Jan 5 11:32, flips Jan 6). The
 * 0.1.0–0.1.1 patch ("born on the term day before the term time → take the previous day's
 * pillars") only handles a table that flips EARLY; when the table flips late, a birth after the
 * instant but before the table's flip kept the old month: 2024-03-05 12:00 → 丙寅 (correct 丁卯),
 * 2024-11-07 12:00 → 甲戌 (correct 乙亥), 2025-02-03 23:30 → 甲辰 丁丑 (correct 乙巳 戊寅), and
 * New York 2025-02-03 10:00 (= KST Feb 4 00:00) → 甲辰 (correct 乙巳 戊寅). Away from the
 * boundaries the table and this computation agree on every day 1905–2049 except Dec 31 of 12
 * years (1908 … 1961), where the dataset's year stem is simply corrupt (1908-12-31 → 壬申; the
 * year is 戊申) — computing the pillars here sidesteps that too (test/solar-terms-direct.test.ts).
 *
 * Rules:
 *   · Year pillar — 입춘 (start of spring) of the calendar year: at/after the instant → that
 *     year, before → the previous year. Stem and branch by modulo from 1984 = 甲子.
 *   · Month pillar — branch of the last term already passed (입춘 → 寅 … 대설 → 子, 소한 → 丑);
 *     stem by the five-tigers rule (五虎遁): year stem 甲/己 → 丙寅 as the first month,
 *     乙/庚 → 戊寅, 丙/辛 → 庚寅, 丁/壬 → 壬寅, 戊/癸 → 甲寅, then +1 per month.
 *   · The previous calendar year's terms are included so early January (after 대설, before
 *     소한) has a "last term passed" — without them the 子 month would be unresolvable.
 * Returns null outside the solar-term range; the caller keeps the dataset's pillars.
 */
function yearMonthFromInstants(birthAbsMs: number, calYear: number): { year: string; month: string } | null {
  const prev = jeolgiOf(calYear - 1);
  const cur = jeolgiOf(calYear);
  if (!prev.length || !cur.length) return null;
  const ipchun = cur.find((t) => t.sajuMonth === 1);
  if (!ipchun) return null;
  const sajuYear = birthAbsMs >= ipchun.utcMs ? calYear : calYear - 1;
  const yIdx = (((sajuYear - SEXAGENARY_EPOCH_YEAR) % 60) + 60) % 60;
  const yStem = yIdx % 10;
  const passed = [...prev, ...cur].filter((t) => t.utcMs <= birthAbsMs);
  const last = passed[passed.length - 1];
  if (!last) return null;
  const mBranch = (last.sajuMonth + 1) % 12; // saju month 1 = 寅 (index 2) … 11 = 子 (0) · 12 = 丑 (1)
  const mStem = (2 + 2 * (yStem % 5) + (last.sajuMonth - 1)) % 10; // 五虎遁: 丙 (2) + 2 per stem pair, +1 per month
  return { year: STEMS[yStem] + BRANCHES[yIdx % 12], month: STEMS[mStem] + BRANCHES[mBranch] };
}

/**
 * Birth date/time → four pillars (사주).
 * - Lunar input is converted to Gregorian first (leap months honored).
 * - **Year & month pillars come from the solar-term instants**, not from the calendar
 *   dataset (see yearMonthFromInstants): the birth is turned into an absolute instant
 *   (local wall clock − tzOffsetMin, KST when omitted) and compared with the astronomical
 *   term instants, so a birth one minute after 입춘 gets the new year — on any date, in
 *   any timezone. Unknown time → noon of the birth day (a stated rule; the dataset's
 *   day-level table is a day late at many terms, so noon is the more honest midpoint).
 * - The day pillar is the dataset's (continuous 60-day cycle at clock midnight — independent
 *   of solar terms); the hour pillar is computed here (hourPillarOf — the library's boundary
 *   is double-shifted). Unknown time → hour pillar null.
 * - Outside the solar-term range (1900–2050) the dataset's day-granular pillars are kept.
 * `solarTermAdjusted` = the year or month pillar differs from the dataset's day-granular value.
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

  // Year & month pillars from the term instants; the dataset's values are the fallback and the
  // reference for solarTermAdjusted.
  const tzOff = birth.tzOffsetMin ?? KST_OFFSET_MIN;
  const birthAbsMs = Date.UTC(year, month - 1, day, hour ?? 12, minute ?? 0) - tzOff * 60_000;
  const direct = yearMonthFromInstants(birthAbsMs, year);
  const yearPillarHanja = direct?.year ?? r.yearPillarHanja;
  const monthPillarHanja = direct?.month ?? r.monthPillarHanja;
  const yearPillar = direct ? ganjiKo(yearPillarHanja) : r.yearPillar;
  const monthPillar = direct ? ganjiKo(monthPillarHanja) : r.monthPillar;
  const solarTermAdjusted = yearPillarHanja !== r.yearPillarHanja || monthPillarHanja !== r.monthPillarHanja;

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
