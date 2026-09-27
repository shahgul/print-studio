import { Placement } from './placement';
import { requireNonEmptyId } from './shared';
import { SheetDefinition } from './sheet-definition';

export enum SideKind {
  Front = 'FRONT',
  Back = 'BACK',
}

export class Side {
  private constructor(
    readonly kind: SideKind,
    readonly placements: ReadonlyArray<Placement>,
  ) {}

  static create(kind: SideKind, placements: ReadonlyArray<Placement> = []): Side {
    const seen = new Set<string>();

    for (const placement of placements) {
      if (seen.has(placement.id)) {
        throw new RangeError(`duplicate placement id: ${placement.id}`);
      }

      seen.add(placement.id);
    }

    return new Side(kind, Object.freeze([...placements]));
  }
}

type CreateSheetInput = Readonly<{
  id: string;
  definition: SheetDefinition;
  front: Side;
  back?: Side;
}>;

export class Sheet {
  private constructor(
    readonly id: string,
    readonly definition: SheetDefinition,
    readonly front: Side,
    readonly back: Side | null,
  ) {}

  static create(input: CreateSheetInput): Sheet {
    if (input.front.kind !== SideKind.Front) {
      throw new RangeError('sheet front must be a FRONT side');
    }

    if (input.back !== undefined && input.back.kind !== SideKind.Back) {
      throw new RangeError('sheet back must be a BACK side');
    }

    return new Sheet(
      requireNonEmptyId(input.id, 'sheet id'),
      input.definition,
      input.front,
      input.back ?? null,
    );
  }
}
