# Testing and Correctness Strategy

Printing converts software decisions into consumed physical material. Correctness must be treated more seriously than visual plausibility.

## Core rule

Every behavioral change follows:

**RED → GREEN → REFACTOR**

Bug fixes start with a reproducing test.

## Test pyramid

### Unit / small — majority
Pure:
- units;
- geometry;
- transforms;
- clipping;
- packing helpers;
- booklet ordering;
- copy expansion;
- calibration math;
- constraint evaluation;
- Print Truth calculations.

### Integration / medium
- PDF import;
- PDF export;
- image embedding;
- project persistence;
- preflight;
- recipe application;
- solver + renderer;
- IPP capability normalization;
- transport fake.

### E2E / large
Critical flows:
- import image → exact size → export;
- multi-page PDF → N-up → export;
- Smart Layout → accept → print-ready PDF;
- booklet;
- labels;
- calibration profile application;
- system/direct printer flow using test/fake endpoints;
- crash recovery.

### Current desktop test commands and provenance

- `pnpm test` runs deterministic Vitest domain, geometry, import, persistence, source monitoring, and viewport tests.
- `pnpm test:e2e:browser` runs focused WebdriverIO tests in headless Chrome. The Tauri service starts Vite and mocks selected native commands. It checks canvas launch, exact numeric geometry, undo/redo buttons and shortcuts, grouped dragging, redo invalidation, zoom/fit invariance, off-sheet rejection, and Save/Open UI serialization after redo. It does **not** prove native disk persistence or the operating-system file picker.
- M1.8 adds image import → exact-size placement → verified preview → Undo/Redo → mocked project Save/Open → PDF export E2E. Exported PDF bytes are reopened and inspected for A4 dimensions, embedded raster metadata, and identical content geometry across zoom changes. Native binary read/write is intercepted to preserve the raw IPC shape. Deterministic renderer tests separately inspect PNG/JPEG resource streams, crop/rotation matrices, typed failures, source identity, and EXIF orientation rejection. Native Rust tests verify atomic PDF replacement, path decoding, output guards, and failure preservation.
- On Windows, start `pnpm dev` in one terminal, then run `pnpm test:e2e:native` in another. The service uses external `tauri-driver` and WebView2 to launch the compiled `apps/desktop/src-tauri/target/debug/print-studio.exe` (build it first with `cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml`). It currently checks launch and starter canvas geometry. Local WebView2 element commands timed out, so this is a smoke test rather than full native workflow coverage.
- CI runs Vitest, the browser E2E suite, TypeScript quality/build checks, and Windows Rust tests. Native WebView2 E2E currently runs locally only; CI must not be described as covering native Save/Open or source watching.

Agent-operated Windows runtime checks covered M1.5 live source transitions and M1.6 canvas interactions. M1.6 still requires an exact edited-geometry Save → app restart → Open roundtrip using the real native file store. Computer Use is reserved for this native gap, exploratory issues, and visual checks until reliable E2E coverage exists. User physical verification is reserved for real printer output, measurement, device-specific behavior, and subjective UX judgment. Record each result with its actual provenance.

## Golden geometry fixtures

Deferred manual acceptance steps are kept in [TESTING-PENDING.md](../TESTING-PENDING.md). On 3 October 2026, Shahgul requested continuing M1.7 development while leaving the M1.6 native persistence gate open. Automated verification continues; a deferred checkpoint must never be reported as passed.

Maintain human-readable fixtures for known layouts.

Example:
- A4 portrait;
- 10 mm margins;
- 4 × A6-like objects;
- 5 mm gap;
- exact size;
- expected x/y/w/h/rotation.

Assert physical coordinates directly.

This is more important than screenshot equality.

## Golden PDFs

Use representative PDFs for:
- simple vector;
- raster-heavy;
- rotated pages;
- different boxes;
- mixed page sizes;
- transparency;
- fonts;
- damaged/edge cases where legally distributable.

Validate:
- page count;
- page dimensions;
- boxes;
- expected placement transforms;
- embedded resource properties when relevant;
- render smoke tests.

Binary byte-for-byte equality may be unstable because metadata/object ordering can vary. Prefer semantic validation plus selected visual goldens.

## Visual regression

Use rendering snapshots for:
- canvas interaction;
- printable-region overlays;
- marks;
- warnings;
- production previews.

Visual snapshots do not prove physical size. Pair them with geometry assertions.

## Property/invariant testing

Examples:
- placed hard-constrained items never overlap forbidden regions;
- exact-size items retain dimensions;
- no item crosses printable region when containment is hard;
- utilization is 0–100%;
- all requested copies are placed or reported unplaced;
- front/back pairs remain paired;
- booklet sequence includes each logical page once plus defined blanks;
- unit round-trips remain within tolerance.

## Solver regression corpus

Create fixtures for:
- cards;
- photos;
- worksheets;
- mixed-size items;
- rotation/no-rotation;
- awkward prime counts;
- narrow gaps;
- multiple sheet sizes;
- unsatisfiable cases;
- cut-friendly objective;
- locked placements.

Record:
- solver version;
- expected feasibility;
- expected sheet-count upper bound/optimum when known;
- invariants;
- performance budget.

Avoid tests that over-constrain implementation to one equivalent packing unless placement identity matters.

## Numerical tolerance policy

Define tolerances centrally.

Do not use:
- random epsilons scattered across code;
- CSS pixel tolerance for print geometry.

Tests must cover exact boundaries and near-boundary cases.

## Calibration tests

Pure:
- requested vs measured scale correction;
- X/Y independent correction;
- duplex offset;
- transform ordering;
- profile mismatch;
- stale profile warning.

Hardware:
- reference-line measurements;
- media variants;
- duplex registration repeatability;
- OS path vs direct IPP.

Hardware tests produce evidence/reports and are not normal CI blockers.

## Printer protocol tests

Use:
- captured sanitized capability fixtures;
- local fake IPP server;
- malformed responses;
- unsupported attributes;
- timeout;
- auth failure;
- job state transitions;
- unknown completion state.

Never require live printers for unit/integration CI.

## Security/fuzzing

High-value targets:
- PDF/image parsers;
- project/recipe deserialization;
- IPP response parsing;
- printer URIs;
- raw/device-language generation;
- large page counts/dimensions;
- decompression/resource bombs.

## Performance fixtures

Representative:
- 1-page image;
- 100-page office PDF;
- 500-page document;
- high-resolution photos;
- hundreds/thousands of repeated cards;
- mixed jobs.

Measure:
- import latency;
- thumbnail generation;
- memory;
- solver duration;
- export;
- UI responsiveness.

No arbitrary performance promise until fixtures exist.

## Accessibility testing

Automated:
- semantic control checks;
- contrast where tool allows;
- focusability.

Manual:
- keyboard-only critical flow;
- screen reader basics;
- zoom/scaling;
- reduced motion;
- non-color warning comprehension.

## Release gates

Before a release candidate:
- full suite green;
- no skipped critical tests;
- golden geometry reviewed;
- project migrations tested;
- representative exports opened by independent PDF viewers;
- Windows/macOS paths tested according to supported matrix;
- direct printer tests on documented supported devices/protocols;
- known limitations published.

## Physical verification kit

Maintain a printable verification pack:
- 100 mm ruler;
- 50 mm square;
- margin targets;
- duplex alignment;
- N-up;
- crop marks;
- booklet;
- poster tile overlap;
- PPI test image.

This gives a consistent human/hardware acceptance protocol.

## Definition of done

A print feature is not done because:
- it looks right in the canvas;
- one PDF viewer displays it;
- one printer happened to print it correctly.

Done requires:
- domain contract;
- failing test first;
- deterministic geometry verification;
- output verification;
- documented limitations;
- relevant UX/error path;
- regression coverage.
