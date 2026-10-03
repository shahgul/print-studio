import {
  PDFDocument,
  clip,
  concatTransformationMatrix,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFImage,
} from '@cantoo/pdf-lib';
import type { ImportLimits } from '@print-studio/document-import';
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
  SOURCE_CROP_SCALE,
} from '@print-studio/domain';
import { Length } from '@print-studio/units-geometry';
import {
  assertImageAspect,
  PdfRenderError,
  PdfRenderErrorCode,
  resolveImageSourceBytes,
  type SourceBytesResolver,
} from './image-source';

export {
  assertImageAspect,
  PdfRenderError,
  PdfRenderErrorCode,
  resolveImageSourceBytes,
  type SourceBytesResolver,
} from './image-source';

export type PdfRenderOptions = Readonly<{
  resolveSourceBytes?: SourceBytesResolver;
  limits?: ImportLimits;
}>;

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

async function renderSide(
  document: PDFDocument,
  project: Project,
  sheet: Sheet,
  side: Side,
  options: PdfRenderOptions,
  images: Map<string, PDFImage>,
): Promise<void> {
  const width = physicalLengthToPdfPoints(sheet.definition.size.width);
  const height = physicalLengthToPdfPoints(sheet.definition.size.height);
  const page = document.addPage([width, height]);

  for (const placement of side.placements) {
    const item = getItemById(project, placement.itemId);

    assertPlacementFitsPhysicalSheet(sheet, item, placement);

    const rect = mapPlacementToPdfRect(sheet.definition, item, placement);

    if (item.sourceRef) {
      const source = project.sources.find(
        (candidate) => candidate.id === item.sourceRef!.sourceId,
      )!;
      if (!options.resolveSourceBytes)
        throw new PdfRenderError(
          PdfRenderErrorCode.SourceResolverRequired,
          `item ${item.id} requires source bytes`,
        );
      let image = images.get(source.id);
      if (!image) {
        const bytes = await resolveImageSourceBytes(
          source,
          options.resolveSourceBytes,
          options.limits,
        );
        try {
          image =
            bytes[0] === 0x89 ? await document.embedPng(bytes) : await document.embedJpg(bytes);
        } catch (cause) {
          throw new PdfRenderError(
            PdfRenderErrorCode.MalformedSource,
            `source ${source.id} image decoding failed`,
            { cause },
          );
        }
        images.set(source.id, image);
      }
      assertImageAspect(item, source);
      const w = item.size.width.toPoints();
      const h = item.size.height.toPoints();
      const matrix: [number, number, number, number, number, number] =
        placement.rotation === 90
          ? [0, -1, 1, 0, rect.x, rect.y + w]
          : placement.rotation === 180
            ? [-1, 0, 0, -1, rect.x + w, rect.y + h]
            : placement.rotation === 270
              ? [0, 1, -1, 0, rect.x + h, rect.y]
              : [1, 0, 0, 1, rect.x, rect.y];
      const crop = item.sourceRef.crop;
      const fullWidth = (w * SOURCE_CROP_SCALE) / crop.widthMillionths;
      const fullHeight = (h * SOURCE_CROP_SCALE) / crop.heightMillionths;
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(...matrix),
        rectangle(0, 0, w, h),
        clip(),
        endPath(),
      );
      page.drawImage(image, {
        x: (-fullWidth * crop.xMillionths) / SOURCE_CROP_SCALE,
        y:
          (-fullHeight * (SOURCE_CROP_SCALE - crop.yMillionths - crop.heightMillionths)) /
          SOURCE_CROP_SCALE,
        width: fullWidth,
        height: fullHeight,
      });
      page.pushOperators(popGraphicsState());
      continue;
    }

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

export async function renderProjectToPdf(
  project: Project,
  options: PdfRenderOptions = {},
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const images = new Map<string, PDFImage>();

  for (const sheet of project.sheets) {
    await renderSide(document, project, sheet, sheet.front, options, images);

    if (sheet.back !== null) {
      await renderSide(document, project, sheet, sheet.back, options, images);
    }
  }

  return document.save();
}
