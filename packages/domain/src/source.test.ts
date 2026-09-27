import { Length, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import {
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from './index';

describe('SourceFingerprint', () => {
  it('accepts a canonical SHA-256 hex digest', () => {
    const fingerprint = SourceFingerprint.sha256(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    expect(fingerprint.algorithm).toBe('SHA-256');
    expect(fingerprint.value).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
  });

  it('normalizes uppercase hexadecimal and rejects malformed hashes', () => {
    const fingerprint = SourceFingerprint.sha256('A'.repeat(64));

    expect(fingerprint.value).toBe('a'.repeat(64));
    expect(() => SourceFingerprint.sha256('not-a-sha256')).toThrow();
  });
});

describe('SourcePage', () => {
  it('represents an image with pixels but no invented physical size', () => {
    const page = SourcePage.image({
      id: 'image-page-0',
      index: 0,
      pixelWidth: 6000,
      pixelHeight: 4000,
    });

    expect(page.index).toBe(0);
    expect(page.raster).toEqual({
      pixelWidth: 6000,
      pixelHeight: 4000,
      densityDpi: null,
    });
    expect(page.physicalSize).toBeNull();
  });

  it('can retain image density metadata and an intrinsic physical size when known', () => {
    const page = SourcePage.image({
      id: 'image-page-0',
      index: 0,
      pixelWidth: 3000,
      pixelHeight: 2000,
      densityDpi: { x: 300, y: 300 },
      physicalSize: Size2D.of(Length.inches(10), Length.inches(20 / 3)),
    });

    expect(page.raster?.densityDpi).toEqual({ x: 300, y: 300 });
    expect(page.physicalSize?.width.toInches()).toBeCloseTo(10, 6);
  });

  it('represents a PDF page with physical size and no raster metadata', () => {
    const page = SourcePage.pdf({
      id: 'pdf-page-0',
      index: 0,
      physicalSize: Size2D.of(Length.mm(210), Length.mm(297)),
    });

    expect(page.physicalSize?.width.toMillimetres()).toBe(210);
    expect(page.physicalSize?.height.toMillimetres()).toBe(297);
    expect(page.raster).toBeNull();
  });

  it('rejects invalid page indices and raster dimensions', () => {
    expect(() =>
      SourcePage.image({
        id: 'bad-index',
        index: -1,
        pixelWidth: 100,
        pixelHeight: 100,
      }),
    ).toThrow();

    expect(() =>
      SourcePage.image({
        id: 'bad-pixels',
        index: 0,
        pixelWidth: 100.5,
        pixelHeight: 100,
      }),
    ).toThrow();
  });
});

describe('Source', () => {
  const fingerprint = SourceFingerprint.sha256('1'.repeat(64));

  it('creates an available local image source without guessing physical size', () => {
    const source = Source.create({
      id: 'source-image',
      kind: SourceKind.Image,
      displayName: 'portrait.jpg',
      filePath: 'D:\\photos\\portrait.jpg',
      fingerprint,
      byteLength: 12_345,
      pages: [
        SourcePage.image({
          id: 'image-page-0',
          index: 0,
          pixelWidth: 6000,
          pixelHeight: 4000,
        }),
      ],
    });

    expect(source.availability).toBe(SourceAvailability.Available);
    expect(source.pages).toHaveLength(1);
    expect(source.pages[0]?.physicalSize).toBeNull();
  });

  it('retains imported metadata when the referenced file becomes missing', () => {
    const available = Source.create({
      id: 'source-pdf',
      kind: SourceKind.Pdf,
      displayName: 'worksheet.pdf',
      filePath: 'D:\\jobs\\worksheet.pdf',
      fingerprint,
      byteLength: 50_000,
      pages: [
        SourcePage.pdf({
          id: 'pdf-page-0',
          index: 0,
          physicalSize: Size2D.of(Length.mm(210), Length.mm(297)),
        }),
      ],
    });

    const missing = available.withAvailability(SourceAvailability.Missing);

    expect(missing.availability).toBe(SourceAvailability.Missing);
    expect(missing.fingerprint).toBe(available.fingerprint);
    expect(missing.pages[0]?.physicalSize?.width.toMillimetres()).toBe(210);
  });

  it('requires deterministic contiguous page indices starting at zero', () => {
    expect(() =>
      Source.create({
        id: 'source-pdf',
        kind: SourceKind.Pdf,
        displayName: 'bad.pdf',
        filePath: 'D:\\jobs\\bad.pdf',
        fingerprint,
        byteLength: 100,
        pages: [
          SourcePage.pdf({
            id: 'pdf-page-1',
            index: 1,
            physicalSize: Size2D.of(Length.mm(210), Length.mm(297)),
          }),
        ],
      }),
    ).toThrow();
  });

  it('rejects duplicate page ids', () => {
    const physicalSize = Size2D.of(Length.mm(210), Length.mm(297));

    expect(() =>
      Source.create({
        id: 'source-pdf',
        kind: SourceKind.Pdf,
        displayName: 'duplicate.pdf',
        filePath: 'D:\\jobs\\duplicate.pdf',
        fingerprint,
        byteLength: 100,
        pages: [
          SourcePage.pdf({ id: 'same', index: 0, physicalSize }),
          SourcePage.pdf({ id: 'same', index: 1, physicalSize }),
        ],
      }),
    ).toThrow();
  });

  it('requires PDF pages to have physical size and image pages to have raster metadata', () => {
    const imagePage = SourcePage.image({
      id: 'image-page',
      index: 0,
      pixelWidth: 100,
      pixelHeight: 100,
    });
    const pdfPage = SourcePage.pdf({
      id: 'pdf-page',
      index: 0,
      physicalSize: Size2D.of(Length.mm(100), Length.mm(100)),
    });

    expect(() =>
      Source.create({
        id: 'wrong-pdf',
        kind: SourceKind.Pdf,
        displayName: 'wrong.pdf',
        filePath: 'D:\\wrong.pdf',
        fingerprint,
        byteLength: 100,
        pages: [imagePage],
      }),
    ).toThrow();

    expect(() =>
      Source.create({
        id: 'wrong-image',
        kind: SourceKind.Image,
        displayName: 'wrong.png',
        filePath: 'D:\\wrong.png',
        fingerprint,
        byteLength: 100,
        pages: [pdfPage],
      }),
    ).toThrow();
  });

  it('rejects empty page lists and unsafe byte lengths', () => {
    expect(() =>
      Source.create({
        id: 'empty',
        kind: SourceKind.Image,
        displayName: 'empty.png',
        filePath: 'D:\\empty.png',
        fingerprint,
        byteLength: 0,
        pages: [],
      }),
    ).toThrow();

    expect(() =>
      Source.create({
        id: 'unsafe',
        kind: SourceKind.Image,
        displayName: 'unsafe.png',
        filePath: 'D:\\unsafe.png',
        fingerprint,
        byteLength: Number.MAX_SAFE_INTEGER + 1,
        pages: [
          SourcePage.image({
            id: 'image-page',
            index: 0,
            pixelWidth: 1,
            pixelHeight: 1,
          }),
        ],
      }),
    ).toThrow();
  });
});
