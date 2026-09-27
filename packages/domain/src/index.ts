/**
 * Print Studio's canonical domain model.
 *
 * This package intentionally remains independent of React, Tauri, PDF
 * libraries, printer transports, and presentation state.
 */

export { Item } from './item';
export { Orientation, StandardMedia, getStandardMediaSize } from './media';
export { Placement, PlacementStatus, getPlacementBounds, validatePlacement } from './placement';
export type { PlacementValidationResult } from './placement';
export { Project } from './project';
export { Sheet, Side, SideKind } from './sheet';
export { SheetDefinition } from './sheet-definition';
export type { LayoutMargins } from './sheet-definition';

export { Source, SourceAvailability, SourceFingerprint, SourceKind, SourcePage } from './source';
export type { DensityDpi, RasterInfo } from './source';
