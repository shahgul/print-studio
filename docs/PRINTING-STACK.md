# Printing Stack

## Goal

Print Studio should eventually replace most of the confusing software layer between a user and a printer while respecting the boundary imposed by actual hardware.

The important distinction:

> We can often bypass the vendor application and sometimes the vendor-specific driver. We cannot override physical hardware capabilities.

## Three output paths

```text
                         PrintPlan
                            │
           ┌────────────────┼────────────────┐
           │                │                │
      Export only       OS spooler       Direct protocol
           │                │                │
          PDF          system driver          IPP
                                             │
                                      selected raw paths
```

## Stage 0 — print-ready export

Initial path:
- generate physically correct PDF;
- expose exact size / margins / marks;
- user prints through OS/application.

This is valuable before native printer integration exists.

Limitation:
- downstream print dialog/driver can still scale or alter output.

Print Truth should warn about the expected user setting, e.g. “Actual Size / 100%”.

## Stage 1 — OS spooler / installed driver

Path:

```text
Print Studio
  → platform printing API/spooler
  → installed driver
  → printer
```

Benefits:
- broad legacy compatibility;
- can replace much of the user-facing vendor/OS dialog;
- access to installed-device capabilities/settings where the platform exposes them.

Risks:
- vendor-specific driver options;
- platform differences;
- hidden scaling/rasterization;
- difficult normalization.

### Windows

Research areas:
- PrintTicket / PrintCapabilities;
- modern Windows print document package path;
- spooler/job APIs;
- printer capability normalization.

Do not build new architecture around deprecated APIs if modern equivalents exist.

### macOS

Research areas:
- native print system;
- PrintCore / NSPrintOperation where applicable;
- AirPrint/IPP behavior;
- sandbox entitlements.

### Linux

Research areas:
- CUPS;
- IPP;
- system queues;
- portal behavior for sandboxed desktop apps.

## Stage 2 — Direct IPP / IPP Everywhere

Path:

```text
Print Studio
  → discover device
  → Get-Printer-Attributes
  → normalize capabilities
  → render supported document format
  → submit IPP job
  → monitor/cancel where supported
```

IPP Everywhere is strategically important because it is specifically designed for driverless printing.

The Printer Working Group currently states that **98% of printers sold support IPP/2.0 and DNS-SD**. That does not mean 98% expose every feature we need or are fully IPP Everywhere certified, but it makes standards-based direct printing strategically credible rather than a niche path.

Potentially query:
- `media-supported`;
- `media-ready`;
- `sides-supported`;
- `print-color-mode-supported`;
- `print-quality-supported`;
- `printer-resolution-supported`;
- `document-format-supported`;
- `finishings-supported`;
- printer state/reasons.

Benefits:
- fewer vendor-dialog surprises;
- normalized capability model;
- direct job status;
- better control over scaling path;
- cross-platform conceptual consistency.

Limitations:
- not every printer supports the same attributes/formats;
- vendors may expose incomplete or quirky capabilities;
- network security/authentication;
- borderless/tray/device-specific options may not normalize cleanly.

## IPP-USB

Some USB printers expose IPP semantics over USB through an OS/service layer.

Investigate after network IPP works. Do not assume direct USB access is necessary.

## AirPrint

AirPrint is a driverless printing ecosystem built on IPP-related standards and raster/document formats.

Useful considerations:
- device discovery;
- media selection;
- supported raster/document formats;
- mobile/tablet interoperability.

Do not equate “AirPrint printer” with “all IPP features supported”.

## Stage 3 — selected device-language/raw paths

Possible technologies:
- PostScript;
- PCL;
- ZPL for labels;
- ESC/P-family protocols;
- vendor raster languages;
- raw TCP 9100 in controlled contexts.

Use only where:
- IPP/system path cannot expose a valuable capability;
- a target vertical needs it;
- compatibility matrix is manageable.

This is **not** a goal to reimplement drivers for every printer.

## Capability normalization

Printer-specific attributes are normalized into `PrinterCapabilities`.

Every normalized field needs provenance:
- direct IPP;
- OS driver;
- manual user entry;
- calibrated/measured;
- assumed generic.

Unknown ≠ unsupported.

UI must distinguish:
- supported;
- unsupported;
- unknown/unverified.

## Printable area

The printable region may come from:
- printer capability;
- OS driver;
- media database;
- calibration;
- user measurement.

It must remain separate from:
- project margin;
- trim;
- bleed;
- safe area.

## Borderless

Borderless is not a generic boolean. It may depend on:
- media size;
- media type;
- quality mode;
- feed source;
- printer model.

Represent it as a capability condition when data allows.

## Job settings

Normalized job intent may include:
- media;
- copies;
- orientation;
- sides;
- color mode;
- quality;
- resolution;
- tray/media source;
- finishing;
- scaling policy;
- raster/document format.

Layout scaling belongs to Print Studio. Transport/driver settings should not independently rescale unless explicitly intended.

## Job lifecycle

Conceptual states:
- prepared;
- submitting;
- accepted;
- pending;
- processing;
- completed;
- canceled;
- failed;
- unknown.

“Unknown” is real and important.

A timeout does not prove failure. Do not automatically submit another physical copy.

## Job idempotency

Assign an intent ID before submission.

If retrying the same intended physical job:
- reuse intent ID;
- reconcile known spooler/IPP job identity;
- require user confirmation if completion state is unknown and duplicate paper output is possible.

## Monitoring

Where protocol/platform allows:
- printer idle/processing/stopped;
- job state;
- printer-state-reasons;
- out of paper;
- door open;
- media mismatch;
- ink/toner conditions if reliably exposed;
- cancel.

Translate status into clear language without discarding raw detail for expert diagnostics.

## Security

Network printers are untrusted peers.

Requirements:
- validate all protocol responses;
- TLS/auth where supported;
- avoid arbitrary URI redirects;
- network timeouts;
- payload size limits;
- no raw command concatenation;
- explicit permission for discovery;
- do not log sensitive document bytes.

## What cannot be overridden

Software cannot create capabilities the hardware lacks:
- full bleed where mechanism/media does not permit it;
- higher real resolution than hardware;
- perfect duplex registration;
- trays/finishers that do not exist;
- unsupported media thickness;
- nonexistent ink channels;
- physical feed precision.

Print Studio’s goal is to **understand, expose, plan around, and compensate for repeatable behavior**, not to pretend physics can be bypassed.

## Strategic outcome

Long term, Print Studio can become a **Print Operating Layer**:

```text
content
  ↓
layout + preflight + optimization
  ↓
Print Truth
  ↓
printer profile + calibration
  ↓
capability-aware transport
  ↓
printer
```

That is a stronger product position than “advanced PDF printer”.
