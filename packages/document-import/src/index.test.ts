import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { SourceKind } from '@print-studio/domain';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IMPORT_LIMITS,
  DocumentImportError,
  DocumentImportErrorCode,
  importSourceBytes,
} from './index';

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function createPngFixture(options?: {
  width?: number;
  height?: number;
  pixelsPerMetreX?: number;
  pixelsPerMetreY?: number;
  densityUnit?: number;
}): Uint8Array {
  const width = options?.width ?? 600;
  const height = options?.height ?? 300;
  const pixelsPerMetreX = options?.pixelsPerMetreX ?? 11_811;
  const pixelsPerMetreY = options?.pixelsPerMetreY ?? 11_811;
  const densityUnit = options?.densityUnit ?? 1;

  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...u32be(13),
    0x49, 0x48, 0x44, 0x52,
    ...u32be(width),
    ...u32be(height),
    8, 2, 0, 0, 0,
    0, 0, 0, 0,
    ...u32be(9),
    0x70, 0x48, 0x59, 0x73,
    ...u32be(pixelsPerMetreX),
    ...u32be(pixelsPerMetreY),
    densityUnit,
    0, 0, 0, 0,
    ...u32be(0),
    0x49, 0x45, 0x4e, 0x44,
    0, 0, 0, 0,
  ]);
}

function createJpegFixture(options?: {
  width?: number;
  height?: number;
  densityUnits?: number;
  densityX?: number;
  densityY?: number;
}): Uint8Array {
  const width = options?.width ?? 3_000;
  const height = options?.height ?? 2_000;
  const densityUnits = options?.densityUnits ?? 1;
  const densityX = options?.densityX ?? 300;
  const densityY = options?.densityY ?? 300;

  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01,
    densityUnits,
    (densityX >>> 8) & 0xff, densityX & 0xff,
    (densityY >>> 8) & 0xff, densityY & 0xff,
    0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11,
    0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

async function createPdfFixture(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.addPage([595.2755905511812, 841.8897637795277]);
  const rotated = document.addPage([612, 792]);
  rotated.setRotation(degrees(90));
  return document.save();
}

describe('importSourceBytes', () => {
  it('imports PNG pixel dimensions, density metadata, physical size, and a stable SHA-256 fingerprint', async () => {
    const bytes = createPngFixture();

    const source = await importSourceBytes({
      sourceId: 'png-1',
      displayName: 'card.png',
      filePath: 'D:\\input\\card.png',
      bytes,
    });

    expect(source.kind).toBe(SourceKind.Image);
    expect(source.byteLength).toBe(bytes.byteLength);
    expect(source.fingerprint.value).toBe(
      '1202054f7fb0e2904fe9f75f69752884e27b80e3a78679a4fe9135752a1f7ccf',
    );

    const page = source.pages[0];
    expect(page?.raster?.pixelWidth).toBe(600);
    expect(page?.raster?.pixelHeight).toBe(300);
    expect(page?.raster?.densityDpi?.x).toBeCloseTo(299.9994, 3);
    expect(page?.raster?.densityDpi?.y).toBeCloseTo(299.9994, 3);
    expect(page?.physicalSize?.width.toMillimetres()).toBeCloseTo(50.8, 2);
    expect(page?.physicalSize?.height.toMillimetres()).toBeCloseTo(25.4, 2);
  });

  it('does not invent physical size for PNG when pHYs has no physical unit', async () => {
    const source = await importSourceBytes({
      sourceId: 'png-unknown-density',
      displayName: 'unknown.png',
      filePath: 'D:\\input\\unknown.png',
      bytes: createPngFixture({ densityUnit: 0 }),
    });

    expect(source.pages[0]?.raster?.densityDpi).toBeNull();
    expect(source.pages[0]?.physicalSize).toBeNull();
  });

  it('imports JPEG SOF dimensions and JFIF DPI metadata', async () => {
    const source = await importSourceBytes({
      sourceId: 'jpeg-1',
      displayName: 'portrait.jpg',
      filePath: 'D:\\input\\portrait.jpg',
      bytes: createJpegFixture(),
    });

    expect(source.kind).toBe(SourceKind.Image);
    expect(source.pages[0]?.raster).toEqual({
      pixelWidth: 3_000,
      pixelHeight: 2_000,
      densityDpi: { x: 300, y: 300 },
    });
    expect(source.pages[0]?.physicalSize?.width.toInches()).toBeCloseTo(10, 5);
    expect(source.pages[0]?.physicalSize?.height.toInches()).toBeCloseTo(20 / 3, 5);
  });

  it('converts JFIF dots-per-centimetre to DPI', async () => {
    const source = await importSourceBytes({
      sourceId: 'jpeg-dpcm',
      displayName: 'scan.jpg',
      filePath: 'D:\\input\\scan.jpg',
      bytes: createJpegFixture({ densityUnits: 2, densityX: 118, densityY: 118 }),
    });

    expect(source.pages[0]?.raster?.densityDpi?.x).toBeCloseTo(299.72, 2);
    expect(source.pages[0]?.raster?.densityDpi?.y).toBeCloseTo(299.72, 2);
  });

  it('imports PDF page count and physical page size, accounting for page rotation', async () => {
    const source = await importSourceBytes({
      sourceId: 'pdf-1',
      displayName: 'mixed.pdf',
      filePath: 'D:\\input\\mixed.pdf',
      bytes: await createPdfFixture(),
    });

    expect(source.kind).toBe(SourceKind.Pdf);
    expect(source.pages).toHaveLength(2);
    expect(source.pages[0]?.physicalSize?.width.toMillimetres()).toBeCloseTo(210, 2);
    expect(source.pages[0]?.physicalSize?.height.toMillimetres()).toBeCloseTo(297, 2);
    expect(source.pages[1]?.physicalSize?.width.toInches()).toBeCloseTo(11, 5);
    expect(source.pages[1]?.physicalSize?.height.toInches()).toBeCloseTo(8.5, 5);
  });

  it('detects the format from file bytes instead of trusting the extension', async () => {
    const source = await importSourceBytes({
      sourceId: 'mislabeled',
      displayName: 'actually-png.jpg',
      filePath: 'D:\\input\\actually-png.jpg',
      bytes: createPngFixture(),
    });

    expect(source.kind).toBe(SourceKind.Image);
    expect(source.pages[0]?.raster?.pixelWidth).toBe(600);
  });

  it('returns a typed unsupported-format error for unknown signatures', async () => {
    await expect(
      importSourceBytes({
        sourceId: 'unknown',
        displayName: 'unknown.bin',
        filePath: 'D:\\input\\unknown.bin',
        bytes: new Uint8Array([1, 2, 3, 4, 5, 6]),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: DocumentImportErrorCode.UnsupportedFormat,
      }),
    );
  });

  it('returns a typed malformed-file error for truncated PNG input', async () => {
    await expect(
      importSourceBytes({
        sourceId: 'broken-png',
        displayName: 'broken.png',
        filePath: 'D:\\input\\broken.png',
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: DocumentImportErrorCode.MalformedFile,
      }),
    );
  });

  it('rejects input larger than the configured byte limit before parsing', async () => {
    const bytes = createPngFixture();

    await expect(
      importSourceBytes(
        {
          sourceId: 'too-large',
          displayName: 'too-large.png',
          filePath: 'D:\\input\\too-large.png',
          bytes,
        },
        { ...DEFAULT_IMPORT_LIMITS, maxBytes: bytes.byteLength - 1 },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: DocumentImportErrorCode.ResourceLimitExceeded,
      }),
    );
  });

  it('rejects image dimensions whose pixel count exceeds the configured limit', async () => {
    await expect(
      importSourceBytes(
        {
          sourceId: 'too-many-pixels',
          displayName: 'huge.png',
          filePath: 'D:\\input\\huge.png',
          bytes: createPngFixture({ width: 20_000, height: 20_000 }),
        },
        { ...DEFAULT_IMPORT_LIMITS, maxImagePixels: 100_000_000 },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: DocumentImportErrorCode.ResourceLimitExceeded,
      }),
    );
  });

  it('rejects PDFs whose page count exceeds the configured limit', async () => {
    await expect(
      importSourceBytes(
        {
          sourceId: 'too-many-pages',
          displayName: 'pages.pdf',
          filePath: 'D:\\input\\pages.pdf',
          bytes: await createPdfFixture(),
        },
        { ...DEFAULT_IMPORT_LIMITS, maxPdfPages: 1 },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: DocumentImportErrorCode.ResourceLimitExceeded,
      }),
    );
  });

  it('uses typed import errors at the boundary', () => {
    const error = new DocumentImportError(
      DocumentImportErrorCode.MalformedFile,
      'bad source',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(DocumentImportErrorCode.MalformedFile);
  });
});
