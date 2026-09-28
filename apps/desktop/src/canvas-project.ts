import { getPlacementBounds, Item, Placement, Project, Sheet, Side } from '@print-studio/domain';
import { Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';

export type CanvasItemEdit = Readonly<{
  x?: Length;
  y?: Length;
  width?: Length;
  height?: Length;
  rotation?: QuarterTurn;
}>;

export function editCanvasItem(
  project: Project,
  placementId: string,
  edit: CanvasItemEdit,
): Project {
  const target = project.sheets
    .flatMap((sheet) => [sheet.front, sheet.back].filter((side) => side !== null))
    .flatMap((side) => side.placements)
    .find((placement) => placement.id === placementId);
  if (!target) {
    throw new RangeError(`unknown placement: ${placementId}`);
  }

  const previousItem = project.items.find((item) => item.id === target.itemId);
  if (!previousItem) {
    throw new RangeError(`unknown item: ${target.itemId}`);
  }

  const item = Item.create({
    id: previousItem.id,
    size: Size2D.of(edit.width ?? previousItem.size.width, edit.height ?? previousItem.size.height),
    sourceRef: previousItem.sourceRef,
  });
  if (!item.size.equals(previousItem.size)) {
    const placementCount = project.sheets
      .flatMap((sheet) => [sheet.front, sheet.back].filter((side) => side !== null))
      .flatMap((side) => side.placements)
      .filter((candidate) => candidate.itemId === item.id).length;
    if (placementCount > 1) {
      throw new RangeError('cannot resize a shared item without changing its other placements');
    }
  }
  const placement = Placement.create({
    id: target.id,
    itemId: target.itemId,
    origin: Point2D.of(edit.x ?? target.origin.x, edit.y ?? target.origin.y),
    rotation: edit.rotation ?? target.rotation,
  });

  const sheets = project.sheets.map((sheet) => {
    const replace = (side: Side): Side =>
      Side.create(
        side.kind,
        side.placements.map((candidate) => (candidate.id === placementId ? placement : candidate)),
      );
    return Sheet.create({
      id: sheet.id,
      definition: sheet.definition,
      front: replace(sheet.front),
      ...(sheet.back === null ? {} : { back: replace(sheet.back) }),
    });
  });

  for (const sheet of sheets) {
    for (const side of [sheet.front, sheet.back]) {
      for (const candidate of side?.placements ?? []) {
        if (
          candidate.itemId === item.id &&
          !sheet.definition.bounds.containsRect(getPlacementBounds(item, candidate))
        ) {
          throw new RangeError('item edit would extend beyond the physical sheet');
        }
      }
    }
  }

  return Project.create({
    id: project.id,
    sources: project.sources,
    items: project.items.map((candidate) => (candidate.id === item.id ? item : candidate)),
    sheets,
  });
}
