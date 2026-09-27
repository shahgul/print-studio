import {
  Project,
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from '@print-studio/domain';
import { describe, expect, it } from 'vitest';

import { revalidateProjectSources, type SourceFileReader } from './source-revalidation';

function projectWithSource(): Project {
  const source = Source.create({
    id: 'source-1',
    kind: SourceKind.Image,
    displayName: 'photo.jpg',
    filePath: 'D:\\photos\\photo.jpg',
    fingerprint: SourceFingerprint.sha256(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ),
    byteLength: 3,
    pages: [
      SourcePage.image({
        id: 'source-1:page:0',
        index: 0,
        pixelWidth: 100,
        pixelHeight: 50,
      }),
    ],
  });

  return Project.create({ id: 'project-1', sources: [source] });
}

describe('revalidateProjectSources', () => {
  it('marks a missing referenced file MISSING without attempting a read', async () => {
    let readCalled = false;
    const reader: SourceFileReader = {
      async exists() {
        return false;
      },
      async read() {
        readCalled = true;
        return new Uint8Array();
      },
    };

    const result = await revalidateProjectSources(projectWithSource(), reader);

    expect(result.sources[0]?.availability).toBe(SourceAvailability.Missing);
    expect(readCalled).toBe(false);
  });

  it('marks matching and changed bytes without replacing stored metadata', async () => {
    const original = projectWithSource();
    const matching: SourceFileReader = {
      async exists() {
        return true;
      },
      async read() {
        return new TextEncoder().encode('abc');
      },
    };
    const changed: SourceFileReader = {
      async exists() {
        return true;
      },
      async read() {
        return new TextEncoder().encode('abd');
      },
    };

    const available = await revalidateProjectSources(original, matching);
    const modified = await revalidateProjectSources(original, changed);

    expect(available.sources[0]?.availability).toBe(SourceAvailability.Available);
    expect(modified.sources[0]?.availability).toBe(SourceAvailability.Changed);
    expect(modified.sources[0]?.fingerprint).toBe(original.sources[0]?.fingerprint);
    expect(modified.sources[0]?.pages).toBe(original.sources[0]?.pages);
  });

  it('preserves project items and sheets while refreshing source availability', async () => {
    const original = projectWithSource();
    const reader: SourceFileReader = {
      async exists() {
        return false;
      },
      async read() {
        throw new Error('not expected');
      },
    };

    const result = await revalidateProjectSources(original, reader);

    expect(result.id).toBe(original.id);
    expect(result.items).toBe(original.items);
    expect(result.sheets).toBe(original.sheets);
  });

  it('surfaces a read failure when the source exists instead of calling it missing', async () => {
    const reader: SourceFileReader = {
      async exists() {
        return true;
      },
      async read() {
        throw new Error('permission denied');
      },
    };

    await expect(revalidateProjectSources(projectWithSource(), reader)).rejects.toThrow(
      /permission denied/i,
    );
  });
});
