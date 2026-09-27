import {
  Item,
  Orientation,
  Placement,
  Project,
  Sheet,
  SheetDefinition,
  Side,
  SideKind,
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
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

type SizeUmV2 = Readonly<{
  width: number;
  height: number;
}>;

type InsetsUmV2 = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

type PlacementV2 = Readonly<{
  id: string;
  itemId: string;
  originUm: Readonly<{
    x: number;
    y: number;
  }>;
  rotation: QuarterTurn;
}>;

type SideV2 = Readonly<{
  kind: SideKind;
  placements: ReadonlyArray<PlacementV2>;
}>;

type StandardSheetDefinitionV2 = Readonly<{
  kind: 'STANDARD';
  media: StandardMedia;
  orientation: Orientation;
  sizeUm: SizeUmV2;
  layoutMarginsUm: InsetsUmV2;
}>;

type CustomSheetDefinitionV2 = Readonly<{
  kind: 'CUSTOM';
  name: string;
  sizeUm: SizeUmV2;
  layoutMarginsUm: InsetsUmV2;
}>;

type SheetDefinitionV2 = StandardSheetDefinitionV2 | CustomSheetDefinitionV2;

type SheetV2 = Readonly<{
  id: string;
  definition: SheetDefinitionV2;
  front: SideV2;
  back: SideV2 | null;
}>;

type ItemV2 = Readonly<{
  id: string;
  sizeUm: SizeUmV2;
}>;

type SourcePageV2 = Readonly<{
  id: string;
  index: number;
  physicalSizeUm: SizeUmV2 | null;
  raster: Readonly<{
    pixelWidth: number;
    pixelHeight: number;
    densityDpi: Readonly<{ x: number; y: number }> | null;
  }> | null;
}>;

type SourceV2 = Readonly<{
  id: string;
  kind: SourceKind;
  displayName: string;
  filePath: string;
  fingerprint: Readonly<{
    algorithm: 'SHA-256';
    value: string;
  }>;
  byteLength: number;
  availability: SourceAvailability;
  pages: ReadonlyArray<SourcePageV2>;
}>;

type ProjectFileV2 = Readonly<{
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: 2;
  physicalUnit: typeof PROJECT_FILE_PHYSICAL_UNIT;
  project: Readonly<{
    id: string;
    items: ReadonlyArray<ItemV2>;
    sheets: ReadonlyArray<SheetV2>;
    sources: ReadonlyArray<SourceV2>;
  }>;
}>;

function sizeToV2(size: Size2D): SizeUmV2 {
  return {
    width: size.width.micrometres,
    height: size.height.micrometres,
  };
}

function insetsToV2(insets: Insets): InsetsUmV2 {
  return {
    top: insets.top.micrometres,
    right: insets.right.micrometres,
    bottom: insets.bottom.micrometres,
    left: insets.left.micrometres,
  };
}

function placementToV2(placement: Placement): PlacementV2 {
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

function sideToV2(side: Side): SideV2 {
  return {
    kind: side.kind,
    placements: side.placements.map(placementToV2),
  };
}

function sheetDefinitionToV2(definition: SheetDefinition): SheetDefinitionV2 {
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
      sizeUm: sizeToV2(definition.size),
      layoutMarginsUm: insetsToV2(definition.layoutMargins),
    };
  }

  return {
    kind: 'CUSTOM',
    name: definition.name,
    sizeUm: sizeToV2(definition.size),
    layoutMarginsUm: insetsToV2(definition.layoutMargins),
  };
}

function sheetToV2(sheet: Sheet): SheetV2 {
  return {
    id: sheet.id,
    definition: sheetDefinitionToV2(sheet.definition),
    front: sideToV2(sheet.front),
    back: sheet.back === null ? null : sideToV2(sheet.back),
  };
}

function sourcePageToV2(page: SourcePage): SourcePageV2 {
  return {
    id: page.id,
    index: page.index,
    physicalSizeUm: page.physicalSize === null ? null : sizeToV2(page.physicalSize),
    raster:
      page.raster === null
        ? null
        : {
            pixelWidth: page.raster.pixelWidth,
            pixelHeight: page.raster.pixelHeight,
            densityDpi:
              page.raster.densityDpi === null
                ? null
                : {
                    x: page.raster.densityDpi.x,
                    y: page.raster.densityDpi.y,
                  },
          },
  };
}

function sourceToV2(source: Source): SourceV2 {
  return {
    id: source.id,
    kind: source.kind,
    displayName: source.displayName,
    filePath: source.filePath,
    fingerprint: {
      algorithm: source.fingerprint.algorithm,
      value: source.fingerprint.value,
    },
    byteLength: source.byteLength,
    availability: source.availability,
    pages: source.pages.map(sourcePageToV2),
  };
}

function projectToV2(project: Project): ProjectFileV2 {
  return {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    physicalUnit: PROJECT_FILE_PHYSICAL_UNIT,
    project: {
      id: project.id,
      items: project.items.map((item) => ({
        id: item.id,
        sizeUm: sizeToV2(item.size),
      })),
      sheets: project.sheets.map(sheetToV2),
      sources: project.sources.map(sourceToV2),
    },
  };
}

export function serializeProject(project: Project): string {
  return `${JSON.stringify(projectToV2(project), null, 2)}\n`;
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

function requirePositiveSafeInteger(value: unknown, path: string): number {
  const parsed = requireSafeInteger(value, path);
  if (parsed <= 0) {
    throw invalidSchema(`${path} must be a positive safe integer`);
  }
  return parsed;
}

function requirePositiveFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw invalidSchema(`${path} must be a positive finite number`);
  }
  return value;
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

function parseNullableSize(value: unknown, path: string): Size2D | null {
  return value === null ? null : parseSize(value, path);
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

function parseSourcePage(value: unknown, kind: SourceKind, path: string): SourcePage {
  const record = requireRecord(value, path);
  const id = requireString(record.id, `${path}.id`);
  const index = requireSafeInteger(record.index, `${path}.index`);
  const physicalSize = parseNullableSize(record.physicalSizeUm, `${path}.physicalSizeUm`);

  if (kind === SourceKind.Pdf) {
    if (physicalSize === null || record.raster !== null) {
      throw invalidSchema(`${path} PDF page requires physical size and null raster metadata`);
    }
    return SourcePage.pdf({ id, index, physicalSize });
  }

  const raster = requireRecord(record.raster, `${path}.raster`);
  const density =
    raster.densityDpi === null
      ? null
      : (() => {
          const densityRecord = requireRecord(raster.densityDpi, `${path}.raster.densityDpi`);
          return {
            x: requirePositiveFiniteNumber(densityRecord.x, `${path}.raster.densityDpi.x`),
            y: requirePositiveFiniteNumber(densityRecord.y, `${path}.raster.densityDpi.y`),
          };
        })();

  return SourcePage.image({
    id,
    index,
    pixelWidth: requirePositiveSafeInteger(raster.pixelWidth, `${path}.raster.pixelWidth`),
    pixelHeight: requirePositiveSafeInteger(raster.pixelHeight, `${path}.raster.pixelHeight`),
    densityDpi: density,
    physicalSize,
  });
}

function parseSource(value: unknown, path: string): Source {
  const record = requireRecord(value, path);
  const kind = requireEnum(record.kind, Object.values(SourceKind), `${path}.kind`);
  const fingerprint = requireRecord(record.fingerprint, `${path}.fingerprint`);

  if (fingerprint.algorithm !== 'SHA-256') {
    throw invalidSchema(`${path}.fingerprint.algorithm must be SHA-256`);
  }

  const pages = requireArray(record.pages, `${path}.pages`).map((page, index) =>
    parseSourcePage(page, kind, `${path}.pages[${index}]`),
  );

  return Source.create({
    id: requireString(record.id, `${path}.id`),
    kind,
    displayName: requireString(record.displayName, `${path}.displayName`),
    filePath: requireString(record.filePath, `${path}.filePath`),
    fingerprint: SourceFingerprint.sha256(
      requireString(fingerprint.value, `${path}.fingerprint.value`),
    ),
    byteLength: requirePositiveSafeInteger(record.byteLength, `${path}.byteLength`),
    availability: requireEnum(
      record.availability,
      Object.values(SourceAvailability),
      `${path}.availability`,
    ),
    pages,
  });
}

function parseV2(document: unknown): Project {
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
  const sources = requireArray(projectRecord.sources, 'project.sources').map((source, index) =>
    parseSource(source, `project.sources[${index}]`),
  );

  try {
    return Project.create({
      id: requireString(projectRecord.id, 'project.id'),
      items,
      sheets,
      sources,
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
    return parseV2(migrated);
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

export interface ProjectTextStore {
  read(path: string): Promise<string>;
  writeAtomic(path: string, content: string): Promise<void>;
}

export interface ProjectRecoveryStore extends ProjectTextStore {
  remove(path: string): Promise<void>;
}

export const DEFAULT_AUTOSAVE_INTERVAL_MS = 30_000;

export function getRecoveryProjectPath(projectPath: string): string {
  const suffix = '.printstudio';

  if (!projectPath.toLowerCase().endsWith(suffix)) {
    throw new RangeError('project recovery requires a .printstudio project path');
  }

  return `${projectPath.slice(0, -suffix.length)}.autosave${suffix}`;
}

export class ProjectRecovery {
  constructor(private readonly store: ProjectRecoveryStore) {}

  async save(projectPath: string, project: Project): Promise<void> {
    await this.store.writeAtomic(getRecoveryProjectPath(projectPath), serializeProject(project));
  }

  async load(projectPath: string): Promise<Project> {
    return deserializeProject(await this.store.read(getRecoveryProjectPath(projectPath)));
  }

  async clear(projectPath: string): Promise<void> {
    await this.store.remove(getRecoveryProjectPath(projectPath));
  }
}

export class ProjectPersistence {
  constructor(private readonly store: ProjectTextStore) {}

  async save(path: string, project: Project): Promise<void> {
    await this.store.writeAtomic(path, serializeProject(project));
  }

  async load(path: string): Promise<Project> {
    return deserializeProject(await this.store.read(path));
  }
}
