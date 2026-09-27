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
import { describe, expect, it } from 'vitest';

import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  ProjectFileError,
  ProjectFileErrorCode,
  ProjectPersistence,
  ProjectRecovery,
  getRecoveryProjectPath,
  deserializeProject,
  serializeProject,
} from './index';

function createRoundTripProject(): Project {
  const itemA = Item.create({
    id: 'item-a',
    size: Size2D.of(Length.um(50_001), Length.um(49_999)),
  });
  const itemB = Item.create({
    id: 'item-b',
    size: Size2D.of(Length.mm(20), Length.mm(30)),
  });

  const standardSheet = Sheet.create({
    id: 'sheet-standard',
    definition: SheetDefinition.standard(StandardMedia.A4, {
      orientation: Orientation.Landscape,
      layoutMargins: Insets.of({
        top: Length.um(1_001),
        right: Length.um(2_002),
        bottom: Length.um(3_003),
        left: Length.um(4_004),
      }),
    }),
    front: Side.create(SideKind.Front, [
      Placement.create({
        id: 'placement-front',
        itemId: itemA.id,
        origin: Point2D.of(Length.um(12_345), Length.um(67_890)),
        rotation: QuarterTurn.Deg90,
      }),
    ]),
    back: Side.create(SideKind.Back, [
      Placement.create({
        id: 'placement-back',
        itemId: itemB.id,
        origin: Point2D.of(Length.um(-500), Length.um(8_765)),
        rotation: QuarterTurn.Deg270,
      }),
    ]),
  });

  const customSheet = Sheet.create({
    id: 'sheet-custom',
    definition: SheetDefinition.custom({
      name: 'Photo stock',
      size: Size2D.of(Length.um(101_600), Length.um(152_400)),
      layoutMargins: Length.um(2_500),
    }),
    front: Side.create(SideKind.Front),
  });

  return Project.create({
    id: 'project-round-trip',
    items: [itemA, itemB],
    sheets: [standardSheet, customSheet],
  });
}

describe('project file contract', () => {
  it('publishes a stable format identity and schema version', () => {
    expect(PROJECT_FILE_FORMAT).toBe('print-studio-project');
    expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe(1);
  });

  it('serializes canonical geometry as integer micrometres', () => {
    const serialized = serializeProject(createRoundTripProject());
    const document = JSON.parse(serialized) as {
      format: string;
      schemaVersion: number;
      project: {
        items: Array<{ sizeUm: { width: number; height: number } }>;
        sheets: Array<{
          definition: {
            kind: string;
            layoutMarginsUm: { top: number; right: number; bottom: number; left: number };
          };
          front: { placements: Array<{ originUm: { x: number; y: number }; rotation: number }> };
        }>;
      };
    };

    expect(document.format).toBe(PROJECT_FILE_FORMAT);
    expect(document.schemaVersion).toBe(1);
    expect(document.project.items[0]?.sizeUm).toEqual({
      width: 50_001,
      height: 49_999,
    });
    expect(document.project.sheets[0]?.definition.layoutMarginsUm).toEqual({
      top: 1_001,
      right: 2_002,
      bottom: 3_003,
      left: 4_004,
    });
    expect(document.project.sheets[0]?.front.placements[0]?.originUm).toEqual({
      x: 12_345,
      y: 67_890,
    });
    expect(document.project.sheets[0]?.front.placements[0]?.rotation).toBe(90);
  });

  it('round-trips standard/custom sheets, duplex sides, rotations, and signed coordinates without physical drift', () => {
    const original = createRoundTripProject();

    const restored = deserializeProject(serializeProject(original));

    expect(restored.id).toBe(original.id);
    expect(restored.items).toHaveLength(2);
    expect(restored.items[0]?.size.width.micrometres).toBe(50_001);
    expect(restored.items[0]?.size.height.micrometres).toBe(49_999);

    const standard = restored.sheets[0];
    expect(standard?.definition.mediaKey).toBe(StandardMedia.A4);
    expect(standard?.definition.orientation).toBe(Orientation.Landscape);
    expect(standard?.definition.layoutMargins.top.micrometres).toBe(1_001);
    expect(standard?.front.placements[0]?.rotation).toBe(QuarterTurn.Deg90);
    expect(standard?.back?.placements[0]?.origin.x.micrometres).toBe(-500);
    expect(standard?.back?.placements[0]?.rotation).toBe(QuarterTurn.Deg270);

    const custom = restored.sheets[1];
    expect(custom?.definition.mediaKey).toBeNull();
    expect(custom?.definition.name).toBe('Photo stock');
    expect(custom?.definition.size.width.micrometres).toBe(101_600);
    expect(custom?.definition.size.height.micrometres).toBe(152_400);
  });

  it('is stable across serialize → deserialize → serialize', () => {
    const first = serializeProject(createRoundTripProject());
    const second = serializeProject(deserializeProject(first));

    expect(second).toBe(first);
  });

  it('tolerates additive unknown fields within the current schema version', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as Record<string, unknown>;
    raw.futureTopLevelField = { safely: 'ignored' };

    const projectRecord = raw.project as Record<string, unknown>;
    projectRecord.futureProjectField = true;

    expect(deserializeProject(JSON.stringify(raw)).id).toBe('project-round-trip');
  });
});

describe('project file boundary validation', () => {
  it('returns a typed INVALID_JSON error for malformed JSON', () => {
    expect(() => deserializeProject('{ definitely-not-json')).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidJson,
      }),
    );
  });

  it('rejects files with the wrong format identity', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as Record<string, unknown>;
    raw.format = 'some-other-product';

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidFormat,
      }),
    );
  });

  it('rejects unsupported future schema versions explicitly', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as Record<string, unknown>;
    raw.schemaVersion = CURRENT_PROJECT_SCHEMA_VERSION + 1;

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.UnsupportedSchemaVersion,
      }),
    );
  });

  it('rejects fractional micrometre values instead of rounding persisted geometry', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as {
      project: { items: Array<{ sizeUm: { width: number } }> };
    };
    raw.project.items[0]!.sizeUm.width = 50_000.5;

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidSchema,
      }),
    );
  });

  it('rejects invalid enum values', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as {
      project: {
        sheets: Array<{ front: { placements: Array<{ rotation: number }> } }>;
      };
    };
    raw.project.sheets[0]!.front.placements[0]!.rotation = 45;

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidSchema,
      }),
    );
  });

  it('wraps broken domain references as INVALID_PROJECT', () => {
    const raw = JSON.parse(serializeProject(createRoundTripProject())) as {
      project: {
        sheets: Array<{ front: { placements: Array<{ itemId: string }> } }>;
      };
    };
    raw.project.sheets[0]!.front.placements[0]!.itemId = 'missing-item';

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidProject,
      }),
    );
  });

  it('uses ProjectFileError for all project-file contract failures', () => {
    try {
      deserializeProject('[]');
      throw new Error('expected deserializeProject to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectFileError);
    }
  });
});

describe('ProjectPersistence', () => {
  it('saves a project through an atomic text-store boundary and loads it back', async () => {
    const files = new Map<string, string>();

    const store = {
      async read(path: string): Promise<string> {
        const content = files.get(path);
        if (content === undefined) {
          throw new Error(`missing file: ${path}`);
        }
        return content;
      },
      async writeAtomic(path: string, content: string): Promise<void> {
        files.set(path, content);
      },
    };

    const persistence = new ProjectPersistence(store);
    const project = createRoundTripProject();

    await persistence.save('job.printstudio', project);
    const restored = await persistence.load('job.printstudio');

    expect(restored.id).toBe(project.id);
    expect(restored.items[0]?.size.width.micrometres).toBe(50_001);
    expect(files.get('job.printstudio')).toBe(serializeProject(project));
  });

  it('does not require filesystem, React, or Tauri APIs in the persistence contract', async () => {
    let saved = '';

    const persistence = new ProjectPersistence({
      async read(): Promise<string> {
        return saved;
      },
      async writeAtomic(_path: string, content: string): Promise<void> {
        saved = content;
      },
    });

    await persistence.save('memory', createRoundTripProject());

    expect((await persistence.load('memory')).id).toBe('project-round-trip');
  });
});

describe('project recovery groundwork', () => {
  it('derives a companion recovery project path without changing the project extension', () => {
    expect(getRecoveryProjectPath('D:\\jobs\\worksheet.printstudio')).toBe(
      'D:\\jobs\\worksheet.autosave.printstudio',
    );
  });

  it('writes and restores an atomic recovery snapshot', async () => {
    const files = new Map<string, string>();

    const recovery = new ProjectRecovery({
      async read(path: string): Promise<string> {
        const value = files.get(path);
        if (value === undefined) {
          throw new Error(`missing file: ${path}`);
        }
        return value;
      },
      async writeAtomic(path: string, value: string): Promise<void> {
        files.set(path, value);
      },
      async remove(path: string): Promise<void> {
        files.delete(path);
      },
    });

    const original = createRoundTripProject();

    await recovery.save('D:\\jobs\\worksheet.printstudio', original);
    const restored = await recovery.load('D:\\jobs\\worksheet.printstudio');

    expect(restored.id).toBe(original.id);
    expect(restored.items[0]?.size.width.micrometres).toBe(50_001);
    expect(files.has('D:\\jobs\\worksheet.autosave.printstudio')).toBe(true);
  });

  it('clears the companion recovery snapshot after a successful primary save', async () => {
    const files = new Map<string, string>();

    const store = {
      async read(path: string): Promise<string> {
        const value = files.get(path);
        if (value === undefined) {
          throw new Error(`missing file: ${path}`);
        }
        return value;
      },
      async writeAtomic(path: string, value: string): Promise<void> {
        files.set(path, value);
      },
      async remove(path: string): Promise<void> {
        files.delete(path);
      },
    };

    const project = createRoundTripProject();
    const persistence = new ProjectPersistence(store);
    const recovery = new ProjectRecovery(store);
    const projectPath = 'D:\\jobs\\worksheet.printstudio';

    await recovery.save(projectPath, project);
    expect(files.has(getRecoveryProjectPath(projectPath))).toBe(true);

    await persistence.save(projectPath, project);
    await recovery.clear(projectPath);

    expect(files.has(projectPath)).toBe(true);
    expect(files.has(getRecoveryProjectPath(projectPath))).toBe(false);
  });
});
