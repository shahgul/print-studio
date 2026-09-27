import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import {
  Item,
  Placement,
  PlacementStatus,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  getPlacementBounds,
  validatePlacement,
} from '@print-studio/domain';
import { Length } from '@print-studio/units-geometry';

export type PdfRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export function physicalLengthToPdfPoints(length: Length): number {
  return length.toPoints();
}

export function mapPlacementToPdfRect(
  definition: SheetDefinition,
  item: Item,
  placement: Placement,
): PdfRect {
  const bounds = getPlacementBounds(item, placement);
  const width = physicalLengthToPdfPoints(bounds.size.width);
  const height = physicalLengthToPdfPoints(bounds.size.height);
  const x = physicalLengthToPdfPoints(bounds.origin.x);
  const top = physicalLengthToPdfPoints(bounds.origin.y);
  const pageHeight = physicalLengthToPdfPoints(definition.size.height);

  return {
    x,
    y: pageHeight - top - height,
    width,
    height,
  };
}

function getItemById(project: Project, itemId: string): Item {
  const item = project.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new RangeError(`unknown item: ${itemId}`);
  }

  return item;
}

function assertPlacementFitsPhysicalSheet(sheet: Sheet, item: Item, placement: Placement): void {
  const validation = validatePlacement(sheet.definition, item, placement);

  if (validation.status === PlacementStatus.OutsideSheet) {
    throw new RangeError(`placement ${placement.id} is outside physical sheet ${sheet.id}`);
  }
}

function renderSide(document: PDFDocument, project: Project, sheet: Sheet, side: Side): void {
  const width = physicalLengthToPdfPoints(sheet.definition.size.width);
  const height = physicalLengthToPdfPoints(sheet.definition.size.height);
  const page = document.addPage([width, height]);

  for (const placement of side.placements) {
    const item = getItemById(project, placement.itemId);

    assertPlacementFitsPhysicalSheet(sheet, item, placement);

    const rect = mapPlacementToPdfRect(sheet.definition, item, placement);

    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
  }
}

export async function renderProjectToPdf(project: Project): Promise<Uint8Array> {
  const document = await PDFDocument.create();

  for (const sheet of project.sheets) {
    renderSide(document, project, sheet, sheet.front);

    if (sheet.back !== null) {
      renderSide(document, project, sheet, sheet.back);
    }
  }

  return document.save();
}
