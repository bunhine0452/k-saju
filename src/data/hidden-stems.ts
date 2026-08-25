// Hidden stems (지장간 · 地藏干) — the heavenly stems concealed in each earthly branch,
// with traditional monthly day-counts (여기 residual → 중기 middle → 정기 principal; 30 days total).
//   - Growth branches (寅申巳亥): 7 · 7 · 16
//   - Peak branches (子卯酉): 10 · 20  (午 is the exception — fire-earth cohabitation adds 己: 丙10 · 己9 · 丁11)
//   - Storage branches (辰戌丑未): 9 · 3 · 18
// Used to weight the five-element distribution by day-count ratio instead of principal-only (elements.ts).

export interface JijangganPart {
  /** Hidden heavenly stem (hanja). */
  stem: string;
  /** Traditional day count within the month (월률분야). */
  days: number;
}

/** Branch → hidden-stem composition, in 여기 → 중기 → 정기 order. */
export const JIJANGGAN: Record<string, JijangganPart[]> = {
  寅: [{ stem: '戊', days: 7 }, { stem: '丙', days: 7 }, { stem: '甲', days: 16 }],
  卯: [{ stem: '甲', days: 10 }, { stem: '乙', days: 20 }],
  辰: [{ stem: '乙', days: 9 }, { stem: '癸', days: 3 }, { stem: '戊', days: 18 }],
  巳: [{ stem: '戊', days: 7 }, { stem: '庚', days: 7 }, { stem: '丙', days: 16 }],
  午: [{ stem: '丙', days: 10 }, { stem: '己', days: 9 }, { stem: '丁', days: 11 }],
  未: [{ stem: '丁', days: 9 }, { stem: '乙', days: 3 }, { stem: '己', days: 18 }],
  申: [{ stem: '戊', days: 7 }, { stem: '壬', days: 7 }, { stem: '庚', days: 16 }],
  酉: [{ stem: '庚', days: 10 }, { stem: '辛', days: 20 }],
  戌: [{ stem: '辛', days: 9 }, { stem: '丁', days: 3 }, { stem: '戊', days: 18 }],
  亥: [{ stem: '戊', days: 7 }, { stem: '甲', days: 7 }, { stem: '壬', days: 16 }],
  子: [{ stem: '壬', days: 10 }, { stem: '癸', days: 20 }],
  丑: [{ stem: '癸', days: 9 }, { stem: '辛', days: 3 }, { stem: '己', days: 18 }],
};

export const JIJANGGAN_TOTAL_DAYS = 30;
