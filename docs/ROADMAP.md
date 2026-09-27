# Six-Month Roadmap

Assumption: focused development of roughly **4–5 hours/day** for six months. That is a substantial personal build budget, but this roadmap remains outcome-based rather than promising calendar-perfect completion.

The project should be usable internally throughout development, but the final month is reserved for real polish rather than unfinished foundational work.

## Current implementation status

- [x] Repository blueprint
- [x] pnpm monorepo/workspace scaffold
- [x] React + Vite desktop frontend shell
- [x] Tauri 2 native shell
- [x] `packages/units-geometry` boundary
- [x] `packages/domain` boundary
- [x] lint / format / typecheck / Vitest / build scripts
- [x] GitHub Actions quality workflow
- [ ] M1.1 RED tests for physical units
- [ ] canonical length representation implementation
- [ ] first golden geometry fixture
- [ ] first physically verified PDF export

## Month 1 — Physical truth foundation

### Goal
Prove that the project can represent and export physical geometry correctly.

### Build
- repo/tooling;
- domain types;
- units/geometry;
- project schema/versioning;
- PDF/image import;
- page/source browser;
- physical sheet model;
- canvas mapping physical → screen;
- manual placement;
- resize/rotate/crop;
- exact numeric geometry;
- basic rulers/guides;
- A-series/Letter/custom media;
- PDF export;
- autosave skeleton;
- undo/redo architecture.

### Tests
- unit conversion;
- transforms;
- golden geometry;
- import/export;
- representative PDF fixtures.

### Exit gate
A 50 × 50 mm item placed at a defined coordinate exports with the expected geometry, independent of canvas zoom.

## Month 2 — Everyday Print Studio

### Goal
Become genuinely useful without printer integration.

### Build
- fit/fill/actual-size;
- N-up;
- page ranges;
- copy counts;
- repeat;
- alignment/distribution;
- snapping;
- keyboard workflows;
- photos/contact sheets;
- labels/cards;
- worksheet/half-sheet modes;
- basic poster tiling;
- beginner intent flow;
- initial Print Truth for exported jobs;
- recipes v1;
- strong project save/reopen;
- crash recovery.

### Exit gate
A beginner can import content and produce correct print-ready PDFs for common jobs without Word/Canva layout hacks.

## Month 3 — Duplex, booklet, printer reality

### Goal
Bridge print-ready files to real printer behavior.

### Build
- front/back Sheet/Side workflows;
- manual duplex guidance;
- booklet v1;
- cut marks/gutters;
- printer discovery research/implementation;
- OS spooler path on primary platform;
- printer capability normalization;
- printable-region overlay;
- calibration sheet;
- X/Y scale/offset profiles;
- duplex offset calibration;
- printer profiles;
- Print Truth v2.

### Exit gate
On selected test printers, Print Studio can explain printable limits and use a calibration profile for exact-size/registration workflows.

## Month 4 — Smart Layout and preflight

### Goal
Make the software actively solve production problems.

### Build
- rectangular packing solver;
- hard/soft constraints;
- objectives: minimum sheets, preserve size, preserve orientation, largest output;
- alternative solutions;
- locking/manual edits/re-solve;
- utilization;
- basic cutting objective;
- basic preflight;
- effective PPI;
- clipping/printable-area findings;
- page-size/box findings;
- bleed/safe-zone foundations;
- reports;
- compare layout savings.

### Exit gate
Representative worksheet/card/photo jobs can be optimized automatically with explainable, reproducible results.

## Month 5 — Production depth and direct printing

### Goal
Move from prosumer utility toward serious studio software.

### Build
- step-and-repeat;
- cut-and-stack;
- advanced booklet/signature foundations;
- work-and-turn/tumble research/initial workflows;
- marks framework;
- PDF box editing/visualization;
- improved bleed/preflight;
- batch jobs;
- direct IPP Everywhere path;
- printer state/job monitoring where supported;
- recipes v2;
- headless engine boundary;
- DustChalk integration contract;
- SDK/CLI prototype.

### Exit gate
A small print-production user can perform a meaningful subset of recurring imposition jobs and save them as repeatable recipes.

## Month 6 — Polish, resilience, beta

### Goal
Turn accumulated capability into a product that feels trustworthy.

### Focus
- large-document performance;
- memory;
- cancellation/progress;
- UI hierarchy;
- Simple/Studio/Production transitions;
- accessibility;
- keyboard completeness;
- touch/tablet review;
- onboarding;
- excellent empty/error/loading states;
- project migration tests;
- crash recovery;
- printer error language;
- compatibility matrix;
- physical verification kit;
- regression corpus;
- security hardening;
- packaging/updater;
- documentation;
- sample recipes;
- beta feedback;
- fix high-frequency UX friction.

### Exit gate
External testers can complete targeted workflows without developer intervention, and printed results match documented tolerances/limitations.

## Six-month scope discipline

Do not allow these to derail foundation work:
- full ICC/color-management replacement;
- every printer language;
- every label vendor template;
- industrial finishing integration;
- sophisticated VDP;
- enterprise cloud;
- collaboration;
- every press workflow.

Architecture should preserve them; roadmap should not pretend they are all necessary for the first polished release.

## After six months

Prioritize based on evidence:
- advanced color/soft proof;
- deeper preflight;
- signature/creep sophistication;
- hot folders;
- CLI/API hardening;
- VDP;
- advanced gang/cut optimization;
- production cost model;
- finisher/cutter integrations;
- camera-assisted calibration;
- mobile/tablet companion;
- team recipe libraries;
- OEM/SDK licensing.

## Weekly operating rhythm

Suggested:
- most days: implementation + tests;
- one session/week: dogfood real print jobs;
- one session/week: competitor/user research and backlog pruning;
- every milestone: update canonical docs;
- monthly: print physical verification pack on test devices.

Do not spend six months only coding against synthetic PDFs. Real paper output is part of development.

## Definition of roadmap success

Success is not “implemented every bullet”.

Success is:
- canonical architecture survives feature growth;
- everyday use is excellent;
- Smart Layout works;
- exact output is measurable;
- printer reality is modeled;
- professional direction is proven;
- DustChalk can consume the engine;
- there is enough polish to earn trust.
