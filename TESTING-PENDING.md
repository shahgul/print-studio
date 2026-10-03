# Pending Testing

Last updated: 4 October 2026.

Manual testing is deferred at Shahgul's request while M1.7/M1.8 development proceeds. This file tracks executable checkpoints; `DEVELOPMENT-PLAN.md` remains the milestone ledger. Deferral does not count as a pass or close a verification gate. Automated checks continue during development.

## M1.6 — Native geometry persistence (required, pending)

- [ ] Run `run.bat` on Windows and set X=25, Y=35, width=60, height=40 mm, rotation=90°.
- [ ] Save As through the native dialog to a `.printstudio` file.
- [ ] Inspect the file: x=25,000 µm, y=35,000 µm, width=60,000 µm, height=40,000 µm, rotation=90°.
- [ ] Close the app completely, restart, and Open Project through the native dialog.
- [ ] Confirm all five inspector values return exactly; Save again to exercise replacement.

Record date, tested commit/build, operator, exact restored values, and pass/fail. Browser tests use mocked file commands and do not satisfy this gate.

## M1.7 — Undo/redo and native persistence (manual acceptance pending)

Implementation is available. Local automated verification passed on 3 October 2026: 143 unit tests, format/lint/typecheck/build, and three browser E2E workflows. This does not replace the native checks below.

- [ ] Change X, Y, size, and rotation. Undo each action in reverse order, then Redo each; confirm exact values.
- [ ] Drag and resize across several pointer moves; one Undo must reverse the entire gesture.
- [ ] Undo, make a different edit, and confirm Redo is unavailable.
- [ ] Try an off-sheet edit; confirm rejection leaves geometry/history intact.
- [ ] Zoom, pan, and Fit sheet; confirm these create no undo actions.
- [ ] Use Ctrl+Z, Ctrl+Shift+Z, and Ctrl+Y outside text fields. Confirm text fields retain their normal editing shortcuts.
- [ ] Save the geometry after Undo/Redo, restart the app, and reopen; confirm the saved physical values. History is session-only.
- [ ] Open another project and confirm history resets. Cancel Open or Save and confirm geometry/history is preserved.
- [ ] With an imported source, change its file while the app is open. Undo geometry and confirm current MISSING/CHANGED availability is retained.

Record date, tested commit/build, operator, exact values, and pass/fail. Full timed autosave and crash-recovery UX are later work, not implemented by undo/redo.

## M1.8 — Native image export and physical truth (ready for manual testing)

Software verification passes: 159 TypeScript tests, four browser E2E tests, format/lint/typecheck/build, Rust formatting, and 16 native Rust tests. The browser tests mock native commands; the actual UI/IPC workflow below is still pending.

- [ ] Run `run.bat`, Import `tests/fixtures/physical-truth.png` (repeat later with `.jpg`).
- [ ] Set image width=100 mm, height=50 mm and choose **Place image on sheet**. Confirm its inspector shows X=20, Y=30, width=100, height=50 mm; confirm asymmetric artwork is visible.
- [ ] Confirm placement Undo/Redo, then rotate to 90° and back to 0°. Preview must rotate clockwise and retain exact dimensions.
- [ ] Save the project, close/restart the actual app, Open, and confirm image, source availability, and physical geometry are restored.
- [ ] Choose **Export PDF…** through the native dialog, including a Unicode/spaced filename. Re-export to the same path to exercise atomic replacement. Cancel the dialog once and confirm no output is written.
- [ ] Open the exported PDF in an independent viewer. Confirm one A4 page and actual image content. The starter vector reference remains as an existing object.
- [ ] Move/alter the external image and confirm preview/export explain the unavailable/changed source rather than substituting content. Restore original bytes.
- [ ] Change only image width or height to an incompatible aspect and confirm the warning/export rejection; restore 100×50 mm.
- [ ] Print at **Actual Size / 100%** on A4 with Fit/Shrink disabled. Measure the image's outer boundary against 100×50 mm and position against 20,30 mm. Record actual values and the accepted device tolerance.
- [ ] Change canvas zoom, export/print again, and record whether measured output changes. Automated PDF geometry invariance is already verified.

JPEG EXIF rotation/mirroring is explicitly unsupported for this checkpoint; use the supplied normalized fixture. Placed PDF sources and native printer submission are later work.

Record printer/model, media, driver/transport, scaling settings, measurement method/tolerance, build, and result. Screenshots cannot prove physical correctness.
