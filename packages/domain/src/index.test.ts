import { describe, expect, it } from 'vitest';
import { Insets, Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';

import {
  Item,
  MediaDefinition,
  Placement,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  StandardMedia,
  validatePlacement,
} from './index';

describe('StandardMedia', () => {
  it('defines A4 as exactly 210 × 297 mm', () => {
    expect(StandardMedia.A4.size.width.toMillimetres()).toBe(210);
    expect(StandardMedia.A4.size.height.toMillimetres()).toBe(297);
  });

  it('defines A5, A3, and US Letter physical dimensions', () => {
    expect(StandardMedia.A5.size.width.toMillimetres()).toBe(148);
    expect(StandardMedia.A5.size.height.toMillimetres()).toBe(210);

    expect(StandardMedia.A3.size.width.toMillimetres()).toBe(297);
    expect(StandardMedia.A3.size.height.toMillimetres()).toBe(420);

    expect(StandardMedia.LETTER.size.width.toInches()).toBeCloseTo(8.5, 6);
    expect(StandardMedia.LETTER.size.height.toInches()).toBeCloseTo(11, 6);
  });

  it('supports custom physical media', () => {
    const media = MediaDefinition.custom('Custom Card', Size2D.of(Length.mm(100), Length.mm(150)));

    expect(media.id).toBe('custom');
    expect(media.name).toBe('Custom Card');
    expect(media.size.width.toMillimetres()).toBe(100);
    expect(media.size.height.toMillimetres()).toBe(150);
  });
});

describe('SheetDefinition', () => {
  it('derives a usable area from physical bounds and layout margins', () => {
    const sheet = SheetDefinition.create({
      media: StandardMedia.A4,
      layoutMargins: Insets.uniform(Length.mm(10)),
    });

    expect(sheet.physicalBounds.origin.equals(Point2D.of(Length.zero(), Length.zero()))).toBe(true);
    expect(sheet.physicalBounds.size.equals(StandardMedia.A4.size)).toBe(true);
    expect(sheet.usableArea.origin.x.toMillimetres()).toBe(10);
    expect(sheet.usableArea.origin.y.toMillimetres()).toBe(10);
    expect(sheet.usableArea.size.width.toMillimetres()).toBe(190);
    expect(sheet.usableArea.size.height.toMillimetres()).toBe(277);
  });

  it('rejects margins that consume more than the sheet', () => {
    expect(() =>
      SheetDefinition.create({
        media: StandardMedia.A4,
        layoutMargins: Insets.uniform(Length.mm(110)),
      }),
    ).toThrow();
  });
});

describe('Item and Placement', () => {
  const item = Item.create({
    id: 'item-1',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });

  it('stores exact requested physical size', () => {
    expect(item.size.width.toMillimetres()).toBe(50);
    expect(item.size.height.toMillimetres()).toBe(50);
  });

  it('creates a placement without mutating item geometry', () => {
    const placement = Placement.create({
      itemId: item.id,
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg0,
    });

    expect(placement.itemId).toBe('item-1');
    expect(placement.origin.x.toMillimetres()).toBe(20);
    expect(placement.origin.y.toMillimetres()).toBe(30);
    expect(placement.rotation).toBe(QuarterTurn.Deg0);
    expect(item.size.width.toMillimetres()).toBe(50);
  });
});

describe('placement validation', () => {
  const definition = SheetDefinition.create({
    media: StandardMedia.A4,
    layoutMargins: Insets.uniform(Length.mm(10)),
  });

  const item = Item.create({
    id: 'item-1',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });

  it('marks the canonical golden A4 placement as inside the usable area', () => {
    const placement = Placement.create({
      itemId: item.id,
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg0,
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe('inside-usable-area');
    expect(result.bounds.origin.x.toMillimetres()).toBe(20);
    expect(result.bounds.origin.y.toMillimetres()).toBe(30);
    expect(result.bounds.size.width.toMillimetres()).toBe(50);
    expect(result.bounds.size.height.toMillimetres()).toBe(50);
  });

  it('distinguishes physical containment from usable-area containment', () => {
    const placement = Placement.create({
      itemId: item.id,
      origin: Point2D.of(Length.mm(5), Length.mm(20)),
      rotation: QuarterTurn.Deg0,
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe('inside-sheet-outside-usable-area');
    expect(definition.physicalBounds.containsRect(result.bounds)).toBe(true);
    expect(definition.usableArea.containsRect(result.bounds)).toBe(false);
  });

  it('marks a placement outside the physical sheet as overflow', () => {
    const placement = Placement.create({
      itemId: item.id,
      origin: Point2D.of(Length.mm(180), Length.mm(260)),
      rotation: QuarterTurn.Deg0,
    });

    const result = validatePlacement(definition, item, placement);

    expect(result.status).toBe('outside-sheet');
  });

  it('uses rotated physical dimensions during validation', () => {
    const portraitItem = Item.create({
      id: 'item-portrait',
      size: Size2D.of(Length.mm(40), Length.mm(60)),
    });

    const placement = Placement.create({
      itemId: portraitItem.id,
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg90,
    });

    const result = validatePlacement(definition, portraitItem, placement);

    expect(result.bounds.size.width.toMillimetres()).toBe(60);
    expect(result.bounds.size.height.toMillimetres()).toBe(40);
  });

  it('rejects validation against the wrong item', () => {
    const placement = Placement.create({
      itemId: 'different-item',
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg0,
    });

    expect(() => validatePlacement(definition, item, placement)).toThrow();
  });
});

describe('Side, Sheet, and Project', () => {
  const definition = SheetDefinition.create({
    media: StandardMedia.A4,
    layoutMargins: Insets.uniform(Length.mm(10)),
  });
  const item = Item.create({
    id: 'item-1',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });
  const placement = Placement.create({
    itemId: item.id,
    origin: Point2D.of(Length.mm(20), Length.mm(30)),
    rotation: QuarterTurn.Deg0,
  });

  it('creates a front side with placements', () => {
    const side = Side.create('front', [placement]);

    expect(side.kind).toBe('front');
    expect(side.placements).toHaveLength(1);
  });

  it('creates a sheet with a required front and optional back', () => {
    const front = Side.create('front', [placement]);
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front,
    });

    expect(sheet.front).toBe(front);
    expect(sheet.back).toBeUndefined();
  });

  it('creates a minimal project that indexes items and sheets', () => {
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front: Side.create('front', [placement]),
    });
    const project = Project.create({
      id: 'project-1',
      name: 'Golden A4',
      items: [item],
      sheets: [sheet],
    });

    expect(project.getItem('item-1')).toBe(item);
    expect(project.getSheet('sheet-1')).toBe(sheet);
    expect(project.items).toHaveLength(1);
    expect(project.sheets).toHaveLength(1);
  });

  it('rejects duplicate item ids', () => {
    expect(() =>
      Project.create({
        id: 'project-1',
        name: 'Duplicate',
        items: [item, item],
        sheets: [],
      }),
    ).toThrow();
  });

  it('rejects placements that refer to missing items', () => {
    const missingPlacement = Placement.create({
      itemId: 'missing',
      origin: Point2D.of(Length.mm(20), Length.mm(30)),
      rotation: QuarterTurn.Deg0,
    });
    const sheet = Sheet.create({
      id: 'sheet-1',
      definition,
      front: Side.create('front', [missingPlacement]),
    });

    expect(() =>
      Project.create({
        id: 'project-1',
        name: 'Invalid',
        items: [item],
        sheets: [sheet],
      }),
    ).toThrow();
  });
});
