import { PDFDocument } from '@cantoo/pdf-lib';
import {
  Item,
  Orientation,
  Placement,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  SideKind,
  StandardMedia,
} from '@print-studio/domain';
import { Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import goldenA4 from '../../../tests/golden-geometry/a4-50mm-square.json';
import {
  mapPlacementToPdfRect,
  physicalLengthToPdfPoints,
  renderProjectToPdf,
} from './index';

function createGoldenProject(): Project {
  const definition = SheetDefinition.standard(StandardMedia.A4, {
    orientation: Orientation.Portrait,
    layoutMargins: Length.mm(goldenA4.sheet.layoutMarginMm),
  });
  const item = Item.create({
    id: goldenA4.item.id,
    size: Size2D.of(Length.mm(goldenA4.item.widthMm), Length.mm(goldenA4.item.heightMm)),
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
  const sheet = Sheet.create({
    id: 'sheet-1',
    definition,
    front: Side.create(SideKind.Front, [placement]),
  });

  return Project.create({
    id: goldenA4.id,
    items: [item],
    sheets: [sheet],
  });
}

describe('physicalLengthToPdfPoints', () => {
  it('converts one inch to exactly 72 PDF points', () => {
    expect(physicalLengthToPdfPoints(Length.inches(1))).toBe(72);
  });

  it('uses canonical micrometres rather than screen pixels', () => {
    expect(physicalLengthToPdfPoints(Length.mm(210))).toBeCloseTo(595.2755905511812, 10);
    expect(physicalLengthToPdfPoints(Length.mm(297))).toBeCloseTo(841.8897637795277, 10);
  });
});

describe('mapPlacementToPdfRect', () => {
  it('maps the golden top-left placement into bottom-left PDF coordinates', () => {
    const project = createGoldenProject();
    const sheet = project.sheets[0];
    const item = project.items[0];
    const placement = sheet?.front.placements[0];

    expect(sheet).toBeDefined();
    expect(item).toBeDefined();
    expect(placement).toBeDefined();

    const rect = mapPlacementToPdfRect(sheet!.definition, item!, placement!);

    expect(rect.x).toBeCloseTo(56.69291338582678, 10);
    expect(rect.y).toBeCloseTo(615.1181102362204, 10);
    expect(rect.width).toBeCloseTo(141.73228346456693, 10);
    expect(rect.height).toBeCloseTo(141.73228346456693, 10);
  });

  it('uses rotated physical bounds before converting to PDF coordinates', () => {
    const definition = SheetDefinition.standard(StandardMedia.A4);
    const item = Item.create({
      id: 'portrait-card',
      size: Size2D.of(Length.mm(40), Length.mm(60)),
    });
    const placement = Placement.create({
      id: 'rotated-placement',
      itemId: item.id,
      origin: Point2D.of(Length.mm(10), Length.mm(20)),
      rotation: QuarterTurn.Deg90,
    });

    const rect = mapPlacementToPdfRect(definition, item, placement);

    expect(rect.width).toBeCloseTo(physicalLengthToPdfPoints(Length.mm(60)), 10);
    expect(rect.height).toBeCloseTo(physicalLengthToPdfPoints(Length.mm(40)), 10);
    expect(rect.y).toBeCloseTo(physicalLengthToPdfPoints(Length.mm(237)), 10);
  });
});

describe('renderProjectToPdf', () => {
  it('renders the golden A4 project as one physically correct PDF page', async () => {
    const bytes = await renderProjectToPdf(createGoldenProject());

    expect(bytes.byteLength).toBeGreaterThan(0);

    const document = await PDFDocument.load(bytes);
    const pages = document.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0]?.getWidth()).toBeCloseTo(physicalLengthToPdfPoints(Length.mm(210)), 8);
    expect(pages[0]?.getHeight()).toBeCloseTo(physicalLengthToPdfPoints(Length.mm(297)), 8);
  });

  it('renders a duplex sheet as front then back PDF pages', async () => {
    const definition = SheetDefinition.standard(StandardMedia.A4);
    const item = Item.create({
      id: 'duplex-item',
      size: Size2D.of(Length.mm(20), Length.mm(20)),
    });
    const frontPlacement = Placement.create({
      id: 'front-placement',
      itemId: item.id,
      origin: Point2D.of(Length.mm(10), Length.mm(10)),
    });
    const backPlacement = Placement.create({
      id: 'back-placement',
      itemId: item.id,
      origin: Point2D.of(Length.mm(15), Length.mm(15)),
    });
    const project = Project.create({
      id: 'duplex-project',
      items: [item],
      sheets: [
        Sheet.create({
          id: 'duplex-sheet',
          definition,
          front: Side.create(SideKind.Front, [frontPlacement]),
          back: Side.create(SideKind.Back, [backPlacement]),
        }),
      ],
    });

    const bytes = await renderProjectToPdf(project);
    const document = await PDFDocument.load(bytes);

    expect(document.getPageCount()).toBe(2);
  });

  it('rejects placement outside the physical sheet instead of silently clipping it', async () => {
    const definition = SheetDefinition.standard(StandardMedia.A4);
    const item = Item.create({
      id: 'overflow-item',
      size: Size2D.of(Length.mm(50), Length.mm(50)),
    });
    const placement = Placement.create({
      id: 'overflow-placement',
      itemId: item.id,
      origin: Point2D.of(Length.mm(180), Length.mm(260)),
    });
    const project = Project.create({
      id: 'overflow-project',
      items: [item],
      sheets: [
        Sheet.create({
          id: 'overflow-sheet',
          definition,
          front: Side.create(SideKind.Front, [placement]),
        }),
      ],
    });

    await expect(renderProjectToPdf(project)).rejects.toThrow(/outside physical sheet/i);
  });
});
