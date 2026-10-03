import { readFileSync } from 'node:fs';
import { importSourceBytes } from '@print-studio/document-import';
import { Project, SourceAvailability } from '@print-studio/domain';
import { Length, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';
import { createStarterProject } from './starter-project';
import { placeImageOnSheet } from './image-placement';

describe('exact-size image placement', () => {
  async function fixture() {
    const source = await importSourceBytes({
      sourceId: 'image',
      displayName: 'fixture.png',
      filePath: 'fixture.png',
      bytes: new Uint8Array(
        readFileSync(new URL('../../../tests/fixtures/physical-truth.png', import.meta.url)),
      ),
    });
    return { source, project: Project.create({ ...createStarterProject(), sources: [source] }) };
  }

  it('appends an explicit-size source-backed image without guessing DPI or changing existing geometry', async () => {
    const { project, source } = await fixture();
    const next = placeImageOnSheet(project, source.id, {
      itemId: 'image-item',
      placementId: 'image-placement',
      size: Size2D.of(Length.mm(100), Length.mm(50)),
    });
    expect(next.items).toHaveLength(2);
    expect(next.items[0]).toBe(project.items[0]);
    expect(next.items[1]!.size.width.micrometres).toBe(100_000);
    expect(next.items[1]!.sourceRef?.sourceId).toBe(source.id);
    expect(next.sheets[0]!.front.placements[1]!.origin.x.micrometres).toBe(20_000);
    expect(next.sheets[0]!.front.placements[1]!.origin.y.micrometres).toBe(30_000);
  });

  it('rejects overflow, unavailable content, and mismatched aspect', async () => {
    const { project, source } = await fixture();
    const input = {
      itemId: 'image-item',
      placementId: 'image-placement',
      size: Size2D.of(Length.mm(100), Length.mm(50)),
    };
    expect(() =>
      placeImageOnSheet(project, source.id, {
        ...input,
        size: Size2D.of(Length.mm(400), Length.mm(200)),
      }),
    ).toThrow(/physical sheet/);
    expect(() =>
      placeImageOnSheet(project, source.id, {
        ...input,
        size: Size2D.of(Length.mm(50), Length.mm(50)),
      }),
    ).toThrow(/aspect/);
    expect(() =>
      placeImageOnSheet(
        Project.create({
          ...project,
          sources: [source.withAvailability(SourceAvailability.Missing)],
        }),
        source.id,
        input,
      ),
    ).toThrow(/available/i);
  });
});
