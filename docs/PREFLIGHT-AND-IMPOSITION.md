# Preflight and Professional Imposition

## Purpose

Professional printing introduces two related needs:

1. determine whether incoming material can produce the intended physical result;
2. arrange pages/items for efficient production and finishing.

These capabilities should sit on the same physical model used by beginner workflows.

## Preflight philosophy

Preflight is not a generic “quality score”.

Every finding should be:
- localized;
- explainable;
- categorized by severity;
- tied to production consequences;
- fixable only when the fix is safe and explicit.

## Initial findings

### Geometry
- source page size;
- mixed page sizes;
- crop outside page bounds;
- printable-region collision;
- unsafe content near trim;
- insufficient bleed;
- unexpected scale;
- aspect mismatch.

### Raster
- effective PPI at final physical size;
- extreme upscaling;
- image dimensions.

### PDF structure
- malformed/corrupt pages;
- PDF boxes;
- rotation;
- embedded-font issues where detectable;
- transparency/version concerns where relevant.

### Color — later/deeper
- RGB/CMYK/grayscale/spot inventory;
- output intent;
- overprint;
- separations;
- total ink coverage;
- ICC compatibility.

Do not claim professional color correctness until the color pipeline is genuinely implemented.

## PDF boxes

Support/visualize:
- MediaBox;
- CropBox;
- TrimBox;
- BleedBox;
- ArtBox.

Beginner mode should not require knowing these names.

Production mode must expose them clearly.

## Auto-fix policy

Safe examples:
- rotate page;
- normalize a clearly intended box;
- add blank pages for booklet signature;
- move objects within a safe printable region when exact location is not constrained.

Potentially destructive examples:
- invent bleed by scaling/cropping artwork;
- convert color spaces;
- rasterize transparency;
- substitute fonts;
- crop content.

Destructive fixes require explicit preview/approval.

## Imposition types

### N-up
Multiple pages/items per sheet.

### Step-and-repeat
Repeat the same design over the sheet.

### Cut-and-stack
Arrange sequence so cut stacks yield correct order.

### Booklet
Reorder pages for folded signatures.

### Saddle stitch
Nested folded sheets with center binding.

### Perfect-bound signatures
Group pages into signatures for gathering/binding.

### Work-and-turn
Front/back production using same plate/sheet orientation strategy.

### Work-and-tumble
Alternative sheet flip for two-sided production.

### Gang / mixed-job
Place distinct jobs/items on shared stock to reduce waste.

### Poster / tiling
Split one large final object across smaller sheets.

## Creep

Folded nested sheets cause inner pages to protrude.

Advanced booklet workflow may need:
- sheet count;
- stock thickness/caliper;
- creep model;
- maximum shift;
- content-safe constraints.

Keep user-requested trim size canonical; creep modifies imposed placement.

## Bleed

Model:
- requested bleed;
- available source bleed;
- required minimum;
- mark offset.

Do not conflate bleed with printer borderless.

## Marks

Potential marks:
- trim/crop;
- fold;
- registration;
- color bars;
- slug;
- collating/gathering;
- lay;
- cutter;
- OMR;
- barcode/QR;
- finisher control.

Marks are physical entities with semantics and should not be baked into random renderer code.

## Cutting plans

For cut-aware optimization:
- identify guillotine-compatible cut lines;
- group aligned cuts;
- estimate operation count;
- model resulting stacks;
- validate cut-and-stack order.

The user may choose a layout with lower sheet utilization if cutting becomes substantially easier.

## Variable data — later

Potential sources:
- CSV;
- JSON;
- generated sequence;
- QR/barcode values;
- names/IDs.

Variable data belongs above a deterministic template/placement system.

Do not turn Print Studio into a mail-merge word processor.

## Professional automation — later

- production recipe;
- hot folder;
- local daemon;
- CLI;
- API;
- variable input;
- report;
- output folder;
- optional printer submit.

Automation must record:
- input fingerprint;
- recipe version;
- solver version;
- preflight result;
- output hash;
- print-job intent where submitted.

## Compatibility strategy

The professional market includes mature tools. Do not attempt feature parity everywhere in V1.

Early professional wedge should focus on:
- approachable modern UX;
- physical intent;
- explainable optimization;
- exact/calibrated output;
- reusable recipes;
- local-first processing;
- excellent basic preflight.

Deep color/press/finishing integrations should follow validated demand.
