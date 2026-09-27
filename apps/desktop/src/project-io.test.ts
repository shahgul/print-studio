import { describe, expect, it } from 'vitest';

import { createTauriProjectTextStore, ensureProjectExtension } from './project-io';

describe('ensureProjectExtension', () => {
  it('adds the .printstudio extension when missing', () => {
    expect(ensureProjectExtension('D:\\jobs\\worksheet')).toBe('D:\\jobs\\worksheet.printstudio');
  });

  it('preserves an existing extension case-insensitively', () => {
    expect(ensureProjectExtension('D:\\jobs\\worksheet.PRINTSTUDIO')).toBe(
      'D:\\jobs\\worksheet.PRINTSTUDIO',
    );
  });
});

describe('createTauriProjectTextStore', () => {
  it('reads project text through the narrow native command', async () => {
    const calls: Array<{ command: string; args: unknown }> = [];
    const store = createTauriProjectTextStore(async (command, args) => {
      calls.push({ command, args });
      return '{"format":"print-studio-project"}';
    });

    await expect(store.read('D:\\jobs\\a.printstudio')).resolves.toBe(
      '{"format":"print-studio-project"}',
    );
    expect(calls).toEqual([
      {
        command: 'read_project_text',
        args: { path: 'D:\\jobs\\a.printstudio' },
      },
    ]);
  });

  it('writes only through the atomic native command', async () => {
    const calls: Array<{ command: string; args: unknown }> = [];
    const store = createTauriProjectTextStore(async (command, args) => {
      calls.push({ command, args });
      return undefined;
    });

    await store.writeAtomic('D:\\jobs\\a.printstudio', 'project-content');

    expect(calls).toEqual([
      {
        command: 'write_project_text_atomic',
        args: {
          path: 'D:\\jobs\\a.printstudio',
          content: 'project-content',
        },
      },
    ]);
  });
});
