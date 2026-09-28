import { Item } from './item';
import { Placement } from './placement';
import { requireNonEmptyId } from './shared';
import { Sheet } from './sheet';
import { Source } from './source';

type CreateProjectInput = Readonly<{
  id: string;
  items?: ReadonlyArray<Item>;
  sheets?: ReadonlyArray<Sheet>;
  sources?: ReadonlyArray<Source>;
}>;

function requireUniqueIds<T>(
  values: ReadonlyArray<T>,
  getId: (value: T) => string,
  label: string,
): void {
  const seen = new Set<string>();

  for (const value of values) {
    const id = getId(value);

    if (seen.has(id)) {
      throw new RangeError(`duplicate ${label} id: ${id}`);
    }

    seen.add(id);
  }
}

function getPlacements(sheet: Sheet): ReadonlyArray<Placement> {
  return sheet.back === null
    ? sheet.front.placements
    : [...sheet.front.placements, ...sheet.back.placements];
}

function validateItemSourceReferences(
  items: ReadonlyArray<Item>,
  sources: ReadonlyArray<Source>,
): void {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  for (const item of items) {
    if (item.sourceRef === null) {
      continue;
    }

    const source = sourcesById.get(item.sourceRef.sourceId);
    if (source === undefined) {
      throw new RangeError(
        `item ${item.id} references unknown source ${item.sourceRef.sourceId}`,
      );
    }

    if (!source.pages.some((page) => page.id === item.sourceRef?.sourcePageId)) {
      throw new RangeError(
        `item ${item.id} references unknown source page ${item.sourceRef.sourcePageId} in source ${source.id}`,
      );
    }
  }
}

export class Project {
  private constructor(
    readonly id: string,
    readonly items: ReadonlyArray<Item>,
    readonly sheets: ReadonlyArray<Sheet>,
    readonly sources: ReadonlyArray<Source>,
  ) {}

  static create(input: CreateProjectInput): Project {
    const items = Object.freeze([...(input.items ?? [])]);
    const sheets = Object.freeze([...(input.sheets ?? [])]);
    const sources = Object.freeze([...(input.sources ?? [])]);

    requireUniqueIds(items, (item) => item.id, 'item');
    requireUniqueIds(sheets, (sheet) => sheet.id, 'sheet');
    requireUniqueIds(sources, (source) => source.id, 'source');

    validateItemSourceReferences(items, sources);

    const itemIds = new Set(items.map((item) => item.id));
    const allPlacements = sheets.flatMap((sheet) => getPlacements(sheet));

    requireUniqueIds(allPlacements, (placement) => placement.id, 'placement');

    for (const placement of allPlacements) {
      if (!itemIds.has(placement.itemId)) {
        throw new RangeError(
          `placement ${placement.id} references unknown item ${placement.itemId}`,
        );
      }
    }

    return new Project(requireNonEmptyId(input.id, 'project id'), items, sheets, sources);
  }
}
