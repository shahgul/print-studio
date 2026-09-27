# Market and Impact

Research snapshot: **27 September 2026**.

## What problem size means here

Print Studio should not use a misleading “printing market = our TAM” argument.

Printing is a very large installed ecosystem, but not every person who prints is a high-value software customer. The market should be understood by **frequency × pain × economic consequence**.

## Evidence that physical printing remains large

IDC reported roughly **19.4 million hardcopy peripherals shipped worldwide in Q1 2025**. In Q2 2026, IDC reported roughly **17.2 million worldwide printer/MFP shipments** even after a year-over-year decline.

These are new shipments, not installed base. They demonstrate that physical printing remains a large active hardware ecosystem.

Do not convert these shipment figures directly into “addressable users”.

## Frequency and willingness to pay

### Casual
Frequency: low  
Pain: moderate/high when something fails  
Economic consequence: low  
Willingness to pay: low

Impact:
- fewer failed prints;
- less time fighting settings;
- correct sizing.

### Teachers / creators / makers / photographers
Frequency: medium to high  
Pain: recurring  
Economic consequence: paper, ink, media, time  
Willingness to pay: moderate if value is visible

Impact:
- fewer sheets;
- exact output;
- reusable workflows;
- less setup.

### Small businesses / offices / designers
Frequency: high  
Pain: recurring/manual  
Economic consequence: labor + media + consistency  
Willingness to pay: moderate/high

Impact:
- recipes;
- batch production;
- fewer mistakes;
- consistent staff workflow.

### Print shops / prepress
Frequency: very high  
Pain: operational  
Economic consequence: substrate, machine time, operator time, reprints, deadlines  
Willingness to pay: high when ROI is demonstrable

Impact:
- preflight;
- imposition;
- ganging;
- automation;
- reduced waste;
- faster job preparation.

## Waste and efficiency

PaperCut states that in managed printing environments roughly **12% of print jobs go uncollected on average**. This is a different type of waste from sheet-layout waste, but it validates a key economic principle: organizations already buy software specifically to reduce print waste.

Professional imposition vendors similarly sell on:
- better sheet utilization;
- automatic ganging;
- reduced setup;
- lower material use;
- faster production.

Print Studio should measure and expose:
- sheet count;
- utilization percentage;
- waste area;
- cut complexity;
- estimated substrate cost;
- alternative-layout savings.

## Teacher impact

AdoptAClassroom’s 2025 US survey of 3,700 teachers reported:
- average out-of-pocket classroom spending of **$895/year**;
- **82%** purchased essentials including paper, pencils, and markers;
- a median school-provided classroom budget of **$200**.

This is US data and must not be presented as representative of India. The useful inference is narrower: in at least some education markets, teachers personally absorb material costs, so paper-efficient classroom printing can have direct personal value.

A DustChalk-integrated workflow such as:

```text
32 students
→ 2 worksheets per A4
→ 16 sheets instead of 32
→ one horizontal cut per sheet
```

communicates impact better than “2-up imposition”.

## Impact dimensions

### Time
- fewer experiments with print dialogs;
- fewer manual Word/Canva layouts;
- fewer repeated imposition setups;
- reusable recipes;
- batch/hot-folder automation later.

### Material
- fewer sheets;
- reduced blank areas;
- better stock use;
- mixed-job ganging later.

### Quality
- fewer low-resolution surprises;
- explicit bleed/safe-zone issues;
- correct physical size;
- better front/back alignment.

### Confidence
- Print Truth makes downstream transformations visible;
- calibration creates device-specific confidence;
- known vs assumed capabilities are explicit.

### Accessibility of expertise
- translate production terminology into user intent;
- allow beginners to achieve outcomes formerly requiring specialist knowledge;
- preserve expert control rather than hiding it.

## Market category warning

Analyst reports put the broader **print-management software** market in the billions of dollars, but those categories include enterprise fleet management, secure release, accounting, cloud print administration, and other products outside our initial scope.

Do **not** use broad print-management market figures as Print Studio’s direct TAM.

## Realistic commercial ceilings

### Ceiling 1: polished utility
Exact-size + N-up + booklet + good UX.

Potential: sustainable paid indie utility.

### Ceiling 2: prosumer Print Studio
Teachers, makers, photographers, designers, small businesses.

Potential: larger cross-platform product with repeat users.

### Ceiling 3: production platform
Preflight + advanced imposition + ganging + automation + printer control + SDK/API.

Potential: higher-value professional/B2B licensing and integration.

The architectural objective is to preserve a path from Ceiling 1 to Ceiling 3 without forcing professional complexity into the beginner interface.

## What would prove product-market fit

Signals:
- users repeatedly save/reuse recipes;
- users report measurable sheet/time savings;
- exact-size/calibration becomes a reason for retention;
- teachers use class-count workflows repeatedly;
- pros use the app for paid jobs;
- print shops replace manual imposition steps;
- users ask for batch/hot-folder/API rather than only decorative features;
- users trust Print Truth enough to print without separate Adobe/vendor verification.

## Impact metrics to instrument later

Privacy-conscious, opt-in telemetry where appropriate:
- jobs created;
- accepted Smart Layout objective;
- sheets before vs after optimization;
- number of items/pages;
- recipes reused;
- preflight errors caught before output;
- calibration profiles used;
- exports vs direct prints;
- time-to-first-ready-job;
- abandoned/failed jobs;
- manual edits after Smart Layout;
- estimated sheets/media saved.

Avoid pretending “ink saved” is precise unless the printer actually reports credible consumption data.
