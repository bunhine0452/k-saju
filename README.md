<div align="center">

# k-saju

**Four Pillars (사주 · Saju · BaZi), computed — not guessed.**

A deterministic TypeScript engine for Korean four-pillars charts:
minute-exact solar terms, true solar time, timezone-aware — and honest about every convention it picks.

[![ci](https://github.com/bunhine0452/k-saju/actions/workflows/ci.yml/badge.svg)](https://github.com/bunhine0452/k-saju/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/k-saju.svg)](https://www.npmjs.com/package/k-saju)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node ≥ 20](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](#install)

<img src="./assets/demo.svg" alt="npx k-saju 1995-03-16 07:30 — an animated terminal four-pillars chart" width="760">

```bash
npx k-saju 1995-03-16 07:30
```

*[한국어 README](./README.ko.md)*

</div>

---

Saju (사주, "four pillars") is Korea's centuries-old system for mapping a birth
instant onto the traditional calendar: a year, month, day, and hour pillar, each a
pair of one heavenly stem and one earthly branch. Korean fortune-tellers read those
eight characters; this library only **computes** them — deterministically, with the
boundary math done right.

It is the open-sourced calculation core of [ioreum](https://www.ioreum.com/en),
where the same numbers feed an AI that writes the actual reading. The philosophy,
there and here: **calculation is code; interpretation is language.** An LLM never
touches a number.

## Why this exists

Every saju/BaZi calculator agrees on the easy 95%. The remaining 5% — the
boundaries — is where nearly all of them quietly disagree with the almanac.
These four traps are locked by [golden tests](./test) here:

| The trap | What many tools do | What k-saju does | See for yourself |
| --- | --- | --- | --- |
| **Solar terms are instants, not dates.** In 2024 the year/month pillar flips at 입춘 (start of spring) *Feb 4, 17:26 KST*, not at midnight. | Apply the term at day granularity → everyone born earlier that day gets the wrong year pillar. | Minute-exact comparison against the astronomical instant; year & month corrected, day untouched. | `npx k-saju 2024-02-04 04:00` → year is still 癸卯, *not* 甲辰 |
| **The midnight hour (자시) is double-edged.** Born 23:31: whose day is your hour stem from? | Flip the day pillar, or ignore the late-자시 rule entirely. | Day pillar stays with clock midnight; hour stem takes the next day's stem (야자시 rule). | `npx k-saju 2000-05-15 23:31` → day 癸酉, hour 甲子 |
| **The clock is not the sun.** Korea's standard meridian is 135°E; Seoul sits at 127°. | One fixed −30 min for everyone, or nothing. | Optional true solar time: longitude × 4 min + equation of time, per birth date. | `npx k-saju 2000-05-05 09:30 --lon 124.7` → 丙辰, while Seoul gets 丁巳 |
| **Foreign births need absolute time.** Solar terms are astronomical instants; on a New York morning a KST-dated term may not have happened yet (입춘 2024 = 03:26 EST). | Compare local *dates* to KST term *dates*. | Convert the term instant to the birth timezone and compare instants. | `npx k-saju 2024-02-04 00:30 --place new-york` → year still 癸卯 on "Feb 4" |

Every number in this table is enforced by the test suite. If a claim here ever
drifts from the code, CI fails.

## Install

```bash
npm install k-saju        # library
npx k-saju                # or just run the CLI, interactive
```

ESM only, Node ≥ 20, TypeScript types included. Two runtime dependencies, both MIT:
[`@fullstackfamily/manseryeok`](https://www.npmjs.com/package/@fullstackfamily/manseryeok)
(the KASI-derived Korean calendar dataset, 1900–2050 — day pillar and lunar↔solar
conversion) and [`astronomy-engine`](https://www.npmjs.com/package/astronomy-engine)
(solar-term instants, computed rather than tabulated).

## Quick start

```ts
import {
  deriveSaju, analyzeElements, analyzeSipseong, analyzeDaeun,
  iljuInfo, ganjiLabel, ELEMENT_EN,
} from 'k-saju';

const birth = { date: '1995-03-16', time: '07:30', calendar: 'solar' } as const;

const chart = deriveSaju(birth);
chart.day.hanja;            // '丙午'
chart.day.korean;           // '병오'
ganjiLabel(chart.day.hanja) // 'Yang Fire Horse'

const elements = analyzeElements(chart);
elements.counts;            // { 木: 2, 火: 2, 土: 2, 金: 0, 水: 2 }  ← integer, principal-element
elements.weighted;          // { 木: 2.533, 火: 1.7, 土: 2.133, 金: 0, 水: 1.633 }  ← hidden-stem weighted
elements.lacking;           // ['金']

const tenGods = analyzeSipseong(chart);   // distribution vs. the day master
const daily  = iljuInfo(chart);           // day pillar: twelve stage + seat ten-god
const luck   = analyzeDaeun(birth, chart, 'M');  // 8 × 10-year luck pillars
```

Born outside Korea? Give the engine the local wall clock plus where:

```ts
deriveSaju({
  date: '2024-02-04', time: '00:30', calendar: 'solar',
  tzOffsetMin: -300,   // New York, EST at that date
  longitude: -74.01,   // true solar time for the hour pillar
});
// → year pillar 癸卯: locally it's already Feb 4, but 입춘 (17:26 KST = 03:26 EST)
//   hasn't happened yet in absolute time — a date-based tool would say 甲辰
```

Lunar birthdays, leap months included:

```ts
deriveSaju({ date: '2020-04-15', calendar: 'lunar', isLeapMonth: true, time: '09:00' });
```

## What it computes

| Function | Returns |
| --- | --- |
| `deriveSaju(birth)` | The four pillars, with correction flags (`solarTermAdjusted`, `trueSolarApplied`, `hourCorrectionMin`) so you can *show* users what was corrected and why |
| `analyzeElements(saju)` | Five-element distribution — integer principal counts **and** a finer distribution weighting each branch by its hidden stems (지장간, traditional day-count ratios) |
| `analyzeSipseong(saju)` | Ten-gods distribution relative to the day master (Companion / Output / Wealth / Authority / Resource) |
| `analyzeDaeun(birth, saju, gender)` | Luck pillars (대운): direction, starting age, 8 pillars — with `daysToTerm` published so the arithmetic is auditable |
| `solarTermsOfYear(year)` / `jeolgiOfYear(year)` | The 24 solar terms of a year (or just the 12 month-boundary 절기) as KST wall-clock time + absolute instant, computed astronomically for 1900–2050 |
| `iljuInfo(saju)` / `twelveStage(stem, branch)` | Day-pillar reading: twelve life stage + the ten-god of the seat |
| `stemLabel` / `branchLabel` / `ganjiLabel` / `*_EN` maps | English display layer: `'丙申'` → `'Yang Fire Monkey'`, `'제왕'` → `'Peak'`, … |

The engine speaks hanja and Korean internally (the canonical vocabulary of the
domain) and translates only at the display layer — the same discipline we use in
production.

## Honest limits

Claims of "accuracy" in this domain usually hide school choices and dataset gaps.
Ours, in the open:

- **Solar-term instants are computed, not tabulated** (astronomy-engine,
  1900–2050; outside that range the calendar dataset's day-granular pillars are
  used as-is). They agree with the KASI-derived 2026 values within 1 minute; KASI
  publishes whole minutes, so a 1-minute difference is rounding. *Why computed:*
  the calendar dataset's own term table returns the 2026 values for every year
  2020–2030 — 0.1.0 relied on it and was wrong for term-day births in every
  other year (fixed in 0.1.1).
- **Year & month pillars are computed directly from the solar-term instants; the
  day pillar comes from the calendar library.** *Why:* the dataset's day-level
  month table switches months a day *after* the instant at many terms (경칩 2024 =
  Mar 5 11:22 KST, table flips Mar 6), so 0.1.1's "term-day, before the term time"
  patch still gave `2024-03-05 12:00` the old month (丙寅 instead of 丁卯) and
  `2025-02-03 23:30` the old year (甲辰 instead of 乙巳). Fixed in 0.1.2; off the
  boundaries the two agree on every day 1905–2049 (the sweep is a test), except
  Dec 31 of 12 years where the dataset's year stem is corrupt — now bypassed.
- **Luck-pillar starting age** measures days to the term against the astronomical
  instants (forward: ceil, reverse: floor; unknown time → noon). Schools still
  place the first pillar ±1 year apart, so `daysToTerm` is returned for you to
  audit the division yourself.
- **Equation of time** uses the standard approximation (±0.5 min).
- **Conventions declared:** hour branches anchor at true-solar 23:00 (the classic
  −30 min Korean manseryeok correction when no longitude is given); late 자시
  takes the next day's stem while the day pillar keeps clock midnight; foreign
  births follow the local-time school; luck direction is year-stem polarity ×
  gender. If your school differs, the code is short and readable — fork the rule.
- **Calendar dataset**: 1900–2050 (KASI-derived, MIT).

## Glossary

| Term | Meaning |
| --- | --- |
| 사주 saju / 八字 BaZi | "Four pillars" — year/month/day/hour, each one stem + one branch. Same computational core; Korean and Chinese practice differ in conventions, which this engine makes explicit |
| 만세력 manseryeok | The Korean perpetual almanac this library replaces with code |
| 입춘 / solar terms | 24 astronomical points of the solar year; 12 of them bound the months, 입춘 bounds the year |
| Day master (일간) | The day pillar's stem — "you" in a chart; everything else is read relative to it |
| 지장간 hidden stems | Stems concealed inside each branch; used here to weight the element distribution |
| 십성 ten gods | The five relation categories (× yin/yang) between the day master and everything else |
| 대운 luck pillars | The 10-year periods; direction and starting age are computed, not vibes |

## FAQ

**Is this fortune-telling?** No — it's the *calendar math underneath it*. The
engine deterministically converts a birth instant into traditional symbolic
coordinates. What those mean to you is interpretation, and deliberately out of
scope. (If you want the interpretation layer done well, that's
[our product](https://www.ioreum.com/en).)

**Saju vs. BaZi?** Same four-pillars core. Schools differ on the boundary rules —
which is precisely the part this library treats as first-class, documented,
tested behavior instead of silent defaults.

**Browser?** The engine is pure ESM TypeScript and bundles fine (the CLI is
Node-only). A zero-build playground page is on the roadmap.

**Why are outputs in hanja/Korean?** Canonical values stay canonical; the
`labels` module maps them to English at render time. Your UI can do the same in
any language.

## Roadmap

- [x] Minute-exact solar terms for the full 1900–2050 range (astronomical
      computation — shipped in 0.1.1)
- [x] Year & month pillars and the luck-pillar starting age (대운수) from the
      astronomical term instants instead of the dataset's day-level table
      (shipped in 0.1.2)
- [ ] Branch relations (합·충·형·파·해) module
- [ ] Zero-build browser playground (GitHub Pages)
- [ ] Chart SVG renderer (the CLI box, as an embeddable image)

## Contributing

`npm ci && npm test` — 28 golden tests should be green in under a second.
Boundary behavior is contract: a PR that changes any golden value needs a source
(an almanac, KASI data, or a school reference). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Credits & license

Calendar dataset by [@fullstackfamily/manseryeok](https://www.npmjs.com/package/@fullstackfamily/manseryeok) (MIT);
solar-term astronomy by [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT).
Engine extracted from the production core of [ioreum](https://www.ioreum.com/en) — released
so anyone can check the math behind a reading. MIT, do what you like.

If this saved you from re-deriving 절기 boundary math at 2 a.m., a ⭐ helps the
next person find it.
