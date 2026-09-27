import { Insets, Length, Point2D, Rect, Size2D } from '@print-studio/units-geometry';

import { Orientation, StandardMedia, getStandardMediaSize } from './media';
import { requireNonEmptyName } from './shared';

export type LayoutMargins = Length | Insets;

type StandardSheetOptions = Readonly<{
  orientation?: Orientation;
  layoutMargins?: LayoutMargins;
}>;

type CustomSheetInput = Readonly<{
  name: string;
  size: Size2D;
  layoutMargins?: LayoutMargins;
}>;

function normalizeMargins(layoutMargins: LayoutMargins | undefined): Insets {
  if (layoutMargins === undefined) {
    return Insets.uniform(Length.zero());
  }

  return layoutMargins instanceof Length ? Insets.uniform(layoutMargins) : layoutMargins;
}

export class SheetDefinition {
  private constructor(
    readonly mediaKey: StandardMedia | null,
    readonly name: string,
    readonly orientation: Orientation | null,
    readonly size: Size2D,
    readonly layoutMargins: Insets,
    readonly bounds: Rect,
    readonly usableBounds: Rect,
  ) {}

  static standard(media: StandardMedia, options: StandardSheetOptions = {}): SheetDefinition {
    const orientation = options.orientation ?? Orientation.Portrait;
    const size = getStandardMediaSize(media, orientation);
    const layoutMargins = normalizeMargins(options.layoutMargins);

    return SheetDefinition.createResolved({
      mediaKey: media,
      name: media,
      orientation,
      size,
      layoutMargins,
    });
  }

  static custom(input: CustomSheetInput): SheetDefinition {
    if (input.size.isEmpty()) {
      throw new RangeError('custom sheet size must have positive dimensions');
    }

    return SheetDefinition.createResolved({
      mediaKey: null,
      name: requireNonEmptyName(input.name, 'sheet name'),
      orientation: null,
      size: input.size,
      layoutMargins: normalizeMargins(input.layoutMargins),
    });
  }

  private static createResolved(
    input: Readonly<{
      mediaKey: StandardMedia | null;
      name: string;
      orientation: Orientation | null;
      size: Size2D;
      layoutMargins: Insets;
    }>,
  ): SheetDefinition {
    const bounds = Rect.of(Point2D.of(Length.zero(), Length.zero()), input.size);
    const usableBounds = bounds.inset(input.layoutMargins);

    return new SheetDefinition(
      input.mediaKey,
      input.name,
      input.orientation,
      input.size,
      input.layoutMargins,
      bounds,
      usableBounds,
    );
  }
}
