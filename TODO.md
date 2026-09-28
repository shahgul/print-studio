# TODO

> **Living inbox for Print Studio ideas, discoveries, follow-ups, and important unscheduled work.**

Last updated: 28 September 2026.

This file is intentionally an **inbox**, not the execution plan.

Use it when:
- a new product idea appears during discussion;
- implementation reveals an important follow-up;
- a useful feature is not yet scheduled;
- research is needed before committing to a direction;
- an issue should not be forgotten but should not interrupt the current milestone.

When an item gets scheduled, promote it to `DEVELOPMENT-PLAN.md` and mark it here as promoted.

## Status legend

- [ ] Open / unscheduled.
- [~] Being investigated.
- [>] Promoted into `DEVELOPMENT-PLAN.md`.
- [x] Completed.
- [!] Blocked / waiting for decision or external dependency.
- [−] Dropped deliberately.

## Capture rules

Each important TODO should have enough context that a future agent can understand why it exists.

Prefer:

```text
- [ ] Camera-assisted duplex calibration
  - Why: manual ruler measurement is tedious.
  - Trigger: after manual calibration is reliable.
  - Related: docs/CALIBRATION.md
```

over:

```text
- [ ] camera thing
```

Do not use TODO as a substitute for:
- canonical product specs;
- architectural decisions;
- bugs that need immediate tests/fixes;
- the current milestone checklist.

---

# Open ideas / future considerations

## Printing and printer intelligence

- [ ] Explore a maintained printer capability/profile knowledge base.
  - Could augment live IPP/OS capability discovery.
  - Must distinguish reported, measured, community-supplied, and assumed values.
  - Risk: large maintenance burden.

- [ ] Explore camera-assisted calibration.
  - Detect printed fiducials from a phone/camera.
  - Estimate X/Y scale and duplex registration.
  - Only after manual calibration is proven reliable.

- [ ] Investigate printer-driver scaling detection.
  - Detect likely Fit/Shrink behavior from calibration output.
  - Relevant to Print Truth.

- [ ] Research partially used label-sheet calibration.
  - Important for labels/stickers where feed offset is critical.

## Smart Layout

- [ ] Explore “easiest cutting” as a first-class solver objective.
  - Need a defensible cut-complexity metric, not merely area utilization.

- [ ] Explore mixed-media/mixed-stock optimization.
  - Example: choose between A4/A3/SRA3 based on cost and waste.

- [ ] Explore human-readable solver explanations.
  - “Uses one extra sheet but reduces eight cuts.”

- [ ] Natural-language intent → structured constraints.
  - LLM only translates intent.
  - Deterministic solver remains authoritative.

## Professional production

- [ ] Governed recipe edit permissions.
  - Inspired by controlled operator editing patterns.
  - Recipe fields may be locked/editable/range-limited/approval-required.

- [ ] Production recipe draft/published states.
  - Useful for print shops and regulated workflows.

- [ ] Production output regression comparison.
  - Compare recipe/version output for page order, geometry, marks, content and sheet count.

- [ ] Safe production scripting/extensibility.
  - Declarative recipes first.
  - Arbitrary scripting only after validated demand.

- [ ] Hot-folder processing.
  - Requires idempotent file handling, reports, recipe versions, and duplicate-print protection.

- [ ] Production dashboard.
  - Job state, preflight failures, render/solver timing, printer status and retries.

## Classroom / DustChalk

- [ ] Validate teacher printing patterns in Indian schools.
  - Most common printers/media.
  - Typical worksheet copy counts.
  - Personal vs school-funded consumables.
  - Mobile vs Windows workflow.

- [ ] “Print for class” DustChalk integration.
  - Student count → structured print intent.
  - Keep DustChalk semantics outside core geometry.

- [ ] Classroom cut-plan UX.
  - Show number/direction of cuts, not prepress terminology.

## Photography / makers

- [ ] Photographer print workflow research.
  - Exact physical size.
  - contact sheets.
  - border/crop decisions.
  - PPI.
  - printer/media/color expectations.

- [ ] Maker/crafter 1:1 workflow research.
  - sewing patterns;
  - templates;
  - sticker sheets;
  - planner inserts;
  - model making.

## Color / prepress

- [ ] ICC engine research.
  - Do not implement until geometry/output pipeline is stable.

- [ ] Evaluate LittleCMS and alternatives.
  - License, precision, integration and cross-platform concerns.

- [ ] Spot color / overprint / separation strategy.
  - Production-mode only.

- [ ] PDF/X scope.
  - Decide which variants matter based on real professional users.

## Product / business

- [ ] Final product naming/trademark/domain review before public beta.
  - Repository can remain `print-studio`.

- [ ] Validate perpetual vs subscription preference separately for:
  - personal users;
  - teachers/creators;
  - print shops;
  - automation/SDK customers.

- [ ] Interview 3–5 small print operators before deep Production-mode work.

- [ ] Validate a free tier that is genuinely useful without giving away all recurring/automation value.

## Engineering

- [ ] Source relink/reimport UX.
  - Core M1.5 states now distinguish AVAILABLE / MISSING / CHANGED.
  - Later UX should let users locate a missing file or explicitly accept/re-import changed content.
  - Never update the stored source fingerprint merely because a different file exists at the old path.


- [ ] Add EXIF density metadata support for JPEG/TIFF-oriented photo workflows.
  - Current basic JPEG importer recognizes JFIF density and always recognizes SOF pixel dimensions.
  - Do not block M1.5 basic import on EXIF; add when photo fixtures justify it.


- [ ] Image DPI provenance and trust policy.
  - M1.5 deliberately does not guess DPI when absent.
  - PNG pHYs and JPEG JFIF declared physical density are now recognized.
  - Still define provenance for EXIF density, user override, and later measured/derived values.

- [x] Manual Windows persistence checkpoint passed.
  - Save As → close app → reopen → Open preserved exact A4/item/position geometry.
  - Subsequent Save successfully exercised replacement of the existing `.printstudio` file.

- [x] Native atomic project-file adapter for Windows/Tauri.
  - Implemented inside M1.4.
  - Uses a same-directory temporary file, flush + `sync_all()`, then atomic persist/replace.
  - Verified by a dedicated Windows-native Rust CI job.
  - Desktop Open / Save / Save As test surface is wired to the adapter.

- [ ] Commit and enforce a pnpm lockfile for fully reproducible dependency installs.
  - Current CI intentionally uses `--frozen-lockfile=false` because no lockfile is committed yet.
  - Do before public/beta packaging.

- [ ] Replace temporary Tauri app icon with the final Print Studio brand icon set.
  - Current `icon.ico` is a functional development placeholder required by `tauri-build` on Windows.
  - Generate the full Tauri icon set once branding is finalized.


- [ ] Decide when/where Rust becomes justified.
  - TypeScript first.
  - Move only measured performance/native requirements.

- [x] Define project file extension/name once persistence work starts.
  - Resolution: `.printstudio`.

- [ ] Consider a local API/daemon only when an actual second process/app needs it.

- [ ] Add dependency/license inventory before public distribution.

- [ ] Add vulnerability reporting process before public beta.

---

# Promoted / scheduled

- [x] Physical document model and golden A4 layout.
  - Completed as M1.2 in `DEVELOPMENT-PLAN.md`.
  - Golden fixture: `tests/golden-geometry/a4-50mm-square.json`.

- [x] Headless PDF renderer.
  - Completed as M1.3 in `DEVELOPMENT-PLAN.md`.
  - Initial adapter: `@cantoo/pdf-lib`, isolated behind `packages/pdf-engine`.
  - Semantic PDF geometry tests are authoritative; no binary golden PDF is checked in yet.

- [x] Project persistence/schema versioning.
  - Completed as M1.4 in `DEVELOPMENT-PLAN.md`.
  - Includes schema v1, atomic Windows Save/Open, manual Windows verification, and recovery snapshot groundwork.

- [>] Source import model.
  - M1.5 implementation, automated checks, and CI passed; user manual Windows live-source monitoring remains pending in `DEVELOPMENT-PLAN.md`.
  - Source persistence/revalidation, non-destructive crop/source-item metadata, and live-source monitoring are implemented.

- [>] Physical sheet canvas.
  - M1.6 implementation, automated checks, and CI passed; user manual Windows canvas and edited-project Save → reopen checks remain pending in `DEVELOPMENT-PLAN.md`.

---

# Completed / resolved

- [x] Decide canonical physical length representation.
  - Resolution: signed integer micrometres.
  - Recorded as D-018.

- [x] Add Windows development launcher.
  - Resolution: root `run.bat`.

- [x] Decide whether printer-vendor applications can eventually be bypassed.
  - Resolution: staged export → OS spooler → Direct IPP → selected raw/device paths.
  - See `docs/PRINTING-STACK.md`.
