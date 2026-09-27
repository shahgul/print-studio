# Canonical Domain Model

The domain model is the most important long-term contract in Print Studio. UI modes, renderers, transports, and integrations should all depend on the same physical concepts.

Names are working names. Change deliberately and document migrations.

## Fundamental rule

**Physical geometry is canonical. Screen geometry is derived.**

Do not store a user’s intended 50 mm object as a CSS pixel width.

## Units

Canonical storage is a signed **integer number of micrometres (µm)** represented by a JavaScript safe integer.

Rules:
- 1 mm = 1,000 µm;
- 1 cm = 10,000 µm;
- 1 inch = 25,400 µm exactly;
- external decimal units are rounded once at the construction boundary to the nearest micrometre;
- half-micrometre ties round away from zero symmetrically;
- PDF points are converted using 72 pt/in and therefore may quantize by at most 0.5 µm;
- public geometry uses typed `Length` values rather than ambiguous naked numbers;
- negative `Length` values are valid for coordinates/offsets;
- `Size2D` and `Insets` enforce non-negative invariants;
- UI pixels and raster pixels are derived values and never canonical physical geometry.

This decision is recorded as D-018 in `DECISIONS.md`.

Known relationship:
- 1 inch = 25.4 mm;
- PDF user-space default commonly maps 72 points per inch.

## Core entities

### Project

Container for one user job/workspace.

Owns:
- sources;
- items;
- sheets;
- layout state;
- constraints;
- recipes/recipe reference;
- printer/output intent;
- preflight state;
- project metadata.

A Project is not a PDF. It may consume many PDFs/images and produce many sheets.

### Source

Immutable or versioned imported content.

Examples:
- PDF;
- image;
- generated QR/barcode;
- simple text/shape content.

Properties:
- source ID;
- type;
- URI/path or embedded data;
- fingerprint/hash;
- intrinsic dimensions;
- page/frame list;
- color metadata where known;
- raster pixel dimensions/PPI metadata where present;
- parser warnings.

The source should not be destructively edited. Cropping and transforms belong to items/derived assets.

### SourcePage / Asset

Addressable page/frame/content unit from a Source.

Examples:
- PDF page 7;
- JPEG image;
- generated vector QR.

### Item

A physical instance placed or intended to be placed on a sheet.

Properties:
- source asset reference;
- physical width/height;
- position;
- rotation;
- scale policy;
- crop;
- aspect policy;
- bleed/safe metadata;
- copy-group reference;
- lock state;
- constraints;
- front/back relationship where relevant.

One SourcePage may generate many Items.

### CopySpecification

Represents repetition intent without immediately cloning every object.

Examples:
- 32 identical worksheet copies;
- 4 copies of page 1, 2 copies of page 2;
- 1 card front/back pair for each student;
- variable-data records later.

This enables the solver to reason about quantities.

### SheetDefinition

Describes physical stock, independent of an individual sheet instance.

Properties:
- width/height;
- stock/media name;
- orientation policy;
- nominal margins;
- printable-area source;
- thickness/caliper later;
- cost metadata later;
- tray/media mapping later.

### Sheet

One physical sheet in the production plan.

Owns:
- front Side;
- optional back Side;
- SheetDefinition reference;
- production/order metadata.

A Sheet is not the same as one PDF page. Export may represent each side as a PDF page.

### Side

One printable face of a Sheet.

Contains:
- placed items;
- marks;
- printable region;
- side transform;
- calibration transform;
- production annotations.

### PrintableRegion

Known/assumed area a selected printer/media/transport can mark.

Source classification:
- queried from printer;
- OS/driver-reported;
- measured;
- manually configured;
- generic assumption.

Never hide provenance.

### Layout

The complete placement solution for a Project or subset.

Properties:
- sheet list;
- placements;
- objective;
- solver version;
- score components;
- utilization;
- warnings;
- unsatisfied constraints;
- explanation;
- generation metadata.

### Placement

Binds an Item instance to a Side with a physical transform.

Contains:
- x/y;
- rotation;
- effective width/height;
- crop;
- scale;
- front/back mapping;
- marks relationships.

### Constraint

A hard or soft rule.

Hard examples:
- exact width = 90 mm;
- cannot rotate;
- minimum 3 mm gap;
- must remain within printable region;
- front and back must pair;
- sheet size fixed.

Soft examples:
- prefer no rotation;
- prefer fewer sheets;
- prefer aligned cuts;
- prefer larger margins.

Each constraint should have:
- ID/type;
- scope;
- priority/hardness;
- parameters;
- human explanation.

### Objective

Defines what Smart Layout optimizes.

Possible components:
- sheet count;
- waste area;
- scale;
- cut complexity;
- rotation count;
- material cost;
- finishing complexity.

A weighted multi-objective profile may be used, but user-facing alternatives should remain understandable.

### Recipe

Reusable production intent.

A Recipe is not merely a serialized UI state.

May contain:
- expected input pattern;
- sheet/media;
- constraints;
- copy logic;
- layout strategy/objective;
- marks;
- duplex;
- output strategy;
- optional preferred PrinterProfile.

Recipes should be versioned.

### Printer

Discovered/configured device identity.

Potential identity fields:
- stable OS ID;
- IPP printer UUID;
- make/model;
- network URI;
- transport availability.

Do not assume model name uniquely identifies a physical device.

### PrinterCapabilities

Snapshot of capabilities for a printer + connection/transport.

Examples:
- media;
- sides;
- color modes;
- resolutions;
- formats;
- finishings;
- trays;
- status attributes.

Include:
- retrieval time;
- source;
- unknown fields;
- raw/normalized representation as appropriate.

### PrinterProfile

User-owned production profile for a specific printer/context.

Contains:
- printer identity;
- transport;
- media;
- calibration;
- preferred defaults;
- verified capabilities;
- notes;
- profile version.

### CalibrationProfile

Measured compensation.

Scope may include:
- printer;
- transport;
- media;
- feed orientation;
- quality/resolution;
- duplex mode.

Possible values:
- X/Y scale correction;
- X/Y positional correction;
- duplex back-side correction;
- skew/rotation if later proven useful;
- measured date;
- measurement method;
- confidence/verification.

Calibration must never be applied invisibly; Print Truth reports it.

### PreflightFinding

Properties:
- severity;
- code;
- page/item/sheet location;
- message;
- evidence;
- impact;
- safe-fix availability;
- fix status.

### FixAction

Explicit transformation that addresses one or more findings.

Properties:
- reversible;
- destructive/non-destructive;
- parameters;
- before/after metadata;
- user approval when required.

### PrintPlan

Resolved plan after layout + printer/output decisions.

Contains:
- sheets/sides;
- output format;
- printer/transport;
- effective media settings;
- calibration;
- job attributes;
- Print Truth summary;
- preflight gate result.

### PrintJob

One submitted production attempt.

Important distinction:
- **PrintPlan** = intent;
- **PrintJob** = execution attempt.

This matters for safe retries. The same plan may be retried without creating an unintended duplicate physical job unless the user explicitly asks for another copy.

### PrintJobIntentId / IdempotencyKey

Stable identifier for one intended submission.

If a network retry occurs, reuse the same intent ID. A new physical copy is a new intent.

### Mark

Production mark with physical geometry and semantics:
- crop;
- trim;
- fold;
- registration;
- color bar;
- slug;
- collating/gathering;
- cutter;
- barcode/QR.

### FinishingPlan

Future professional concept:
- cuts;
- folds;
- gather/collate;
- bind;
- punch;
- staple;
- external finisher metadata.

## Important value objects

- `Length`
- `Point2D`
- `Size2D`
- `Rect`
- `Rotation`
- `Scale`
- `MarginBox`
- `PageBoxes`
- `Dpi`
- `ColorSpaceInfo`
- `Transform2D`
- `MediaKey`
- `PrinterUri`

Use branded/strong types where language allows.

## State vs derived data

Canonical:
- requested physical item size;
- sheet definition;
- source/crop;
- constraints;
- placements;
- calibration values.

Derived:
- CSS coordinates;
- screen zoom;
- rendered thumbnail pixels;
- utilization percentage;
- effective PPI;
- clipping warning;
- solver score.

Do not persist derived UI geometry as truth when it can be recalculated.

## Project format requirements

The project format should be:
- versioned from the beginning;
- forward-extensible;
- explicit about units/version;
- deterministic enough for tests;
- capable of referencing or embedding sources;
- independent of React;
- independent of a specific PDF library;
- independent of a printer driver.

Migration strategy must exist before shipping persistent user projects.

## Invariants

Examples:
- physical width/height must be positive;
- placement references valid sheet/side;
- a hard “exact size” constraint cannot be silently scaled;
- back-side mapping must be deterministic;
- calibration scope must match the selected printer/media/transport or be explicitly overridden;
- renderer cannot modify layout geometry;
- UI zoom cannot affect export;
- a submitted print job records the plan version it executed.

These invariants should become tests.
