import { invoke } from '@tauri-apps/api/core';

export interface SourceBytesReader {
  read(path: string): Promise<Uint8Array>;
}

export type BinaryInvokeCommand = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  }

  throw new TypeError('read_source_bytes returned a non-binary value');
}

export function createTauriSourceBytesReader(
  invokeCommand: BinaryInvokeCommand = (command, args) => invoke<ArrayBuffer>(command, args),
): SourceBytesReader {
  return {
    async read(path: string): Promise<Uint8Array> {
      return toUint8Array(await invokeCommand('read_source_bytes', { path }));
    },
  };
}
