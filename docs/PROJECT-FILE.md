# Project File Format

Current schema: **2**

This document defines the durable Print Studio project-file contract implemented by `packages/project-file`.

## Identity

Every project document begins with:

```json
{
  "format": "print-studio-project",
  "schemaVersion": 2,
  "physicalUnit": "MICROMETRE"
}
```

These fields are not UI metadata. They are compatibility/safety markers.

## Physical precision

All canonical geometry is persisted as **signed safe integer micrometres**.

Examples:

```json
{
  "sizeUm": {
    "width": 210000,
    "height": 297000
  }
}
```

Rules:
- do not save mm/cm/in/pt floats as canonical geometry;
- do not round persisted values while loading;
- fractional or unsafe integer micrometre values are invalid;
- negative coordinates are valid where the domain permits them;
- dimensions/margins still pass domain invariants after parsing.

## V2 shape

Simplified example:

```json
{
  "format": "print-studio-project",
  "schemaVersion": 1,
  "physicalUnit": "MICROMETRE",
  "project": {
    "id": "project-1",
    "items": [
      {
        "id": "item-1",
        "sizeUm": {
          "width": 50000,
          "height": 50000
        }
      }
    ],
    "sheets": [
      {
        "id": "sheet-1",
        "definition": {
          "kind": "STANDARD",
          "media": "A4",
          "orientation": "PORTRAIT",
          "sizeUm": {
            "width": 210000,
            "height": 297000
          },
          "layoutMarginsUm": {
            "top": 10000,
            "right": 10000,
            "bottom": 10000,
            "left": 10000
          }
        },
        "front": {
          "kind": "FRONT",
          "placements": [
            {
              "id": "placement-1",
              "itemId": "item-1",
              "originUm": {
                "x": 20000,
                "y": 30000
              },
              "rotation": 0
            }
          ]
        },
        "back": null
      }
    ]
  }
}
```

Custom media use `kind: "CUSTOM"` and persist their name, resolved physical size, and margins.

## Why standard media also store size

A standard sheet stores:
- semantic media key;
- orientation;
- resolved physical size.

On load, Print Studio reconstructs the standard media and verifies that the persisted physical size still matches.

This prevents a future code/configuration error from silently turning an old project into a physically different document.

## Compatibility policy

### Same schema version

Unknown additional fields are ignored.

This permits additive evolution where older readers can safely continue when new optional metadata appears.

Required known fields and enums are still validated strictly.

### Future schema version

A reader must reject a project whose `schemaVersion` is newer than it understands.

It must not:
- guess;
- strip unknown structures;
- open and resave the file as if nothing happened.

### Older schema version

Older versions pass through the migration boundary.

The first real migration is implemented:

```text
schema V1
  project: { id, items, sheets }
        ↓
schema V2
  project: { id, items, sheets, sources: [] }
```

V1 physical geometry is left untouched. Migration adds only the new empty source collection and updates the schema version.

## Errors

Project-file failures use typed codes:

- `INVALID_JSON`
- `INVALID_FORMAT`
- `UNSUPPORTED_SCHEMA_VERSION`
- `INVALID_SCHEMA`
- `INVALID_PROJECT`

The UI can later translate these into actionable messages without depending on incidental parser exception text.

## Storage boundary

Serialization is intentionally separate from disk I/O.

`ProjectPersistence` depends on:

```ts
interface ProjectTextStore {
  read(path: string): Promise<string>;
  writeAtomic(path: string, content: string): Promise<void>;
}
```

Platform implementations own:
- file dialogs;
- path permissions;
- atomic replacement;
- filesystem errors;
- backup/recovery policy.

The first desktop implementation now exists in the Tauri/Rust layer:
- native Open / Save dialogs are provided through the official Tauri dialog plugin;
- the frontend bridge calls only `read_project_text` and `write_project_text_atomic`;
- native reads/writes are restricted to paths ending in `.printstudio`;
- current project text is capped at 16 MiB as a temporary safety bound while schema 2 stores source references/metadata but does not embed source file bytes;
- Windows-native Rust tests run separately in CI.

The core codec owns:
- format identity;
- versioning;
- validation;
- migrations;
- lossless reconstruction.

## Atomic-save requirement

A project save must never leave the user's only good project truncated because the process crashed halfway through writing.

The desktop adapter uses this sequence:

```text
target directory
   ↓
create same-directory temporary file
   ↓
write complete project text
   ↓
flush
   ↓
sync file contents
   ↓
atomically persist/replace target
```

The previous good project is never deliberately deleted before the replacement is ready.

A naive:

```text
delete old file
write new file
```

remains unacceptable.

The current Rust implementation is tested on a Windows GitHub Actions runner for:
- creating a new project file;
- replacing an existing project file;
- preserving an existing file when validation fails;
- refusing non-`.printstudio` paths;
- rejecting oversized content before touching the existing project.

## Sources

Schema V2 persists referenced source metadata inside the project while leaving the original source files external.

Each source stores:
- source ID and kind;
- display name;
- referenced local file path;
- original SHA-256 fingerprint;
- original byte length;
- availability state: `AVAILABLE`, `MISSING`, or `CHANGED`;
- ordered SourcePage metadata.

Image page metadata may store:
- pixel width/height;
- declared density when known;
- physical size when it can be derived from trustworthy metadata.

PDF page metadata stores:
- canonical physical page size;
- no raster metadata merely because previews may later be rasterized.

The project does **not** replace last-known imported metadata when an external file changes. On reopen:
- missing path → `MISSING`;
- same SHA-256 bytes → `AVAILABLE`;
- different SHA-256 bytes → `CHANGED`.

A changed source must be explicitly re-imported before its stored fingerprint or intrinsic metadata are replaced.

The desktop existence probe is separate from the byte read so permission/I/O failures are not mislabeled as missing files.

## Manual Windows verification

The first real desktop persistence checkpoint passed on **28 September 2026**.

Verified workflow:

```text
starter A4 project
   ↓
Save As .printstudio
   ↓
close application
   ↓
restart Print Studio
   ↓
Open saved project
   ↓
A4 = 210 × 297 mm
item = 50 × 50 mm
position = 20 × 30 mm
   ↓
Save existing file again
```

The reopened project preserved the expected canonical physical geometry, and the second Save exercised replacement of the existing project file through the native atomic storage path.


## Recovery groundwork

M1.4 establishes a recovery snapshot convention for saved projects:

```text
job.printstudio
job.autosave.printstudio
```

Recovery rules:
- snapshots use the same versioned project codec as the primary project;
- recovery writes use the same atomic-write contract;
- the current initial autosave interval policy is 30 seconds;
- successful primary saves may clear the companion recovery snapshot;
- recovery removal is idempotent;
- native removal refuses paths that are not `.printstudio` files.

This is intentionally **groundwork**, not the final autosave UX. Automatic timers, untitled-session recovery storage, recovery prompts, and polished crash restoration remain later product work.
