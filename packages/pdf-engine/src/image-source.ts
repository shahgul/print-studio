import {
  DocumentImportError,
  DocumentImportErrorCode,
  importSourceBytes,
  type ImportLimits,
} from '@print-studio/document-import';
import {
  SOURCE_CROP_SCALE,
  SourceAvailability,
  SourceKind,
  type Item,
  type Source,
} from '@print-studio/domain';

export enum PdfRenderErrorCode {
  SourceResolverRequired = 'SOURCE_RESOLVER_REQUIRED',
  SourceUnavailable = 'SOURCE_UNAVAILABLE',
  SourceChanged = 'SOURCE_CHANGED',
  SourceReadFailed = 'SOURCE_READ_FAILED',
  UnsupportedSource = 'UNSUPPORTED_SOURCE',
  MalformedSource = 'MALFORMED_SOURCE',
  ResourceLimitExceeded = 'RESOURCE_LIMIT_EXCEEDED',
  AspectMismatch = 'ASPECT_MISMATCH',
}

export class PdfRenderError extends Error {
  constructor(
    readonly code: PdfRenderErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PdfRenderError';
  }
}

export type SourceBytesResolver = (source: Source) => Promise<Uint8Array>;

function assertSupportedJpegOrientation(bytes: Uint8Array): void {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 2; offset + 4 <= bytes.length;) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > bytes.length) break; // The importer validates JPEG segment bounds.
    if (
      marker === 0xe1 &&
      new TextDecoder().decode(bytes.subarray(offset + 4, offset + 10)) === 'Exif\0\0'
    ) {
      const tiff = offset + 10;
      const invalid = () =>
        new PdfRenderError(
          PdfRenderErrorCode.MalformedSource,
          'JPEG has malformed EXIF orientation metadata',
        );
      if (tiff + 8 > end) throw invalid();
      const order = view.getUint16(tiff);
      if (order !== 0x4949 && order !== 0x4d4d) throw invalid();
      const little = order === 0x4949;
      if (view.getUint16(tiff + 2, little) !== 42) throw invalid();
      const ifdOffset = view.getUint32(tiff + 4, little);
      if (ifdOffset === 0) {
        offset = end;
        continue;
      }
      const ifd = tiff + ifdOffset;
      if (ifd < tiff + 8 || ifd + 2 > end) throw invalid();
      const entries = view.getUint16(ifd, little);
      if (ifd + 2 + entries * 12 + 4 > end) throw invalid();
      for (let index = 0; index < entries; index++) {
        const entry = ifd + 2 + index * 12;
        if (view.getUint16(entry, little) !== 0x0112) continue;
        if (view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1)
          throw invalid();
        const orientation = view.getUint16(entry + 8, little);
        if (orientation < 1 || orientation > 8) throw invalid();
        if (orientation !== 1)
          throw new PdfRenderError(
            PdfRenderErrorCode.UnsupportedSource,
            'JPEG EXIF rotation/mirroring is not supported yet. Use an orientation-normalized image.',
          );
      }
    }
    offset = end;
  }
}

export async function resolveImageSourceBytes(
  source: Source,
  resolve: SourceBytesResolver,
  limits?: ImportLimits,
): Promise<Uint8Array> {
  if (source.kind !== SourceKind.Image)
    throw new PdfRenderError(
      PdfRenderErrorCode.UnsupportedSource,
      `source ${source.id}: placed PDF content is not supported yet`,
    );
  if (source.availability !== SourceAvailability.Available)
    throw new PdfRenderError(
      PdfRenderErrorCode.SourceUnavailable,
      `source ${source.id} is ${source.availability}`,
    );
  let bytes: Uint8Array;
  try {
    bytes = await resolve(source);
  } catch (cause) {
    throw new PdfRenderError(
      PdfRenderErrorCode.SourceReadFailed,
      `cannot read source ${source.id}`,
      { cause },
    );
  }
  try {
    const inspected = await importSourceBytes(
      { sourceId: source.id, displayName: source.displayName, filePath: source.filePath, bytes },
      limits,
    );
    if (
      inspected.fingerprint.value !== source.fingerprint.value ||
      inspected.byteLength !== source.byteLength
    )
      throw new PdfRenderError(
        PdfRenderErrorCode.SourceChanged,
        `source ${source.id} bytes differ from the imported fingerprint`,
      );
    const expected = source.pages[0]?.raster;
    const actual = inspected.pages[0]?.raster;
    if (
      inspected.kind !== SourceKind.Image ||
      source.pages.length !== 1 ||
      !actual ||
      !expected ||
      actual.pixelWidth !== expected.pixelWidth ||
      actual.pixelHeight !== expected.pixelHeight
    )
      throw new PdfRenderError(
        PdfRenderErrorCode.MalformedSource,
        `source ${source.id} intrinsic dimensions differ from stored metadata`,
      );
    assertSupportedJpegOrientation(bytes);
    return bytes;
  } catch (cause) {
    if (cause instanceof PdfRenderError) throw cause;
    const code =
      cause instanceof DocumentImportError &&
      cause.code === DocumentImportErrorCode.ResourceLimitExceeded
        ? PdfRenderErrorCode.ResourceLimitExceeded
        : PdfRenderErrorCode.MalformedSource;
    throw new PdfRenderError(code, `source ${source.id} cannot be rendered`, { cause });
  }
}

export function assertImageAspect(item: Item, source: Source): void {
  const reference = item.sourceRef;
  const page = source.pages.find((candidate) => candidate.id === reference?.sourcePageId);
  const raster = page?.raster;
  if (!reference || !raster)
    throw new PdfRenderError(
      PdfRenderErrorCode.MalformedSource,
      `item ${item.id} has no valid image page`,
    );
  const width = (raster.pixelWidth * reference.crop.widthMillionths) / SOURCE_CROP_SCALE;
  const height = (raster.pixelHeight * reference.crop.heightMillionths) / SOURCE_CROP_SCALE;
  const expectedHeightUm = (item.size.width.micrometres * height) / width;
  const expectedWidthUm = (item.size.height.micrometres * width) / height;
  if (
    Math.min(
      Math.abs(item.size.height.micrometres - expectedHeightUm),
      Math.abs(item.size.width.micrometres - expectedWidthUm),
    ) > 1
  )
    throw new PdfRenderError(
      PdfRenderErrorCode.AspectMismatch,
      `item ${item.id}: size must preserve the cropped image aspect ratio`,
    );
}
