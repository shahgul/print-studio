# Decisions

This is a lightweight architectural/product decision log. It records what is currently agreed, what is deliberately deferred, and what would require an explicit change.

## Accepted

### D-001 — Physical geometry is canonical
**Decision:** Store intended geometry in physical units; screen pixels are derived.

**Why:** Exact-size printing, export, calibration, and multiple renderers cannot safely depend on UI pixels.

### D-002 — Sheet is a first-class object
**Decision:** Model Sheet and Side explicitly rather than treating each output PDF page as the domain.

**Why:** Duplex, imposition, stock, fronts/backs, and finishing all depend on the physical sheet.

### D-003 — One model, progressive UX
**Decision:** Simple, Studio, and Production modes share the same project/domain model.

**Why:** Avoid consumer/pro forks and preserve continuity as users grow.

### D-004 — Intent before terminology
**Decision:** Beginner workflows start from “what are you making?” rather than print jargon.

**Why:** Users think in outcomes; terminology should be revealed only when useful.

### D-005 — Smart Layout is deterministic domain logic
**Decision:** Geometry/constraint solving is authoritative. AI may translate natural language into structured intent later but does not directly position printable objects.

**Why:** Print geometry must be testable, reproducible, and explainable.

### D-006 — Hard constraints never fail silently
**Decision:** Exact-size, no-rotation, minimum gap, containment, and similar hard constraints produce explicit conflict if unsatisfiable.

**Why:** A physically wrong “best effort” is worse than a clear conflict.

### D-007 — Multiple optimization objectives
**Decision:** Smart Layout exposes meaningful alternatives rather than one mysterious score.

**Why:** Minimum paper, easiest cutting, largest size, and orientation can conflict.

### D-008 — Print Truth is a core product concept
**Decision:** Before output, show effective dimensions, scale, printer-region issues, resolution, calibration, and warnings.

**Why:** Preview alone is not sufficient to predict physical output.

### D-009 — Calibration is part of the product
**Decision:** Model printer/media/transport-specific repeatable deviation.

**Why:** Correct digital geometry does not guarantee exact physical output.

### D-010 — Vendor apps can be bypassed; physics cannot
**Decision:** Support a staged path from PDF export → OS spooler → direct IPP → selected raw/device paths.

**Why:** Broad compatibility first; direct control where standards allow; avoid becoming a driver vendor unnecessarily.

### D-011 — Local-first
**Decision:** Ordinary source processing/layout does not require uploading documents to a server.

**Why:** privacy, latency, offline use, cost, and print-shop/school trust.

### D-012 — Standalone engine, DustChalk consumer
**Decision:** DustChalk uses Print Studio capabilities through a contract. Teacher concepts do not leak into core geometry types.

**Why:** reusable platform and clean architecture.

### D-013 — Print-relevant editing only
**Decision:** Support crop/rotate/resize/simple overlays/marks, but do not become Canva/Illustrator/Word.

**Why:** protect product identity and six-month focus.

### D-014 — TDD for behavior
**Decision:** red → green → refactor for behavior; bug fixes start with reproduction tests.

**Why:** print correctness must survive refactoring.

### D-015 — Golden physical fixtures
**Decision:** Maintain geometry/PDF/physical verification fixtures.

**Why:** screenshots cannot prove real-world size.

### D-016 — Recipes store intent
**Decision:** Saved recipes represent production rules/constraints, not merely serialized UI controls.

**Why:** automation and SDK consumers should not depend on one UI.

### D-017 — Print submission is a side effect with unknown states
**Decision:** PrintPlan and PrintJob are separate; retries use stable intent IDs.

**Why:** a network timeout may occur after the printer has accepted a job. Automatic duplicate submission can waste materials.

### D-018 — Canonical length representation is integer micrometres
**Decision:** Store canonical physical lengths as signed JavaScript safe integers measured in micrometres. Convert external units at construction boundaries and round once to the nearest micrometre, using symmetric half-away-from-zero rounding.

**Why:** This gives deterministic physical geometry, exact common metric dimensions, exact inch conversion (1 inch = 25,400 µm), bounded sub-millimetre error for PDF points, and straightforward serialization. Negative lengths remain valid for coordinates and calibration offsets; size/inset types enforce their own non-negative invariants.

**Precision note:** one PDF point is approximately 352.778 µm and therefore cannot be represented exactly as an integer micrometre. The maximum construction quantization error is 0.5 µm, far below normal printer mechanical tolerances.

### D-020 — Project files are versioned, explicit, and lossless
**Decision:** The first durable project format uses the identity `print-studio-project`, schema version `1`, and persists all canonical physical geometry as safe integer micrometres. The codec lives in `packages/project-file` and is independent of React, Tauri, filesystem APIs, printer code, and PDF libraries.

**Compatibility rules:**
- persisted micrometre values are never silently rounded;
- malformed/semantically invalid files fail with typed project-file errors;
- additive unknown fields are tolerated within a supported schema version;
- unsupported future schema versions are rejected explicitly;
- migrations run through a dedicated migration boundary before domain reconstruction;
- standard media store both semantic media/orientation and resolved physical size so a future media-definition change cannot silently alter an old project's geometry.

**Storage rule:** platform storage implements `writeAtomic`; partial file replacement must never be considered a successful save.

**Why:** project files become long-lived user assets. Physical drift, silent version guessing, and partially-written saves would violate Print Studio's core trust model.

### D-019 — Initial PDF adapter is @cantoo/pdf-lib behind pdf-engine
**Decision:** Use `@cantoo/pdf-lib` as the first PDF creation/manipulation adapter inside `packages/pdf-engine`, while keeping domain and layout contracts independent of it.

**Why:** The maintained Cantoo fork keeps the familiar pdf-lib API, is MIT licensed, works in JavaScript environments relevant to the project, and was actively maintained at the September 2026 implementation snapshot. The original upstream `pdf-lib` latest release is substantially older.

**Boundary rule:** canonical micrometres convert to PDF points only inside the PDF engine. React/Tauri/browser pixels are never inputs to the renderer.

**Replacement rule:** this is an adapter decision, not a permanent public API commitment. A future commercial/native PDF engine can replace it without changing canonical project geometry.

## Preferred direction, not yet irreversible

### D-P01 — React + TypeScript UI
Strong current preference for application UI.

### D-P02 — Tauri desktop shell
Strong candidate for desktop/native integration.

### D-P03 — PDF.js for PDF preview/import rendering
Candidate; keep behind abstraction.

### D-P04 — PDF adapter abstraction
Fulfilled by D-019. Keep the concrete PDF library behind `packages/pdf-engine`.

### D-P05 — qpdf as an optional structural companion
Candidate where useful.

### D-P06 — TypeScript-first with Rust/native modules where justified
Do not rewrite everything in Rust without measured need.

## Deferred

### D-X02 — Final project file format
Requirements are defined; exact encoding/storage is not.

### D-X03 — Final licensing model for Print Studio source/product
Do not add an OSS license accidentally before product/licensing intent is decided.

### D-X04 — Exact paid edition names/prices
Business doc contains hypotheses only.

### D-X05 — Color-management engine
Architecture must preserve it; implementation is post-foundation.

### D-X06 — Cloud architecture
No cloud requirement exists for core local workflows.

### D-X07 — Mobile product
Touch-aware architecture is useful, but full mobile scope is not decided.

### D-X08 — Printer capability database
Could be useful but may create maintenance/support burden.

### D-X09 — Camera-assisted calibration
Promising but must prove measurement reliability.

## Decision change protocol

When changing an accepted decision:
1. state why the old decision is insufficient;
2. document migration/compatibility impact;
3. update affected docs;
4. update tests/contracts;
5. do not silently diverge in implementation.
