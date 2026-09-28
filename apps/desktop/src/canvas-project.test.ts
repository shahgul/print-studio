import {
  getPlacementBounds,
  Placement,
  Project,
  Sheet,
  Side,
  SideKind,
} from '@print-studio/domain';
import { Length, Point2D, QuarterTurn } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import { editCanvasItem } from './canvas-project';
import { createStarterProject } from './starter-project';

describe('canvas project edits', () => {
  it('moves, resizes, and rotates the starter item in canonical units', () => {
    const original = createStarterProject();
    const moved = editCanvasItem(original, 'starter-placement', { x: Length.mm(25.125) });
    const resized = editCanvasItem(moved, 'starter-placement', { width: Length.mm(60) });
    const rotated = editCanvasItem(resized, 'starter-placement', {
      rotation: QuarterTurn.Deg90,
    });

    expect(original.sheets[0]?.front.placements[0]?.origin.x.micrometres).toBe(20_000);
    expect(rotated.sheets[0]?.front.placements[0]?.origin.x.micrometres).toBe(25_125);
    expect(rotated.items[0]?.size.width.micrometres).toBe(60_000);
    expect(rotated.sheets[0]?.front.placements[0]?.rotation).toBe(QuarterTurn.Deg90);
    expect(
      getPlacementBounds(rotated.items[0]!, rotated.sheets[0]!.front.placements[0]!).size.width
        .micrometres,
    ).toBe(50_000);
  });

  it('rejects edits that overflow the physical sheet or collapse an item', () => {
    const project = createStarterProject();
    expect(() => editCanvasItem(project, 'starter-placement', { x: Length.mm(200) })).toThrow(
      /physical sheet/,
    );
    expect(() => editCanvasItem(project, 'starter-placement', { width: Length.zero() })).toThrow(
      /positive/,
    );
  });

  it('retains source references and sheets outside the edited placement', () => {
    const project = createStarterProject();
    const updated = editCanvasItem(project, 'starter-placement', { y: Length.mm(40) });
    expect(updated.sources).toEqual(project.sources);
    expect(updated.sheets[0]?.definition).toBe(project.sheets[0]?.definition);
    expect(updated.items[0]?.sourceRef).toBe(project.items[0]?.sourceRef);
  });

  it('does not silently resize another placement sharing the same Item', () => {
    const starter = createStarterProject();
    const sheet = starter.sheets[0]!;
    const second = Placement.create({
      id: 'second-placement',
      itemId: starter.items[0]!.id,
      origin: Point2D.of(Length.mm(100), Length.mm(100)),
    });
    const project = Project.create({
      id: starter.id,
      items: starter.items,
      sheets: [
        Sheet.create({
          id: sheet.id,
          definition: sheet.definition,
          front: Side.create(SideKind.Front, [...sheet.front.placements, second]),
        }),
      ],
    });

    expect(() => editCanvasItem(project, 'starter-placement', { width: Length.mm(60) })).toThrow(
      /shared item/,
    );
    const moved = editCanvasItem(project, 'starter-placement', { x: Length.mm(25) });
    expect(moved.sheets[0]?.front.placements[1]?.origin.x.micrometres).toBe(100_000);
  });
});
