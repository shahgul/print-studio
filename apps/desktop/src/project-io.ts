import { invoke } from '@tauri-apps/api/core';
import type { ProjectTextStore } from '@print-studio/project-file';

export const PROJECT_FILE_EXTENSION = '.printstudio';

export type InvokeCommand = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export function ensureProjectExtension(path: string): string {
  return path.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
    ? path
    : `${path}${PROJECT_FILE_EXTENSION}`;
}

export function createTauriProjectTextStore(
  invokeCommand: InvokeCommand = invoke,
): ProjectTextStore {
  return {
    read(path: string): Promise<string> {
      return invokeCommand<string>('read_project_text', { path });
    },

    async writeAtomic(path: string, projectContent: string): Promise<void> {
      await invokeCommand<void>('write_project_text_atomic', {
        path,
        content: projectContent,
      });
    },
  };
}
