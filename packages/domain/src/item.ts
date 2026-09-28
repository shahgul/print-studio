import { Size2D } from '@print-studio/units-geometry';

import { requireNonEmptyId } from './shared';

export const SOURCE_CROP_SCALE = 1_000_000;

type CreateSourceCropInput = Readonly<{
  xMillionths: number;
  yMillionths: number;
  widthMillionths: number;
  heightMillionths: number;
}>;

function requireCropCoordinate(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > SOURCE_CROP_SCALE) {
    throw new RangeError(`${name} must be an integer between 0 and ${SOURCE_CROP_SCALE}`);
  }

  return value;
}

function requireCropExtent(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > SOURCE_CROP_SCALE) {
    throw new RangeError(`${name} must be a positive integer no greater than ${SOURCE_CROP_SCALE}`);
  }

  return value;
}

export class SourceCrop {
  private constructor(
    readonly xMillionths: number,
    readonly yMillionths: number,
    readonly widthMillionths: number,
    readonly heightMillionths: number,
  ) {}

  static create(input: CreateSourceCropInput): SourceCrop {
    const x = requireCropCoordinate(input.xMillionths, 'crop x');
    const y = requireCropCoordinate(input.yMillionths, 'crop y');
    const width = requireCropExtent(input.widthMillionths, 'crop width');
    const height = requireCropExtent(input.heightMillionths, 'crop height');

    if (x + width > SOURCE_CROP_SCALE || y + height > SOURCE_CROP_SCALE) {
      throw new RangeError('crop rectangle must remain inside the normalized source page');
    }

    return new SourceCrop(x, y, width, height);
  }

  static full(): SourceCrop {
    return new SourceCrop(0, 0, SOURCE_CROP_SCALE, SOURCE_CROP_SCALE);
  }
}

type CreateItemSourceReferenceInput = Readonly<{
  sourceId: string;
  sourcePageId: string;
  crop?: SourceCrop;
}>;

export class ItemSourceReference {
  private constructor(
    readonly sourceId: string,
    readonly sourcePageId: string,
    readonly crop: SourceCrop,
  ) {}

  static create(input: CreateItemSourceReferenceInput): ItemSourceReference {
    return new ItemSourceReference(
      requireNonEmptyId(input.sourceId, 'source id'),
      requireNonEmptyId(input.sourcePageId, 'source page id'),
      input.crop ?? SourceCrop.full(),
    );
  }
}

type CreateItemInput = Readonly<{
  id: string;
  size: Size2D;
  sourceRef?: ItemSourceReference | null;
}>;

export class Item {
  private constructor(
    readonly id: string,
    readonly size: Size2D,
    readonly sourceRef: ItemSourceReference | null,
  ) {}

  static create(input: CreateItemInput): Item {
    if (input.size.isEmpty()) {
      throw new RangeError('item size must have positive dimensions');
    }

    return new Item(requireNonEmptyId(input.id, 'item id'), input.size, input.sourceRef ?? null);
  }
}
