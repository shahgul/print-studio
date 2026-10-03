import { describe, expect, it, vi } from 'vitest';
import { createTauriPdfWriter, ensurePdfExtension } from './pdf-export';

describe('native PDF output bridge', () => {
  it('sends binary output and an encoded Unicode path without JSON byte expansion', async () => {
    const invoke = vi.fn(async () => undefined);
    const bytes = new TextEncoder().encode('%PDF-1.7\n');
    const path = 'D:\\jobs\\測定 #1.pdf';
    await createTauriPdfWriter(invoke).writeAtomic(path, bytes);
    expect(invoke).toHaveBeenCalledWith('write_pdf_bytes_atomic', bytes, {
      headers: { 'x-print-studio-path': encodeURIComponent(path) },
    });
    expect(ensurePdfExtension('test.PDF')).toBe('test.PDF');
    expect(ensurePdfExtension('test')).toBe('test.pdf');
  });

  it('rejects wrong extension/signature/limit and propagates storage failures', async () => {
    const invoke = vi.fn(async () => {
      throw new Error('disk full');
    });
    const writer = createTauriPdfWriter(invoke);
    const bytes = new TextEncoder().encode('%PDF-1.7\n');
    await expect(writer.writeAtomic('test.txt', bytes)).rejects.toThrow(/\.pdf/);
    await expect(writer.writeAtomic('test.pdf', new Uint8Array([1]))).rejects.toThrow(/PDF/);
    expect(invoke).not.toHaveBeenCalled();
    await expect(writer.writeAtomic('test.pdf', bytes)).rejects.toThrow(/disk full/);
  });
});
