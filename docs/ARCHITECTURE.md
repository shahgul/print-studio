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
│   ├── project-file/
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
- as of the September 2026 research snapshot, Tauri's official plugins workspace still has open proposals for cross-platform printer support rather than a mature official printer API;
- OS spooler, IPP, USB/raw paths still need explicit implementation;
- do not couple printer architecture to a wrapper plugin that may not cover production needs.

This remains an architecture direction, not an irreversible commitment.

### PDF preview/import

Candidate:
- PDF.js for client-side PDF parsing/rendering/preview where appropriate.

### PDF composition/output

Current implementation:
- `packages/pdf-engine` is the headless PDF boundary;
- `@cantoo/pdf-lib` is the initial TypeScript PDF adapter;
- the adapter is isolated so domain/layout contracts do not depend on that library;
- qpdf remains a possible lower-level structural companion where it materially helps.

Why `@cantoo/pdf-lib`:
- it retains the original pdf-lib API model;
- it is MIT licensed;
- as of the September 2026 implementation snapshot it is actively maintained, unlike the much older latest upstream `pdf-lib` release.

Public domain contracts must remain independent of the PDF library.

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
- `@cantoo/pdf-lib`: MIT (current initial PDF adapter);
- qpdf: Apache-2.0;
- MuPDF is technically strong but its open-source option is GNU AGPL, with commercial licensing offered by Artifex; do not make it a default dependency unless the product's distribution/license model is compatible;
- be cautious with strong-copyleft PDF engines when commercial distribution or closed components are planned.

Do not add a dependency only because it is technically powerful; licensing, platform support, security, and maintenance matter.

## Core boundaries

### Project editing history (M1.7 contract)

The desktop editing history is a headless TypeScript module. Actions record validated canonical Item/Sheet geometry; undo and redo restore that geometry while retaining current Source metadata and availability. It contains no React, viewport, renderer, native file paths, or source bytes. A drag/resize gesture is one action; numeric edits, rotation, and keyboard nudges are separate actions. Rejected and unchanged edits do not enter history, and a new edit after undo discards the redo branch. History is bounded to 100 actions and is session-only. Successful Open or source import starts a fresh history; Save does not clear it. Existing project serialization and atomic recovery snapshots persist the current Project, not the history.

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

Current M1.5 implementation:
- `packages/document-import` accepts raw bytes plus caller-owned source identity/path metadata;
- file type is detected from byte signatures rather than trusted from the filename;
- PNG/JPEG metadata parsing reads dimensions without decoding a full bitmap;
- PNG `pHYs` and JPEG JFIF density are used when they declare physical units;
- missing/unknown image density does not create an assumed physical size;
- PDFs are parsed for page count and canonical physical page dimensions, including 90°/270° page rotation;
- SHA-256 fingerprints identify the exact imported bytes;
- typed errors distinguish unsupported, malformed, and resource-limit failures;
- default guards currently cap imports at 256 MiB, 1,000 PDF pages, and 250 million image pixels.

Desktop source reads use a bounded Rust adapter and Tauri raw binary IPC (`tauri::ipc::Response`) so file bytes are not expanded into JSON arrays.

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

#### M1.8 image output contract

`renderProjectToPdf(project, { resolveSourceBytes })` accepts a caller-owned local source resolver. Placed PNG/JPEG Items render actual image content; source-less geometry fixtures retain their vector rectangles. Referenced image bytes are bounded and re-inspected through `document-import`, and their SHA-256 identity and intrinsic dimensions must match the Project. Missing/changed sources, absent resolvers, malformed content, unsupported placed PDF sources, and resource-limit violations fail with typed errors rather than exporting placeholders. Unplaced sources are not read. Each distinct placed source is resolved/embedded once per export.

Normalized crop is applied through a clip and image transform, without rewriting source bytes. Quarter-turn rotation is clockwise in sheet coordinates. Item size and position remain canonical; no DPI is assumed. The cropped raster aspect must agree with the Item within 1 µm of dimension quantization; unsupported distortion fails explicitly. Preview uses the same crop, rotation, and Item dimensions. PDF output does not contain selection outlines/rulers.

Nontrivial JPEG EXIF orientation is rejected explicitly because browser auto-orientation would otherwise differ from raw JPEG embedding. Native PDF output is capped at 64 MiB; source decoding retains the existing 256 MiB/250 MP import limits. These are bounds, not a claim of constant memory or full decompression sandboxing.

Desktop image placement requires explicit width/height in millimetres and preserves source aspect. It appends a source-backed Item at 20,30 mm on the first sheet's front; overflow fails instead of fitting automatically. Existing geometry is retained. Native PDF export uses a bounded, `.pdf`-only atomic binary writer, raw binary IPC, and a user-selected save path. Physical print measurement and driver scaling remain manual verification gates.

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

The M1.6 desktop canvas uses `canvas-model.ts` for the pure physical-to-screen viewport transform and `canvas-project.ts` for validated immutable Project edits. React/SVG handles display and pointer/keyboard input. Fit, zoom, and pan change only viewport state; saved projects and PDF output still use canonical micrometres. The canvas displays the first sheet's front side. M1.8 resolves verified local image bytes through `image-previews.ts`, manages Blob URL lifetime, and renders source-backed PNG/JPEG placements with canonical crop/rotation; other geometry keeps its outline. Vitest and browser-mode WebdriverIO cover geometry and UI workflows. An external Windows `tauri-driver` smoke test launches the compiled WebView2 app. Agent-operated canvas runtime checks passed; exact native edited-project Save → restart → Open and native image export acceptance remain pending.

## Persistence

The first persistence boundary is implemented in `packages/project-file`.

Current rules:
- format identity: `print-studio-project`;
- current schema version: 2;
- canonical persisted physical unit: integer micrometres;
- project files are treated as untrusted input and validated at load time;
- unknown additive fields are tolerated inside a supported schema version;
- unsupported future versions fail explicitly rather than being guessed;
- migration logic is isolated behind a migration hook from the beginning;
- serialization/deserialization is independent of React, Tauri, filesystem APIs, and the PDF engine.

`ProjectPersistence` depends on a small `ProjectTextStore` port:
- `read(path)`;
- `writeAtomic(path, content)`.

The word **atomic** is part of the adapter contract. A platform implementation must not report success after a partial/truncated project replacement.

Desktop implementation now provides:
- a TypeScript `ProjectTextStore` bridge that invokes only narrow Tauri commands;
- native Rust read + atomic-write commands;
- same-directory temporary writes followed by flush, sync, and atomic persist/replace;
- `.printstudio` path validation;
- native Open / Save dialogs;
- a dedicated Windows-native CI job;
- a temporary desktop persistence test surface.

Recovery groundwork now provides:
- companion `.autosave.printstudio` snapshots for saved project paths;
- atomic recovery writes;
- idempotent native cleanup;
- a 30-second initial interval policy constant.

Still required in later autosave/crash-recovery work:
- timer/session orchestration and dirty-state integration;
- untitled-session recovery;
- recovery prompts and conflict UX.

M1.5 adds source fingerprinting, explicit availability states, schema V1 → V2 migration fixtures, and source-item crop metadata without depending on temporary browser object URLs. The native watcher and focus-time fallback revalidate source paths while the project is open. Automated checks, CI, and agent-operated Windows live-monitoring verification passed.

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
