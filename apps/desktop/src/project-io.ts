import { invoke } from '@tauri-apps/api/core';
import type { ProjectTextStore } from '@print-studio/project-file';

export const PROJECT_FILE_EXTENSION = '.printstudio';

export type InvokeCommand = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export function ensureProjectExtension(path: string): string {
  return path.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
    ? path
    : `${path}${PROJECT_FILE_EXTENSION}`;
}

export function createTauriProjectTextStore(
  invokeCommand: InvokeCommand = (command, args) => invoke(command, args),
): ProjectTextStore {
  return {
    async read(path: string): Promise<string> {
      const result = await invokeCommand('read_project_text', { path });

      if (typeof result !== 'string') {
        throw new TypeError('read_project_text returned a non-string value');
      }

      return result;
    },

    async writeAtomic(path: string, projectContent: string): Promise<void> {
      await invokeCommand('write_project_text_atomic', {
        path,
        content: projectContent,
      });
    },
  };
}
