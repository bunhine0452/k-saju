// Shared types for the k-saju deterministic engine.
// Principle: calculation is code — deterministic, reproducible, testable.
// This layer has zero LLM / network / UI dependencies.

/** The five elements (오행 · 五行), keyed by hanja. Render with ELEMENT_EN from labels.ts. */
export type Element = '木' | '火' | '土' | '金' | '水';

export interface BirthInput {
  /** Birth date "YYYY-MM-DD" (wall clock of the birth place). */
  date: string;
  /** Birth time "HH:mm". Omit if unknown — the hour pillar becomes null (3-pillar chart). */
  time?: string;
  /** Whether `date` is Gregorian (`solar`) or Korean lunar (`lunar`). */
  calendar: 'solar' | 'lunar';
  /** For lunar input: was it a leap month (윤달)? */
  isLeapMonth?: boolean;
  /**
   * Birth-place longitude in °E (negative = °W). When provided, the hour-pillar boundary
   * uses true solar time: clock + longitude correction + equation of time.
   * When omitted, the classic Korean manseryeok convention applies (fixed −30 min ≈ 127.5°E).
   */
  longitude?: number;
  /**
   * UTC offset of the birth place at the moment of birth, in minutes (DST included).
   * e.g. Seoul +540, New York (EST) −300. When provided, `date`/`time` are read as that
   * local wall clock: solar-term boundaries (KST astronomical times) are converted for
   * comparison, and the hour pillar generalizes to lon×4 − tzOffset + equation of time.
   * When omitted, input is interpreted as KST (Asia/Seoul) — the manseryeok default.
   */
  tzOffsetMin?: number;
}

/** One pillar (기둥): Korean reading ('갑자'), hanja ('甲子'), and the split stem/branch. */
export interface Pillar {
  korean: string;
  hanja: string;
  /** Heavenly stem (천간) hanja, e.g. '甲'. */
  stem: string;
  /** Earthly branch (지지) hanja, e.g. '子'. */
  branch: string;
}

/** A four-pillars chart (사주). `hour` is null when birth time is unknown. */
export interface Saju {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  /** False when birth time was not provided (3-pillar chart). */
  timeKnown: boolean;
  /** Whether the hour boundary used a corrected clock (always true when hour is known). */
  isTimeCorrected: boolean;
  /**
   * True when the minute-exact solar-term correction moved the year/month pillar
   * (born on a solar-term day, before the exact term time — or across a timezone).
   */
  solarTermAdjusted: boolean;
  /** True when the hour pillar used true solar time (longitude + equation of time). */
  trueSolarApplied?: boolean;
  /** Total clock correction applied in true-solar mode, in minutes (negative = earlier). */
  hourCorrectionMin?: number;
}

/** Five-element distribution of the chart. */
export interface ElementProfile {
  /** Integer counts by principal element (본기): stems 1 each, branch principal 1 each. */
  counts: Record<Element, number>;
  /**
   * Weighted distribution: stems 1.0; each branch split across its hidden stems
   * (지장간) by traditional day-count ratios (days/30). Finer than `counts`.
   */
  weighted: Record<Element, number>;
  /** Elements completely absent from `counts`. */
  lacking: Element[];
  /** Elements tied at the maximum count. */
  excess: Element[];
}

/** Ten-gods (십성 · 十星) category counts relative to the day master. */
export interface SipseongProfile {
  /** Day master (일간) stem hanja. */
  dayMaster: string;
  /** Counts by category — 비겁 Companion · 식상 Output · 재성 Wealth · 관성 Authority · 인성 Resource. */
  counts: { 비겁: number; 식상: number; 재성: number; 관성: number; 인성: number };
  /** Most frequent category(ies). */
  dominant: ('비겁' | '식상' | '재성' | '관성' | '인성')[];
}

/** One luck pillar (대운) — a 10-year period. */
export interface DaeunPillar {
  /** 1-based order. */
  order: number;
  /** Approximate (Western-count) starting age: daeunsu + 10 × n. */
  startAge: number;
  /** Ganji, e.g. '丙午'. */
  ganji: string;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
}

/** Luck-pillar analysis — direction, starting age, and the 8 pillars (80 years). */
export interface DaeunInfo {
  /** '순행' = forward through the sexagenary cycle, '역행' = reverse. */
  direction: '순행' | '역행';
  /** Starting age of the first luck pillar (1–10): days to the solar term ÷ 3, rounded. */
  daeunsu: number;
  /** Days from birth to the governing solar term — published so the math is auditable. */
  daysToTerm: number;
  pillars: DaeunPillar[];
}

/** Day-pillar reading (일주론) — the day master seated on its own branch. */
export interface IljuInfo {
  /** Day-pillar ganji, e.g. '癸亥'. */
  ganji: string;
  dayStem: string;
  dayBranch: string;
  stemElement: Element;
  branchElement: Element;
  /** Ten-god (fine-grained) that the branch principal stem gives the day master, e.g. '겁재'. */
  branchSipseong: string | null;
  /** Twelve life stage (십이운성) the day master meets at its own branch, e.g. '제왕'. */
  twelveStage: string;
}
