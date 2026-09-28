# Development Plan

> **Living engineering execution plan for Print Studio.**

Last updated: 28 September 2026.

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

## M1.5 — Image/PDF Source Model: manual live-monitoring gate

**Status:** Implementation, automated checks, and CI complete; user manual Windows live-monitoring verification pending.

Keep the app open while the source transitions AVAILABLE → MISSING → CHANGED → AVAILABLE, then check focus-time revalidation. M1.6 also awaits the user's manual Windows canvas and edited-project persistence verification. Do not start M1.7 until both milestones are closed.

The detailed checkpoints are below under **Milestone ledger and next work**.

---

# Implemented; manual Windows verification pending

## M1.6 — Physical Sheet Canvas

**Status:** Implemented; focused tests, local TypeScript pipeline, and CI passed. User manual Windows canvas and edited-project Save → reopen checks pending.

The detailed checklist and verification record are below under **Milestone ledger and next work**.

## M1.5 — Image/PDF Source Model

**Status:** Implemented; automated checks and CI passed. User manual Windows live-source monitoring check pending. Earlier import and reopen-time checks remain recorded below.

The detailed checklist and live-monitoring verification record are below under **Milestone ledger and next work**.

# Completed milestones

## M1.4 — Project Schema + Persistence

**Status:** Complete and verified.

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
- [x] Source-aware/missing-source persistence explicitly transferred to M1.5, where Source/SourcePage will exist.
- [x] Add autosave/recovery groundwork on top of the atomic storage adapter.
  - companion path: `name.autosave.printstudio`;
  - recovery snapshots use the same versioned/lossless codec;
  - recovery writes remain atomic;
  - cleanup is idempotent and restricted to `.printstudio` paths;
  - initial interval policy constant: 30 seconds;
  - final timer/untitled-session/prompt UX remains scheduled under strong autosave/crash recovery.
- [x] Add narrow Tauri commands for project read + atomic write.
- [x] Restrict native project storage to `.printstudio` files.
- [x] Add 16 MiB safety bound for the current source-less project format.
- [x] Add Windows-native CI job with `cargo fmt --check` + Rust tests.
- [x] Add temporary M1.4 desktop test surface with Open / Save / Save As.
- [x] Manual Windows checkpoint: save → close app → reopen → Open → verify exact geometry.
- [x] Full TypeScript/React CI green.
- [x] Full Windows-native Rust CI green.
- [x] Recovery cleanup verified in Windows-native CI.

### Hands-on checkpoint — passed on Windows

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
10. Result: **passed on Windows on 28 September 2026**.

This checkpoint verifies the real Windows/Tauri boundary. It does not yet test imported content or the physical canvas.


---

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

# Milestone ledger and next work

## M1.5 — Image/PDF Source Model

**Status:** Implemented and automated checks passed; user manual live-monitoring gate pending.

- [x] Implement `Source` / `SourcePage` minimal domain.
- [x] Represent image intrinsic pixel dimensions without inventing DPI.
- [x] Represent PDF page physical dimensions in canonical units.
- [x] Define SHA-256 source fingerprint identity.
- [x] Add source availability state so missing files retain last-known metadata.
- [x] Enforce deterministic contiguous page indices and unique page IDs.
- [x] Implement source fingerprint/hash calculation from imported bytes.
- [x] Add bounded native binary source reader using Tauri raw IPC (no JSON byte expansion).
- [x] Add desktop Import… checkpoint for real PNG/JPEG/PDF inspection.
- [x] Persist Source/SourcePage metadata inside project schema V2.
- [x] Revalidate referenced source path + fingerprint on project reopen and surface AVAILABLE/MISSING/CHANGED states.
- [x] Migrate schema V1 → V2 by adding an empty source collection.
- [x] Preserve original source fingerprint/page metadata when external bytes change.
- [x] Distinguish missing files from read/permission failures.
- [x] Manual Windows persistence/revalidation checkpoint.
- [x] Add native live source monitoring with debounced revalidation and focus-time fallback.
- [ ] User manual Windows live-source monitoring checkpoint while the app stays open.
- [x] Non-destructive crop metadata.
  - source-backed Items reference both Source ID and SourcePage ID;
  - crop is a normalized integer-millionths rectangle relative to the original source page;
  - Project construction validates source/page references;
  - schema-V2 persistence remains additive and accepts older V2 Items without `sourceRef`.
- [x] Basic PNG/JPEG metadata import from raw bytes.
- [x] Basic PDF page-count/physical-size import from raw bytes.
- [x] Malformed/unsupported input error contracts with typed codes.
- [x] Resource-limit groundwork: 256 MiB file, 1,000 PDF pages, 250 MP image defaults.
- [x] Manual Windows import checkpoint: real JPG and PDF imported successfully and metadata verified.
- [x] CI green for the headless importer + desktop/native import bridge.

### Hands-on M1.5 checkpoint — passed on Windows

Verified manually on 28 September 2026:

1. Real JPG imported successfully.
2. Pixel/density/physical metadata matched expectations.
3. Real PDF imported successfully.
4. Page count and physical page dimensions matched expectations.
5. Source fingerprints/path reporting behaved as expected.

Result: **passed**.

This checkpoint validates source inspection. Source persistence/revalidation was verified separately below.

### Hands-on source persistence/revalidation checkpoint — passed on Windows

Verified manually on 28 September 2026:

1. Import a real JPG or PDF.
2. **Save As…** a `.printstudio` project.
3. Close Print Studio.
4. Reopen the saved project.
5. Confirm the source is restored and reports **AVAILABLE**.
6. Close the app, rename or move the external source file, then reopen the project.
7. Confirm the source reports **MISSING** while its last-known metadata remains visible.
8. Restore the source path, alter the file contents, then reopen.
9. Confirm the source reports **CHANGED** and Print Studio does not silently replace the stored fingerprint/metadata.
10. Restore the original file bytes and confirm a later reopen returns to **AVAILABLE**.

Result: **passed** — the sequence returned **AVAILABLE → MISSING → CHANGED → AVAILABLE** while preserving last-known source metadata.

Only a genuinely absent path is classified as MISSING. If the file exists but cannot be read, the app should surface the I/O failure.

### Hands-on live-source monitoring checkpoint — user verification pending

User test steps:

1. `git pull` and run `run.bat`.
2. Import a real JPG or PDF and save the project.
3. Keep Print Studio open.
4. Rename or move the referenced source file without reopening the project.
5. Confirm the open app changes the source state to **MISSING** after the watcher/debounce runs.
6. Put different bytes at the original source path.
7. Confirm the open app changes the source state to **CHANGED**.
8. Restore the original source bytes at the original path.
9. Confirm the open app returns to **AVAILABLE**.
10. As a fallback check, change the source while Print Studio is unfocused, return to the app, and confirm focus-time revalidation catches the current state.

Prior Codex-operated Windows/Tauri observation on 28 September 2026: a local PNG moved through **AVAILABLE → MISSING → CHANGED → AVAILABLE** while the app stayed open; focus-time revalidation also observed **CHANGED**. The original fingerprint and intrinsic metadata remained visible. This is implementation evidence, not the user's manual verification. The checkpoint stays open until the user reports a pass.

## M1.6 — Physical Sheet Canvas

**Status:** Implemented and automated checks passed; user manual Windows runtime and edited-project persistence checks pending.

- [x] Define viewport transform physical → screen.
- [x] Render real A4 sheet from domain model.
- [x] Zoom/pan.
- [x] Fit sheet.
- [x] Render placement from canonical geometry.
- [x] Numeric physical coordinates remain unchanged through zoom/window resize.
- [x] Selection.
- [x] Drag.
- [x] Resize.
- [x] Rotate.
- [x] Rulers.
- [x] Basic guides.
- [x] Keyboard nudge.
- [ ] User manual Windows UI/runtime verification, including edited-project Save → reopen.
- [x] CI green.

### M1.6 verification record

The canvas maps canonical millimetres to screen pixels through an explicit viewport transform. The React/SVG view never writes screen coordinates into the Project. `canvas-project` reconstructs validated domain objects for edits and rejects physical-sheet overflow. Resizing an Item shared by multiple placements is rejected explicitly to avoid changing another placement's physical size without warning.

Focused RED tests preceded the viewport and edit implementation, including a reproducing test for shared-Item resizing. The full local TypeScript pipeline passed: formatting, lint, typecheck, 136 tests, and build.

Prior Codex-operated Windows/Tauri observation on 28 September 2026 exercised drag, resize, quarter-turn rotation, keyboard nudge, numeric entry, zoom, fit, pan, and Save → reopen on the starter A4 sheet. The resulting schema-V2 file contained `originUm: {x: 45500, y: 38422}`, `sizeUm: {width: 59220, height: 58866}`, and `rotation: 90`. These observations do not close the user's manual runtime or persistence checkpoints, and they do not measure physical printer output.

GitHub Actions [CI run 36384393298](https://github.com/shahgul/print-studio/actions/runs/36384393298) passed both the TypeScript quality job and the native Windows job for commit `549be19`.

### User manual Windows gate — pending

1. Launch `run.bat`; confirm the starter A4 sheet is 210 × 297 mm with the 50 × 50 mm item at X=20, Y=30 mm.
2. Drag the item, resize its corner, choose a quarter-turn rotation, enter an exact X/Y/width/height value, and use an arrow key to nudge it. Confirm the inspector reports the intended millimetre values and invalid off-sheet edits are rejected.
3. Zoom, pan, and Fit sheet; confirm the inspector values do not change. Resize the window and confirm the same.
4. Set an easily recognized valid geometry, for example X=25, Y=35, width=60, height=40 mm, rotation=90°. Save As a `.printstudio` file, close the app, reopen it, and Open Project. Confirm all five values are restored exactly.

Report a pass or the failed step to close this gate. The M1.5 live-source gate above must also pass before M1.7 starts.

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

1. Treat the latest repository state as authoritative; do not rely on previous ChatGPT/Codex conversation memory.
2. Inspect the current branch/worktree and recent relevant changes before editing.
3. Read the active section in this file.
4. Check `TODO.md` for relevant promoted/new items.
5. Read the relevant canonical/specification docs for the area being changed.
6. Follow RED → GREEN → REFACTOR for behavior.
7. Update the owning canonical documentation when a design decision changes.
8. Mark an item complete only after the relevant verification passes.
9. Add newly discovered unscheduled ideas to `TODO.md`, not randomly to code comments.
10. Promote a TODO into this plan when it is scheduled.
11. Keep `docs/ROADMAP.md` high-level; do not duplicate this execution ledger there.
12. Before handing work to another environment/thread, commit or otherwise clearly record the authoritative state in the repository.
