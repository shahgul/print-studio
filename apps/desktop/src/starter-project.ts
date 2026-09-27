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
import { Length, Point2D, Size2D } from '@print-studio/units-geometry';

export function createStarterProject(): Project {
  const item = Item.create({
    id: 'starter-square',
    size: Size2D.of(Length.mm(50), Length.mm(50)),
  });

  const placement = Placement.create({
    id: 'starter-placement',
    itemId: item.id,
    origin: Point2D.of(Length.mm(20), Length.mm(30)),
  });

  const sheet = Sheet.create({
    id: 'starter-sheet',
    definition: SheetDefinition.standard(StandardMedia.A4, {
      orientation: Orientation.Portrait,
      layoutMargins: Length.mm(10),
    }),
    front: Side.create(SideKind.Front, [placement]),
  });

  return Project.create({
    id: 'starter-a4-project',
    items: [item],
    sheets: [sheet],
  });
}
