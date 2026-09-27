# UX and Interaction Model

## Design objective

Print Studio must reconcile two goals:

- a beginner should get a successful print without learning print-production vocabulary;
- a professional should be able to inspect and control exact geometry and production decisions.

The solution is **progressive disclosure over one canonical model**, not separate simplified and professional products.

## Primary mental model

> **Paper is the canvas.**

The user is not configuring an abstract print dialog. They are arranging or approving physical objects on physical sheets.

The workspace should communicate:
- real sheet boundaries;
- physical rulers;
- printable region;
- safe region;
- trim/bleed when relevant;
- front/back sides;
- folds/cuts/marks;
- actual dimensions;
- warnings tied to visible geometry.

## Entry flow: intent first

A beginner-oriented start screen can ask:

**What are you making?**
- regular document;
- photos;
- exact-size print;
- cards / flashcards;
- labels / stickers;
- worksheet copies;
- booklet;
- poster;
- template / pattern;
- save paper automatically;
- custom layout.

This is not just a template picker. The choice creates useful constraints and defaults.

A professional can choose **Open in Studio/Production** and bypass the wizard.

## Workspace layers

### Simple mode

Purpose:
- successful output with minimum terminology.

Characteristics:
- task-oriented choices;
- guided defaults;
- visible physical preview;
- few controls at once;
- warnings expressed as consequences.

Prefer:
- “Keep exact size”
- “Fit without clipping”
- “Use fewer sheets”
- “Make cutting easier”
- “Print front and back”

Avoid requiring terms like N-up, imposition, work-and-turn, creep, or PDF boxes unless needed.

### Studio mode

Purpose:
- hands-on physical composition.

Capabilities:
- selection;
- drag/resize/rotate;
- rulers/guides;
- exact numeric geometry;
- snapping;
- crop;
- align/distribute;
- sheet/page thumbnails;
- copy/repeat;
- Smart Layout alternatives;
- constraints;
- recipe save.

### Production mode

Purpose:
- prepress/imposition/automation.

Capabilities:
- PDF boxes;
- bleed;
- trim;
- marks;
- preflight;
- signatures;
- work-and-turn/tumble;
- cut-and-stack;
- gang layouts;
- creep;
- finishing constraints;
- variable data later;
- production recipes;
- hot-folder/API configuration later.

Switching modes must not mutate the underlying job.

## Main workspace anatomy

Proposed desktop structure:

```text
┌────────────────────────────────────────────────────────────────────┐
│ top bar: project / undo / mode / Smart Layout / Preflight / Print │
├───────────────┬────────────────────────────────────┬───────────────┤
│ sources/pages │                                    │ inspector     │
│ sheets        │       physical sheet canvas        │ geometry      │
│ recipes       │                                    │ constraints   │
│               │                                    │ print info    │
├───────────────┴────────────────────────────────────┴───────────────┤
│ status: size / scale / printer / warnings / utilization / zoom    │
└────────────────────────────────────────────────────────────────────┘
```

The actual visual design can evolve, but physical state and warnings must remain easy to inspect.

## Smart Layout UX

Smart Layout should not be a mysterious “AI” button.

Flow:
1. select content and copy counts;
2. set/accept media;
3. state priorities;
4. solver returns a recommended plan plus useful alternatives;
5. app explains measurable consequences;
6. user can accept, edit, lock parts, and re-run.

Example:

```text
Recommended — Minimum paper
3 A4 sheets
91% average utilization
4 items rotated
0 items resized
14 guillotine cut lines

Alternative — Easier cutting
4 A4 sheets
78% utilization
0 mixed rows
8 cut lines
```

Supported priorities should eventually include:
- preserve exact item size;
- minimum sheets;
- largest readable output;
- easiest cutting;
- preserve orientation;
- minimum waste;
- lowest estimated material cost.

Solver output must be reproducible from the same inputs, constraints, solver version, and objective.

## Constraint-conflict UX

Never silently violate a constraint.

Example:

```text
This 210 × 297 mm item cannot fit inside this printer's 5 mm hardware margins at 100%.

Choose:
[Keep 100% size — edges may clip]
[Scale to 96.8% — entire item prints]
[Change paper]
[Use borderless media if supported]
```

The UI should teach through consequences.

## Print Truth

Before print/export, answer:
- physical item dimensions;
- any scaling;
- sheet/media;
- known printable area;
- clipping;
- effective PPI;
- duplex transform;
- calibration compensation;
- known vs assumed printer capabilities;
- preflight status;
- sheets/material usage.

Print Truth is a readable contract between the digital job and expected physical output.

## Printer setup UX

When a device is discovered:

```text
Epson Example
Connection: IPP
Media: A4 / A5 / 4×6
Color: yes
Duplex: unavailable
Borderless: selected photo media
Formats: PDF / PWG Raster
Status: ready
```

Offer:
- system-driver path;
- Direct IPP when verified;
- calibration.

Never invent capabilities.

## Calibration UX

### Basic

1. print a calibration sheet at the intended 100% path;
2. measure reference lines/targets;
3. enter measured values;
4. calculate corrections;
5. save against printer + media + transport.

Possible parameters:
- X scale;
- Y scale;
- X/Y offset;
- rotation/skew if useful;
- front/back duplex offset.

### Future camera-assisted

A phone/camera captures fiducial markers. Computer vision estimates scale and registration errors.

This remains optional and must be validated against measurement truth.

## Manual duplex UX

Do not force users to reason only in “long edge” and “short edge”.

Show:
- sheet front;
- flip animation/diagram;
- back;
- exact re-feed orientation.

For non-duplex devices:
1. print fronts;
2. show re-feed instruction;
3. optionally print one test sheet;
4. print backs.

## Booklet UX

Simple:
- paper;
- finished orientation;
- binding side;
- duplex availability;
- fold preview.

Advanced:
- signatures;
- creep;
- paper thickness;
- covers;
- nested saddle/perfect-bound options;
- marks.

## Cutting UX

“Minimum paper” and “minimum cutting effort” may be different solutions.

Show:
- ordered cut lines;
- aligned rows/columns;
- estimated cut count;
- resulting stacks;
- cut-and-stack sequence when relevant.

Later support machine-readable cutter marks/barcodes.

## Preflight UX

Attach findings to visible pages/items.

Severity:
- **Error** — likely prevents intended production.
- **Warning** — creates risk or quality concern.
- **Info** — relevant property.

Every finding should say:
- what;
- where;
- why it matters;
- safest response;
- whether a safe automatic fix exists.

Avoid a generic “print score” that can hide critical failures.

## Keyboard / power-user behavior

Expected:
- undo/redo;
- delete;
- duplicate;
- copy/paste;
- arrow nudge;
- fine/coarse nudge modifiers;
- constrain aspect/rotation;
- multi-select;
- zoom shortcuts;
- fit sheet/selection;
- command palette;
- direct numeric focus.

## Touch/mobile

The full production workspace is desktop-first, but core layout interactions should remain touch-aware.

Mobile/tablet is useful for:
- quick exact-size jobs;
- worksheet/photo layout;
- job review;
- printer discovery/status;
- camera-assisted calibration.

Do not cripple desktop UX merely to force a single responsive layout.

## Error language

Prefer consequence:
- “This edge may be clipped by 2.1 mm.”

Over implementation jargon:
- “MediaPrintableArea conflict.”

Professional mode may expose the technical detail in an expandable section.

## Accessibility

- complete keyboard path for production-critical actions;
- focus states;
- non-color-only error communication;
- readable warning hierarchy;
- large enough touch targets;
- scalable UI;
- accessible names for canvas controls;
- reduced-motion support;
- do not communicate orientation/side solely via animation.

## Onboarding philosophy

Teach by producing a successful first job.

Suggested first-run path:
1. drop an image/PDF;
2. choose intent;
3. show physical sheet;
4. show recommended layout;
5. reveal Print Truth;
6. export/print;
7. invite user to save as recipe only after success.

Do not begin with account creation, printer-driver tutorials, or a wall of settings.
