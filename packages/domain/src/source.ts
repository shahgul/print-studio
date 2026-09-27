import { Size2D } from '@print-studio/units-geometry';

import { requireNonEmptyId, requireNonEmptyName } from './shared';

export enum SourceKind {
  Image = 'IMAGE',
  Pdf = 'PDF',
}

export enum SourceAvailability {
  Available = 'AVAILABLE',
  Missing = 'MISSING',
}

export type DensityDpi = Readonly<{
  x: number;
  y: number;
}>;

export type RasterInfo = Readonly<{
  pixelWidth: number;
  pixelHeight: number;
  densityDpi: DensityDpi | null;
}>;

export class SourceFingerprint {
  private constructor(
    readonly algorithm: 'SHA-256',
    readonly value: string,
  ) {}

  static sha256(value: string): SourceFingerprint {
    const normalized = value.trim().toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(normalized)) {
      throw new RangeError('SHA-256 fingerprint must be exactly 64 hexadecimal characters');
    }

    return new SourceFingerprint('SHA-256', normalized);
  }
}

type CreateImagePageInput = Readonly<{
  id: string;
  index: number;
  pixelWidth: number;
  pixelHeight: number;
  densityDpi?: DensityDpi | null;
  physicalSize?: Size2D | null;
}>;

type CreatePdfPageInput = Readonly<{
  id: string;
  index: number;
  physicalSize: Size2D;
}>;

function requirePageIndex(index: number): number {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError('source page index must be a non-negative safe integer');
  }

  return index;
}

function requirePixelDimension(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }

  return value;
}

function requireDensity(density: DensityDpi | null | undefined): DensityDpi | null {
  if (density == null) {
    return null;
  }

  if (
    !Number.isFinite(density.x) ||
    !Number.isFinite(density.y) ||
    density.x <= 0 ||
    density.y <= 0
  ) {
    throw new RangeError('image density must contain positive finite DPI values');
  }

  return Object.freeze({ x: density.x, y: density.y });
}

function requirePositivePhysicalSize(size: Size2D, name: string): Size2D {
  if (size.isEmpty()) {
    throw new RangeError(`${name} must have positive width and height`);
  }

  return size;
}

export class SourcePage {
  private constructor(
    readonly id: string,
    readonly index: number,
    readonly physicalSize: Size2D | null,
    readonly raster: RasterInfo | null,
  ) {}

  static image(input: CreateImagePageInput): SourcePage {
    const physicalSize =
      input.physicalSize == null
        ? null
        : requirePositivePhysicalSize(input.physicalSize, 'image physical size');

    return new SourcePage(
      requireNonEmptyId(input.id, 'source page id'),
      requirePageIndex(input.index),
      physicalSize,
      Object.freeze({
        pixelWidth: requirePixelDimension(input.pixelWidth, 'pixel width'),
        pixelHeight: requirePixelDimension(input.pixelHeight, 'pixel height'),
        densityDpi: requireDensity(input.densityDpi),
      }),
    );
  }

  static pdf(input: CreatePdfPageInput): SourcePage {
    return new SourcePage(
      requireNonEmptyId(input.id, 'source page id'),
      requirePageIndex(input.index),
      requirePositivePhysicalSize(input.physicalSize, 'PDF page physical size'),
      null,
    );
  }
}

type CreateSourceInput = Readonly<{
  id: string;
  kind: SourceKind;
  displayName: string;
  filePath: string;
  fingerprint: SourceFingerprint;
  byteLength: number;
  pages: ReadonlyArray<SourcePage>;
  availability?: SourceAvailability;
}>;

function requireByteLength(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError('source byte length must be a positive safe integer');
  }

  return value;
}

function validatePages(kind: SourceKind, pages: ReadonlyArray<SourcePage>): void {
  if (pages.length === 0) {
    throw new RangeError('source must contain at least one page or frame');
  }

  const pageIds = new Set<string>();

  pages.forEach((page, index) => {
    if (page.index !== index) {
      throw new RangeError(
        `source page indices must be contiguous from zero; expected ${index}, got ${page.index}`,
      );
    }

    if (pageIds.has(page.id)) {
      throw new RangeError(`duplicate source page id: ${page.id}`);
    }
    pageIds.add(page.id);

    if (kind === SourceKind.Pdf) {
      if (page.physicalSize === null || page.raster !== null) {
        throw new RangeError('PDF source pages require physical size and cannot be raster pages');
      }
    } else if (page.raster === null) {
      throw new RangeError('image source pages require raster metadata');
    }
  });
}

export class Source {
  private constructor(
    readonly id: string,
    readonly kind: SourceKind,
    readonly displayName: string,
    readonly filePath: string,
    readonly fingerprint: SourceFingerprint,
    readonly byteLength: number,
    readonly pages: ReadonlyArray<SourcePage>,
    readonly availability: SourceAvailability,
  ) {}

  static create(input: CreateSourceInput): Source {
    const pages = Object.freeze([...input.pages]);
    validatePages(input.kind, pages);

    return new Source(
      requireNonEmptyId(input.id, 'source id'),
      input.kind,
      requireNonEmptyName(input.displayName, 'source display name'),
      requireNonEmptyName(input.filePath, 'source file path'),
      input.fingerprint,
      requireByteLength(input.byteLength),
      pages,
      input.availability ?? SourceAvailability.Available,
    );
  }

  withAvailability(availability: SourceAvailability): Source {
    return new Source(
      this.id,
      this.kind,
      this.displayName,
      this.filePath,
      this.fingerprint,
      this.byteLength,
      this.pages,
      availability,
    );
  }
}
