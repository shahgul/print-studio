# Smart Layout

## Purpose

Smart Layout converts physical intent and constraints into one or more explainable sheet arrangements.

It is primarily a deterministic optimization/constraint problem. Machine learning or an LLM may later translate natural language into constraints, but **the geometry solver remains authoritative**.

## Example

Input:
- 17 cards;
- each card 80 × 55 mm;
- A4 stock;
- 5 mm printable margin;
- 3 mm minimum gap;
- rotation allowed;
- exact card size required.

Output:

```text
Recommended — Minimum paper
2 sheets
9 + 8 cards
86% average usable-area utilization
3 cards rotated
0 scaled

Alternative — Easier cutting
3 sheets
aligned rows
fewer cut operations
lower utilization
```

## Inputs

### Media
- sheet width/height;
- printable region;
- stock/media identifier;
- optional cost;
- optional grain/feed constraints later.

### Items
- physical dimensions;
- copy count;
- crop;
- front/back pair;
- min/max scale;
- exact-size flag;
- rotation permissions;
- grouping/keep-together rules.

### Gaps/margins
- outer margin;
- item gap;
- bleed;
- cut gap;
- printer exclusion zones.

### Production constraints
Future:
- guillotine cuts;
- step-and-repeat requirements;
- same-row/same-column;
- cutter/finisher rules;
- work-and-turn;
- grain direction.

## Hard vs soft constraints

Hard constraints must never be violated silently.

Examples:
- exact physical size;
- no rotation;
- minimum gap;
- printable-area containment;
- pair front/back;
- fixed sheet size.

Soft constraints influence ranking:
- prefer no rotation;
- prefer aligned cuts;
- prefer fewer sheets;
- prefer larger margins.

If hard constraints cannot all be satisfied, return a conflict, not a “best effort” layout pretending to be valid.

## Objective profiles

### Minimum paper
Primary:
- sheet count;
- waste area.

### Preserve size
Primary:
- zero/least scaling;
- clipping forbidden.

### Largest output
Primary:
- maximize common/item scale subject to readability/constraints.

### Easiest cutting
Primary:
- aligned guillotine cuts;
- fewer cut operations;
- simple stacks.

### Preserve orientation
Primary:
- minimize rotations.

### Lowest material cost
Primary:
- selected stock cost × sheets;
- later finishing/ink proxies where credible.

### Balanced
Explicit weighted profile. Weights must be versioned and inspectable.

## Explainability

Every solution should report:
- objective;
- sheet count;
- utilization;
- scaling;
- rotations;
- estimated cut complexity;
- unplaced items;
- conflicts/warnings;
- material/cost estimate where available;
- solver version.

Do not present an unexplained “95/100 layout score” as the primary result.

## Alternative generation

A single optimum is not enough because humans value different trade-offs.

Generate alternatives only when materially different:
- one fewer sheet but more cuts;
- same sheets with no rotation;
- larger margins;
- preserved reading order;
- cheaper stock.

Avoid trivial near-duplicates.

## Manual editing and locking

User can:
- accept solver plan;
- move items manually;
- lock placements/groups/sheets;
- re-run solver around locked content.

Locks become hard constraints.

## Algorithm roadmap

### Stage 1: deterministic grids and known layouts
- N-up;
- regular grids;
- fit/fill;
- standard booklet rules.

### Stage 2: rectangular packing
- shelf/skyline/max-rects style heuristics as candidates;
- rotation;
- copy counts;
- exact sizes;
- multiple sheets.

### Stage 3: multi-objective search
- compare packing heuristics;
- search layout variants;
- cut-complexity scoring;
- constraint propagation.

### Stage 4: production-aware planning
- gang jobs;
- stock choice;
- guillotine constraints;
- finishing-aware scoring;
- cost model.

Do not prematurely implement exotic optimization before representative fixtures exist.

## Determinism

Given:
- identical sources;
- identical physical metadata;
- same constraints;
- same objective;
- same solver version/config;

the solver should return the same solution ordering unless explicitly using a stochastic strategy with a recorded seed.

Determinism is important for:
- regression testing;
- recipe reliability;
- professional repeatability;
- explainability.

## Numerical tolerances

Tolerance policy belongs to units/geometry and must be explicit.

Never rely on arbitrary UI pixel equality to decide physical overlap.

Tests should cover:
- items exactly touching allowed boundaries;
- near-tolerance gaps;
- fractional unit conversion;
- repeated transforms;
- rotated rectangles;
- page edges;
- calibrated transforms.

## Solver output contract

Conceptually:

```ts
type SolveResult =
  | {
      type: "success";
      layouts: LayoutCandidate[];
      solverVersion: string;
    }
  | {
      type: "unsatisfiable";
      conflicts: ConstraintConflict[];
      suggestions: RelaxationOption[];
      solverVersion: string;
    };
```

Do not return partial invalid placement as “success”.

## Natural-language layer

Later:

> “Put these worksheets two per sheet, keep text readable, and make them easy to cut.”

An LLM may produce structured intent:
- target 2-up preference;
- readability/min-scale constraint;
- cutting objective.

The structured constraints are shown/validated before solving. The LLM does not directly position objects.

## Metrics

Track locally/opt-in as appropriate:
- solver time;
- candidate count;
- accepted objective;
- user edits after solve;
- alternative selected;
- sheets before/after;
- utilization;
- constraint conflicts.

These metrics can reveal whether Smart Layout actually reduces work.
