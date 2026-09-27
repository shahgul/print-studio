# Print Studio

> **From digital content to a predictable physical object.**

Print Studio is a planned local-first physical-layout and print-production platform. It is not meant to be another print dialog or a pile of PDF utilities. It should let a beginner describe the physical result they want, let a professional control production details when necessary, and use the same geometry, layout, preflight, calibration, and printing engines for both.

People think in outcomes:

- “put four cards on A4”;
- “print this photo at exactly 100 × 150 mm”;
- “make 32 worksheet copies with minimum paper”;
- “make front and back line up”;
- “turn this PDF into a correctly folded booklet”.

Existing software often exposes document modes, driver terminology, vendor dialogs, or professional prepress concepts instead.

Print Studio aims to own:

**content → physical sheets → validated layout → optimized production → predictable printer output**

## Product thesis

Print Studio should eventually be:

- easy enough for an occasional user to get a correct result without understanding print terminology;
- useful enough for teachers, photographers, makers, designers, and small businesses to use repeatedly;
- deep enough for advanced imposition and prepress workflows;
- precise enough to treat millimetres, inches, points, printer margins, scaling, and duplex registration as first-class concerns;
- local-first so sensitive documents can remain on-device;
- built as reusable engines so the standalone app, DustChalk, CLI/automation, and future SDK/API consumers share the same core.

The defining concept is:

> **intent → production-ready sheets**

not merely:

> PDF → print dialog

## Core pillars

1. **Physical-sheet workspace** — paper is the canvas; documents, photos, cards, labels, marks, folds, and cuts are physical objects on it.
2. **Smart Layout** — optimize for minimum sheets, maximum size, easiest cutting, preserved orientation, material cost, or other explicit objectives.
3. **Print Truth** — explain requested physical size, effective scaling, printable area, resolution, clipping risk, calibration, and expected output before printing.
4. **Progressive complexity** — Simple, Studio, and Production modes expose increasing control over the same domain model.
5. **Printer reality** — model printer capabilities, hardware margins, media, duplex behavior, and calibration instead of pretending a correct PDF guarantees a correct physical result.
6. **Reusable production recipes** — store intent and constraints, not opaque dialog settings.
7. **Automation-ready architecture** — the same engines can support desktop UI, DustChalk, batch jobs, hot folders, CLI, and future SDK/API usage.
8. **Local-first trust** — ordinary document layout and printing should not require uploading files to a server.

## Documentation

The repository is deliberately documentation-heavy before implementation. Read the relevant canonical docs rather than expanding README into a duplicate specification.

### Product and research

- [Product](docs/PRODUCT.md) — vision, audiences, jobs-to-be-done, product pillars, scope and non-goals.
- [Pain Points](docs/PAIN-POINTS.md) — beginner, teacher, maker, photographer, SMB, and professional printing problems.
- [Market and Impact](docs/MARKET-AND-IMPACT.md) — how large/impactful the problem may be without inflating broad printing markets into a fake TAM.
- [Competitive Landscape](docs/COMPETITORS.md) — current rivals, what they already solve, and where Print Studio must be different.
- [Business](docs/BUSINESS.md) — monetization thesis, pricing hypotheses, customer ladder, free/paid principles and B2B/SDK direction.
- [Research References](docs/REFERENCES.md) — dated standards, market, competitor, and anecdotal sources.
- [Research Backlog](docs/RESEARCH-BACKLOG.md) — user, printer, solver, PDF, color, commercial, legal, and competitor questions still requiring validation.
- [Quadient Inspire Lessons](docs/QUADIENT-INSPIRE-LESSONS.md) — lessons from Designer, Interactive, Automation, Scaler, and Production Server that should inform Print Studio architecture without turning it into a CCM product.

### Product behavior and UX

- [Features](docs/FEATURES.md) — comprehensive capability inventory from everyday printing through production automation.
- [UX](docs/UX.md) — physical-sheet interaction model, intent-first workflows, Simple/Studio/Production modes, Print Truth, calibration, duplex, cutting and accessibility.
- [Smart Layout](docs/SMART-LAYOUT.md) — solver inputs, constraints, objectives, alternatives, explainability, determinism and algorithm roadmap.
- [Preflight and Imposition](docs/PREFLIGHT-AND-IMPOSITION.md) — professional PDF checks, boxes, bleed, marks, booklet/signatures, cut-and-stack, gang work and automation direction.
- [Glossary](docs/GLOSSARY.md) — print/prepress terminology.

### Engineering

- [Domain Model](docs/DOMAIN-MODEL.md) — canonical Project, Source, Item, Sheet, Side, Constraint, Layout, Recipe, PrinterProfile, PrintPlan and PrintJob concepts.
- [Architecture](docs/ARCHITECTURE.md) — module boundaries, technology direction, persistence, preview/output separation, APIs and security.
- [Printing Stack](docs/PRINTING-STACK.md) — print-ready export, OS spooler, IPP Everywhere, AirPrint-related paths, selected raw/device options, capability normalization and job lifecycle.
- [Calibration](docs/CALIBRATION.md) — exact-size, offset, duplex registration, confidence and future camera-assisted calibration.
- [Testing](docs/TESTING.md) — TDD, golden geometry/PDFs, solver regression, protocol fakes, security/fuzzing, physical verification and release gates.
- [Security and Privacy](docs/SECURITY-AND-PRIVACY.md) — local-first boundary, hostile documents, printer discovery, transport, logging, telemetry and future cloud behavior.
- [Integrations](docs/INTEGRATIONS.md) — DustChalk, SDK, CLI, hot folders, local API, design tools and future OEM integrations.

### Planning and governance

- [Roadmap](docs/ROADMAP.md) — six-month sequence with exit gates.
- [Decisions](docs/DECISIONS.md) — accepted decisions, preferred technology direction and deliberately deferred choices.
- [Risks](docs/RISKS.md) — product, engineering, printer, privacy, commercial and research risks.
- [AGENTS.md](AGENTS.md) — operating instructions for future coding agents and contributors.

## Initial product boundary

Print Studio is **not** intended to become Photoshop, Illustrator, Canva, Word, or a general-purpose design application.

It may provide print-relevant editing such as:
- crop;
- rotate;
- resize;
- simple text/captions;
- borders;
- annotations;
- overlays;
- production marks.

But the product rule is:

> **Design elsewhere when unrestricted creative editing is required. Prepare, arrange, optimize, validate, and print here.**

## Development philosophy

- Contract first for public module/API boundaries.
- Geometry and physical units are deterministic domain logic, not UI state.
- Preview and exported/printed output derive from the same canonical model.
- Every behavior-changing implementation follows red → green → refactor.
- Printing correctness is tested with golden fixtures and measurable tolerances.
- No hidden scaling.
- No silent destructive fix.
- No “magic” optimization without showing the trade-off.
- No printer capability shown unless known or clearly marked as assumed.
- Local processing is preferred; cloud features require a concrete benefit and explicit privacy story.
- Do not promise physical precision beyond what printer calibration and hardware tolerances support.

## Current status

**Blueprint complete; Month 1 scaffold initialized.**

The repository now captures the product, market, competitor, UX, domain, architecture, printer-control, calibration, professional-production, business, integration, test, risk, and six-month roadmap decisions discussed before development. The pnpm workspace, React/Vite desktop app, Tauri 2 shell, core package boundaries, quality scripts, and CI are scaffolded; physical-unit behavior is intentionally not implemented yet.

Start with [ROADMAP.md](docs/ROADMAP.md) and [AGENTS.md](AGENTS.md) before writing application code.
