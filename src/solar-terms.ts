// Solar-term instants — the moment the Sun's apparent longitude reaches each of the 24 term
// longitudes, computed astronomically (astronomy-engine, MIT) for 1900–2050 and returned as
// KST wall-clock time plus the absolute instant.
//
// Why the dataset was dropped (0.1.1): `@fullstackfamily/manseryeok`'s `getSolarTermsByYear`
// advertises 2020–2030 support, but every one of those eleven years returns the SAME table —
// the 2026 values (입춘 = Feb 4 05:02). The real 입춘 is Feb 4 17:26 KST in 2024, Feb 3 23:10
// in 2025, Feb 4 10:46 in 2027. So term-day births in 2020–2030 were being "corrected" against
// an instant up to ±13 hours off, and every other year had no minute data at all (day-granular
// fallback). The "minute-exact solar terms" promise was true only for people born in 2026.
//
// Accuracy: the 12 month-boundary terms of 2026 (the one year the dataset is right for) agree
// with the KASI-derived values within 0–1 minute (test/solar-terms.test.ts); KASI publishes
// whole minutes, so a 1-minute difference is rounding. Results are KST (UTC+9) wall clock —
// the whole chart is anchored to KST astronomical time, and saju.ts converts for births
// elsewhere via tzOffsetMin. Pure module (no I/O), cached per year, locked by golden tests.
// astronomy-engine ships both a CJS and an ESM build. Node 20 resolves the CJS one through
// tsx and its lexer does not surface the named exports, so `import { MakeTime }` throws there
// while Node 22 is fine (CI caught exactly this). Namespace import + interop unwrap works on
// every path: true ESM has no `default`, CJS interop puts module.exports there.
import * as AstronomyNs from 'astronomy-engine';

const Astronomy = ((AstronomyNs as unknown as { default?: typeof AstronomyNs }).default ??
  AstronomyNs) as typeof AstronomyNs;
const { MakeTime, SearchSunLongitude } = Astronomy;

/** 절기 (jeolgi) = the 12 terms that bound the months; 중기 (junggi) = the 12 mid-month terms. */
export type SolarTermType = 'jeolgi' | 'junggi';

export interface SolarTerm {
  /** Korean name, e.g. '입춘'. */
  name: string;
  /** Hanja name, e.g. '立春'. */
  nameHanja: string;
  /** Apparent solar longitude of the term, degrees (입춘 = 315). */
  longitude: number;
  type: SolarTermType;
  /** Saju month this term opens (1 = 寅 month … 12 = 丑 month); a 중기 sits mid-month. */
  sajuMonth: number;
  // KST wall clock
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Absolute instant (ms since the Unix epoch, UTC) — for timezone conversion and sorting. */
  utcMs: number;
}

// [name, hanja, longitude, ~month, ~day, type, saju month]. The approximate date anchors the ±15-day search window.
const TABLE: ReadonlyArray<readonly [string, string, number, number, number, SolarTermType, number]> = [
  ['소한', '小寒', 285, 1, 5, 'jeolgi', 12],
  ['대한', '大寒', 300, 1, 20, 'junggi', 12],
  ['입춘', '立春', 315, 2, 4, 'jeolgi', 1],
  ['우수', '雨水', 330, 2, 19, 'junggi', 1],
  ['경칩', '驚蟄', 345, 3, 5, 'jeolgi', 2],
  ['춘분', '春分', 0, 3, 20, 'junggi', 2],
  ['청명', '淸明', 15, 4, 5, 'jeolgi', 3],
  ['곡우', '穀雨', 30, 4, 20, 'junggi', 3],
  ['입하', '立夏', 45, 5, 5, 'jeolgi', 4],
  ['소만', '小滿', 60, 5, 21, 'junggi', 4],
  ['망종', '芒種', 75, 6, 6, 'jeolgi', 5],
  ['하지', '夏至', 90, 6, 21, 'junggi', 5],
  ['소서', '小暑', 105, 7, 7, 'jeolgi', 6],
  ['대서', '大暑', 120, 7, 23, 'junggi', 6],
  ['입추', '立秋', 135, 8, 7, 'jeolgi', 7],
  ['처서', '處暑', 150, 8, 23, 'junggi', 7],
  ['백로', '白露', 165, 9, 7, 'jeolgi', 8],
  ['추분', '秋分', 180, 9, 23, 'junggi', 8],
  ['한로', '寒露', 195, 10, 8, 'jeolgi', 9],
  ['상강', '霜降', 210, 10, 23, 'junggi', 9],
  ['입동', '立冬', 225, 11, 7, 'jeolgi', 10],
  ['소설', '小雪', 240, 11, 22, 'junggi', 10],
  ['대설', '大雪', 255, 12, 7, 'jeolgi', 11],
  ['동지', '冬至', 270, 12, 22, 'junggi', 11],
];

const KST_OFFSET_MS = 9 * 3600_000;
const SEARCH_WINDOW_DAYS = 30; // from anchor −15 d for 30 d: wider than the ~15-day term spacing, narrower than the next crossing
export const SOLAR_TERM_YEAR_MIN = 1900;
export const SOLAR_TERM_YEAR_MAX = 2050;

const cache = new Map<number, SolarTerm[]>();

/**
 * The 24 solar terms of a year (KST wall clock + absolute instant), in chronological order.
 * Years outside 1900–2050 return [] — callers fall back to day granularity.
 */
export function solarTermsOfYear(year: number): SolarTerm[] {
  if (!Number.isInteger(year) || year < SOLAR_TERM_YEAR_MIN || year > SOLAR_TERM_YEAR_MAX) return [];
  const hit = cache.get(year);
  if (hit) return hit;
  const list = TABLE.map(([name, nameHanja, longitude, m, d, type, sajuMonth]) => {
    const start = MakeTime(new Date(Date.UTC(year, m - 1, d - 15)));
    const t = SearchSunLongitude(longitude, start, SEARCH_WINDOW_DAYS);
    if (!t) throw new Error(`solar term search failed: ${year} ${name}`); // cannot happen inside the range — never fall back silently
    const utcMs = t.date.getTime();
    const k = new Date(utcMs + KST_OFFSET_MS);
    return {
      name,
      nameHanja,
      longitude,
      type,
      sajuMonth,
      year,
      month: k.getUTCMonth() + 1,
      day: k.getUTCDate(),
      hour: k.getUTCHours(),
      minute: k.getUTCMinutes(),
      utcMs,
    };
  });
  const sorted = [...list].sort((a, b) => a.utcMs - b.utcMs);
  cache.set(year, sorted);
  return sorted;
}

/** Only the 12 month-boundary terms (절기). 입춘 also bounds the year pillar. */
export function jeolgiOfYear(year: number): SolarTerm[] {
  return solarTermsOfYear(year).filter((t) => t.type === 'jeolgi');
}
