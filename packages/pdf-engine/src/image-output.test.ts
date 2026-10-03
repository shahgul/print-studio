import { readFileSync } from 'node:fs';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from '@cantoo/pdf-lib';
import { importSourceBytes } from '@print-studio/document-import';
import {
  Item,
  ItemSourceReference,
  Placement,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  SideKind,
  SourceAvailability,
  SourceCrop,
  StandardMedia,
} from '@print-studio/domain';
import { Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it, vi } from 'vitest';
import { PdfRenderErrorCode, renderProjectToPdf } from './index';

const png = new Uint8Array(
  readFileSync(new URL('../../../tests/fixtures/physical-truth.png', import.meta.url)),
);
const jpeg = new Uint8Array(
  readFileSync(new URL('../../../tests/fixtures/physical-truth.jpg', import.meta.url)),
);

async function fixture(bytes = png, rotation = QuarterTurn.Deg0, crop = SourceCrop.full()) {
  const source = await importSourceBytes({
    sourceId: 'image',
    displayName: 'fixture',
    filePath: 'fixture.png',
    bytes,
  });
  const width = (100 * crop.widthMillionths) / 1_000_000;
  const height = (50 * crop.heightMillionths) / 1_000_000;
  const item = Item.create({
    id: 'image-item',
    size: Size2D.of(Length.mm(width), Length.mm(height)),
    sourceRef: ItemSourceReference.create({
      sourceId: source.id,
      sourcePageId: source.pages[0]!.id,
      crop,
    }),
  });
  const placement = Placement.create({
    id: 'image-placement',
    itemId: item.id,
    origin: Point2D.of(Length.mm(20), Length.mm(30)),
    rotation,
  });
  const project = Project.create({
    id: 'image-project',
    sources: [source],
    items: [item],
    sheets: [
      Sheet.create({
        id: 'a4',
        definition: SheetDefinition.standard(StandardMedia.A4),
        front: Side.create(SideKind.Front, [placement]),
      }),
    ],
  });
  return { project, source, item, placement };
}

function content(document: PDFDocument): string {
  const streams = document.getPages()[0]!.node.lookup(PDFName.of('Contents'), PDFArray);
  return streams
    .asArray()
    .map((ref) => {
      const stream = document.context.lookup(ref);
      if (!(stream instanceof PDFRawStream))
        throw new Error('expected a serialized content stream');
      return new TextDecoder().decode(decodePDFRawStream(stream).decode());
    })
    .join('\n');
}

describe('source-backed image PDF output', () => {
  it.each([
    ['PNG', png],
    ['JPEG', jpeg],
  ] as const)('embeds %s content at exact physical size', async (_format, bytes) => {
    const { project } = await fixture(bytes);
    const pdf = await PDFDocument.load(
      await renderProjectToPdf(project, { resolveSourceBytes: async () => bytes }),
    );
    const page = pdf.getPages()[0]!;
    expect(page.getWidth()).toBeCloseTo(Length.mm(210).toPoints(), 8);
    expect(page.getHeight()).toBeCloseTo(Length.mm(297).toPoints(), 8);
    const resources = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    const image = pdf.context.lookup(resources.values()[0]!);
    if (!(image instanceof PDFRawStream)) throw new Error('expected an embedded image stream');
    expect(image.dict.get(PDFName.of('Subtype'))?.toString()).toBe('/Image');
    expect(image.dict.get(PDFName.of('Width'))?.toString()).toBe('600');
    expect(image.dict.get(PDFName.of('Height'))?.toString()).toBe('300');
    const operators = content(pdf);
    expect(operators).toContain(' Do');
    expect(operators).not.toContain(' S');
    const matrices = [
      ...operators.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm/g),
    ].map((match) => match.slice(1).map(Number));
    expect(matrices[0]![4]).toBeCloseTo(Length.mm(20).toPoints(), 8);
    expect(matrices[0]![5]).toBeCloseTo(Length.mm(217).toPoints(), 8);
    expect(
      matrices.find((matrix) => Math.abs(matrix[0]! - Length.mm(100).toPoints()) < 0.001)?.[3],
    ).toBeCloseTo(Length.mm(50).toPoints(), 8);
  });

  it.each([0, 90, 180, 270])(
    'preserves clockwise %s° rotation and non-destructive crop',
    async (rotation) => {
      const crop = SourceCrop.create({
        xMillionths: 250_000,
        yMillionths: 250_000,
        widthMillionths: 500_000,
        heightMillionths: 500_000,
      });
      const { project } = await fixture(png, rotation as QuarterTurn, crop);
      const pdf = await PDFDocument.load(
        await renderProjectToPdf(project, { resolveSourceBytes: async () => png }),
      );
      const operators = content(pdf);
      expect(operators).toContain('W\nn');
      const matrix = [
        ...operators.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm/g),
      ][0]!
        .slice(1)
        .map(Number);
      const expected =
        rotation === 0
          ? [1, 0, 0, 1]
          : rotation === 90
            ? [0, -1, 1, 0]
            : rotation === 180
              ? [-1, 0, 0, -1]
              : [0, 1, -1, 0];
      expect(matrix.slice(0, 4)).toEqual(expected);
      const w = Length.mm(50).toPoints();
      const h = Length.mm(25).toPoints();
      const corners = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ].map(([x, y]) => ({
        x: matrix[0]! * x! + matrix[2]! * y! + matrix[4]!,
        y: matrix[1]! * x! + matrix[3]! * y! + matrix[5]!,
      }));
      const turned = rotation === 90 || rotation === 270;
      expect(Math.min(...corners.map((point) => point.x))).toBeCloseTo(Length.mm(20).toPoints(), 8);
      expect(Math.min(...corners.map((point) => point.y))).toBeCloseTo(
        Length.mm(297 - 30 - (turned ? 50 : 25)).toPoints(),
        8,
      );
      expect(
        Math.max(...corners.map((point) => point.x)) - Math.min(...corners.map((point) => point.x)),
      ).toBeCloseTo(turned ? h : w, 8);
      // The crop occupies 50×25 mm; its full image remains 100×50 mm.
      const translates = [...operators.matchAll(/1 0 0 1 ([-\d.]+) ([-\d.]+) cm/g)].map((match) =>
        Number(match[1]),
      );
      expect(translates.some((value) => Math.abs(value - Length.mm(-25).toPoints()) < 0.001)).toBe(
        true,
      );
      expect(project.items[0]!.sourceRef!.crop).toBe(crop);
    },
  );

  it('resolves repeated image content once and does not read unplaced sources', async () => {
    const { project, placement } = await fixture();
    const sheet = project.sheets[0]!;
    const repeated = Project.create({
      ...project,
      sheets: [
        Sheet.create({
          id: sheet.id,
          definition: sheet.definition,
          front: Side.create(SideKind.Front, [
            placement,
            Placement.create({
              id: 'second',
              itemId: placement.itemId,
              origin: Point2D.of(Length.mm(20), Length.mm(100)),
            }),
          ]),
        }),
      ],
    });
    const resolver = vi.fn(async () => png);
    await renderProjectToPdf(repeated, { resolveSourceBytes: resolver });
    expect(resolver).toHaveBeenCalledTimes(1);
    await renderProjectToPdf(Project.create({ ...project, items: [], sheets: [] }), {
      resolveSourceBytes: resolver,
    });
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('rejects missing resolver, unavailable/changed bytes, read failures, and oversized input', async () => {
    const { project, source } = await fixture();
    await expect(renderProjectToPdf(project)).rejects.toMatchObject({
      code: PdfRenderErrorCode.SourceResolverRequired,
    });
    for (const availability of [SourceAvailability.Missing, SourceAvailability.Changed]) {
      await expect(
        renderProjectToPdf(
          Project.create({ ...project, sources: [source.withAvailability(availability)] }),
          { resolveSourceBytes: async () => png },
        ),
      ).rejects.toMatchObject({ code: PdfRenderErrorCode.SourceUnavailable });
    }
    await expect(
      renderProjectToPdf(project, { resolveSourceBytes: async () => jpeg }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.SourceChanged });
    await expect(
      renderProjectToPdf(project, {
        resolveSourceBytes: async () => {
          throw new Error('read failed');
        },
      }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.SourceReadFailed });
    await expect(
      renderProjectToPdf(project, {
        resolveSourceBytes: async () => png,
        limits: { maxBytes: 8, maxImagePixels: 250_000_000, maxPdfPages: 1_000 },
      }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.ResourceLimitExceeded });
  });

  it('rejects aspect distortion instead of silently stretching the image', async () => {
    const { project, item } = await fixture();
    const distorted = Project.create({
      ...project,
      items: [Item.create({ ...item, size: Size2D.of(Length.mm(50), Length.mm(50)) })],
    });
    await expect(
      renderProjectToPdf(distorted, { resolveSourceBytes: async () => png }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.AspectMismatch });
  });

  it('rejects excessive raster dimensions and corrupt image data before producing output', async () => {
    const { project } = await fixture();
    await expect(
      renderProjectToPdf(project, {
        resolveSourceBytes: async () => png,
        limits: { maxBytes: 256 * 1024 * 1024, maxImagePixels: 1, maxPdfPages: 1_000 },
      }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.ResourceLimitExceeded });
    const corrupt = png.slice();
    const idat = Buffer.from(corrupt).indexOf('IDAT');
    expect(idat).toBeGreaterThan(0);
    corrupt[idat + 4] = 0xff;
    const bad = await fixture(corrupt);
    await expect(
      renderProjectToPdf(bad.project, { resolveSourceBytes: async () => corrupt }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.MalformedSource });
  });

  it('rejects placed PDF sources instead of substituting geometry placeholders', async () => {
    const document = await PDFDocument.create();
    document.addPage([200, 100]);
    const bytes = await document.save();
    const source = await importSourceBytes({
      sourceId: 'pdf',
      displayName: 'fixture.pdf',
      filePath: 'fixture.pdf',
      bytes,
    });
    const { project, item } = await fixture();
    const pdfProject = Project.create({
      ...project,
      sources: [source],
      items: [
        Item.create({
          ...item,
          sourceRef: ItemSourceReference.create({
            sourceId: source.id,
            sourcePageId: source.pages[0]!.id,
          }),
        }),
      ],
    });
    await expect(
      renderProjectToPdf(pdfProject, { resolveSourceBytes: async () => bytes }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.UnsupportedSource });
  });

  it('rejects EXIF-rotated JPEGs so browser preview cannot differ from PDF orientation', async () => {
    const exif = [
      69, 120, 105, 102, 0, 0, 77, 77, 0, 42, 0, 0, 0, 8, 0, 1, 1, 18, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0,
      0, 0, 0, 0,
    ];
    const oriented = new Uint8Array([
      ...jpeg.subarray(0, 2),
      0xff,
      0xe1,
      0,
      34,
      ...exif,
      ...jpeg.subarray(2),
    ]);
    const { project } = await fixture(oriented);
    await expect(
      renderProjectToPdf(project, { resolveSourceBytes: async () => oriented }),
    ).rejects.toMatchObject({ code: PdfRenderErrorCode.UnsupportedSource });
  });
});
