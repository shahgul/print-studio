import type { Project } from '@print-studio/domain';
import { resolveImageSourceBytes, type SourceBytesResolver } from '@print-studio/pdf-engine';
import { useEffect, useState } from 'react';

export type ImagePreview = Readonly<{ url?: string; error?: string }>;

export function useImagePreviews(
  project: Project,
  resolve: SourceBytesResolver,
): Readonly<Record<string, ImagePreview>> {
  const [previews, setPreviews] = useState<Record<string, ImagePreview>>({});
  const placed = new Set(project.items.map((item) => item.sourceRef?.sourceId));
  const sources = project.sources.filter((source) => placed.has(source.id));
  const sourceKey = JSON.stringify(sources);
  useEffect(() => {
    let disposed = false;
    const urls: string[] = [];
    setPreviews({});
    for (const source of sources) {
      void resolveImageSourceBytes(source, resolve)
        .then((bytes) => {
          if (disposed) return;
          const url = URL.createObjectURL(
            new Blob([new Uint8Array(bytes)], {
              type: bytes[0] === 0x89 ? 'image/png' : 'image/jpeg',
            }),
          );
          urls.push(url);
          setPreviews((current) => ({ ...current, [source.id]: { url } }));
        })
        .catch((error) => {
          if (!disposed)
            setPreviews((current) => ({ ...current, [source.id]: { error: String(error) } }));
        });
    }
    return () => {
      disposed = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [sourceKey, resolve]);
  return previews;
}
