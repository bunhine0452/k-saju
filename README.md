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
| **Solar terms are instants, not dates.** The year/month pillar flips at 입춘 (start of spring) *05:02 KST*, not at midnight. | Apply the term at day granularity → everyone born that morning gets the wrong year pillar. | Minute-exact comparison; year & month corrected, day untouched. | `npx k-saju 2024-02-04 04:00` → year is still 癸卯, *not* 甲辰 |
| **The midnight hour (자시) is double-edged.** Born 23:31: whose day is your hour stem from? | Flip the day pillar, or ignore the late-자시 rule entirely. | Day pillar stays with clock midnight; hour stem takes the next day's stem (야자시 rule). | `npx k-saju 2000-05-15 23:31` → day 癸酉, hour 甲子 |
| **The clock is not the sun.** Korea's standard meridian is 135°E; Seoul sits at 127°. | One fixed −30 min for everyone, or nothing. | Optional true solar time: longitude × 4 min + equation of time, per birth date. | `npx k-saju 2000-05-05 09:30 --lon 124.7` → 丙辰, while Seoul gets 丁巳 |
| **Foreign births need absolute time.** Solar terms are astronomical instants; a New York evening can already be past a KST-dated term. | Compare local *dates* to KST term *dates*. | Convert the term instant to the birth timezone and compare instants. | `npx k-saju 2024-02-03 16:00 --place new-york` → year 甲辰 on "Feb 3" |

Every number in this table is enforced by the test suite. If a claim here ever
drifts from the code, CI fails.

## Install

```bash
npm install k-saju        # library
npx k-saju                # or just run the CLI, interactive
```

ESM only, Node ≥ 20, TypeScript types included. One runtime dependency
([`@fullstackfamily/manseryeok`](https://www.npmjs.com/package/@fullstackfamily/manseryeok),
MIT — the KASI-derived Korean calendar dataset, 1900–2050).

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
  date: '2024-02-03', time: '16:00', calendar: 'solar',
  tzOffsetMin: -300,   // New York, EST at that date
  longitude: -74.01,   // true solar time for the hour pillar
});
// → year pillar 甲辰: locally it's Feb 3, but 입춘 already passed in absolute time
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
| `iljuInfo(saju)` / `twelveStage(stem, branch)` | Day-pillar reading: twelve life stage + the ten-god of the seat |
| `stemLabel` / `branchLabel` / `ganjiLabel` / `*_EN` maps | English display layer: `'丙申'` → `'Yang Fire Monkey'`, `'제왕'` → `'Peak'`, … |

The engine speaks hanja and Korean internally (the canonical vocabulary of the
domain) and translates only at the display layer — the same discipline we use in
production.

## Honest limits

Claims of "accuracy" in this domain usually hide school choices and dataset gaps.
Ours, in the open:

- **Minute-exact solar-term times cover 2020–2030** (the dataset's range). Outside
  it, term boundaries fall back to day granularity — exactly what other tools do
  *everywhere*. Extending minute-level terms to 1900–2050 via astronomical
  computation is [the roadmap's #1 item](#roadmap).
- **Luck-pillar starting age** uses day-granular term boundaries (noon sampling),
  so it can differ from a paper almanac by ±1 year. `daysToTerm` is returned so
  you can audit the division yourself.
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

- [ ] Minute-exact solar terms for the full 1900–2050 range (astronomical
      computation — **help wanted**, this is a fun one)
- [ ] Branch relations (합·충·형·파·해) module
- [ ] Zero-build browser playground (GitHub Pages)
- [ ] Chart SVG renderer (the CLI box, as an embeddable image)

## Contributing

`npm ci && npm test` — 17 golden tests should be green in under a second.
Boundary behavior is contract: a PR that changes any golden value needs a source
(an almanac, KASI data, or a school reference). See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Credits & license

Calendar dataset by [@fullstackfamily/manseryeok](https://www.npmjs.com/package/@fullstackfamily/manseryeok) (MIT).
Engine extracted from the production core of [ioreum](https://www.ioreum.com/en) — released
so anyone can check the math behind a reading. MIT, do what you like.

If this saved you from re-deriving 절기 boundary math at 2 a.m., a ⭐ helps the
next person find it.
