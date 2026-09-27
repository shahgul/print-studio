# Architecture

## Architectural goal

Build one reusable print-production engine with multiple consumers:

```text
                    Print Studio core
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
 desktop/web UI       DustChalk         CLI / SDK / API
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
              layout / preflight / render
                          │
               printer/output subsystem
```

The standalone UI must not become the architecture.

## Proposed repository shape

Exact names can evolve:

```text
print-studio/
├── apps/
│   ├── desktop/
│   └── web/                 # optional/lightweight surface
├── packages/
│   ├── domain/
│   ├── units-geometry/
│   ├── document-import/
│   ├── layout-core/
│   ├── layout-solver/
│   ├── imposition/
│   ├── preflight/
│   ├── renderer/
│   ├── pdf-engine/
│   ├── recipes/
│   ├── printer-core/
│   ├── calibration/
│   └── sdk/
├── native/
│   ├── printing/
│   └── platform/
├── tests/
│   ├── fixtures/
│   ├── golden-geometry/
│   ├── golden-pdfs/
│   └── hardware/
└── docs/
```

Do not create every package on day one merely because it appears here. Split when boundaries become real.

## Technology direction

### UI

Current preferred direction:
- React;
- TypeScript;
- desktop-first interaction model.

Reasons:
- strong ecosystem;
- suitable for a complex canvas/application UI;
- aligns with existing web/product work;
- easy shared UI for optional web surface.

### Desktop wrapper

Tauri is a strong candidate because it allows:
- web UI;
- native Rust commands;
- smaller runtime footprint than Electron in many deployments;
- access to platform/native printing work.

Caveat:
- printer integration is not “solved” by choosing Tauri;
- OS spooler, IPP, USB/raw paths still need explicit implementation;
- do not couple printer architecture to a wrapper plugin that may not cover production needs.

This remains an architecture direction, not an irreversible commitment.

### PDF preview/import

Candidate:
- PDF.js for client-side PDF parsing/rendering/preview where appropriate.

### PDF composition/output

Candidate:
- pdf-lib for initial TypeScript PDF creation/manipulation;
- qpdf as a possible lower-level structural tool/companion where it materially helps.

Do not make public domain contracts depend on either library.

### Native/core implementation language

Two valid paths:
1. TypeScript-first core for faster initial iteration;
2. Rust modules for performance-sensitive solver/native printing/rendering tasks.

A hybrid is likely reasonable with Tauri, but the first implementation should prove where Rust is actually needed.

## License considerations

The product may later be commercial. Dependency licenses must be reviewed before adoption.

Current direction:
- prefer permissive dependencies where possible;
- PDF.js: Apache-2.0;
- pdf-lib: MIT;
- qpdf: Apache-2.0;
- be cautious with strong-copyleft PDF engines when commercial distribution or closed components are planned.

Do not add a dependency only because it is technically powerful; licensing, platform support, security, and maintenance matter.

## Core boundaries

### Domain
Pure types and invariants. No React, no filesystem, no printer IO.

### Units / geometry
Deterministic physical geometry:
- conversions;
- rectangles;
- transforms;
- clipping/intersections;
- tolerance policy.

### Document import
Turns external files into validated Source/Asset metadata. Treat files as untrusted.

### Layout core
Applies known placement algorithms and validates layouts.

### Layout solver
Searches/optimizes alternatives against constraints/objectives.

### Imposition
Production-specific page ordering and sheet-side logic.

### Preflight
Analyzes source/project/output conditions and produces findings/fixes.

### Renderer
Converts canonical sheet sides into visual/output representations. Renderer must not invent layout changes.

### PDF engine
PDF-specific reading/writing/page-box operations behind an abstraction.

### Recipes
Versioned serialization and application of reusable production intent.

### Printer core
Normalized printer identity, capability model, job model.

### Platform/native printing
Windows/macOS/Linux spooler integration and direct protocol transports.

### Calibration
Creates and applies measured corrections.

### Application orchestration
Coordinates workflows without absorbing domain logic.

### UI
Displays state and gathers intent. It should not be the only place where important rules exist.

## Import → layout → output pipeline

```text
untrusted source
   ↓ validate/parse
Source / SourcePage
   ↓ instantiate intent
Items + CopySpecifications
   ↓ constraints
Smart Layout / manual placement
   ↓
Layout
   ↓ preflight
Preflight findings / fixes
   ↓
PrintPlan
   ↓
Renderer / exporter / printer transport
```

## Preview architecture

The preview must be a visualization of canonical physical geometry.

Bad:
- browser canvas becomes source of truth;
- export reads CSS positions;
- print uses a separate layout algorithm.

Good:
- domain stores physical placement;
- canvas maps physical → screen transform;
- PDF renderer maps physical → PDF coordinate transform;
- print renderer maps physical → target format;
- all paths share tests.

## Persistence

Projects and recipes need schema versions from the beginning.

Requirements:
- atomic save where possible;
- autosave;
- crash recovery;
- migration tests;
- source fingerprinting;
- explicit missing-file state;
- no hidden dependence on temporary browser object URLs.

Possible local database/storage can be chosen later.

## Worker / performance model

Large PDFs and solver search must not freeze the UI.

Potential separation:
- parser/render workers;
- solver worker/native task;
- thumbnail queue;
- cancellation tokens;
- progressive preview;
- bounded memory;
- backpressure for large documents.

Performance budgets should be documented once representative fixtures exist.

## Public SDK/API boundary

Do not expose UI internals.

A future consumer should be able to express:

```ts
createProject(...)
addSource(...)
createItems(...)
solveLayout({ objective, constraints })
preflight(...)
render(...)
createPrintPlan(...)
submitPrintJob(...)
```

Contracts need typed errors and explicit units.

## Idempotent physical side effects

Printing is not a normal retryable API call.

A timeout after submission may mean:
- job never reached printer;
- job reached spooler;
- job is printing;
- job completed.

Therefore:
- assign a stable PrintJobIntentId before submission;
- store intent before side effect;
- transport adapters should expose known/unknown state;
- never automatically submit a second physical copy because an acknowledgement timed out.

## Security

Imported PDFs/images and network responses are untrusted.

Mitigations:
- parser/resource limits;
- file-size/page-count limits with user override;
- avoid executing embedded content;
- sanitize generated text/metadata;
- validate IPP responses;
- constrain network discovery scope;
- no raw command injection into printer languages;
- no credential logging;
- sandbox high-risk parsing when practical.

## Observability

Local-first does not mean opaque.

Internal diagnostics should support:
- solver timing;
- renderer timing;
- parser errors;
- printer discovery;
- capability normalization;
- transport failures;
- calibration application;
- print-job transitions.

User telemetry, if added, must be opt-in/appropriate and avoid document content.

## Architecture anti-patterns

- React state as canonical print geometry;
- one giant `print()` function that lays out, renders, and submits;
- printer-specific conditionals scattered through UI;
- “px” in persistent physical geometry;
- different algorithms for preview and output;
- silent scaling in renderer;
- hard-coding one OS driver model;
- cloud upload required for local printing;
- coupling DustChalk semantics into core layout types.

## Initial milestone architecture

Month 1 should prove:
- canonical unit/geometry model;
- PDF/image import;
- physical-sheet canvas;
- deterministic manual placement;
- correct PDF export;
- project persistence;
- tests that compare known geometry.

Printer-control complexity comes after output geometry is trustworthy.
