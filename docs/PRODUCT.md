# Product

## Vision

Print Studio should become the software layer between digital content and reliable physical output.

People think in physical intent:
- “put four cards on A4”;
- “print this photo at exactly 100 × 150 mm”;
- “make 32 worksheet copies with minimum paper”;
- “front and back must line up”;
- “turn these pages into a folded booklet”.

Existing software usually exposes application-specific print modes, operating-system dialogs, vendor driver settings, or specialist prepress terminology.

Print Studio should translate intent into production-ready sheets while still allowing experts to control production directly.

## Product promise

> **Tell Print Studio what you are trying to make. It should arrange it, validate it, optimize it, prepare it, and help ensure the printer produces what you intended.**

## Why this is not just a print dialog

```text
source material
    ↓
physical document model
    ↓
layout / imposition
    ↓
preflight
    ↓
optimization
    ↓
Print Truth
    ↓
printer profile / calibration
    ↓
OS or direct print transport
    ↓
physical output
```

## Target audiences

### Occasional / beginner users

Jobs:
- print an image or PDF without unexpected cropping;
- fit/fill a sheet;
- print at exact physical size;
- place several items on one page;
- understand margins and borderless limitations;
- duplex correctly;
- make a booklet/poster without understanding imposition.

Value:
- remove terminology;
- prevent waste;
- make preview trustworthy.

### Teachers and education

Jobs:
- worksheets for a class;
- two half-sheet worksheets on one A4;
- flashcards/activity cards;
- student-count-based copying;
- paper-efficient classroom production;
- reusable recipes.

Value:
- convert classroom intent into efficient sheets;
- later integrate into DustChalk.

### Makers / crafters

Jobs:
- 1:1 templates;
- stickers;
- sewing/woodworking patterns;
- planner inserts;
- labels;
- model components;
- craft cut sheets.

Value:
- exact dimensions, calibration, cut guides, predictable scaling.

### Photographers

Jobs:
- exact print sizes;
- contact sheets;
- multiple sizes on one sheet;
- borders/captions;
- resolution warnings;
- later color/profile workflows.

Value:
- maximize media usage without changing requested dimensions.

### Designers / offices / small businesses

Jobs:
- labels, cards, invitations, certificates, brochures, handouts;
- reusable layouts;
- batch production;
- mixed document assembly.

Value:
- repeatability and reduced setup.

### Print shops / prepress operators

Jobs:
- inspect incoming files;
- manage bleed and marks;
- impose N-up, step-and-repeat, cut-and-stack, booklet/signatures;
- gang jobs;
- optimize stock;
- save production recipes;
- automate through hot folders/CLI/API;
- later variable data and finishing workflows.

Value:
- operator time, fewer errors, lower waste, repeatability.

## Core jobs to be done

- “Make this fit correctly.”
- “Keep this exact physical size.”
- “Use the fewest sheets.”
- “Make it easy to cut.”
- “Put these different things on the same stock.”
- “Print the right number for these people.”
- “Make front/back line up.”
- “Turn these pages into a correctly ordered booklet.”
- “Tell me what is wrong before I waste paper.”
- “Remember how I produced this job last time.”
- “Send this to the printer without mystery scaling.”
- “Repeat this automatically.”

## Product pillars

### 1. Physical-sheet workspace

The primary workspace represents real sheets with real dimensions and printable regions. Content is placed onto those sheets as physical objects.

### 2. Smart Layout

The solver supports multiple objectives rather than one opaque “best” result:
- minimum sheets;
- maximum content size;
- easiest cutting;
- preserve orientation;
- minimum rotations;
- minimum material waste;
- minimum estimated production cost;
- balanced trade-off.

### 3. Print Truth

Before production, summarize what will physically happen.

Example:

```text
Requested item size: 100 × 150 mm
Output scale: 100.000%
Effective image resolution: 287 PPI
Printable area: compatible
Duplex compensation: -1.2 mm X / +0.6 mm Y
Clipping: none
Status: Ready
```

When there is a conflict, show consequences instead of silently choosing:

```text
Keep exact size → 2.3 mm may clip
Fit printable area → output becomes 96.8%
Rearrange → exact size can be preserved
```

### 4. Progressive complexity

**Simple mode**
- asks what the user wants to make;
- uses plain language;
- chooses safe defaults;
- explains consequences.

**Studio mode**
- physical-sheet editing;
- exact geometry;
- guides/crop/repeats;
- smart-layout alternatives;
- recipes.

**Production mode**
- preflight;
- PDF boxes/bleed/marks;
- advanced imposition;
- ganging;
- finishing;
- automation;
- color/output-production tools over time.

These modes share one document model.

### 5. Printer reality

A geometrically correct PDF is not the same as a correct physical result. Hardware, drivers, firmware, media, non-printable margins, and duplex mechanics can change output.

Print Studio should model this gap through capabilities, Print Truth, and calibration.

### 6. Reusable production recipes

Recipes store meaningful production intent, not opaque dialog state.

### 7. Local-first

Sensitive documents should remain on-device by default.

## Scope boundaries

Print Studio may provide print-relevant editing:
- crop;
- rotate;
- resize;
- nudge;
- simple text/captions;
- borders/backgrounds;
- overlays/watermarks;
- basic annotations;
- print/finishing marks.

It should not become a full:
- illustration suite;
- photo editor;
- word processor;
- publication design suite;
- Canva/Figma replacement.

> **Design elsewhere when unrestricted creative editing is required. Prepare, arrange, optimize, validate, and print here.**

## Success criteria

1. A beginner can produce a correct everyday layout without learning printer terminology.
2. A user can specify real dimensions and understand when printer limitations threaten them.
3. Smart Layout produces explainable alternatives with measurable trade-offs.
4. Preview and output agree because they derive from the same canonical model.
5. A calibrated printer profile can compensate for repeatable scale/offset behavior.
6. A professional can perform serious imposition without leaving the application.
7. Repetitive jobs can be saved as recipes and automated.
8. DustChalk can call the engine without depending on the standalone UI.
9. The system is testable without owning every printer model.
10. Capability growth does not destroy product coherence.

## Working name

Repository/product working name: **Print Studio**.

“Print Engine”, “Layout Engine”, “Print Truth”, “Smart Layout”, and “Printer Profile” are concepts within the product, not separate products today.
