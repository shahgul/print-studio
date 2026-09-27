# Development Plan

> **Living engineering execution plan for Print Studio.**

Last updated: 27 September 2026.

This file is the canonical day-to-day development tracker. It answers:

- What are we building now?
- What comes immediately after it?
- What is complete?
- What is blocked?
- What must be verified before a milestone is considered finished?

This file is deliberately different from `docs/ROADMAP.md`:

- **ROADMAP.md** = six-month product/engineering strategy and sequencing.
- **DEVELOPMENT-PLAN.md** = live implementation checklist and completion ledger.
- **TODO.md** = unscheduled ideas, follow-ups, discoveries, and important reminders.

## Status legend

- [x] Complete and verified.
- [ ] Planned / not complete.
- [~] In progress.
- [!] Blocked or requires a decision.
- [>] Promoted from TODO into planned development.

A task is not marked complete merely because code exists. Relevant tests, type checks, build checks, documentation, and output verification must pass.

---

# Current milestone

## M1.4 — Project Schema + Persistence

**Status:** In progress.

**Goal:** Make Print Studio projects durable without losing canonical physical geometry, while establishing schema versioning and migration rules before real user projects exist.

The detailed M1.4 checklist is below under **Next milestones**.

---

# Completed milestones

## M1.3 — Headless PDF Renderer

**Status:** Complete and verified.

**Goal:** Generate a mathematically correct PDF from the canonical domain model.

- [x] Select/lock initial PDF composition adapter behind an interface.
- [x] Define renderer contract before implementation.
- [x] Add PDF renderer package boundary.
- [x] Convert canonical micrometres → PDF points only at renderer boundary.
- [x] Render A4 page exactly 210 × 297 mm.
- [x] Render first 50 × 50 mm vector object at 20 × 30 mm.
- [x] Re-open generated PDF and inspect page geometry programmatically.
- [x] Add semantic golden-PDF validation.
- [x] Decide not to check in a binary golden PDF yet; semantic geometry assertions are the authoritative M1.3 regression test.
- [x] Prove canvas/browser pixels are not involved.
- [x] Reject physical-sheet overflow rather than silently clipping.
- [x] Render duplex sheets as front then back PDF pages.
- [x] CI green.
- [x] Update Development Plan.

### Exit gate

The canonical M1.2 fixture produces a PDF whose page and placed object geometry match the intended physical dimensions within documented PDF-point quantization tolerance.

Verified:
- A4 page geometry is re-opened from serialized PDF bytes and checked programmatically.
- the 50 × 50 mm object maps from top-left project coordinates to the correct bottom-left PDF coordinates.
- rendering is headless and independent of React/Tauri/browser pixels.
- `@cantoo/pdf-lib` is contained behind `packages/pdf-engine`.

---

## M1.2 — Physical Document Model + Golden A4 Layout

**Status:** Complete and verified.

**Goal:** Represent a real physical sheet, items, sides, placements, and usable area entirely in the headless domain package, then prove the first canonical A4 layout without React or PDF rendering.

### Contract / tests

- [x] Define RED tests for standard media.
- [x] Define RED tests for `SheetDefinition`.
- [x] Define RED tests for layout margins and usable area.
- [x] Define RED tests for `Item`.
- [x] Define RED tests for `Placement`.
- [x] Define RED tests for `Side`.
- [x] Define RED tests for `Sheet`.
- [x] Define RED tests for minimal `Project`.
- [x] Define RED tests for placement validation.
- [x] Create first golden geometry fixture:
  - A4 portrait = 210 × 297 mm
  - layout margin = 10 mm
  - item position = 20 × 30 mm
  - item size = 50 × 50 mm
  - rotation = 0°
- [x] Verify an edge-touching item follows geometry semantics consistently.
- [x] Verify an item outside the physical sheet is invalid.
- [x] Verify an item inside the physical sheet but outside the usable area is distinguishable from physical overflow.

### Implementation

- [x] Add standard media definitions.
- [x] Add `SheetDefinition`.
- [x] Add `Item`.
- [x] Add `Placement`.
- [x] Add `Side`.
- [x] Add `Sheet`.
- [x] Add minimal `Project`.
- [x] Add placement validation result/error codes.
- [x] Keep all domain code independent of React, Tauri, PDF libraries, and printer transports.

### Verification

- [x] Domain focused tests pass.
- [x] Full Vitest suite passes.
- [x] Format check passes.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Build passes.
- [x] CI is green.
- [x] Relevant canonical docs updated.
- [x] Development plan marked complete only after verification.

### Exit gate

The domain can represent and validate:

```text
A4 portrait: 210 × 297 mm
layout margins: 10 mm

item:
x = 20 mm
y = 30 mm
width = 50 mm
height = 50 mm
rotation = 0°
```

without depending on screen pixels or a PDF library.

---

# Completed foundation

## Repository / tooling

- [x] Product blueprint created.
- [x] `AGENTS.md` created.
- [x] pnpm workspace scaffolded.
- [x] React + Vite desktop shell scaffolded.
- [x] Tauri 2 shell scaffolded.
- [x] Windows `run.bat` launcher added.
- [x] TypeScript strict configuration.
- [x] ESLint.
- [x] Prettier.
- [x] Vitest.
- [x] GitHub Actions quality pipeline.
- [x] CI bootstrap corrected and full pipeline verified green.

## M1.1 — Deterministic Physical Geometry

- [x] RED tests written before implementation.
- [x] Integer micrometres selected as canonical physical length representation.
- [x] mm conversion.
- [x] cm conversion.
- [x] inch conversion.
- [x] PDF point conversion.
- [x] deterministic half-away-from-zero rounding.
- [x] physical arithmetic.
- [x] safe-integer validation.
- [x] `Point2D`.
- [x] `Size2D`.
- [x] `Insets`.
- [x] `Rect`.
- [x] containment.
- [x] intersection.
- [x] translation.
- [x] rectangle insetting.
- [x] quarter-turn rotation.
- [x] edge touching defined as non-overlap.
- [x] canonical unit decision recorded as D-018.
- [x] full CI verified green.

---

# Next milestones

## M1.4 — Project Schema + Persistence

**Status:** In progress.

- [x] Define schema version 1.
- [x] Define stable project serialization contract.
- [x] Add explicit file identity (`print-studio-project`) and physical unit marker.
- [x] Serialize canonical physical geometry as safe integer micrometres without loss.
- [x] Round-trip standard/custom media, duplex sides, rotations, margins, and signed coordinates.
- [x] Reject malformed JSON with typed error codes.
- [x] Reject wrong product/file identity.
- [x] Detect and reject unsupported future schema versions.
- [x] Reject fractional/unsafe persisted micrometre values instead of rounding them.
- [x] Validate persisted enum values and broken domain references.
- [x] Tolerate additive unknown fields within the current schema version.
- [x] Add migration hook and migration-focused tests.
- [x] Add headless `ProjectPersistence` load/save orchestration.
- [x] Define `ProjectTextStore.writeAtomic()` as the platform storage contract.
- [x] Implement native Windows/Tauri atomic file-store adapter.
- [x] Add desktop Save/Open integration and native file picker.
- [ ] Add missing-source representation after Source/SourcePage lands in M1.5.
- [ ] Add autosave/recovery policy on top of the atomic storage adapter.
- [x] Add narrow Tauri commands for project read + atomic write.
- [x] Restrict native project storage to `.printstudio` files.
- [x] Add 16 MiB safety bound for the current source-less project format.
- [x] Add Windows-native CI job with `cargo fmt --check` + Rust tests.
- [x] Add temporary M1.4 desktop test surface with Open / Save / Save As.
- [ ] Manual Windows checkpoint: save → close app → reopen → Open → verify exact geometry.
- [x] Full TypeScript/React CI green.
- [x] Full Windows-native Rust CI green.

### Hands-on checkpoint — available now

This is the first useful point to pause feature work and test the desktop app manually.

Expected starter project:
- A4 portrait: 210 × 297 mm;
- item: 50 × 50 mm;
- position: 20 × 30 mm.

Manual Windows check:
1. `git pull`.
2. Run `run.bat`.
3. Confirm the starter values shown in the app.
4. Choose **Save As…** and save a `.printstudio` file.
5. Close Print Studio completely.
6. Run `run.bat` again.
7. Choose **Open…** and select the saved project.
8. Confirm A4 remains 210 × 297 mm, item remains 50 × 50 mm, and position remains 20 × 30 mm.
9. Choose **Save** once more to exercise replacement of an existing project file.
10. Report the result before the manual checkpoint is marked complete.

This checkpoint verifies the real Windows/Tauri boundary. It does not yet test imported content or the physical canvas.

## M1.5 — Image/PDF Source Model

- [ ] Implement `Source` / `SourcePage` minimal domain.
- [ ] Image intrinsic pixel dimensions.
- [ ] PDF page physical dimensions.
- [ ] Source fingerprint/hash strategy.
- [ ] Non-destructive crop metadata.
- [ ] Basic image import.
- [ ] Basic PDF import.
- [ ] Malformed input/error contracts.
- [ ] Resource-limit groundwork.
- [ ] CI green.

## M1.6 — Physical Sheet Canvas

- [ ] Define viewport transform physical → screen.
- [ ] Render real A4 sheet from domain model.
- [ ] Zoom/pan.
- [ ] Fit sheet.
- [ ] Render placement from canonical geometry.
- [ ] Numeric physical coordinates remain unchanged through zoom/window resize.
- [ ] selection.
- [ ] drag.
- [ ] resize.
- [ ] rotate.
- [ ] rulers.
- [ ] basic guides.
- [ ] keyboard nudge.
- [ ] UI/runtime verification.
- [ ] CI green.

## M1.7 — Undo/Redo + Project Editing Foundation

- [ ] Define command/action model.
- [ ] Undo placement changes.
- [ ] Redo placement changes.
- [ ] multi-action correctness.
- [ ] no renderer/native state inside undo model.
- [ ] save/reopen edited project.
- [ ] crash-recovery groundwork.

## M1.8 — Month 1 Physical Truth Gate

- [ ] Import representative image.
- [ ] Place at exact physical size.
- [ ] Export through headless renderer.
- [ ] Programmatically verify output.
- [ ] Print physical verification sheet on at least one real printer.
- [ ] Record expected vs measured result.
- [ ] Confirm zoom/UI did not influence output.
- [ ] Review Month 1 architecture against docs.
- [ ] Update roadmap and development plan.

---

# Month 2 — Everyday Print Studio

## Layout fundamentals

- [ ] actual size.
- [ ] fit.
- [ ] fill/crop.
- [ ] shrink oversized only.
- [ ] orientation handling.
- [ ] copy counts.
- [ ] repeat.
- [ ] N-up 2/4/6/8/9/12/custom.
- [ ] row/column ordering.
- [ ] snapping.
- [ ] align/distribute.
- [ ] multi-select.
- [ ] crop tools.
- [ ] duplicate.
- [ ] exact numeric inspector.

## Everyday workflows

- [ ] exact-size print workflow.
- [ ] photos.
- [ ] contact sheets.
- [ ] labels/cards.
- [ ] worksheet / half-sheet workflow.
- [ ] poster tiling v1.
- [ ] basic booklet workflow.
- [ ] manual duplex guidance foundation.

## Product foundation

- [ ] Simple mode first-run intent flow.
- [ ] Print Truth v1.
- [ ] recipes v1.
- [ ] strong autosave.
- [ ] crash recovery.
- [ ] accessible keyboard flow.
- [ ] polished empty/error/loading states.

---

# Month 3 — Duplex, Booklet, Printer Reality

- [ ] front/back sheet model expansion.
- [ ] duplex pairing.
- [ ] long/short-edge visual model.
- [ ] manual duplex re-feed instructions.
- [ ] booklet ordering.
- [ ] cut marks.
- [ ] gutters.
- [ ] system printer discovery.
- [ ] capability normalization.
- [ ] OS spooler path on primary platform.
- [ ] printable-region source/provenance model.
- [ ] printer profiles.
- [ ] calibration sheet.
- [ ] X/Y scale calibration.
- [ ] X/Y positional calibration.
- [ ] duplex registration calibration.
- [ ] Print Truth v2.
- [ ] printer diagnostics/status foundation.

---

# Month 4 — Smart Layout + Preflight

- [ ] rectangular packing baseline.
- [ ] hard constraints.
- [ ] soft constraints.
- [ ] minimum-sheet objective.
- [ ] preserve-size objective.
- [ ] preserve-orientation objective.
- [ ] largest-output objective.
- [ ] meaningful alternative layouts.
- [ ] lock placements and re-solve.
- [ ] utilization calculation.
- [ ] cutting-complexity model v1.
- [ ] preflight framework.
- [ ] effective PPI.
- [ ] clipping findings.
- [ ] printable-area findings.
- [ ] page-size findings.
- [ ] PDF-box groundwork.
- [ ] bleed/safe-area groundwork.
- [ ] preflight report.
- [ ] before/after material comparison.

---

# Month 5 — Production Depth + Direct Printing

- [ ] step-and-repeat.
- [ ] cut-and-stack.
- [ ] signature foundations.
- [ ] advanced booklet.
- [ ] work-and-turn groundwork.
- [ ] work-and-tumble groundwork.
- [ ] marks framework.
- [ ] MediaBox/CropBox/TrimBox/BleedBox/ArtBox visualization.
- [ ] advanced preflight.
- [ ] batch jobs.
- [ ] Direct IPP Everywhere.
- [ ] printer/job monitoring.
- [ ] safe retry/unknown print state.
- [ ] recipes v2.
- [ ] headless CLI prototype.
- [ ] SDK boundary prototype.
- [ ] DustChalk contract.
- [ ] production pipeline/job-state foundation.

---

# Month 6 — Product Polish + Beta

- [ ] large-file performance.
- [ ] worker/cancellation model.
- [ ] memory bounds.
- [ ] Simple/Studio/Production transitions.
- [ ] accessibility audit.
- [ ] keyboard completeness.
- [ ] touch/tablet review.
- [ ] onboarding.
- [ ] diagnostics.
- [ ] project migrations.
- [ ] recovery.
- [ ] compatibility matrix.
- [ ] physical verification kit.
- [ ] security hardening.
- [ ] installer/package.
- [ ] updater strategy.
- [ ] sample recipes.
- [ ] beta workflow.
- [ ] external user feedback.
- [ ] high-frequency UX fixes.

---

# Later / Production Expansion

These are intentionally tracked but not scheduled into the initial six-month gate unless evidence changes priorities.

- [ ] professional recipe publishing.
- [ ] operator-edit permissions inspired by governed production systems.
- [ ] recipe regression comparison.
- [ ] hot folders.
- [ ] automation dashboard.
- [ ] safe scripting/extensibility.
- [ ] VDP.
- [ ] gang-job optimization.
- [ ] finishing-aware solver.
- [ ] production costing.
- [ ] ICC/color-management subsystem.
- [ ] soft proof.
- [ ] separations/overprint.
- [ ] cutter/finisher integration.
- [ ] camera-assisted calibration.
- [ ] team recipe library.
- [ ] OEM/commercial SDK.
- [ ] mobile/tablet companion.

---

# Maintenance rules

Every implementation session should:

1. Read the active section in this file.
2. Check `TODO.md` for relevant promoted/new items.
3. Follow RED → GREEN → REFACTOR for behavior.
4. Update the owning canonical documentation when a design decision changes.
5. Mark an item complete only after the relevant verification passes.
6. Add newly discovered unscheduled ideas to `TODO.md`, not randomly to code comments.
7. Promote a TODO into this plan when it is scheduled.
8. Keep `docs/ROADMAP.md` high-level; do not duplicate this execution ledger there.
