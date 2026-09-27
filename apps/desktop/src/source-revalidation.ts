import { revalidateSourceBytes } from '@print-studio/document-import';
import { Project } from '@print-studio/domain';

export interface SourceFileReader {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<Uint8Array>;
}

export async function revalidateProjectSources(
  project: Project,
  reader: SourceFileReader,
): Promise<Project> {
  const sources = await Promise.all(
    project.sources.map(async (source) => {
      const exists = await reader.exists(source.filePath);

      if (!exists) {
        return revalidateSourceBytes(source, null);
      }

      return revalidateSourceBytes(source, await reader.read(source.filePath));
    }),
  );

  return Project.create({
    id: project.id,
    items: project.items,
    sheets: project.sheets,
    sources,
  });
}
