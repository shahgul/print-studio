# Print Studio

> **From digital content to a predictable physical object.**

Print Studio is a planned local-first physical-layout and printing platform. Its purpose is not merely to expose more printer settings. It should let a beginner say what they want to make, let a professional control production details when needed, and use the same underlying geometry, layout, preflight, calibration, and printing engines for both.

The product starts from a simple observation: people think in outcomes — “put four cards on A4”, “print this photo at exactly 100 × 150 mm”, “make 32 worksheet copies with minimum paper”, “print this booklet correctly” — while existing software usually exposes document modes, driver terminology, or professional prepress concepts.

Print Studio aims to own the path from **content → physical sheets → validated layout → optimized production → predictable printer output**.

## Product thesis

Print Studio should eventually be:

- easy enough for an occasional user to get a correct result without understanding print terminology;
- useful enough for teachers, photographers, makers, designers, and small businesses to use repeatedly;
- deep enough for advanced imposition and prepress workflows;
- precise enough to treat millimetres, inches, points, printer margins, scaling, and duplex registration as first-class concerns;
- local-first so sensitive documents can remain on-device;
- built as reusable engines so the standalone app, DustChalk, a CLI, automation workflows, and future SDK/API consumers share the same core.

The defining concept is **intent → production-ready sheets**, not “PDF → print dialog”.

## Core pillars

1. **Physical-sheet workspace** — paper is the canvas; documents, photos, cards, labels, marks, folds, and cuts are physical objects on it.
2. **Smart layout** — optimize for minimum sheets, maximum size, easiest cutting, preserved orientation, material cost, or other explicit objectives.
3. **Print Truth** — explain requested physical size, effective scaling, printable area, resolution, clipping risk, and expected output before printing.
4. **Progressive complexity** — Simple mode expresses user intent; Studio/Production mode exposes professional controls over the same document model.
5. **Printer reality** — model printer capabilities, hardware margins, media, duplex behavior, and calibration instead of pretending a correct PDF guarantees a correct physical result.
6. **Reusable production recipes** — store intent and constraints, not just opaque dialog settings.
7. **Automation-ready architecture** — the same engines should support desktop UI, DustChalk, batch jobs, hot folders, CLI, and future SDK/API usage.

## Documentation map

Read these before implementation:

- [Product](docs/PRODUCT.md) — vision, audiences, jobs-to-be-done, scope, non-goals, success criteria.
- [Pain-point research](docs/PAIN-POINTS.md) — beginner, prosumer, teacher, maker, photographer, SMB, and professional-print problems.
- [Competitive landscape](docs/COMPETITORS.md) — rival categories, current capabilities, and where Print Studio must differentiate.
- [Features](docs/FEATURES.md) — comprehensive capability inventory from basic layout through production automation.
- [UX](docs/UX.md) — physical-sheet interaction model, Simple vs Studio/Production modes, onboarding, preview, and workflows.
- [Domain model](docs/DOMAIN-MODEL.md) — canonical concepts such as Project, Source, Item, Sheet, Side, Layout, Constraint, PrinterProfile, Recipe, and PrintJob.
- [Architecture](docs/ARCHITECTURE.md) — module boundaries, proposed technology direction, contracts, persistence, and separation of concerns.
- [Printing stack](docs/PRINTING-STACK.md) — OS spooler, IPP Everywhere, direct printing, capabilities, raw/device paths, calibration, and monitoring.
- [Testing](docs/TESTING.md) — TDD expectations, golden geometry/PDF fixtures, deterministic solver tests, calibration tests, and output verification.
- [Business](docs/BUSINESS.md) — monetization thesis, customer segments, editions, pricing hypotheses, and business risks.
- [DustChalk and integrations](docs/INTEGRATIONS.md) — how the engine can power teacher workflows and later third-party consumers.
- [Roadmap](docs/ROADMAP.md) — six-month sequence and gates.
- [Decisions and open questions](docs/DECISIONS.md) — decisions already made, decisions deliberately deferred, and research questions.
- [Glossary](docs/GLOSSARY.md) — print and prepress terminology.
- [Research references](docs/REFERENCES.md) — dated sources used to ground product and market assumptions.

## Initial product boundary

Print Studio is **not** intended to become Photoshop, Illustrator, Canva, Word, or a general-purpose design application. It may provide print-relevant edits such as crop, rotate, simple text, marks, borders, annotation, and basic overlays, but the product identity is:

> **Design elsewhere when you need unrestricted creative design. Prepare, arrange, optimize, validate, and print perfectly here.**

## Development philosophy

- Contract first for public module/API boundaries.
- Geometry and physical units are deterministic domain logic, not UI state.
- Preview and exported/printed output must derive from the same canonical model.
- Every behavior-changing implementation follows red → green → refactor.
- Printing correctness is tested with golden fixtures and measurable tolerances.
- No hidden scaling.
- No silent destructive fix.
- No “magic” optimization without showing the trade-off.
- No printer capability shown unless it is known or clearly labelled as assumed.
- Local processing is preferred; cloud features require a concrete benefit and explicit privacy story.

## Current status

**Planning / foundation.** The repository currently defines the complete product and engineering blueprint before implementation begins.

See [ROADMAP.md](docs/ROADMAP.md) for the build sequence.
