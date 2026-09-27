import {
  Item,
  Orientation,
  Placement,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  SideKind,
  StandardMedia,
} from '@print-studio/domain';
import { Insets, Length, Point2D, QuarterTurn, Size2D } from '@print-studio/units-geometry';

import { ProjectFileError, ProjectFileErrorCode } from './errors';
import { migrateProjectFileDocument } from './migrations';
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_PHYSICAL_UNIT,
} from './shared';

export {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  ProjectFileError,
  ProjectFileErrorCode,
} from './shared';

type JsonRecord = Record<string, unknown>;

type SizeUmV1 = Readonly<{
  width: number;
  height: number;
}>;

type InsetsUmV1 = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

type PlacementV1 = Readonly<{
  id: string;
  itemId: string;
  originUm: Readonly<{
    x: number;
    y: number;
  }>;
  rotation: QuarterTurn;
}>;

type SideV1 = Readonly<{
  kind: SideKind;
  placements: ReadonlyArray<PlacementV1>;
}>;

type StandardSheetDefinitionV1 = Readonly<{
  kind: 'STANDARD';
  media: StandardMedia;
  orientation: Orientation;
  sizeUm: SizeUmV1;
  layoutMarginsUm: InsetsUmV1;
}>;

type CustomSheetDefinitionV1 = Readonly<{
  kind: 'CUSTOM';
  name: string;
  sizeUm: SizeUmV1;
  layoutMarginsUm: InsetsUmV1;
}>;

type SheetDefinitionV1 = StandardSheetDefinitionV1 | CustomSheetDefinitionV1;

type SheetV1 = Readonly<{
  id: string;
  definition: SheetDefinitionV1;
  front: SideV1;
  back: SideV1 | null;
}>;

type ItemV1 = Readonly<{
  id: string;
  sizeUm: SizeUmV1;
}>;

type ProjectFileV1 = Readonly<{
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: typeof CURRENT_PROJECT_SCHEMA_VERSION;
  physicalUnit: typeof PROJECT_FILE_PHYSICAL_UNIT;
  project: Readonly<{
    id: string;
    items: ReadonlyArray<ItemV1>;
    sheets: ReadonlyArray<SheetV1>;
  }>;
}>;

function sizeToV1(size: Size2D): SizeUmV1 {
  return {
    width: size.width.micrometres,
    height: size.height.micrometres,
  };
}

function insetsToV1(insets: Insets): InsetsUmV1 {
  return {
    top: insets.top.micrometres,
    right: insets.right.micrometres,
    bottom: insets.bottom.micrometres,
    left: insets.left.micrometres,
  };
}

function placementToV1(placement: Placement): PlacementV1 {
  return {
    id: placement.id,
    itemId: placement.itemId,
    originUm: {
      x: placement.origin.x.micrometres,
      y: placement.origin.y.micrometres,
    },
    rotation: placement.rotation,
  };
}

function sideToV1(side: Side): SideV1 {
  return {
    kind: side.kind,
    placements: side.placements.map(placementToV1),
  };
}

function sheetDefinitionToV1(definition: SheetDefinition): SheetDefinitionV1 {
  if (definition.mediaKey !== null) {
    if (definition.orientation === null) {
      throw new ProjectFileError(
        ProjectFileErrorCode.InvalidProject,
        'standard sheet definition is missing orientation',
      );
    }

    return {
      kind: 'STANDARD',
      media: definition.mediaKey,
      orientation: definition.orientation,
      sizeUm: sizeToV1(definition.size),
      layoutMarginsUm: insetsToV1(definition.layoutMargins),
    };
  }

  return {
    kind: 'CUSTOM',
    name: definition.name,
    sizeUm: sizeToV1(definition.size),
    layoutMarginsUm: insetsToV1(definition.layoutMargins),
  };
}

function sheetToV1(sheet: Sheet): SheetV1 {
  return {
    id: sheet.id,
    definition: sheetDefinitionToV1(sheet.definition),
    front: sideToV1(sheet.front),
    back: sheet.back === null ? null : sideToV1(sheet.back),
  };
}

function projectToV1(project: Project): ProjectFileV1 {
  return {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    physicalUnit: PROJECT_FILE_PHYSICAL_UNIT,
    project: {
      id: project.id,
      items: project.items.map((item) => ({
        id: item.id,
        sizeUm: sizeToV1(item.size),
      })),
      sheets: project.sheets.map(sheetToV1),
    },
  };
}

export function serializeProject(project: Project): string {
  return `${JSON.stringify(projectToV1(project), null, 2)}\n`;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) {
    throw invalidSchema(`${path} must be an object`);
  }

  return value;
}

function requireArray(value: unknown, path: string): ReadonlyArray<unknown> {
  if (!Array.isArray(value)) {
    throw invalidSchema(`${path} must be an array`);
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw invalidSchema(`${path} must be a string`);
  }

  return value;
}

function requireSafeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) {
    throw invalidSchema(`${path} must be a safe integer`);
  }

  return value as number;
}

function requireEnum<T extends string>(value: unknown, values: ReadonlyArray<T>, path: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw invalidSchema(`${path} has an unsupported value`);
  }

  return value as T;
}

function requireQuarterTurn(value: unknown, path: string): QuarterTurn {
  if (
    value !== QuarterTurn.Deg0 &&
    value !== QuarterTurn.Deg90 &&
    value !== QuarterTurn.Deg180 &&
    value !== QuarterTurn.Deg270
  ) {
    throw invalidSchema(`${path} must be 0, 90, 180, or 270`);
  }

  return value;
}

function invalidSchema(message: string): ProjectFileError {
  return new ProjectFileError(ProjectFileErrorCode.InvalidSchema, message);
}

function parseLength(value: unknown, path: string): Length {
  return Length.um(requireSafeInteger(value, path));
}

function parseSize(value: unknown, path: string): Size2D {
  const record = requireRecord(value, path);

  return Size2D.of(
    parseLength(record.width, `${path}.width`),
    parseLength(record.height, `${path}.height`),
  );
}

function parseInsets(value: unknown, path: string): Insets {
  const record = requireRecord(value, path);

  return Insets.of({
    top: parseLength(record.top, `${path}.top`),
    right: parseLength(record.right, `${path}.right`),
    bottom: parseLength(record.bottom, `${path}.bottom`),
    left: parseLength(record.left, `${path}.left`),
  });
}

function parsePlacement(value: unknown, path: string): Placement {
  const record = requireRecord(value, path);
  const origin = requireRecord(record.originUm, `${path}.originUm`);

  return Placement.create({
    id: requireString(record.id, `${path}.id`),
    itemId: requireString(record.itemId, `${path}.itemId`),
    origin: Point2D.of(
      parseLength(origin.x, `${path}.originUm.x`),
      parseLength(origin.y, `${path}.originUm.y`),
    ),
    rotation: requireQuarterTurn(record.rotation, `${path}.rotation`),
  });
}

function parseSide(value: unknown, expectedKind: SideKind, path: string): Side {
  const record = requireRecord(value, path);
  const kind = requireEnum(record.kind, Object.values(SideKind), `${path}.kind`);

  if (kind !== expectedKind) {
    throw invalidSchema(`${path}.kind must be ${expectedKind}`);
  }

  const placements = requireArray(record.placements, `${path}.placements`).map((placement, index) =>
    parsePlacement(placement, `${path}.placements[${index}]`),
  );

  return Side.create(kind, placements);
}

function assertStoredSizeMatches(storedSize: Size2D, resolvedSize: Size2D, path: string): void {
  if (!storedSize.equals(resolvedSize)) {
    throw invalidSchema(`${path}.sizeUm does not match the selected standard media`);
  }
}

function parseSheetDefinition(value: unknown, path: string): SheetDefinition {
  const record = requireRecord(value, path);
  const kind = requireString(record.kind, `${path}.kind`);
  const margins = parseInsets(record.layoutMarginsUm, `${path}.layoutMarginsUm`);
  const storedSize = parseSize(record.sizeUm, `${path}.sizeUm`);

  if (kind === 'STANDARD') {
    const media = requireEnum(record.media, Object.values(StandardMedia), `${path}.media`);
    const orientation = requireEnum(
      record.orientation,
      Object.values(Orientation),
      `${path}.orientation`,
    );
    const definition = SheetDefinition.standard(media, {
      orientation,
      layoutMargins: margins,
    });

    assertStoredSizeMatches(storedSize, definition.size, path);
    return definition;
  }

  if (kind === 'CUSTOM') {
    return SheetDefinition.custom({
      name: requireString(record.name, `${path}.name`),
      size: storedSize,
      layoutMargins: margins,
    });
  }

  throw invalidSchema(`${path}.kind must be STANDARD or CUSTOM`);
}

function parseSheet(value: unknown, path: string): Sheet {
  const record = requireRecord(value, path);

  return Sheet.create({
    id: requireString(record.id, `${path}.id`),
    definition: parseSheetDefinition(record.definition, `${path}.definition`),
    front: parseSide(record.front, SideKind.Front, `${path}.front`),
    ...(record.back === null
      ? {}
      : { back: parseSide(record.back, SideKind.Back, `${path}.back`) }),
  });
}

function parseItem(value: unknown, path: string): Item {
  const record = requireRecord(value, path);

  return Item.create({
    id: requireString(record.id, `${path}.id`),
    size: parseSize(record.sizeUm, `${path}.sizeUm`),
  });
}

function parseV1(document: unknown): Project {
  const root = requireRecord(document, 'root');

  if (root.physicalUnit !== PROJECT_FILE_PHYSICAL_UNIT) {
    throw invalidSchema(`physicalUnit must be ${PROJECT_FILE_PHYSICAL_UNIT}`);
  }

  const projectRecord = requireRecord(root.project, 'project');
  const items = requireArray(projectRecord.items, 'project.items').map((item, index) =>
    parseItem(item, `project.items[${index}]`),
  );
  const sheets = requireArray(projectRecord.sheets, 'project.sheets').map((sheet, index) =>
    parseSheet(sheet, `project.sheets[${index}]`),
  );

  try {
    return Project.create({
      id: requireString(projectRecord.id, 'project.id'),
      items,
      sheets,
    });
  } catch (error) {
    if (error instanceof ProjectFileError) {
      throw error;
    }

    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidProject,
      'project data violates domain invariants',
      { cause: error },
    );
  }
}

export function deserializeProject(serialized: string): Project {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new ProjectFileError(ProjectFileErrorCode.InvalidJson, 'project file is not valid JSON', {
      cause: error,
    });
  }

  const migrated = migrateProjectFileDocument(parsed);

  try {
    return parseV1(migrated);
  } catch (error) {
    if (error instanceof ProjectFileError) {
      throw error;
    }

    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidProject,
      'project file could not be reconstructed',
      { cause: error },
    );
  }
}
