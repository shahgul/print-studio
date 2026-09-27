# Security and Privacy

## Position

Print Studio handles documents that can contain financial, personal, school, business, or customer information.

Default:

> **Files stay local unless the user explicitly chooses a feature that requires otherwise.**

## Threat surfaces

- malformed PDFs/images;
- enormous/decompression-bomb files;
- project/recipe files;
- network printer discovery;
- IPP responses;
- printer URIs;
- raw printer protocols;
- future cloud sync/API;
- plugins/integrations;
- crash/diagnostic logs.

## File processing

Requirements:
- validate type and size;
- page/pixel/dimension limits with explicit override;
- memory/time limits;
- no execution of embedded PDF JavaScript;
- no following arbitrary embedded links;
- sanitize generated metadata;
- sandbox risky parsers where practical;
- keep dependencies current.

## Project files

Treat imported project/recipe files as untrusted.

Requirements:
- schema validation;
- version validation;
- no arbitrary filesystem paths executed;
- safe missing-file resolution;
- no command templates that become shell injection.

## Printer discovery

- discover only when user enters printer context or has enabled it;
- request minimum OS/network permissions;
- validate mDNS/DNS-SD data;
- validate IPP URIs;
- do not follow arbitrary redirects blindly;
- avoid SSRF-like behavior if network URLs can be user supplied;
- show device identity/source.

## Print transport

- TLS where supported/appropriate;
- bounded request/response;
- authentication secrets stored through platform credential facilities if needed;
- never log credentials;
- raw printer-language data must be generated, not concatenated from unchecked user strings;
- job content not retained beyond user policy.

## Logs

Default diagnostics should avoid:
- document text;
- document images;
- full file paths when not needed;
- printer credentials;
- personally identifying job names.

Prefer:
- source hash;
- anonymized/local IDs;
- parser code/error;
- dimensions/counts;
- transport status.

## Telemetry

If product telemetry is introduced:
- document contents are excluded;
- make collection transparent;
- allow opt-out where required/appropriate;
- collect product-behavior metrics, not source content;
- separate crash diagnostics from marketing analytics.

## Cloud features

A future cloud feature must document:
- what is uploaded;
- why;
- retention;
- encryption;
- deletion;
- processor/subprocessor implications;
- whether a local alternative exists.

Do not silently route local print jobs through a server.

## DustChalk

When embedded in DustChalk:
- teacher/class metadata should only be sent to Print Studio core as necessary structured print constraints;
- do not require student names for copy-count printing;
- generated local output should not leak classroom metadata into PDF metadata unless intended.

## Future plugin/recipe ecosystem

If third-party recipes/plugins become possible:
- signed/trusted distribution model;
- capability permissions;
- no arbitrary native code by default;
- schema-only recipes preferred;
- visible actions before printing.

## Reporting vulnerabilities

A public vulnerability reporting process should be added before broad distribution. Do not publish a security email/process that is not actually monitored.
