// k-saju CLI — a four-pillars chart in your terminal.
//   npx k-saju 1995-03-16 07:30
//   npx k-saju 1995-03-16 07:30 --place new-york --gender F
//   npx k-saju 1995-03-16 --lunar --json
import { createInterface } from 'node:readline/promises';
import { deriveSaju } from './saju.js';
import { analyzeElements } from './elements.js';
import { analyzeSipseong } from './sipseong.js';
import { analyzeDaeun } from './daeun.js';
import { iljuInfo } from './ilju.js';
import {
  ELEMENT_EN, SIPSEONG_EN, SIPSEONG_DETAIL_EN, STAGE_EN, DIRECTION_EN,
  stemLabel, ganjiLabel, STEM_ELEMENT, BRANCH_ELEMENT,
} from './labels.js';
import { ENGINE_VERSION } from './index.js';
import type { BirthInput, Element } from './types.js';

// ── tiny arg parser (zero deps) ──────────────────────────────────────────────
interface Args {
  date?: string;
  time?: string;
  lunar: boolean;
  leap: boolean;
  gender: 'M' | 'F' | 'N';
  place?: string;
  lon?: number;
  tz?: string;
  json: boolean;
  color: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { lunar: false, leap: false, gender: 'N', json: false, color: true, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--lunar') a.lunar = true;
    else if (t === '--leap') a.leap = true;
    else if (t === '--gender') a.gender = (argv[++i] ?? 'N').toUpperCase() as Args['gender'];
    else if (t === '--place') a.place = argv[++i];
    else if (t === '--lon') a.lon = Number(argv[++i]);
    else if (t === '--tz') a.tz = argv[++i];
    else if (t === '--json') a.json = true;
    else if (t === '--no-color') a.color = false;
    else if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--version' || t === '-v') a.version = true;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) a.date = t;
    else if (/^\d{1,2}:\d{2}$/.test(t)) a.time = t.padStart(5, '0');
    else {
      console.error(`unknown argument: ${t} (try --help)`);
      process.exit(1);
    }
  }
  if (!['M', 'F', 'N'].includes(a.gender)) a.gender = 'N';
  return a;
}

// ── city presets (longitude °E, IANA timezone) ───────────────────────────────
const PLACES: Record<string, { lon: number; tz: string }> = {
  seoul: { lon: 126.98, tz: 'Asia/Seoul' },
  busan: { lon: 129.08, tz: 'Asia/Seoul' },
  tokyo: { lon: 139.69, tz: 'Asia/Tokyo' },
  beijing: { lon: 116.41, tz: 'Asia/Shanghai' },
  taipei: { lon: 121.56, tz: 'Asia/Taipei' },
  singapore: { lon: 103.85, tz: 'Asia/Singapore' },
  'new-york': { lon: -74.01, tz: 'America/New_York' },
  'los-angeles': { lon: -118.24, tz: 'America/Los_Angeles' },
  chicago: { lon: -87.63, tz: 'America/Chicago' },
  london: { lon: -0.13, tz: 'Europe/London' },
  paris: { lon: 2.35, tz: 'Europe/Paris' },
  berlin: { lon: 13.41, tz: 'Europe/Berlin' },
  sydney: { lon: 151.21, tz: 'Australia/Sydney' },
};

/** UTC offset (minutes) of an IANA timezone at a given wall-clock instant (DST-correct). */
function offsetMinAt(tz: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const target = Date.UTC(y, mo - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const g = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asIf = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
    if (asIf === target) break;
    guess += target - asIf;
  }
  return Math.round((target - guess) / 60_000);
}

/** Parse "--tz" as IANA name or fixed "±HH:MM" offset. */
function resolveTzOffset(tz: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const m = tz.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  return offsetMinAt(tz, y, mo, d, h, mi);
}

// ── colors ───────────────────────────────────────────────────────────────────
let useColor = true;
const paint = (code: string, s: string) => (useColor ? `[${code}m${s}[0m` : s);
const bold = (s: string) => paint('1', s);
const dim = (s: string) => paint('2', s);
const ELEMENT_COLOR: Record<Element, string> = { 木: '32', 火: '31', 土: '33', 金: '90', 水: '36' };
const elc = (el: Element | undefined, s: string) => (el ? paint(ELEMENT_COLOR[el], s) : s);
const stemPaint = (ch: string) => elc(STEM_ELEMENT[ch], ch);
const branchPaint = (ch: string) => elc(BRANCH_ELEMENT[ch], ch);

// ── output ───────────────────────────────────────────────────────────────────
const HELP = `k-saju — deterministic four-pillars (사주 · Saju · BaZi) chart in your terminal

usage
  npx k-saju <YYYY-MM-DD> [HH:mm] [options]
  npx k-saju                          interactive mode

options
  --lunar             input date is Korean lunar
  --leap              lunar leap month (윤달)
  --gender M|F|N      for luck-pillar direction (default N: year-stem polarity)
  --place <city>      birth place preset: ${Object.keys(PLACES).join(', ')}
  --lon <deg>         birth longitude °E (negative = °W) — true solar time
  --tz <zone|±HH:MM>  birth timezone (IANA name or fixed offset) for non-KST births
  --json              raw JSON output
  --no-color          plain output
  -v, --version       print version

examples
  npx k-saju 1995-03-16 07:30
  npx k-saju 1990-11-05 23:40 --place seoul
  npx k-saju 1988-07-04 09:10 --place new-york --gender F
  npx k-saju 1995-03-16 --lunar --leap`;

function bar(value: number, max: number): string {
  const width = Math.max(value > 0 ? 1 : 0, Math.round((value / Math.max(max, 1)) * 12));
  return '█'.repeat(width) + dim('░'.repeat(Math.max(0, 12 - width)));
}

/** One 8-column-wide box cell: 3 spaces + CJK char (2 cols) + 3 spaces. */
function cell(painted: string | null): string {
  return painted ? `   ${painted}   ` : `   ${dim('──')}   `;
}

function render(birth: BirthInput, gender: 'M' | 'F' | 'N'): string {
  const saju = deriveSaju(birth);
  const elements = analyzeElements(saju);
  const sipseong = analyzeSipseong(saju);
  const ilju = iljuInfo(saju);
  const daeun = analyzeDaeun(birth, saju, gender);
  const L: string[] = [];

  L.push('');
  L.push(`  ${bold('k-saju')} ${dim(`v${ENGINE_VERSION} · four pillars, computed — not guessed`)}`);
  L.push('');

  // Pillars box — traditional order: hour · day · month · year (right = year).
  const cols = [saju.hour?.hanja ?? null, saju.day.hanja, saju.month.hanja, saju.year.hanja];
  const center8 = (s: string) => s.padStart(Math.floor((8 + s.length) / 2)).padEnd(8);
  const heads = ['hour', 'day', 'month', 'year']
    .map((h, i) => (i === 1 ? bold(center8(h)) : dim(center8(h))));
  const stems = cols.map((h) => cell(h ? stemPaint(h[0]) : null));
  const branches = cols.map((h) => cell(h ? branchPaint(h[1]) : null));
  L.push(`    ${heads.join(' ')}`);
  L.push(`   ┌${Array(4).fill('────────').join('┬')}┐`);
  L.push(`   │${stems.join('│')}│`);
  L.push(`   │${branches.join('│')}│`);
  L.push(`   └${Array(4).fill('────────').join('┴')}┘`);

  // Per-pillar English glosses.
  const gloss = (label: string, hanja: string | null, mark = '') =>
    hanja
      ? `   ${dim(label.padEnd(6))} ${hanja}  ${ganjiLabel(hanja)}${mark}`
      : `   ${dim(label.padEnd(6))} ${dim('─  unknown time (3-pillar chart)')}`;
  L.push(gloss('year', saju.year.hanja));
  L.push(gloss('month', saju.month.hanja));
  L.push(gloss('day', saju.day.hanja, dim('  ← you')));
  L.push(gloss('hour', saju.hour?.hanja ?? null));
  L.push('');

  // Corrections applied — the honest-math section.
  if (saju.solarTermAdjusted)
    L.push(dim('   ⟲ solar-term corrected: the minute-exact term instant moved the year/month pillars'));
  if (saju.trueSolarApplied)
    L.push(dim(`   ⟲ true solar time: hour boundary shifted ${saju.hourCorrectionMin} min (longitude + equation of time)`));
  if (saju.solarTermAdjusted || saju.trueSolarApplied) L.push('');

  // Day master.
  const stage = ilju.twelveStage ? `${ilju.twelveStage} ${STAGE_EN[ilju.twelveStage] ?? ''}` : '';
  L.push(`   ${bold('day master')}  ${stemPaint(ilju.dayStem)} ${stemLabel(ilju.dayStem)}` +
    (stage ? dim(`  ·  stage ${stage}`) : '') +
    (ilju.branchSipseong ? dim(`  ·  seat ${ilju.branchSipseong} ${SIPSEONG_DETAIL_EN[ilju.branchSipseong] ?? ''}`) : ''));
  L.push('');

  // Five elements (weighted by hidden stems).
  const maxW = Math.max(...Object.values(elements.weighted));
  (Object.keys(ELEMENT_EN) as Element[]).forEach((el) => {
    const w = elements.weighted[el];
    const absent = elements.lacking.includes(el) ? dim('  (absent in principal counts)') : '';
    L.push(`   ${elc(el, el)} ${ELEMENT_EN[el].padEnd(5)} ${bar(w, maxW)} ${w.toFixed(1)}${absent}`);
  });
  L.push('');

  // Ten gods.
  const tg = (Object.entries(sipseong.counts) as [keyof typeof sipseong.counts, number][])
    .map(([k, v]) => {
      const label = `${SIPSEONG_EN[k]} ${v}`;
      return sipseong.dominant.includes(k) ? bold(label) : dim(label);
    })
    .join(dim(' · '));
  L.push(`   ${dim('ten gods')}    ${tg}`);

  // Luck pillars.
  if (daeun) {
    const steps = daeun.pillars
      .map((p) => `${dim(String(p.startAge))} ${stemPaint(p.stem)}${branchPaint(p.branch)}`)
      .join(dim('  '));
    L.push(`   ${dim('luck cycles')} ${dim(`${DIRECTION_EN[daeun.direction]}, every 10y from age ${daeun.daeunsu}`)}${gender === 'N' ? dim(' (pass --gender M|F for the classical rule)') : ''}`);
    L.push(`   ${steps}`);
  }
  L.push('');
  L.push(dim('   numbers by k-saju (MIT, deterministic) · the full AI reading lives at ioreum.com/en'));
  L.push('');
  return L.join('\n');
}

// ── interactive mode ─────────────────────────────────────────────────────────
async function interactive(): Promise<{ birth: BirthInput; gender: 'M' | 'F' | 'N' }> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n  ${bold('k-saju')} ${dim('· your four pillars, from calendar math alone')}\n`);
  const date = (await rl.question('  birth date (YYYY-MM-DD) › ')).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    rl.close();
    console.error('  need YYYY-MM-DD (e.g. 1995-03-16)');
    process.exit(1);
  }
  const timeRaw = (await rl.question('  birth time  (HH:mm, enter to skip) › ')).trim();
  const time = /^\d{1,2}:\d{2}$/.test(timeRaw) ? timeRaw.padStart(5, '0') : undefined;
  const cal = (await rl.question('  calendar    (s = solar, l = korean lunar) [s] › ')).trim().toLowerCase();
  const place = (await rl.question(`  birth place (${Object.keys(PLACES).slice(0, 5).join(', ')}, … — enter to skip) › `)).trim().toLowerCase();
  rl.close();
  const birth: BirthInput = { date, time, calendar: cal === 'l' ? 'lunar' : 'solar' };
  const preset = PLACES[place];
  if (preset) {
    birth.longitude = preset.lon;
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = (time ?? '12:00').split(':').map(Number);
    birth.tzOffsetMin = offsetMinAt(preset.tz, y, mo, d, h, mi);
  }
  return { birth, gender: 'N' };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  useColor = args.color && !process.env.NO_COLOR && process.stdout.isTTY !== false;
  if (args.version) { console.log(ENGINE_VERSION); return; }
  if (args.help) { console.log(HELP); return; }

  let birth: BirthInput;
  let gender = args.gender;
  if (!args.date) {
    if (process.stdin.isTTY) {
      ({ birth, gender } = await interactive());
    } else {
      console.log(HELP);
      return;
    }
  } else {
    birth = { date: args.date, time: args.time, calendar: args.lunar ? 'lunar' : 'solar' };
    if (args.lunar && args.leap) birth.isLeapMonth = true;
    const preset = args.place ? PLACES[args.place.toLowerCase()] : undefined;
    if (args.place && !preset) {
      console.error(`unknown --place (have: ${Object.keys(PLACES).join(', ')}) — or use --lon/--tz directly`);
      process.exit(1);
    }
    const lon = args.lon ?? preset?.lon;
    if (lon != null) birth.longitude = lon;
    const tzName = args.tz ?? preset?.tz;
    if (tzName) {
      const [y, mo, d] = args.date.split('-').map(Number);
      const [h, mi] = (args.time ?? '12:00').split(':').map(Number);
      birth.tzOffsetMin = resolveTzOffset(tzName, y, mo, d, h, mi);
    }
  }

  if (args.json) {
    const saju = deriveSaju(birth);
    console.log(JSON.stringify({
      input: { ...birth, gender },
      saju,
      elements: analyzeElements(saju),
      sipseong: analyzeSipseong(saju),
      ilju: iljuInfo(saju),
      daeun: analyzeDaeun(birth, saju, gender),
    }, null, 2));
    return;
  }
  console.log(render(birth, gender));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
