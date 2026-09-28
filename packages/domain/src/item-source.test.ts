import { Length, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import {
  Item,
  ItemSourceReference,
  Project,
  Source,
  SourceCrop,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from './index';

function imageSource(): Source {
  return Source.create({
    id: 'source-1',
    kind: SourceKind.Image,
    displayName: 'portrait.jpg',
    filePath: 'D:\\photos\\portrait.jpg',
    fingerprint: SourceFingerprint.sha256('1'.repeat(64)),
    byteLength: 12_345,
    pages: [
      SourcePage.image({
        id: 'source-1:page:0',
        index: 0,
        pixelWidth: 6_000,
        pixelHeight: 4_000,
      }),
    ],
  });
}

describe('SourceCrop', () => {
  it('stores a deterministic normalized crop in integer millionths', () => {
    const crop = SourceCrop.create({
      xMillionths: 100_000,
      yMillionths: 125_000,
      widthMillionths: 750_000,
      heightMillionths: 625_000,
    });

    expect(crop.xMillionths).toBe(100_000);
    expect(crop.yMillionths).toBe(125_000);
    expect(crop.widthMillionths).toBe(750_000);
    expect(crop.heightMillionths).toBe(625_000);
  });

  it('rejects empty or out-of-bounds normalized crops', () => {
    expect(() =>
      SourceCrop.create({
        xMillionths: 900_000,
        yMillionths: 0,
        widthMillionths: 200_000,
        heightMillionths: 1_000_000,
      }),
    ).toThrow(/crop/i);

    expect(() =>
      SourceCrop.create({
        xMillionths: 0,
        yMillionths: 0,
        widthMillionths: 0,
        heightMillionths: 1_000_000,
      }),
    ).toThrow(/crop/i);
  });
});

describe('source-backed Item', () => {
  it('references an immutable source page and keeps crop independent from physical item size', () => {
    const sourceRef = ItemSourceReference.create({
      sourceId: 'source-1',
      sourcePageId: 'source-1:page:0',
      crop: SourceCrop.create({
        xMillionths: 100_000,
        yMillionths: 50_000,
        widthMillionths: 800_000,
        heightMillionths: 900_000,
      }),
    });

    const item = Item.create({
      id: 'photo-item',
      size: Size2D.of(Length.mm(100), Length.mm(150)),
      sourceRef,
    });

    expect(item.sourceRef).toBe(sourceRef);
    expect(item.size.width.toMillimetres()).toBe(100);
    expect(item.sourceRef?.crop.widthMillionths).toBe(800_000);
  });

  it('defaults a source reference to the full uncropped page', () => {
    const sourceRef = ItemSourceReference.create({
      sourceId: 'source-1',
      sourcePageId: 'source-1:page:0',
    });

    expect(sourceRef.crop).toEqual(SourceCrop.full());
  });

  it('validates source and source-page references at the project boundary', () => {
    const source = imageSource();
    const validItem = Item.create({
      id: 'valid-item',
      size: Size2D.of(Length.mm(100), Length.mm(150)),
      sourceRef: ItemSourceReference.create({
        sourceId: source.id,
        sourcePageId: source.pages[0]!.id,
      }),
    });

    expect(() =>
      Project.create({
        id: 'project-valid',
        items: [validItem],
        sources: [source],
      }),
    ).not.toThrow();

    const missingSourceItem = Item.create({
      id: 'missing-source-item',
      size: validItem.size,
      sourceRef: ItemSourceReference.create({
        sourceId: 'missing-source',
        sourcePageId: source.pages[0]!.id,
      }),
    });

    expect(() =>
      Project.create({
        id: 'project-missing-source',
        items: [missingSourceItem],
        sources: [source],
      }),
    ).toThrow(/unknown source/i);

    const missingPageItem = Item.create({
      id: 'missing-page-item',
      size: validItem.size,
      sourceRef: ItemSourceReference.create({
        sourceId: source.id,
        sourcePageId: 'missing-page',
      }),
    });

    expect(() =>
      Project.create({
        id: 'project-missing-page',
        items: [missingPageItem],
        sources: [source],
      }),
    ).toThrow(/unknown source page/i);
  });
});
