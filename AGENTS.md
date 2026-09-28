# AGENTS.md

This repository is the canonical source of truth for **Print Studio**. Read this file and the relevant docs before making implementation or product changes.

## Working model and source of truth

Print Studio development may span Codex on the local PC, ChatGPT discussions, GitHub, and other tools. The repository is the coordination boundary between them.

- **Repository/GitHub is authoritative.** Code, tests, tracked milestone state, accepted decisions, and canonical documentation in the repository override conversational memory or a copied prompt.
- **Codex/local PC is the primary implementation environment.** Use it for editing, running tests, Tauri/Windows verification, debugging, refactoring, and commits.
- **ChatGPT discussions are for product/architecture/research decisions.** A discussion is not authoritative until the relevant repository document is updated.
- A new agent/thread must not assume it has previous chat context. Reconstruct context from the repository before acting.
- Before implementation, pull/inspect the latest repository state and check the current branch/worktree so stale chat instructions do not overwrite newer work.
- If a prompt conflicts with the repository, stop and reconcile the conflict using the repository as the default authority.
- Important decisions discovered during implementation must be written back to the owning Markdown document in the same change.
- Do not use chat history as the only record of milestone completion, manual verification, architecture, or product decisions.

## Product identity

Print Studio is a **physical-layout and print-production platform**, not merely a PDF printer or another settings dialog.

> **From digital content to a predictable physical object.**

A beginner may only know the outcome they want. A professional may expect explicit control over imposition, bleed, marks, finishing, preflight, calibration, and automation. Both experiences must use the same underlying domain model and engines.

## Required reading before implementation

At minimum:
1. `README.md`
2. `DEVELOPMENT-PLAN.md`
3. `TODO.md`
4. `docs/PRODUCT.md`
5. `docs/DOMAIN-MODEL.md`
6. `docs/ARCHITECTURE.md`
7. `docs/FEATURES.md`
8. `docs/UX.md`
9. the specialist doc for the area being changed.

For printer/device work also read:
- `docs/PRINTING-STACK.md`
- `docs/CALIBRATION.md`

For solver/imposition work also read:
- `docs/SMART-LAYOUT.md`
- `docs/PREFLIGHT-AND-IMPOSITION.md`
- `docs/TESTING.md`

For strategy/scope work also read:
- `docs/MARKET-AND-IMPACT.md`
- `docs/COMPETITORS.md`
- `docs/BUSINESS.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `docs/RISKS.md`

## Non-negotiable principles

- The **physical sheet** is a first-class domain object.
- Physical dimensions use explicit units. Pixels are never the canonical measurement.
- Preview, export, and print derive from the same canonical project/layout model.
- Never introduce hidden scaling.
- Never silently “fix” a document in a way that changes physical intent.
- Optimization must expose its objective and important trade-offs.
- Printer capabilities must be queried, measured, or clearly labelled as assumed.
- Beginner UX must not require knowledge of prepress terminology.
- Professional capability must not be blocked by simplified beginner abstractions.
- Keep layout/domain logic independent of React and presentation state.
- Keep native printer transports independent of the layout solver.
- Local-first is the default. Do not add cloud dependence without documented benefit.
- Sensitive documents must not be uploaded by default.
- Do not turn Print Studio into a general-purpose illustration/design suite.
- Do not couple core engine decisions to DustChalk; DustChalk is a consumer of Print Studio capabilities.

## Engineering workflow

For behavior changes follow **red → green → refactor**.

Before implementing:
- inspect the latest repository state, current branch/worktree, and recent relevant changes;
- discover the actual stack and test commands from the repo;
- read the active milestone and relevant canonical docs instead of relying on remembered chat context;
- define or update the relevant contract first;
- add the failing test or golden fixture;
- make the smallest implementation that satisfies the contract;
- refactor only while tests remain green.

For bugs, first reproduce the bug with a failing test.

## Testing expectations

Geometry, physical-unit conversion, page ordering, imposition, calibration, and solver behavior require deterministic tests.

Use:
- unit tests for geometry and constraints;
- property/invariant tests for layouts;
- integration tests for PDF/image import and export;
- golden geometry fixtures for known physical layouts;
- golden rendered/PDF fixtures where stable;
- printer-protocol simulations/fakes for IPP and spooler behavior;
- real-printer calibration tests as a separate hardware suite;
- E2E tests for critical user workflows.

Never claim exact-size correctness from screenshots alone.

## Documentation ownership

When a decision changes, update the owning document in the same change.

- positioning, audiences, non-goals → `docs/PRODUCT.md`
- pain research → `docs/PAIN-POINTS.md`
- problem size and impact → `docs/MARKET-AND-IMPACT.md`
- competitor claims → `docs/COMPETITORS.md`
- feature scope → `docs/FEATURES.md`
- user flows/interactions → `docs/UX.md`
- canonical concepts → `docs/DOMAIN-MODEL.md`
- module boundaries/stack → `docs/ARCHITECTURE.md`
- printer/IPP/driver paths → `docs/PRINTING-STACK.md`
- calibration → `docs/CALIBRATION.md`
- solver → `docs/SMART-LAYOUT.md`
- professional prepress/imposition → `docs/PREFLIGHT-AND-IMPOSITION.md`
- testing → `docs/TESTING.md`
- monetization → `docs/BUSINESS.md`
- DustChalk/external consumers → `docs/INTEGRATIONS.md`
- strategic sequencing → `docs/ROADMAP.md`
- live implementation/completion tracking → `DEVELOPMENT-PLAN.md`
- new unscheduled ideas/follow-ups → `TODO.md`
- accepted/deferred decisions → `docs/DECISIONS.md`
- product/engineering risks → `docs/RISKS.md`
- terminology → `docs/GLOSSARY.md`
- external sources → `docs/REFERENCES.md`

Do not turn README into a duplicate specification.

## API and package design

Use contract-first interfaces and validate at boundaries.

Public APIs should:
- have typed input and output;
- use consistent structured errors;
- be additive where possible;
- avoid leaking renderer/driver implementation details;
- expose physical concepts rather than UI state;
- make units explicit in types;
- make destructive transformations explicit;
- support idempotent job submission where retries could duplicate physical output.

A print-job API must treat duplicate submission as a serious side effect. An idempotency key represents one user intent, not one network attempt.

## High-level responsibility separation

Preserve clear boundaries between:
- document/domain model;
- physical geometry and units;
- layout/imposition solver;
- preflight;
- rendering/export;
- printer discovery/capabilities;
- print transports;
- printer profiles/calibration;
- application orchestration;
- UI;
- automation/SDK boundary.

Do not collapse these into one frontend store.

## Security and privacy

- Never commit printer credentials, API keys, private documents, or real customer jobs.
- Treat imported documents and printer/network responses as untrusted input.
- PDFs may be malformed or hostile; parsers need resource limits and sandboxing where practical.
- Network discovery reveals local-network information; request only required permissions.
- Raw printer paths are privileged capabilities and must validate payloads.
- Keep document processing local by default.

## Product quality bar

The intended product should eventually provide:
- undo/redo;
- autosave and crash recovery;
- keyboard access and power-user shortcuts;
- accessible controls;
- responsive and performant canvas behavior;
- deterministic physical output;
- warnings before paper/ink is wasted;
- explainable optimization;
- reusable recipes;
- excellent defaults without removing advanced control.

## Current phase

The repository is in planning/foundation. Do not prematurely build a large framework or printer-specific driver matrix. Preserve the sequencing in `docs/ROADMAP.md`.

If implementation reveals a conflict with the blueprint, document and resolve the conflict rather than silently diverging.

## Development tracking discipline

- Keep `DEVELOPMENT-PLAN.md` current during implementation.
- Mark tasks complete only after their verification gate passes.
- Capture newly discovered unscheduled work in `TODO.md`.
- When a TODO becomes scheduled, mark it promoted there and add it to `DEVELOPMENT-PLAN.md`.
- When a promoted TODO is implemented, mark/update both files.
- Do not use random code comments as the only record of important future product work.
