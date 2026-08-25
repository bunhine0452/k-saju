// Canonical stem/branch tables shared across modules. Values are traditional and fixed.
import type { Element } from './types.js';

/** Heavenly stem (천간) → element. */
export const STEM_ELEMENT: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/** Earthly branch (지지) → principal (본기) element. Hidden-stem weighting lives in elements.ts. */
export const BRANCH_ELEMENT: Record<string, Element> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土',
  丑: '土', 未: '土', 申: '金', 酉: '金', 亥: '水', 子: '水',
};

/** Stem polarity — true = yang (양간), false = yin (음간). */
export const STEM_YANG: Record<string, boolean> = {
  甲: true, 乙: false, 丙: true, 丁: false, 戊: true,
  己: false, 庚: true, 辛: false, 壬: true, 癸: false,
};

/** Generating cycle (상생): 木→火→土→金→水→木. */
export const GENERATES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

/** Controlling cycle (상극): 木→土→水→火→金→木. */
export const CONTROLS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const STEMS_KO = '갑을병정무기경신임계';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const BRANCHES_KO = '자축인묘진사오미신유술해';
