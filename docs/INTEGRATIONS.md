# Integrations

## Core rule

Print Studio is an engine/platform first. DustChalk and future products consume its capabilities; they do not define its core domain.

## DustChalk

### Why it fits

Teacher workflows naturally contain production semantics:
- student count;
- group count;
- worksheet type;
- flashcards;
- cut/fold requirements;
- readability;
- paper-saving priority.

Instead of exporting a PDF and leaving the teacher to solve layout manually, DustChalk can pass structured intent to Print Studio.

Example:

```json
{
  "intent": "CLASS_WORKSHEET",
  "students": 32,
  "copiesPerStudent": 1,
  "media": "A4",
  "duplex": false,
  "priority": "MINIMUM_PAPER",
  "minimumReadableScale": 0.72,
  "preferSingleStraightCut": true
}
```

Possible result:

```text
16 A4 sheets
2 worksheets per sheet
100% of minimum readability constraint
one horizontal cut per sheet
estimated saving vs one-per-sheet: 16 sheets
```

### DustChalk workflows

- Print for class;
- flashcard sheet;
- picture cards;
- half-sheet worksheet;
- activity cards;
- certificates;
- labels;
- booklet/activity pack;
- “print 6 sets for groups”;
- save school/printer recipe.

### UX responsibility

DustChalk should expose teacher language.

Print Studio core receives structured constraints.

Do not expose “N-up imposition” in DustChalk unless a power-user mode explicitly needs it.

## SDK

Potential public capability:

```ts
const project = await printStudio.createProject();
await project.addSource(file);
const plan = await project.solve({
  media: "A4",
  objective: "MINIMUM_PAPER",
  constraints: [...]
});
const result = await project.render(plan, { format: "PDF" });
```

Later printer APIs:

```ts
const printers = await printStudio.printers.discover();
const printPlan = await project.preparePrint({
  layout: plan,
  printerProfileId
});
await printStudio.print.submit(printPlan, { intentId });
```

Actual contracts will be designed separately; examples are conceptual.

## CLI

Future use cases:
- automation;
- CI-like document preparation;
- print shops;
- batch jobs.

Conceptual:

```bash
print-studio impose input.pdf   --recipe business-card-a3   --output imposed.pdf

print-studio preflight input.pdf --profile digital-print

print-studio print input.pdf   --recipe labels-24up   --printer "ipp://..."
```

## Hot folders

Professional later-stage workflow:

```text
/watch/business-cards/
      ↓
apply recipe
      ↓
preflight
      ↓
/output/ready/
/output/error/
```

Requirements:
- deterministic recipe version;
- idempotent file handling;
- processing report;
- source/output hash;
- never silently print duplicates.

## Local API

Potential local daemon lets another application call the engine without shipping it as a library.

Uses:
- desktop tools;
- DustChalk local integration;
- browser extension/app bridge;
- shop automation.

Security:
- localhost binding by default;
- authentication/token;
- origin restrictions where relevant;
- no unauthenticated LAN print API.

## Cloud API

Not a starting requirement.

If built later, likely for:
- team automation;
- server-generated print assets;
- remote production workflow;
- enterprise integration.

Sensitive input/privacy and large PDF costs make “upload everything to us” undesirable as the default architecture.

## Design-tool interoperability

Prefer importing:
- PDF;
- images;
- standard exported formats.

Future:
- plugin/export integrations from Canva/Figma/Adobe tools only when useful.

Do not rebuild those design tools.

## Printer/OEM integration

Long-term possibilities:
- printer capability databases;
- OEM-certified profiles;
- media presets;
- manufacturer partnerships;
- label/finisher integrations.

Do not make the initial product dependent on OEM cooperation.

## Recipe exchange

Future:
- export/import recipe file;
- organization library;
- teacher recipe library;
- printer/profile packs;
- verified vendor recipes.

Recipes need versioning and safety validation before application.

## Third-party trust boundary

Every external:
- source document;
- printer response;
- recipe;
- integration payload;

is untrusted input and must be validated at the boundary.



## Folixa / generated-document layer

**Folixa** is the standalone structured document-creation product. Its reusable **Folixa Engine** owns document modelling, reusable components/templates, renderer abstraction, and document generation.

This replaces the earlier idea of Print Studio independently adopting pdfcn.

```text
structured data / application intent
        ↓
Folixa Engine
        ↓
generated PDF/document
        ↓
Print Studio
        ↓
preflight / placement / imposition / print planning / output
```

pdfcn, Takumi, Forme, or other rendering technologies are Folixa implementation concerns unless Print Studio independently needs them for a print-specific reason.

### Integration strategy

Start with generated-file interchange. Folixa exports a PDF/document and Print Studio imports it like any other source. This preserves a clean boundary and independently deployable products.

Later, direct Folixa Engine consumption may be useful for generated labels, certificates, reports, variable-data documents, or other workflows. Add that dependency only when a concrete Print Studio use case requires it.

### Ownership boundary

Folixa does **not** replace Print Studio's:
- precise print geometry;
- source tracking and change detection;
- preflight;
- imposition;
- printer capabilities/integration;
- print recipes;
- Print Studio project model;
- physical-output workflow.

Conversely, Print Studio should not grow a parallel general-purpose document component/template system that duplicates Folixa Engine.

### DustChalk chain

The preferred ecosystem flow is:

```text
DustChalk
  teacher workflow/data
        ↓
Folixa Engine
  document generation
        ↓
Print Studio
  optional print preparation
        ↓
physical output
```

Each product remains independently useful and owns a distinct layer.


## Folixa and Shadcn Labs

Folixa is the preferred shared boundary for generated documents. Print Studio should consume generated PDF/file output first and only consider direct Folixa Engine embedding when a concrete editing/generation workflow requires it.

Shadcn Labs projects are references, not Print Studio dependencies:
- **pdfcn** belongs behind Folixa's renderer abstraction rather than being integrated independently here.
- **editorcn** may inform future text/content editing UX, but Print Studio's precision canvas, geometry, preflight, imposition and printer workflow remain native Print Studio concerns.
- **startercn / skills / agentcn / mcpcn** are not current Print Studio requirements.

This prevents renderer choices from leaking into the print-production domain and keeps Folixa and Print Studio independently evolvable.
