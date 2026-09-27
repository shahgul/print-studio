import { describe, expect, it } from 'vitest';

import goldenA4 from '../../../tests/golden-geometry/a4-50mm-square.json';
import { Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';

import {
  Item,
  Orientation,
  Placement,
  PlacementStatus,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  SideKind,
  StandardMedia,
  getStandardMediaSize,
  getPlacementBounds,
  validatePlacement,
} from './index';

describe('standard media', () => {
  it('defines A4 portrait as exactly 210 × 297 mm', () => {
    const size = getStandardMediaSize(StandardMedia.A4, Orientation.Portrait);

    expect(size.width.micrometres).toBe(210_000);
    expect(size.height.micrometres).toBe(297_000);
  });

  it('rotates standard media dimensions for landscape', () => {
    const size = getStandardMediaSize(StandardMedia.A4, Orientation.Landscape);

    expect(size.width.micrometres).toBe(297_000);
    expect(size.height.micrometres).toBe(210_000);
  });

  it('defines US Letter using exact inch dimensions', () => {
    const size = getStandardMediaSize(StandardMedia.Letter, Orientation.Portrait);

    expect(size.width.micrometres).toBe(215_900);
    expect(size.height.micrometres).toBe(279_400);
  });
});

describe('SheetDefinition', () => {
  it('derives physical and usable bounds from media and layout margins', () => {
    const definition = SheetDefinition.standard(StandardMedia.A4, {
      orientation: Orientation.Portrait,
      layoutMargins: Length.mm(10),
    });

    expect(definition.size.width.toMillimetres()).toBe(210);
    expect(definition.size.height.toMillimetres()).toBe(297);
    expect(definition.bounds.left.toMillimetres()).toBe(0);
    expect(definition.bounds.top.toMillimetres()).toBe(0);
    expect(definition.usableBounds.left.toMillimetres()).toBe(10);
    expect(definition.usableBounds.top.toMillimetres()).toBe(10);
    expect(definition.usableBounds.size.width.toMillimetres()).toBe(190);
    expect(definition.usableBounds.size.height.toMillimetres()).toBe(277);
  });

  it('supports custom physical media dimensions', () => {
    const definition = SheetDefinition.custom({
      name: 'Custom card stock',
      size: Size2D.of(Length.mm(100), Length.mm(150)),
      layoutMargins: Length.mm(5),
    });

    expect(definition.mediaKey).toBeNull();
    expect(definition.name).toBe('Custom card stock');
    expect(definition.size.width.toMillimetres()).toBe(100);
    expect(definition.size.height.toMillimetres()).toBe(150);
    expect(definition.usableBounds.size.width.toMillimetres()).toBe(90);
    expect(definition.usableBounds.size.height.toMillimetres()).toBe(140);
  });

  it('rejects layout margins that exceed the physical sheet', () => {
    expect(() =>
      SheetDefinition.standard(StandardMedia.A5, {
        layoutMargins: Length.mm(100),
      }),
    ).toThrow();
  });
});

describe('Item and Placement', () => {
  it('requires a non-empty item id and positive physical size', () => {
    expect(() =>
      Item.create({
        id: '',
        size: Size2D.of(Length.mm(50), Length.mm(50)),
      }),
    ).toThrow();

    expect(() =>
      Item.create({
        id: 'zero',
        size: Size2D.of(Length.zero(), Length.mm(50)),
      }),
    ).toThrow();
  });

  it('derives placement bounds from item size and quarter-turn rotation', () => {
    const item = Item.create({
      id: 'card',
      size: Size2D.of(Length.mm(50), Length.mm(30)),
    });
    const placement = Placement.create({
      id: 'placement-1',
      itemId: item.id,
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg90,
    });

    const bounds = getPlacementBounds(item, placement);

    expect(bounds.origin.x.toMillimetres()).toBe(20);
    expect(bounds.origin.y.toMillimetres()).toBe(30);
    expect(bounds.size.width.toMillimetres()).toBe(30);
    expect(bounds.size.height.toMillimetres()).toBe(50);
  });

  it('rejects placement/item mismatches when deriving bounds', () => {
    const item = Item.create({
      id: 'card',
      size: Size2D.of(Length.mm(50), Length.mm(30)),
    });
    const placement = Placement.create({
      id: 'placement-1',
      itemId: 'different-item',
      origin: Point2D.of(Length.zero(), Length.zero()),
    });

    expect(() => getPlacementBounds(item, placement)).toThrow();
  });
});

describe('placement validation', () => {
  const definition = SheetDefinition.standard(StandardMedia.A4, {
    layoutMargins: Length.mm(10),
  });
  const item = Item.create({
    id: 'square',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });

  it('accepts an item contained inside the usable area', () => {
    const placement = Placement.create({
      id: 'placement-valid',
      itemId: item.id,
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe(PlacementStatus.Valid);
    expect(result.isInsideSheet).toBe(true);
    expect(result.isInsideUsableArea).toBe(true);
  });

  it('distinguishes usable-area overflow from physical-sheet overflow', () => {
    const placement = Placement.create({
      id: 'placement-margin',
      itemId: item.id,
      origin: Point2D.of(Length.mm(5), Length.mm(30)),
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe(PlacementStatus.OutsideUsableArea);
    expect(result.isInsideSheet).toBe(true);
    expect(result.isInsideUsableArea).toBe(false);
  });

  it('reports physical-sheet overflow as the stronger failure', () => {
    const placement = Placement.create({
      id: 'placement-sheet-overflow',
      itemId: item.id,
      origin: Point2D.of(Length.mm(180), Length.mm(260)),
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe(PlacementStatus.OutsideSheet);
    expect(result.isInsideSheet).toBe(false);
    expect(result.isInsideUsableArea).toBe(false);
  });

  it('allows placement to touch the usable-area edge exactly', () => {
    const placement = Placement.create({
      id: 'placement-touch',
      itemId: item.id,
      origin: Point2D.of(Length.mm(150), Length.mm(237)),
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe(PlacementStatus.Valid);
  });
});

describe('Sheet, Side, and Project', () => {
  const definition = SheetDefinition.standard(StandardMedia.A4, {
    layoutMargins: Length.mm(10),
  });
  const item = Item.create({
    id: 'square',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });
  const placement = Placement.create({
    id: 'placement-1',
    itemId: item.id,
    origin: Point2D.of(Length.mm(20), Length.mm(30)),
  });

  it('creates front and optional back sides explicitly', () => {
    const front = Side.create(SideKind.Front, [placement]);
    const back = Side.create(SideKind.Back);
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front,
      back,
    });

    expect(sheet.front.kind).toBe(SideKind.Front);
    expect(sheet.front.placements).toHaveLength(1);
    expect(sheet.back?.kind).toBe(SideKind.Back);
  });

  it('rejects a back side passed as the front side', () => {
    expect(() =>
      Sheet.create({
        id: 'sheet-1',
        definition,
        front: Side.create(SideKind.Back),
      }),
    ).toThrow();
  });

  it('requires unique item, sheet, and placement ids within a project', () => {
    const front = Side.create(SideKind.Front, [placement]);
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front,
    });

    expect(() =>
      Project.create({
        id: 'project-1',
        items: [item, item],
        sheets: [sheet],
      }),
    ).toThrow();

    expect(() =>
      Project.create({
        id: 'project-1',
        items: [item],
        sheets: [sheet, sheet],
      }),
    ).toThrow();
  });

  it('rejects placements that reference an unknown item', () => {
    const unknownPlacement = Placement.create({
      id: 'placement-unknown',
      itemId: 'missing',
      origin: Point2D.of(Length.zero(), Length.zero()),
    });
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front: Side.create(SideKind.Front, [unknownPlacement]),
    });

    expect(() =>
      Project.create({
        id: 'project-1',
        items: [item],
        sheets: [sheet],
      }),
    ).toThrow();
  });
});

describe('golden A4 physical layout', () => {
  it('represents the canonical fixture exactly in physical units', () => {
    const definition = SheetDefinition.standard(StandardMedia.A4, {
      orientation: Orientation.Portrait,
      layoutMargins: Length.mm(goldenA4.sheet.layoutMarginMm),
    });
    const item = Item.create({
      id: goldenA4.item.id,
      size: Size2D.of(
        Length.mm(goldenA4.item.widthMm),
        Length.mm(goldenA4.item.heightMm),
      ),
    });
    const placement = Placement.create({
      id: goldenA4.placement.id,
      itemId: item.id,
      origin: Point2D.of(
        Length.mm(goldenA4.placement.xMm),
        Length.mm(goldenA4.placement.yMm),
      ),
      rotation: QuarterTurn.Deg0,
    });

    const bounds = getPlacementBounds(item, placement);
    const result = validatePlacement(definition, item, placement);

    expect(definition.size.width.micrometres).toBe(210_000);
    expect(definition.size.height.micrometres).toBe(297_000);
    expect(bounds.origin.x.micrometres).toBe(20_000);
    expect(bounds.origin.y.micrometres).toBe(30_000);
    expect(bounds.size.width.micrometres).toBe(50_000);
    expect(bounds.size.height.micrometres).toBe(50_000);
    expect(result.status).toBe(PlacementStatus.Valid);
  });
});
