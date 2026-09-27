import { Size2D, Length } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import {
  Project,
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from './index';

function imageSource(id: string): Source {
  return Source.create({
    id,
    kind: SourceKind.Image,
    displayName: `${id}.jpg`,
    filePath: `D:\\input\\${id}.jpg`,
    fingerprint: SourceFingerprint.sha256(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ),
    byteLength: 3,
    pages: [
      SourcePage.image({
        id: `${id}:page:0`,
        index: 0,
        pixelWidth: 100,
        pixelHeight: 50,
      }),
    ],
  });
}

describe('Project sources', () => {
  it('stores immutable imported sources alongside items and sheets', () => {
    const source = imageSource('source-1');
    const project = Project.create({ id: 'project-1', sources: [source] });

    expect(project.sources).toEqual([source]);
    expect(Object.isFrozen(project.sources)).toBe(true);
  });

  it('rejects duplicate source ids', () => {
    expect(() =>
      Project.create({
        id: 'project-1',
        sources: [imageSource('duplicate'), imageSource('duplicate')],
      }),
    ).toThrow(/duplicate source id/i);
  });
});

describe('Source availability', () => {
  it('supports CHANGED without replacing last-known metadata', () => {
    const source = imageSource('source-1');
    const changed = source.withAvailability(SourceAvailability.Changed);

    expect(changed.availability).toBe(SourceAvailability.Changed);
    expect(changed.fingerprint).toBe(source.fingerprint);
    expect(changed.pages).toBe(source.pages);
    expect(changed.filePath).toBe(source.filePath);
  });
});
