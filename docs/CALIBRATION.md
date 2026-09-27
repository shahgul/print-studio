# Printer Calibration

## Why calibration exists

Even with mathematically correct output, physical results can differ because of:
- driver scaling;
- firmware behavior;
- feed tolerances;
- non-printable margins;
- media type;
- quality mode;
- duplex mechanics;
- repeated mechanical offset.

Print Studio should not promise impossible precision. It should measure repeatable deviation and compensate where safe.

## Calibration scopes

A calibration profile should be scoped narrowly enough to be trustworthy.

Potential key:
- physical printer identity;
- transport path;
- media size;
- media type;
- feed orientation/tray;
- quality/resolution;
- simplex/duplex.

Do not automatically reuse a photo-paper calibration for plain A4 if behavior is not known to match.

## Basic exact-size calibration

Calibration sheet contains:
- long horizontal reference line;
- vertical reference line;
- known rectangle;
- center/corner fiducials;
- identification/version text;
- instructions to print at the path being calibrated.

User measures:
- actual X distance;
- actual Y distance;
- optional offsets from expected anchors.

If requested 100.00 mm becomes 99.25 mm, compute an X correction.

Do not round compensation prematurely.

## Offset calibration

Used when size is correct but positioning is consistently shifted.

Measure:
- X offset;
- Y offset.

This matters for:
- labels;
- partially used sheets;
- duplex cards;
- forms;
- preprinted stock.

## Duplex registration calibration

Goal:
- align back-side geometry with front-side geometry.

Calibration page should produce targets visible/comparable from both sides.

Measure:
- X offset;
- Y offset;
- possible rotation/skew if repeatable.

Apply back-side correction in the canonical print transform and report it in Print Truth.

## Skew / nonlinear behavior

Some devices may exhibit:
- rotation;
- skew;
- nonuniform X/Y scale;
- feed drift.

Initial calibration should stay simple:
- separate X/Y scale;
- X/Y offset.

Only add affine/projective compensation if real fixtures show it is valuable and reproducible.

Do not overfit one sheet of noisy mechanical behavior.

## Confidence

A CalibrationProfile should record:
- measured date;
- method;
- number of verification prints;
- observed residual error;
- media/quality;
- user-entered vs camera-assisted;
- notes.

Possible status:
- unverified;
- verified;
- stale;
- mismatched context.

## Camera-assisted calibration — future

Process:
1. print fiducial sheet;
2. place on flat surface;
3. capture with phone/camera;
4. detect page edges/fiducials;
5. correct perspective;
6. estimate printed distances/offsets;
7. ask user to verify;
8. save profile.

Risks:
- camera lens distortion;
- perspective;
- printer paper dimension tolerance;
- inaccurate automatic page-edge detection;
- ambient shadows;
- user capture angle.

Camera estimation must never be presented as more accurate than validated measurement.

## Calibration application

Order must be explicit.

Conceptually:
1. canonical layout;
2. side transform (front/back/imposition);
3. calibration transform;
4. renderer mapping to output format.

Do not mutate user-requested dimensions in project state merely because a printer needs correction.

Example:
- user item remains 100 mm in project;
- printer transform may render 100.76 mm digital compensation to produce ~100 mm physically;
- Print Truth shows the correction.

## Printer-driver scaling detection

Possible strategy:
- calibration reference identifies whether output is being globally scaled;
- if scale error is inconsistent with known profile, warn that the OS/driver may be applying Fit/Shrink.

For export-only workflows, guide the user to actual-size settings.

## Calibration test suite

Fixtures:
- 100 mm line;
- 50 × 50 mm square;
- edge offsets;
- duplex crosshair;
- multiple orientations;
- A4/A5/photo media.

Software tests validate:
- compensation math;
- scope matching;
- no double-application;
- inverse/forward transform;
- serialized profile migration.

Hardware tests record observed results but should not gate every CI run.

## User promise

Preferred wording:
- “Calibrated for this printer/media/profile.”

Avoid:
- “Guaranteed exact.”

Physical devices have tolerances and can drift.
