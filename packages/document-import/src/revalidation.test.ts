import {
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from '@print-studio/domain';
import { describe, expect, it } from 'vitest';

import { revalidateSourceBytes } from './index';

function importedSource(): Source {
  return Source.create({
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
        pixelWidth: 3000,
        pixelHeight: 2000,
      }),
    ],
  });
}

describe('revalidateSourceBytes', () => {
  it('marks the source AVAILABLE when current bytes match the imported fingerprint', async () => {
    const source = importedSource().withAvailability(SourceAvailability.Missing);

    const result = await revalidateSourceBytes(source, new TextEncoder().encode('abc'));

    expect(result.availability).toBe(SourceAvailability.Available);
    expect(result.fingerprint).toBe(source.fingerprint);
    expect(result.pages).toBe(source.pages);
  });

  it('marks the source CHANGED when current bytes no longer match', async () => {
    const source = importedSource();

    const result = await revalidateSourceBytes(source, new TextEncoder().encode('abd'));

    expect(result.availability).toBe(SourceAvailability.Changed);
    expect(result.fingerprint).toBe(source.fingerprint);
    expect(result.pages).toBe(source.pages);
    expect(result.byteLength).toBe(3);
  });

  it('marks the source MISSING when no current bytes are available', async () => {
    const source = importedSource();

    const result = await revalidateSourceBytes(source, null);

    expect(result.availability).toBe(SourceAvailability.Missing);
    expect(result.fingerprint).toBe(source.fingerprint);
    expect(result.pages).toBe(source.pages);
  });
});
