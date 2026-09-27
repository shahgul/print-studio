import { PDFDocument } from '@cantoo/pdf-lib';
import {
  Source,
  SourceFingerprint,
  SourceKind,
  SourcePage,
  type DensityDpi,
} from '@print-studio/domain';
import { Length, Size2D } from '@print-studio/units-geometry';

export enum DocumentImportErrorCode {
  UnsupportedFormat = 'UNSUPPORTED_FORMAT',
  MalformedFile = 'MALFORMED_FILE',
  ResourceLimitExceeded = 'RESOURCE_LIMIT_EXCEEDED',
}

export class DocumentImportError extends Error {
  constructor(
    readonly code: DocumentImportErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DocumentImportError';
  }
}

export type ImportLimits = Readonly<{
  maxBytes: number;
  maxPdfPages: number;
  maxImagePixels: number;
}>;

export const DEFAULT_IMPORT_LIMITS: ImportLimits = Object.freeze({
  maxBytes: 256 * 1024 * 1024,
  maxPdfPages: 1_000,
  maxImagePixels: 250_000_000,
});

export type ImportSourceBytesInput = Readonly<{
  sourceId: string;
  displayName: string;
  filePath: string;
  bytes: Uint8Array;
}>;

type ImageMetadata = Readonly<{
  pixelWidth: number;
  pixelHeight: number;
  densityDpi: DensityDpi | null;
}>;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

function malformed(message: string, cause?: unknown): DocumentImportError {
  return new DocumentImportError(
    DocumentImportErrorCode.MalformedFile,
    message,
    cause === undefined ? undefined : { cause },
  );
}

function resourceLimit(message: string): DocumentImportError {
  return new DocumentImportError(DocumentImportErrorCode.ResourceLimitExceeded, message);
}

function startsWith(bytes: Uint8Array, signature: ReadonlyArray<number>): boolean {
  if (bytes.byteLength < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function detectFormat(bytes: Uint8Array): 'PNG' | 'JPEG' | 'PDF' {
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return 'PNG';
  }

  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'JPEG';
  }

  if (startsWith(bytes, PDF_SIGNATURE)) {
    return 'PDF';
  }

  throw new DocumentImportError(
    DocumentImportErrorCode.UnsupportedFormat,
    'source bytes are not a supported PNG, JPEG, or PDF document',
  );
}

function validateLimits(limits: ImportLimits): void {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive safe integer`);
    }
  }
}

function assertByteLimit(bytes: Uint8Array, limits: ImportLimits): void {
  if (bytes.byteLength > limits.maxBytes) {
    throw resourceLimit(
      `source is ${bytes.byteLength} bytes, exceeding the ${limits.maxBytes}-byte import limit`,
    );
  }
}

function assertImagePixelLimit(width: number, height: number, limits: ImportLimits): void {
  if (width > Math.floor(limits.maxImagePixels / height)) {
    throw resourceLimit(
      `image dimensions ${width} × ${height} exceed the ${limits.maxImagePixels}-pixel import limit`,
    );
  }
}

function readU16Be(bytes: Uint8Array, offset: number, label: string): number {
  if (offset < 0 || offset + 2 > bytes.byteLength) {
    throw malformed(`${label} is truncated`);
  }

  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readU32Be(bytes: Uint8Array, offset: number, label: string): number {
  if (offset < 0 || offset + 4 > bytes.byteLength) {
    throw malformed(`${label} is truncated`);
  }

  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.byteLength) {
    throw malformed('metadata string is truncated');
  }

  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]!);
  }
  return value;
}

function physicalSizeFromDensity(
  pixelWidth: number,
  pixelHeight: number,
  density: DensityDpi | null,
): Size2D | null {
  if (density === null) {
    return null;
  }

  return Size2D.of(Length.inches(pixelWidth / density.x), Length.inches(pixelHeight / density.y));
}

function parsePng(bytes: Uint8Array, limits: ImportLimits): ImageMetadata {
  if (bytes.byteLength < 33) {
    throw malformed('PNG is truncated before its IHDR chunk');
  }

  let offset = PNG_SIGNATURE.length;
  let width: number | null = null;
  let height: number | null = null;
  let densityDpi: DensityDpi | null = null;
  let chunkIndex = 0;

  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) {
      throw malformed('PNG chunk header is truncated');
    }

    const length = readU32Be(bytes, offset, 'PNG chunk length');
    const type = asciiAt(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;

    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.byteLength) {
      throw malformed(`PNG ${type} chunk exceeds the available source bytes`);
    }

    if (chunkIndex === 0 && type !== 'IHDR') {
      throw malformed('PNG IHDR must be the first chunk');
    }

    if (type === 'IHDR') {
      if (length !== 13) {
        throw malformed('PNG IHDR chunk must contain exactly 13 bytes');
      }

      width = readU32Be(bytes, dataStart, 'PNG width');
      height = readU32Be(bytes, dataStart + 4, 'PNG height');

      if (width <= 0 || height <= 0) {
        throw malformed('PNG dimensions must be positive');
      }
    } else if (type === 'pHYs' && length === 9) {
      const pixelsPerMetreX = readU32Be(bytes, dataStart, 'PNG horizontal density');
      const pixelsPerMetreY = readU32Be(bytes, dataStart + 4, 'PNG vertical density');
      const unit = bytes[dataStart + 8];

      if (unit === 1 && pixelsPerMetreX > 0 && pixelsPerMetreY > 0) {
        densityDpi = Object.freeze({
          x: pixelsPerMetreX * 0.0254,
          y: pixelsPerMetreY * 0.0254,
        });
      }
    }

    offset = chunkEnd;
    chunkIndex += 1;

    if (type === 'IEND') {
      break;
    }
  }

  if (width === null || height === null) {
    throw malformed('PNG does not contain a valid IHDR chunk');
  }

  assertImagePixelLimit(width, height, limits);

  return { pixelWidth: width, pixelHeight: height, densityDpi };
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function parseJfifDensity(
  bytes: Uint8Array,
  dataStart: number,
  segmentLength: number,
): DensityDpi | null {
  if (segmentLength < 16 || asciiAt(bytes, dataStart, 5) !== 'JFIF\0') {
    return null;
  }

  const units = bytes[dataStart + 7]!;
  const densityX = readU16Be(bytes, dataStart + 8, 'JPEG horizontal density');
  const densityY = readU16Be(bytes, dataStart + 10, 'JPEG vertical density');

  if (densityX <= 0 || densityY <= 0) {
    return null;
  }

  if (units === 1) {
    return Object.freeze({ x: densityX, y: densityY });
  }

  if (units === 2) {
    return Object.freeze({ x: densityX * 2.54, y: densityY * 2.54 });
  }

  return null;
}

function parseJpeg(bytes: Uint8Array, limits: ImportLimits): ImageMetadata {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw malformed('JPEG is missing its SOI marker');
  }

  let offset = 2;
  let width: number | null = null;
  let height: number | null = null;
  let densityDpi: DensityDpi | null = null;

  while (offset < bytes.byteLength) {
    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.byteLength) {
      break;
    }

    const marker = bytes[offset]!;
    offset += 1;

    if (marker === 0xd9) {
      break;
    }

    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    const segmentLength = readU16Be(bytes, offset, 'JPEG segment length');
    if (segmentLength < 2) {
      throw malformed('JPEG segment length must include its two-byte length field');
    }

    const dataStart = offset + 2;
    const segmentEnd = offset + segmentLength;

    if (segmentEnd > bytes.byteLength) {
      throw malformed('JPEG segment exceeds the available source bytes');
    }

    if (marker === 0xe0 && densityDpi === null) {
      densityDpi = parseJfifDensity(bytes, dataStart, segmentLength);
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        throw malformed('JPEG SOF segment is too short');
      }

      height = readU16Be(bytes, dataStart + 1, 'JPEG height');
      width = readU16Be(bytes, dataStart + 3, 'JPEG width');

      if (width <= 0 || height <= 0) {
        throw malformed('JPEG dimensions must be positive');
      }

      break;
    }

    offset = segmentEnd;
  }

  if (width === null || height === null) {
    throw malformed('JPEG does not contain a supported SOF dimension marker');
  }

  assertImagePixelLimit(width, height, limits);

  return { pixelWidth: width, pixelHeight: height, densityDpi };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto SHA-256 is unavailable in this runtime');
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join(
    '',
  );
}

async function importImage(
  input: ImportSourceBytesInput,
  format: 'PNG' | 'JPEG',
  limits: ImportLimits,
  fingerprint: SourceFingerprint,
): Promise<Source> {
  const metadata =
    format === 'PNG' ? parsePng(input.bytes, limits) : parseJpeg(input.bytes, limits);

  return Source.create({
    id: input.sourceId,
    kind: SourceKind.Image,
    displayName: input.displayName,
    filePath: input.filePath,
    fingerprint,
    byteLength: input.bytes.byteLength,
    pages: [
      SourcePage.image({
        id: `${input.sourceId}:page:0`,
        index: 0,
        pixelWidth: metadata.pixelWidth,
        pixelHeight: metadata.pixelHeight,
        densityDpi: metadata.densityDpi,
        physicalSize: physicalSizeFromDensity(
          metadata.pixelWidth,
          metadata.pixelHeight,
          metadata.densityDpi,
        ),
      }),
    ],
  });
}

async function importPdf(
  input: ImportSourceBytesInput,
  limits: ImportLimits,
  fingerprint: SourceFingerprint,
): Promise<Source> {
  let document: PDFDocument;

  try {
    document = await PDFDocument.load(input.bytes);
  } catch (error) {
    throw malformed('PDF could not be parsed', error);
  }

  const pages = document.getPages();

  if (pages.length === 0) {
    throw malformed('PDF contains no pages');
  }

  if (pages.length > limits.maxPdfPages) {
    throw resourceLimit(
      `PDF contains ${pages.length} pages, exceeding the ${limits.maxPdfPages}-page import limit`,
    );
  }

  return Source.create({
    id: input.sourceId,
    kind: SourceKind.Pdf,
    displayName: input.displayName,
    filePath: input.filePath,
    fingerprint,
    byteLength: input.bytes.byteLength,
    pages: pages.map((page, index) => {
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      const swapAxes = rotation === 90 || rotation === 270;
      const width = swapAxes ? page.getHeight() : page.getWidth();
      const height = swapAxes ? page.getWidth() : page.getHeight();

      return SourcePage.pdf({
        id: `${input.sourceId}:page:${index}`,
        index,
        physicalSize: Size2D.of(Length.points(width), Length.points(height)),
      });
    }),
  });
}

export async function importSourceBytes(
  input: ImportSourceBytesInput,
  limits: ImportLimits = DEFAULT_IMPORT_LIMITS,
): Promise<Source> {
  validateLimits(limits);
  assertByteLimit(input.bytes, limits);

  const format = detectFormat(input.bytes);
  const fingerprint = SourceFingerprint.sha256(await sha256Hex(input.bytes));

  if (format === 'PDF') {
    return importPdf(input, limits, fingerprint);
  }

  return importImage(input, format, limits, fingerprint);
}
