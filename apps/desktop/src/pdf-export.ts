import { invoke } from '@tauri-apps/api/core';

export const MAX_PDF_OUTPUT_BYTES = 64 * 1024 * 1024;
type PdfInvoke = (
  command: string,
  bytes: Uint8Array,
  options: { headers: Record<string, string> },
) => Promise<unknown>;

export function ensurePdfExtension(path: string): string {
  return path.toLowerCase().endsWith('.pdf') ? path : `${path}.pdf`;
}

export function createTauriPdfWriter(
  invokeCommand: PdfInvoke = (command, bytes, options) => invoke(command, bytes, options),
) {
  return {
    async writeAtomic(path: string, bytes: Uint8Array): Promise<void> {
      if (!path.toLowerCase().endsWith('.pdf'))
        throw new RangeError('output path must end in .pdf');
      if (bytes.byteLength > MAX_PDF_OUTPUT_BYTES)
        throw new RangeError('PDF output exceeds the 64 MiB safety limit');
      if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-')
        throw new RangeError('output must contain PDF bytes');
      await invokeCommand('write_pdf_bytes_atomic', bytes, {
        headers: { 'x-print-studio-path': encodeURIComponent(path) },
      });
    },
  };
}
