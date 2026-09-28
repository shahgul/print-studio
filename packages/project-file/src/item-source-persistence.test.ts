import {
  Item,
  ItemSourceReference,
  Project,
  Source,
  SourceCrop,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from '@print-studio/domain';
import { Length, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import { ProjectFileErrorCode, deserializeProject, serializeProject } from './index';

function createSourceBackedProject(): Project {
  const source = Source.create({
    id: 'source-photo',
    kind: SourceKind.Image,
    displayName: 'portrait.jpg',
    filePath: 'D:\\photos\\portrait.jpg',
    fingerprint: SourceFingerprint.sha256('2'.repeat(64)),
    byteLength: 50_000,
    pages: [
      SourcePage.image({
        id: 'source-photo:page:0',
        index: 0,
        pixelWidth: 6_000,
        pixelHeight: 4_000,
      }),
    ],
  });

  const item = Item.create({
    id: 'item-photo',
    size: Size2D.of(Length.mm(100), Length.mm(150)),
    sourceRef: ItemSourceReference.create({
      sourceId: source.id,
      sourcePageId: source.pages[0]!.id,
      crop: SourceCrop.create({
        xMillionths: 100_000,
        yMillionths: 125_000,
        widthMillionths: 750_000,
        heightMillionths: 625_000,
      }),
    }),
  });

  return Project.create({
    id: 'project-source-item',
    items: [item],
    sources: [source],
  });
}

describe('source item project-file metadata', () => {
  it('persists source-page identity and non-destructive crop without changing source metadata', () => {
    const original = createSourceBackedProject();
    const serialized = serializeProject(original);
    const raw = JSON.parse(serialized) as {
      project: {
        items: Array<{
          sourceRef: {
            sourceId: string;
            sourcePageId: string;
            cropMillionths: {
              x: number;
              y: number;
              width: number;
              height: number;
            };
          } | null;
        }>;
      };
    };

    expect(raw.project.items[0]?.sourceRef).toEqual({
      sourceId: 'source-photo',
      sourcePageId: 'source-photo:page:0',
      cropMillionths: {
        x: 100_000,
        y: 125_000,
        width: 750_000,
        height: 625_000,
      },
    });

    const restored = deserializeProject(serialized);
    const restoredItem = restored.items[0]!;

    expect(restoredItem.sourceRef?.sourceId).toBe('source-photo');
    expect(restoredItem.sourceRef?.sourcePageId).toBe('source-photo:page:0');
    expect(restoredItem.sourceRef?.crop.xMillionths).toBe(100_000);
    expect(restored.sources[0]?.fingerprint).toBe(original.sources[0]?.fingerprint);
  });

  it('loads older schema-V2 items that do not yet contain sourceRef as source-less items', () => {
    const raw = JSON.parse(serializeProject(createSourceBackedProject())) as {
      project: { items: Array<Record<string, unknown>> };
    };
    delete raw.project.items[0]!.sourceRef;

    const restored = deserializeProject(JSON.stringify(raw));

    expect(restored.items[0]?.sourceRef).toBeNull();
  });

  it('rejects persisted crop geometry outside the normalized source page', () => {
    const raw = JSON.parse(serializeProject(createSourceBackedProject())) as {
      project: {
        items: Array<{
          sourceRef: {
            cropMillionths: { x: number; width: number };
          };
        }>;
      };
    };

    raw.project.items[0]!.sourceRef.cropMillionths.x = 900_000;
    raw.project.items[0]!.sourceRef.cropMillionths.width = 200_000;

    expect(() => deserializeProject(JSON.stringify(raw))).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.InvalidProject,
      }),
    );
  });
});
