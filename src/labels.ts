// English display layer. The engine speaks hanja/Korean (the canonical domain vocabulary);
// this module maps it for rendering. Same philosophy as the engine itself: store canonical
// values, translate only at the display layer.
import type { Element } from './types.js';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEM_YANG, STEMS, BRANCHES } from './maps.js';

/** Element → English. */
export const ELEMENT_EN: Record<Element, string> = {
  木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water',
};

/** Ten-god broad categories (십성) → common English BaZi terms. */
export const SIPSEONG_EN: Record<string, string> = {
  비겁: 'Companion', // peers, self-strength
  식상: 'Output', // expression, creativity
  재성: 'Wealth',
  관성: 'Authority', // career, discipline
  인성: 'Resource', // support, learning
};

/** Fine-grained ten gods (정/편 split) → conventional English names. */
export const SIPSEONG_DETAIL_EN: Record<string, string> = {
  비견: 'Friend',
  겁재: 'Rob Wealth',
  식신: 'Eating God',
  상관: 'Hurting Officer',
  편재: 'Indirect Wealth',
  정재: 'Direct Wealth',
  편관: 'Seven Killings',
  정관: 'Direct Officer',
  편인: 'Indirect Resource',
  정인: 'Direct Resource',
};

/** Twelve life stages (십이운성) → English. */
export const STAGE_EN: Record<string, string> = {
  장생: 'Birth',
  목욕: 'Bath',
  관대: 'Cap & Belt',
  건록: 'Establishment',
  제왕: 'Peak',
  쇠: 'Decline',
  병: 'Sickness',
  사: 'Death',
  묘: 'Grave',
  절: 'Severance',
  태: 'Conception',
  양: 'Nurture',
};

/** Luck-pillar direction → English. */
export const DIRECTION_EN: Record<string, string> = {
  순행: 'forward',
  역행: 'reverse',
};

/** Branch → zodiac animal. */
export const BRANCH_ANIMAL: Record<string, string> = {
  子: 'Rat', 丑: 'Ox', 寅: 'Tiger', 卯: 'Rabbit', 辰: 'Dragon', 巳: 'Snake',
  午: 'Horse', 未: 'Goat', 申: 'Monkey', 酉: 'Rooster', 戌: 'Dog', 亥: 'Pig',
};

/** Branch → its two-hour window on the (uncorrected) clock. */
export const BRANCH_HOURS: Record<string, string> = {
  子: '23:00–01:00', 丑: '01:00–03:00', 寅: '03:00–05:00', 卯: '05:00–07:00',
  辰: '07:00–09:00', 巳: '09:00–11:00', 午: '11:00–13:00', 未: '13:00–15:00',
  申: '15:00–17:00', 酉: '17:00–19:00', 戌: '19:00–21:00', 亥: '21:00–23:00',
};

/** '甲' → 'Yang Wood', '癸' → 'Yin Water'. Unknown input → ''. */
export function stemLabel(stem: string): string {
  const el = STEM_ELEMENT[stem];
  if (!el) return '';
  return `${STEM_YANG[stem] ? 'Yang' : 'Yin'} ${ELEMENT_EN[el]}`;
}

/** '亥' → 'Water Pig'. Unknown input → ''. */
export function branchLabel(branch: string): string {
  const el = BRANCH_ELEMENT[branch];
  const animal = BRANCH_ANIMAL[branch];
  if (!el || !animal) return '';
  return `${ELEMENT_EN[el]} ${animal}`;
}

/** '丙申' → 'Yang Fire Monkey' (stem polarity+element, branch animal). Unknown → ''. */
export function ganjiLabel(ganji: string): string {
  if (ganji.length !== 2) return '';
  const s = stemLabel(ganji[0]);
  const animal = BRANCH_ANIMAL[ganji[1]];
  if (!s || !animal) return '';
  return `${s} ${animal}`;
}

export { STEM_ELEMENT, BRANCH_ELEMENT, STEM_YANG, STEMS, BRANCHES };
