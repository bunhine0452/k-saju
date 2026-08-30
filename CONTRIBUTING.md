# Contributing to k-saju

Thanks for looking under the hood. This engine's whole value is that its numbers
can be trusted, so the bar for changes is "prove it", not "trust me".

## Setup

```bash
npm ci
npm test          # 28 golden tests, < 1 s
npm run typecheck
npm run build && node bin/k-saju.mjs 1995-03-16 07:30
```

## Ground rules

1. **Golden tests are contract.** They lock boundary behavior (solar terms, the
   midnight 자시 rule, leap months, true solar time, foreign timezones) against
   verified almanac values. A PR that changes a golden expectation must cite a
   source: a published almanac, KASI data, or a named school/reference — in the
   PR description *and* in a code comment.
2. **Determinism is non-negotiable.** No network, no randomness, no locale- or
   machine-dependent behavior in `src/` (the CLI may read the environment for
   colors/TTY only).
3. **Canonical values stay canonical.** Engine outputs speak hanja/Korean;
   English (or any language) belongs in the display layer (`labels.ts`).
4. **School choices are features, not bugs.** If your tradition computes a rule
   differently (e.g. 야자시 handling), don't silently change the default —
   propose it as a documented option.
5. **Keep it lean.** Two runtime dependencies (the calendar dataset and the
   astronomy library) are the budget. New ones need a very good reason.

## Good first contributions

- A day-pillar cross-check against a second source: the day pillar is the last
  value still read from the calendar dataset (which has a hole at 1956-12-31 and
  corrupt year stems on Dec 31 of 12 years — see test/solar-terms-direct.test.ts).
- Branch relations (합·충·형·파·해) as a new module with its own golden tests.
- More city presets / better `--place` UX in the CLI.
- Cross-checking golden cases against additional published almanacs.

## Reporting a wrong chart

Open an issue with: birth input (date, time, calendar, place), the pillars you
expected, the pillars you got, and the source you checked against. Boundary
cases (births within ±1 day of a solar term, 23:00–01:00, lunar leap months)
are exactly what we want to hear about.
