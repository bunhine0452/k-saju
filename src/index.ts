// k-saju — deterministic Korean four-pillars (사주 · Saju · BaZi) engine.
// Calculation is code; interpretation is up to you.
export * from './types.js';
export { deriveSaju } from './saju.js';
export { analyzeElements } from './elements.js';
export {
  analyzeSipseong,
  sipseongOf,
  sipseongOfElement,
  sipseongDetail,
  type SipseongCategory,
} from './sipseong.js';
export { analyzeDaeun } from './daeun.js';
export { iljuInfo, twelveStage } from './ilju.js';
export { JIJANGGAN, JIJANGGAN_TOTAL_DAYS, type JijangganPart } from './data/hidden-stems.js';
export {
  ELEMENT_EN,
  SIPSEONG_EN,
  SIPSEONG_DETAIL_EN,
  STAGE_EN,
  DIRECTION_EN,
  BRANCH_ANIMAL,
  BRANCH_HOURS,
  stemLabel,
  branchLabel,
  ganjiLabel,
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  STEM_YANG,
  STEMS,
  BRANCHES,
} from './labels.js';

/** Rule-set identifier — bump when a table or school choice changes. */
export const RULESET = 'k-saju-2026.07';
export const ENGINE_VERSION = '0.1.0';
