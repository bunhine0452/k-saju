// Five-element distribution (오행) of a chart — principal counts + hidden-stem weighting.
import type { Element, ElementProfile, Pillar, Saju } from './types.js';
import { JIJANGGAN, JIJANGGAN_TOTAL_DAYS } from './data/hidden-stems.js';
import { STEM_ELEMENT, BRANCH_ELEMENT } from './maps.js';

const ALL: Element[] = ['木', '火', '土', '金', '水'];

/**
 * Convert the 8 (or 6) characters of a chart into a five-element distribution.
 * - counts: integer counts by principal element (stem 1, branch principal 1) — for
 *   display and for judging absent elements.
 * - weighted: stems 1.0 + branches split across hidden stems by traditional
 *   day-count ratios (part.days/30) — the finer-grained distribution.
 */
export function analyzeElements(saju: Saju): ElementProfile {
  const counts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const weighted: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const pillars: Pillar[] = [saju.year, saju.month, saju.day, ...(saju.hour ? [saju.hour] : [])];
  for (const p of pillars) {
    const s = STEM_ELEMENT[p.stem];
    if (s) {
      counts[s] += 1;
      weighted[s] += 1;
    }
    const b = BRANCH_ELEMENT[p.branch];
    if (b) counts[b] += 1;
    // Hidden-stem weighting: distribute each branch across its hidden stems by day count,
    // instead of crediting the principal element alone.
    const parts = JIJANGGAN[p.branch];
    if (parts) {
      for (const part of parts) {
        const e = STEM_ELEMENT[part.stem];
        if (e) weighted[e] += part.days / JIJANGGAN_TOTAL_DAYS;
      }
    } else if (b) {
      weighted[b] += 1; // fallback (branch without hidden-stem data → principal)
    }
  }
  // Trim floating-point noise (3 decimals).
  for (const e of ALL) weighted[e] = Math.round(weighted[e] * 1000) / 1000;

  const lacking = ALL.filter((e) => counts[e] === 0);
  const max = Math.max(...ALL.map((e) => counts[e]));
  const excess = max > 0 ? ALL.filter((e) => counts[e] === max) : [];

  return { counts, weighted, lacking, excess };
}
