// Day-pillar reading (일주론) — the day master seated on its own branch.
// Twelve life stages (십이운성) + the branch's ten god, both deterministic.
//   Verification anchor: 癸 (yin water) starts at 卯, walks in reverse → meets 亥 at
//   제왕 (peak). 亥 principal stem 壬 → 겁재 relative to 癸.
import type { IljuInfo, Saju } from './types.js';
import { sipseongDetail } from './sipseong.js';
import { STEM_ELEMENT, BRANCH_ELEMENT, STEM_YANG } from './maps.js';

// Twelve life stages, forward order.
const STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const;
const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Each stem's birth branch (장생지 — the stage-cycle origin). Yang stems walk forward (+1),
// yin stems reverse (−1). 戊 shares 丙's palace; 己 shares 丁's.
const JANGSAENG: Record<string, string> = {
  甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', // yang (forward)
  乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯', // yin (reverse)
};

// Branch principal stem (지장간 정기) — for the ten god the branch gives the day master.
const BRANCH_BONGI: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
};

/** Twelve life stage a day master meets at a branch (장생·제왕·묘 …); '' when unknown. */
export function twelveStage(dayStem: string, branch: string): string {
  const js = JANGSAENG[dayStem];
  if (!js) return '';
  const dir = STEM_YANG[dayStem] ? 1 : -1;
  const jsIdx = BRANCH_ORDER.indexOf(js);
  const bIdx = BRANCH_ORDER.indexOf(branch);
  if (jsIdx < 0 || bIdx < 0) return '';
  const i = (((bIdx - jsIdx) * dir) % 12 + 12) % 12;
  return STAGES[i];
}

/** Day pillar + its branch's ten god + twelve stage, all deterministic. */
export function iljuInfo(saju: Saju): IljuInfo {
  const dayStem = saju.day.stem;
  const dayBranch = saju.day.branch;
  const bongi = BRANCH_BONGI[dayBranch];
  return {
    ganji: saju.day.hanja,
    dayStem,
    dayBranch,
    stemElement: STEM_ELEMENT[dayStem],
    branchElement: BRANCH_ELEMENT[dayBranch],
    branchSipseong: bongi ? sipseongDetail(dayStem, bongi) : null,
    twelveStage: twelveStage(dayStem, dayBranch),
  };
}
