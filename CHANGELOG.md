# Changelog

All notable changes to this project are documented here. Boundary behavior is
treated as contract: any change to a computed pillar is a breaking change for
somebody's chart, so it gets an entry with the reason and the evidence.

This project adheres to [Semantic Versioning](https://semver.org/). Before 1.0,
correctness fixes may change output — that is the point of the pre-1.0 phase, and
every such change is listed below.

## [0.1.2] — 2026-09-01

Two correctness releases in one. **If you installed 0.1.0, charts for births on a
solar-term day were wrong in most years — please upgrade.**

### Fixed

- **Solar-term instants are now computed astronomically instead of read from the
  calendar dataset.** The dataset's `getSolarTermsByYear(year)` returns the same
  table for every year — 입춘 fixed at Feb 4, 05:02 KST for 2020 through 2030.
  The real instants differ by up to twelve hours and sometimes fall on a
  different day (2024: Feb 4 17:26 · 2025: Feb 3 23:10 · 2026: Feb 4 05:01 ·
  2027: Feb 4 10:46 KST). 0.1.0 trusted that table, so any birth on a term day in
  2020–2030 other than 2026 could receive the wrong year or month pillar. Terms
  are now derived from solar ecliptic longitude via
  [astronomy-engine](https://github.com/cosinekitty/astronomy) for 1900–2050,
  agreeing with the KASI-derived 2026 values within one minute (KASI publishes
  whole minutes, so that is rounding). *(commit `885c2e1`, which bumped the
  version to 0.1.1 — that version was never published to npm; it ships here.)*
- **Year and month pillars are now derived directly from the term instants**
  rather than from the dataset's day-level month table. That table switches month
  a day *after* the instant at many terms (경칩 2024 = Mar 5 11:22 KST, table
  flips Mar 6), so the 0.1.1 "term day, before the term time" patch was still
  wrong away from 입춘: `2024-03-05 12:00` kept 丙寅 instead of 丁卯, and
  `2025-02-03 23:30` kept 甲辰 instead of 乙巳. Off the boundaries the two agree
  on every day from 1905 to 2049 — that sweep is now a test. *(commit `8ae2439`)*
- **December 31 year-pillar corruption bypassed.** The dataset's year stem is
  corrupt on Dec 31 of twelve years in range; those days now carry Dec 30's
  computed pillars forward.
- **Luck-pillar starting age (대운수) measured against the astronomical
  instants** — forward: ceil, reverse: floor, unknown birth time judged at noon.
  `daysToTerm` is returned so you can audit the division against your own school.

### Added

- `solarTermsOfYear(year)` and `jeolgiOfYear(year)` — the 24 terms (or just the
  12 month boundaries) as KST wall-clock plus absolute instant.
- Regression guard for the bug class that caused all of this: a test asserting
  that **different years produce different term instants**. The original failure
  was invisible to example-based tests because the engine and the fixtures read
  the same table, and every probe happened to sit on one side of the true
  boundary.
- Test suite grown to 28, including the 1905–2049 agreement sweep.

### Note on 0.1.1

The version exists in commit history but was never published to npm. Everything
in it is included in 0.1.2. If you are reading the log and wondering where it
went — it is here.

## [0.1.0] — 2026-08-25

Initial public release. Four pillars from a birth instant: minute-exact solar
terms, true solar time (longitude + equation of time), timezone-aware foreign
births, five-element distribution with hidden stems, ten gods, luck pillars, and
a CLI. Extracted from the production engine behind [ioreum](https://www.ioreum.com/en).

[0.1.2]: https://github.com/bunhine0452/k-saju/releases/tag/v0.1.2
[0.1.0]: https://www.npmjs.com/package/k-saju/v/0.1.0
