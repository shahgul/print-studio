import {
  Project,
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from '@print-studio/domain';
import { Length, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  deserializeProject,
  serializeProject,
} from './index';
import { migrateProjectFileDocument } from './migrations';

function createProjectWithSources(): Project {
  const image = Source.create({
    id: 'photo-source',
    kind: SourceKind.Image,
    displayName: 'portrait.jpg',
    filePath: 'D:\\photos\\portrait.jpg',
    fingerprint: SourceFingerprint.sha256(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ),
    byteLength: 3,
    availability: SourceAvailability.Changed,
    pages: [
      SourcePage.image({
        id: 'photo-source:page:0',
        index: 0,
        pixelWidth: 3000,
        pixelHeight: 2000,
        densityDpi: { x: 300, y: 300 },
        physicalSize: Size2D.of(Length.um(254_000), Length.um(169_333)),
      }),
    ],
  });

  const pdf = Source.create({
    id: 'pdf-source',
    kind: SourceKind.Pdf,
    displayName: 'worksheet.pdf',
    filePath: 'D:\\jobs\\worksheet.pdf',
    fingerprint: SourceFingerprint.sha256('a'.repeat(64)),
    byteLength: 50_000,
    availability: SourceAvailability.Missing,
    pages: [
      SourcePage.pdf({
        id: 'pdf-source:page:0',
        index: 0,
        physicalSize: Size2D.of(Length.mm(210), Length.mm(297)),
      }),
    ],
  });

  return Project.create({
    id: 'project-with-sources',
    sources: [image, pdf],
  });
}

describe('project schema V2 source persistence', () => {
  it('bumps the current schema version to 2', () => {
    expect(CURRENT_PROJECT_SCHEMA_VERSION).toBe(2);
  });

  it('round-trips image/PDF source metadata without physical drift', () => {
    const restored = deserializeProject(serializeProject(createProjectWithSources()));

    expect(restored.sources).toHaveLength(2);

    const image = restored.sources[0]!;
    expect(image.kind).toBe(SourceKind.Image);
    expect(image.availability).toBe(SourceAvailability.Changed);
    expect(image.fingerprint.value).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(image.pages[0]?.raster).toEqual({
      pixelWidth: 3000,
      pixelHeight: 2000,
      densityDpi: { x: 300, y: 300 },
    });
    expect(image.pages[0]?.physicalSize?.width.micrometres).toBe(254_000);
    expect(image.pages[0]?.physicalSize?.height.micrometres).toBe(169_333);

    const pdf = restored.sources[1]!;
    expect(pdf.kind).toBe(SourceKind.Pdf);
    expect(pdf.availability).toBe(SourceAvailability.Missing);
    expect(pdf.pages[0]?.raster).toBeNull();
    expect(pdf.pages[0]?.physicalSize?.width.micrometres).toBe(210_000);
    expect(pdf.pages[0]?.physicalSize?.height.micrometres).toBe(297_000);
  });

  it('serializes sources explicitly in schema V2', () => {
    const raw = JSON.parse(serializeProject(createProjectWithSources())) as {
      schemaVersion: number;
      project: { sources: Array<{ id: string; availability: string }> };
    };

    expect(raw.schemaVersion).toBe(2);
    expect(raw.project.sources).toEqual([
      expect.objectContaining({ id: 'photo-source', availability: 'CHANGED' }),
      expect.objectContaining({ id: 'pdf-source', availability: 'MISSING' }),
    ]);
  });

  it('migrates schema V1 projects by adding an empty sources collection', () => {
    const v1 = {
      format: PROJECT_FILE_FORMAT,
      schemaVersion: 1,
      physicalUnit: 'MICROMETRE',
      project: {
        id: 'legacy-project',
        items: [],
        sheets: [],
      },
    };

    const migrated = migrateProjectFileDocument(v1) as {
      schemaVersion: number;
      project: { sources: unknown[] };
    };

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.project.sources).toEqual([]);

    const restored = deserializeProject(JSON.stringify(v1));
    expect(restored.id).toBe('legacy-project');
    expect(restored.sources).toEqual([]);
  });
});
