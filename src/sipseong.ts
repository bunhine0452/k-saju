// Ten gods (십성 · 十星) — classifying every character by its element/polarity relation
// to the day master: 비겁 Companion · 식상 Output · 재성 Wealth · 관성 Authority · 인성 Resource.
import type { Element, Saju, SipseongProfile } from './types.js';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEM_YANG, GENERATES, CONTROLS } from './maps.js';

export type SipseongCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

/** Category of a target element relative to the day-master element. */
function relationCategory(dayElement: Element, target: Element): SipseongCategory {
  if (target === dayElement) return '비겁'; // same element as me
  if (GENERATES[dayElement] === target) return '식상'; // I generate it
  if (CONTROLS[dayElement] === target) return '재성'; // I control it
  if (CONTROLS[target] === dayElement) return '관성'; // it controls me
  if (GENERATES[target] === dayElement) return '인성'; // it generates me
  return '비겁';
}

/**
 * Ten-god category of a stem relative to the day-master stem.
 * (The fine split — 정/편 — depends on matching polarity; the 5 broad categories
 * are enough for distribution analysis.)
 */
export function sipseongOf(dayStem: string, stem: string): SipseongCategory | null {
  const day = STEM_ELEMENT[dayStem];
  const t = STEM_ELEMENT[stem];
  if (!day || !t) return null;
  return relationCategory(day, t);
}

/** Ten-god category of an arbitrary element relative to the day master (for branches / hidden stems). */
export function sipseongOfElement(dayStem: string, target: Element): SipseongCategory | null {
  const day = STEM_ELEMENT[dayStem];
  if (!day) return null;
  return relationCategory(day, target);
}

/**
 * Fine-grained ten god (정/편 split) — same polarity → the '편' side
 * (비견/식신/편재/편관/편인), different polarity → the '정' side (겁재/상관/정재/정관/정인).
 */
export function sipseongDetail(dayStem: string, stem: string): string | null {
  const cat = sipseongOf(dayStem, stem);
  if (!cat) return null;
  const samePolarity = STEM_YANG[dayStem] === STEM_YANG[stem];
  const MAP: Record<SipseongCategory, [string, string]> = {
    비겁: ['비견', '겁재'],
    식상: ['식신', '상관'],
    재성: ['편재', '정재'],
    관성: ['편관', '정관'],
    인성: ['편인', '정인'],
  };
  return samePolarity ? MAP[cat][0] : MAP[cat][1];
}

/**
 * Ten-god distribution of a whole chart (the day master itself excluded once;
 * branches counted by principal element).
 */
export function analyzeSipseong(saju: Saju): SipseongProfile {
  const dayStem = saju.day.stem;
  const counts: Record<SipseongCategory, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  if (!STEM_ELEMENT[dayStem]) return { dayMaster: dayStem, counts, dominant: [] };

  const pillars = [saju.year, saju.month, saju.day, ...(saju.hour ? [saju.hour] : [])];
  let daySkipped = false;
  for (const p of pillars) {
    if (p.stem === dayStem && !daySkipped) daySkipped = true; // skip the day master itself (once)
    else {
      const c = sipseongOf(dayStem, p.stem);
      if (c) counts[c] += 1;
    }
    const be = BRANCH_ELEMENT[p.branch];
    const bc = be ? sipseongOfElement(dayStem, be) : null;
    if (bc) counts[bc] += 1;
  }
  const max = Math.max(...Object.values(counts));
  const dominant = max > 0
    ? (Object.keys(counts) as SipseongCategory[]).filter((k) => counts[k] === max)
    : [];
  return { dayMaster: dayStem, counts, dominant };
}
