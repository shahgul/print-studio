# Feature Inventory

This is the broad capability map for Print Studio. It is intentionally larger than the six-month implementation plan.

Labels:
- **Foundation** — architectural prerequisite.
- **Core** — expected in the first serious product.
- **Advanced** — later in the six-month build or soon after.
- **Future** — preserve a path; do not prematurely implement.

## Project and source handling

### Foundation
- create/open/save project;
- local autosave;
- crash recovery;
- recent projects;
- import PDF;
- import PNG/JPEG/WebP and common image formats;
- multi-file import;
- preserve source metadata;
- non-destructive source references;
- missing-source recovery;
- page thumbnails;
- reorder/delete/duplicate source pages;
- blank-page insertion;
- undo/redo.

### Advanced
- embedded-assets option;
- package/archive project with sources;
- source-change detection and refresh;
- replace source while preserving placement.

## Physical sheets

### Foundation
- A-series;
- Letter/Legal/Tabloid and common regional sizes;
- common photo sizes;
- custom width/height;
- portrait/landscape;
- physical rulers;
- layout margins;
- printable-region overlay;
- zoom/pan/fit;
- front/back sides.

### Advanced
- stock/material profiles;
- tray/media mappings;
- partially used label/sticker sheets;
- mixed sheet sizes;
- press/finisher grip zones;
- grain direction.

## Item placement

### Core
- drag;
- resize;
- rotate;
- numeric X/Y/W/H;
- exact physical size;
- preserve aspect ratio;
- crop;
- fit/fill;
- center;
- snap;
- align/distribute;
- multi-select;
- keyboard nudge;
- duplicate/repeat;
- lock;
- z-order where meaningful;
- safe area;
- guides;
- gutters.

### Advanced
- linked repeats;
- same crop across selection;
- content whitespace detection;
- per-item rotation permission;
- per-item min/max scale;
- grouping and keep-together constraints.

## Everyday layout

### Core
- one per sheet;
- fit to printable area;
- actual size;
- shrink oversized;
- fill/crop;
- custom scale with resulting dimension preview;
- auto orientation;
- N-up 2/4/6/8/9/12/custom;
- row/column order;
- mixed source pages;
- page ranges;
- repeat one page N times;
- different copy counts.

## Smart Layout

### Core inputs
- sheet/media;
- printable region;
- item dimensions;
- copies;
- rotation constraints;
- gaps/margins;
- scaling permission;
- exact-size constraints.

### Core objectives
- minimum sheets;
- maximum utilization;
- maximum item size;
- preserve requested size;
- preserve orientation;
- minimum rotations.

### Advanced objectives
- easiest cutting;
- guillotine-friendly cuts;
- minimum cut operations;
- waste vs cut complexity;
- stock cost;
- finishing constraints;
- multi-stock choice;
- mixed-job ganging;
- explainable alternatives.

Output:
- chosen objective;
- sheet count;
- utilization;
- rotations;
- scaling;
- unplaced items;
- conflicts;
- alternatives.

## Exact-size and calibration

### Core
- explicit mm/cm/in/pt;
- resulting dimensions;
- 100% scale lock;
- downstream scaling warning;
- printable-region compatibility.

### Advanced
- calibration test sheet;
- X/Y scale correction;
- X/Y offset;
- duplex front/back offset;
- per-media calibration;
- calibration history;
- confidence/verification;
- optional camera-assisted calibration later.

## Photos

### Core
- standard photo sizes;
- mixed print sizes;
- contact sheets;
- captions;
- borders;
- crop/fill;
- effective PPI;
- auto arrangement preserving size.

### Future
- ICC profiles;
- soft proof;
- printer/media color recipes;
- rendering intent;
- photo-specific sharpening pipeline.

## Labels / stickers / cards

### Core
- regular grids;
- custom grids;
- gutter;
- copies;
- crop/cut marks;
- saved templates;
- partially used sheet starting position.

### Advanced
- common label-stock libraries;
- front/back cards;
- rounded-corner safe zones;
- sticker nesting;
- die lines.

## Classroom

### Core
- student count;
- copies per student/group;
- half/quarter worksheet;
- flashcard grids;
- cut guides;
- savings comparison;
- class recipes.

### Integration
- DustChalk “Print for class”;
- worksheet semantics passed as constraints;
- engine returns production plan/output.

## Booklet / document imposition

### Core
- booklet order;
- left/right binding;
- automatic/manual duplex;
- blank-page handling;
- auto rotate.

### Advanced
- saddle stitch;
- nested saddle;
- perfect-bound signatures;
- signature size;
- creep;
- paper thickness;
- covers;
- mixed stock;
- work-and-turn;
- work-and-tumble.

## Poster / tiling

### Core
- target final physical size;
- tile to media;
- overlap;
- alignment marks;
- tile labels;
- assembly map;
- exact scale.

### Advanced
- mixed tile sizes;
- mural planning;
- content-aware segmentation.

## Cut-and-stack / production layouts

### Advanced
- cut-and-stack;
- step-and-repeat;
- N-up sequential;
- page-shuffle schemes;
- guillotine cut plans;
- cutter-friendly rows/columns;
- ticket/numbering workflows.

## Marks and finishing

### Advanced
- crop/trim marks;
- bleed;
- fold marks;
- registration;
- color bars;
- sluglines;
- collating/gathering;
- lay marks;
- cutter marks;
- barcode/QR;
- finisher barcodes;
- configurable offsets/size/stroke.

## PDF boxes

### Advanced
- MediaBox;
- CropBox;
- TrimBox;
- BleedBox;
- ArtBox;
- visualization;
- set/copy/normalize;
- page-size normalization;
- safe-area validation.

## Preflight

### Advanced checks
- page dimensions;
- mixed sizes;
- clipping;
- printable-area violation;
- insufficient bleed;
- low effective raster resolution;
- font issues where detectable;
- source corruption;
- transparency concerns where relevant;
- RGB/CMYK/spot information;
- excessive ink coverage later;
- trim/safe-zone violation;
- aspect-ratio mismatch;
- unexpected scaling.

Output:
- errors/warnings/info;
- page/item location;
- explanation;
- safe auto-fix where available;
- confirmation for destructive changes;
- report export.

## PDF assembly / print-relevant editing

### Core
- merge;
- split;
- reorder;
- rotate;
- crop;
- resize;
- insert blank;
- duplicate;
- simple overlays;
- captions;
- watermark.

### Advanced
- nudge page content;
- backdrop;
- layers;
- page normalization;
- distortion compensation;
- barcode/QR generation.

## Printer discovery/capability

### Advanced
- system-installed printers;
- DNS-SD/mDNS;
- IPP discovery;
- capability query;
- document-format support;
- media supported/ready;
- color mode;
- sides/duplex;
- print quality;
- resolution;
- finishing;
- trays/media sources where exposed;
- borderless/media support where determinable;
- status/reasons.

## Print transports

Staged:
1. print-ready PDF export;
2. OS spooler/driver;
3. Direct IPP Everywhere;
4. IPP-USB where practical;
5. selected raw/device languages only for justified cases.

Potential formats:
- PDF;
- PWG Raster;
- JPEG;
- URF/AirPrint raster;
- PostScript/PCL for legacy/production needs.

Avoid becoming a custom driver vendor without a clear need.

## Print job control

### Advanced
- submit;
- status;
- progress where available;
- cancel;
- retry using stable intent;
- error explanation;
- history;
- reprint;
- queue awareness where platform permits.

## Presets / recipes

### Core
Capture:
- expected input;
- sheet/media;
- layout;
- copies;
- gaps/margins;
- crop/scale;
- duplex;
- marks;
- printer/profile preference.

### Advanced
- shared libraries;
- recipe versioning;
- variables;
- protected templates;
- share/export.

## Batch / automation

### Advanced/Future
- batch files;
- apply recipe to folder;
- hot folders;
- watch folders;
- CLI;
- local API;
- SDK;
- headless render/impose;
- variable data;
- CSV/JSON mapping;
- job tickets;
- webhook/queue integration;
- production protocols after market validation.

## Cost / sustainability

### Advanced
- sheet count;
- utilization;
- waste area;
- cuts;
- estimated substrate cost;
- compare layouts;
- class/job savings;
- ink/coverage proxy;
- reprint/waste history later.

Avoid fake precision in ink-cost estimates.

## Accessibility and polish

### Core
- keyboard navigation;
- focus states;
- non-color-only warnings;
- touch support where relevant;
- command palette;
- contextual help;
- print terminology explanations;
- undo/redo;
- autosave;
- crash recovery;
- polished empty/loading/error states;
- large-file progress/cancellation.

## Explicit non-goals

- full vector illustration;
- advanced photo retouching;
- full word processing;
- free-form publication design;
- Canva/Figma replacement.

Prefer interoperability with design tools.
