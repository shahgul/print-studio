# Research Backlog

Items here require focused validation before implementation or product claims.

## User research

### Beginners
Interview/test:
- users who regularly fight A4 layout;
- parents/students;
- users printing IDs/photos/labels.

Questions:
- what did they attempt first?
- where did scaling go wrong?
- what words do they understand?
- would they trust automated layout?
- what do they measure physically?

### Teachers
Validate:
- most common paper sizes/printers in target Indian schools;
- personal vs school-paid paper/ink;
- worksheet copy volume;
- flashcard/cut workflows;
- mobile vs Windows workflow;
- willingness to save reusable recipes.

### Makers / photographers
Validate:
- exact-size tolerance expectations;
- calibration behavior;
- photo/color expectations;
- label/sticker partial-sheet needs.

### Print shops
Interview at least 3–5 operators:
- incoming file problems;
- current imposition tool;
- recurring recipes;
- setup time;
- cut/finishing constraints;
- automation needs;
- acceptable pricing/support.

## Printer research

- Windows modern printing APIs and PrintTicket path;
- macOS native print stack;
- Linux CUPS/IPP;
- IPP Everywhere capability edge cases;
- IPP-USB;
- AirPrint/URF;
- borderless capability expression;
- printer UUID/device identity;
- status/job monitoring;
- authentication/TLS;
- direct PDF support vs PWG raster fallback.

## Hardware test matrix

Acquire/access over time:
- cheap home inkjet;
- ink tank;
- duplex office laser;
- photo printer;
- label printer;
- professional/office MFP if possible.

Test:
- exact-size;
- margins;
- borderless;
- duplex;
- direct IPP vs driver;
- calibration persistence.

## Solver research

Compare:
- regular grid;
- shelf;
- skyline;
- MaxRects;
- guillotine packing;
- constraint programming;
- OR-Tools/other solvers where licensing/size fit;
- custom heuristics.

Benchmark against:
- sheet count;
- runtime;
- cut complexity;
- deterministic output.

## PDF engine research

Validate:
- PDF.js capability/security;
- pdf-lib composition quality;
- qpdf role;
- PDF box editing;
- fonts;
- transparency;
- large files;
- incremental vs rewrite;
- PDF/X ambitions;
- license impact of alternative commercial/open-source engines.

## Color research — deferred

- ICC profile handling;
- LittleCMS or alternatives;
- soft proof;
- rendering intent;
- spot colors;
- overprint;
- total ink;
- PDF/X output intent.

Do not implement merely to claim “CMYK supported”.

## Commercial research

- India consumer price sensitivity;
- one-time vs subscription;
- teacher bundle via DustChalk;
- professional pricing;
- paid major upgrades;
- commercial SDK/OEM licensing.

## Competitor monitoring

Watch:
- PDF Press;
- Montax;
- Quite;
- Fiery;
- Enfocus;
- Ultimate Impostrip;
- ExactPrint;
- Print Layout Designer;
- Qimage;
- new “easy imposition” tools.

For each major release, record:
- feature;
- UX approach;
- pricing;
- local/cloud model;
- what user problem remains.

## Legal/licensing

Before implementation dependency lock-in:
- dependency SPDX/license audit;
- font licensing;
- PDF standard/compliance libraries;
- printer SDK terms;
- ICC/profile redistribution rights;
- label-template database licensing;
- privacy requirements for telemetry/cloud.

## Naming/brand

Before public beta:
- Print Studio trademark/name collision search;
- domain/app-store availability;
- product identity vs generic term.

Repository name can remain `print-studio` regardless of final brand.
