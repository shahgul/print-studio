import { Point2D, QuarterTurn, Rect, rotateSize } from '@print-studio/units-geometry';

import { Item } from './item';
import { requireNonEmptyId } from './shared';
import { SheetDefinition } from './sheet-definition';

type CreatePlacementInput = Readonly<{
  id: string;
  itemId: string;
  origin: Point2D;
  rotation?: QuarterTurn;
}>;

export class Placement {
  private constructor(
    readonly id: string,
    readonly itemId: string,
    readonly origin: Point2D,
    readonly rotation: QuarterTurn,
  ) {}

  static create(input: CreatePlacementInput): Placement {
    return new Placement(
      requireNonEmptyId(input.id, 'placement id'),
      requireNonEmptyId(input.itemId, 'placement item id'),
      input.origin,
      input.rotation ?? QuarterTurn.Deg0,
    );
  }
}

export function getPlacementBounds(item: Item, placement: Placement): Rect {
  if (item.id !== placement.itemId) {
    throw new RangeError(
      `placement ${placement.id} references item ${placement.itemId}, not ${item.id}`,
    );
  }

  return Rect.of(placement.origin, rotateSize(item.size, placement.rotation));
}

export enum PlacementStatus {
  Valid = 'VALID',
  OutsideUsableArea = 'OUTSIDE_USABLE_AREA',
  OutsideSheet = 'OUTSIDE_SHEET',
}

export type PlacementValidationResult = Readonly<{
  status: PlacementStatus;
  isInsideSheet: boolean;
  isInsideUsableArea: boolean;
  bounds: Rect;
}>;

export function validatePlacement(
  definition: SheetDefinition,
  item: Item,
  placement: Placement,
): PlacementValidationResult {
  const bounds = getPlacementBounds(item, placement);
  const isInsideSheet = definition.bounds.containsRect(bounds);
  const isInsideUsableArea = isInsideSheet && definition.usableBounds.containsRect(bounds);

  if (!isInsideSheet) {
    return {
      status: PlacementStatus.OutsideSheet,
      isInsideSheet: false,
      isInsideUsableArea: false,
      bounds,
    };
  }

  if (!isInsideUsableArea) {
    return {
      status: PlacementStatus.OutsideUsableArea,
      isInsideSheet: true,
      isInsideUsableArea: false,
      bounds,
    };
  }

  return {
    status: PlacementStatus.Valid,
    isInsideSheet: true,
    isInsideUsableArea: true,
    bounds,
  };
}
