# Roadmap

## What this library is for

k-saju converts a birth instant into traditional four-pillar coordinates, and
does nothing else. Everything on this roadmap serves one claim: **the numbers are
checkable.** If an item cannot be verified against an independent source, it does
not belong here.

**In scope:** calendar and astronomical math, boundary conventions, the symbolic
derivations that follow mechanically from the pillars (elements, hidden stems,
ten gods, luck pillars), and anything that makes those auditable.

**Out of scope, permanently:** interpretation, readings, compatibility scores,
naming, life advice. Not because it is hard, but because it is not verifiable —
mixing it in is exactly how this genre earned its reputation. (That layer is
[our product](https://www.ioreum.com/en); it is a different kind of thing and it
should stay in a different repository.)

## Ordering principle

Correctness and verifiability come before features. 0.1.0 shipped trusting a
lookup table that returned the same answer for every year, and the test suite
could not see it because the fixtures read the same table. Every remaining place
where this library trusts data it did not compute is a repeat of that bug waiting
to happen — so those get cleared first, and the features that make the project
pleasant to find and use ride alongside.

---

## Next

### Test vectors as a published artifact

Export the boundary cases the golden tests lock — term instants, term-day births,
foreign births, late-자시 days, luck-pillar starting ages — as plain JSON under
`vectors/`, versioned and shipped in the package.

*Why first:* it is the cheapest item here and it changes what the project is. A
port in Python, Go, or Rust can then verify against the same cases instead of
re-deriving them, which makes k-saju the reference for a boundary question rather
than one more implementation of it. It also gives anyone auditing a claim in the
README a file to run rather than a paragraph to trust.

### Zero-build browser playground (GitHub Pages)

A single page: birth date, time, place, and the pillar box, running the engine
client-side with no install.

*Why:* "show me" currently requires `npx`. A link that answers the question in
five seconds is worth more than another README section, and it doubles as the
demo for anything the project claims.

---

## v0.2 — Compute the day pillar

The day pillar is a continuous sexagenary count; it can be derived from the
Julian Day Number with a fixed anchor and no dataset at all. Today it still comes
from the calendar library — the same library whose year stem is corrupt on
December 31 of twelve years in range, which we currently work around by carrying
December 30 forward.

Computing it removes the last dataset dependency from the pillar path, deletes
that workaround and its whole bug class, and extends the usable range past
1900–2050.

*How it gets verified:* the 1905–2049 agreement sweep already exists as a test.
Inside that range this must be a provable no-op — every day identical, or the
change does not ship. The day-boundary conventions (KST midnight for the day
pillar, late 자시 taking the next day's stem) stay exactly as documented; the
sweep is what proves it.

## v0.3 — Compute lunar↔solar conversion

The last remaining use of the calendar dataset. Lunisolar months begin at the new
moon in local time, and a leap month is the one without a 중기 — both computable
with the astronomy dependency already present.

This is the ambitious item, and the conventions matter more than the astronomy:
Korean practice must match the KASI calendar. So it ships behind a full
comparison against the dataset across 1900–2050 first, and only becomes the
default when the two agree everywhere. If they disagree anywhere, the
disagreement gets documented before either side is called correct.

Landing this means k-saju computes every value it returns.

## v0.4 — Branch relations (합·충·형·파·해)

Combination, clash, punishment, destruction, harm — as pure functions over the
four branches, returned as data rather than prose. Well-defined tables, no
astronomy, no interpretation: it reports that a relation exists, not what it
means for you.

*Why not sooner:* it is the most requested practitioner feature and the easiest
to write, which is precisely why it should wait behind the correctness work. A
relation module built on pillars that might be off by a day is worse than no
relation module.

## Later

- **Chart SVG renderer** — the CLI box as an embeddable image, for issue threads,
  docs, and share cards.
- **Range beyond 1900–2050** — falls out of v0.2 and v0.3 nearly for free;
  needs a decision on how far back the conventions are even meaningful.
- **Historical daylight saving as declared data** — currently handled for Korea;
  other countries need the rules as an auditable table rather than code.

## 1.0

Tagged when every returned value is computed rather than looked up, the test
vectors have been stable across a release, and the boundary conventions have not
changed in a version. Until then, versions are pre-1.0 on purpose: **correctness
fixes may change output**, and each one is listed in
[CHANGELOG.md](./CHANGELOG.md) with its reason and evidence.

## Contributing to this

Boundary behavior is contract. A PR that changes any computed value needs a
source — an almanac, KASI data, or a school reference — and a test that fails
before the change. Disagreeing with a convention is welcome and is usually a
documentation issue first: see [CONTRIBUTING.md](./CONTRIBUTING.md).
