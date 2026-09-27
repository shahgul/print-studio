import { describe, expect, it } from 'vitest';

import { createTauriSourceBytesReader } from './source-io';

describe('createTauriSourceBytesReader', () => {
  it('probes source existence separately from binary reads', async () => {
    const calls: Array<{ command: string; args: unknown }> = [];
    const reader = createTauriSourceBytesReader(async (command, args) => {
      calls.push({ command, args });
      return command === 'source_file_exists';
    });

    await expect(reader.exists('D:\\input\\document.pdf')).resolves.toBe(true);
    expect(calls).toEqual([
      {
        command: 'source_file_exists',
        args: { path: 'D:\\input\\document.pdf' },
      },
    ]);
  });

  it('reads native binary IPC responses without JSON byte expansion', async () => {
    const calls: Array<{ command: string; args: unknown }> = [];
    const reader = createTauriSourceBytesReader(async (command, args) => {
      calls.push({ command, args });
      return new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
    });

    const bytes = await reader.read('D:\\input\\document.pdf');

    expect([...bytes]).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(calls).toEqual([
      {
        command: 'read_source_bytes',
        args: { path: 'D:\\input\\document.pdf' },
      },
    ]);
  });

  it('accepts a Uint8Array response for adapter compatibility', async () => {
    const reader = createTauriSourceBytesReader(async () => new Uint8Array([1, 2, 3]));

    await expect(reader.read('D:\\input\\image.png')).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects unexpected native response shapes', async () => {
    const reader = createTauriSourceBytesReader(async () => 'not binary');

    await expect(reader.read('D:\\input\\image.png')).rejects.toThrow(/binary/i);
  });
});
