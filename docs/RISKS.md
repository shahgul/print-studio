# Risks

## Product risks

### R1 — “Everything printing” becomes endless scope
**Risk:** professional printing has decades of specialized features.

**Mitigation:**
- six-month roadmap gates;
- clear non-goals;
- architecture supports future depth without requiring immediate parity;
- validate high-end features with real operators.

### R2 — Feature checklist without differentiated experience
**Risk:** competing on N-up/booklet/crop when mature products already offer them.

**Mitigation:**
- physical-object model;
- intent-first UX;
- explainable solver;
- Print Truth;
- calibration;
- printer operating layer.

### R3 — Beginner/pro conflict
**Risk:** product becomes intimidating or too shallow.

**Mitigation:**
- progressive modes over one model;
- semantic beginner workflows;
- professional inspector/detail layers;
- usability tests for both groups.

### R4 — Users do not pay
**Risk:** existing free tools are “good enough”.

**Mitigation:**
- free tier proves usefulness;
- monetize repeatable/high-ROI features;
- validate pricing with recurring users;
- focus on time/material savings.

## Engineering risks

### R5 — PDF complexity
PDF is a large format with malformed files, unusual boxes, fonts, transparency, color, and security concerns.

**Mitigation:**
- mature libraries behind abstraction;
- corpus testing;
- limits/sandboxing;
- progressive preflight depth.

### R6 — Numerical correctness
Small rounding errors can become physical misalignment.

**Mitigation:**
- typed physical units;
- central tolerance policy;
- deterministic transforms;
- golden geometry tests.

### R7 — Solver performance
Packing/imposition optimization can become combinatorial.

**Mitigation:**
- heuristics first;
- time budgets;
- cancellation;
- bounded candidate search;
- approximate solutions with clear objectives;
- benchmark corpus.

### R8 — Preview/output divergence
UI may look correct while PDF/print differs.

**Mitigation:**
- same canonical model;
- renderer cannot change layout;
- geometry tests;
- independent PDF inspection;
- physical verification kit.

### R9 — Printer compatibility explosion
Drivers and firmware behave differently.

**Mitigation:**
- staged transport strategy;
- OS path for broad compatibility;
- standards-based IPP;
- capability provenance;
- calibrated profiles;
- documented compatibility matrix;
- avoid arbitrary raw integrations.

### R10 — Direct print duplicate jobs
Timeout/retry can produce extra physical copies.

**Mitigation:**
- intent IDs;
- persistent job state;
- “unknown” state;
- confirmation before uncertain retry.

### R11 — Calibration overpromises
Mechanical variation is noisy and device/media dependent.

**Mitigation:**
- scoped profiles;
- verification date/confidence;
- “calibrated” not “guaranteed exact”;
- residual-error reporting.

### R12 — Color management rabbit hole
Professional color can consume the roadmap.

**Mitigation:**
- separate subsystem;
- inventory/warnings before transforms;
- delay serious conversions/soft proof until core geometry succeeds.

### R13 — Large-file performance
Hundreds of pages/high-res images can exhaust memory/UI.

**Mitigation:**
- lazy page rendering;
- workers/native tasks;
- bounded caches;
- progressive thumbnails;
- cancellation;
- representative performance fixtures.

### R14 — Dependency licensing
Some PDF/rendering components may impose copyleft/commercial terms.

**Mitigation:**
- license review before adoption;
- prefer permissive dependencies where reasonable;
- keep interfaces replaceable;
- maintain third-party notices.

### R15 — Tauri/native printing gap
A desktop shell does not automatically provide mature cross-platform printing.

**Mitigation:**
- treat platform printing as its own subsystem;
- do not depend on one plugin;
- use OS APIs/IPP adapters directly where needed.

## Security/privacy risks

### R16 — Hostile documents
PDF/image parsers process untrusted files.

Mitigation:
- limits;
- sandbox where practical;
- dependency updates;
- fuzzing;
- never execute embedded scripts/content.

### R17 — Local-network printer discovery
Discovery reveals devices and potentially network metadata.

Mitigation:
- explicit permission/context;
- minimum scope;
- secure URI handling;
- do not upload discovered network topology.

### R18 — Cloud temptation
Cloud processing would simplify some integrations but weaken privacy.

Mitigation:
- local-first default;
- cloud only for features with explicit user value.

## Business/support risks

### R19 — Consumer support burden
Printer problems may be blamed on Print Studio even when caused by firmware/hardware.

Mitigation:
- Print Truth;
- capability provenance;
- diagnostic reports;
- compatibility docs;
- calibration;
- clear boundary between known/unknown.

### R20 — Professional expectations
Print shops expect reliability, support, advanced formats, and workflow integration.

Mitigation:
- do not market “Print Pro” prematurely;
- beta with actual shops;
- publish supported workflow matrix;
- price support into professional tiers.

### R21 — Perpetual pricing sustainability
OS/printer changes require ongoing maintenance.

Mitigation:
- paid major upgrades, optional maintenance, or mixed pricing;
- avoid lifetime promises that cannot fund support.

## Research risks

### R22 — Community anecdotes mistaken for market statistics
Reddit/forum pain is useful but not representative.

Mitigation:
- label anecdotal evidence;
- combine with vendor docs, interviews, telemetry, and surveys.

### R23 — Broad market reports misused as TAM
Print-management reports include categories outside this product.

Mitigation:
- use segment-based bottom-up validation;
- never pitch broad printer/software market as direct TAM.

## Kill / pivot signals

Reconsider direction if:
- exact/layout users rarely repeat jobs;
- users consistently choose existing free tools after testing;
- printer-control support consumes most engineering without improving retention;
- professional users require proprietary integrations beyond feasible scope;
- Smart Layout saves negligible time/material compared with simple grids.

A pivot can still retain the reusable layout engine for DustChalk or vertical products.
