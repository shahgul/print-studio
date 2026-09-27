import { Size2D } from '@print-studio/units-geometry';

import { requireNonEmptyId } from './shared';

type CreateItemInput = Readonly<{
  id: string;
  size: Size2D;
}>;

export class Item {
  private constructor(
    readonly id: string,
    readonly size: Size2D,
  ) {}

  static create(input: CreateItemInput): Item {
    if (input.size.isEmpty()) {
      throw new RangeError('item size must have positive dimensions');
    }

    return new Item(requireNonEmptyId(input.id, 'item id'), input.size);
  }
}
