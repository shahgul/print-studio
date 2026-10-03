import {
  Item,
  ItemSourceReference,
  Placement,
  Project,
  Sheet,
  Side,
  SourceAvailability,
  SourceKind,
  getPlacementBounds,
} from '@print-studio/domain';
import { Length, Point2D, type Size2D } from '@print-studio/units-geometry';
import { assertImageAspect } from '@print-studio/pdf-engine';

export function placeImageOnSheet(
  project: Project,
  sourceId: string,
  input: Readonly<{ itemId: string; placementId: string; size: Size2D }>,
): Project {
  const source = project.sources.find((candidate) => candidate.id === sourceId);
  const sheet = project.sheets[0];
  if (
    !source ||
    source.kind !== SourceKind.Image ||
    source.availability !== SourceAvailability.Available
  )
    throw new RangeError('an available PNG/JPEG image is required');
  if (!sheet) throw new RangeError('a physical sheet is required');
  const item = Item.create({
    id: input.itemId,
    size: input.size,
    sourceRef: ItemSourceReference.create({ sourceId, sourcePageId: source.pages[0]!.id }),
  });
  assertImageAspect(item, source);
  const placement = Placement.create({
    id: input.placementId,
    itemId: item.id,
    origin: Point2D.of(Length.mm(20), Length.mm(30)),
  });
  if (!sheet.definition.bounds.containsRect(getPlacementBounds(item, placement)))
    throw new RangeError('image would extend beyond the physical sheet');
  return Project.create({
    ...project,
    items: [...project.items, item],
    sheets: [
      Sheet.create({
        id: sheet.id,
        definition: sheet.definition,
        front: Side.create(sheet.front.kind, [...sheet.front.placements, placement]),
        ...(sheet.back ? { back: sheet.back } : {}),
      }),
      ...project.sheets.slice(1),
    ],
  });
}
