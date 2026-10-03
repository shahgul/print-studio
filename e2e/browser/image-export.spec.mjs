/* global browser, describe, it, window, URL, TextDecoder */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } = createRequire(
  new URL('../../packages/pdf-engine/package.json', import.meta.url),
)('@cantoo/pdf-lib');

function pageContent(document) {
  const streams = document.getPages()[0].node.lookup(PDFName.of('Contents'), PDFArray);
  return streams
    .asArray()
    .map((ref) =>
      new TextDecoder().decode(decodePDFRawStream(document.context.lookup(ref)).decode()),
    )
    .join('\n')
    .replace(/\/Image-[^\s]+/g, '/Image');
}

describe('M1.8 exact-size image workflow', () => {
  it('imports, places, previews, persists, and exports image geometry independently of zoom', async () => {
    await browser.refresh();
    await browser.setWindowSize(1440, 1100);
    const bytes = Array.from(
      readFileSync(new URL('../../tests/fixtures/physical-truth.png', import.meta.url)),
    );
    // Keep the raw binary IPC shape. Standard WebDriver argument serialization cannot preserve ArrayBuffer mocks.
    await browser.execute((imageBytes) => {
      const original = window.__TAURI_INTERNALS__.invoke;
      window.exportedPdfs = [];
      window.__TAURI_INTERNALS__.invoke = async (command, args, options) => {
        if (command === 'read_source_bytes') return Uint8Array.from(imageBytes).buffer;
        if (command === 'source_file_exists') return true;
        if (command === 'set_source_watch_paths') return null;
        if (command === 'write_pdf_bytes_atomic') {
          window.exportedPdfs.push({
            bytes: Array.from(args),
            path: decodeURIComponent(options.headers['x-print-studio-path']),
          });
          return null;
        }
        return original(command, args, options);
      };
    }, bytes);
    const openDialog = await browser.tauri.mock('plugin:dialog|open');
    const saveDialog = await browser.tauri.mock('plugin:dialog|save');
    await openDialog.mockResolvedValue('C:\\test\\physical-truth.png');
    await saveDialog.mockResolvedValue('C:\\test\\physical-truth.pdf');
    await (await browser.$('button*=Import')).click();
    await (await browser.$('button=Place image on sheet')).waitForExist();
    assert.equal(await (await browser.$('input[aria-label="Image width (mm)"]')).getValue(), '100');
    assert.equal(await (await browser.$('input[aria-label="Image height (mm)"]')).getValue(), '50');
    await (await browser.$('button=Place image on sheet')).click();
    await (await browser.$('.source-image')).waitForExist();
    assert.equal(
      await (await browser.$('//label[.//span[normalize-space()="WIDTH (mm)"]]/input')).getValue(),
      '100',
    );
    await (await browser.$('button=Undo')).click();
    assert.equal(await (await browser.$('.source-image')).isExisting(), false);
    await (await browser.$('button=Redo')).click();
    await (await browser.$('.source-image')).waitForExist();

    await (await browser.$('button*=Export PDF')).click();
    await browser.waitUntil(
      async () => (await browser.execute(() => window.exportedPdfs.length)) === 1,
    );
    await (await browser.$('button[aria-label="Zoom in"]')).click();
    await (await browser.$('button*=Export PDF')).click();
    await browser.waitUntil(
      async () => (await browser.execute(() => window.exportedPdfs.length)) === 2,
    );
    const exported = await browser.execute(() => window.exportedPdfs);
    const pdfs = await Promise.all(
      exported.map((output) => PDFDocument.load(Uint8Array.from(output.bytes))),
    );
    assert.equal(exported[0].path, 'C:\\test\\physical-truth.pdf');
    assert.ok(Math.abs(pdfs[0].getPages()[0].getWidth() - (210 * 72) / 25.4) < 1e-8);
    assert.ok(Math.abs(pdfs[0].getPages()[0].getHeight() - (297 * 72) / 25.4) < 1e-8);
    const images = pdfs[0].getPages()[0].node.Resources().lookup(PDFName.of('XObject'), PDFDict);
    assert.equal(images.keys().length, 1);
    const image = pdfs[0].context.lookup(images.values()[0]);
    assert.ok(image instanceof PDFRawStream);
    assert.equal(image.dict.get(PDFName.of('Width')).toString(), '600');
    assert.equal(pageContent(pdfs[0]), pageContent(pdfs[1]));

    const writeProject = await browser.tauri.mock('write_project_text_atomic');
    await writeProject.mockResolvedValue(null);
    await saveDialog.mockResolvedValue('C:\\test\\image.printstudio');
    await (await browser.$('button*=Save As')).click();
    await writeProject.update();
    const saved = writeProject.mock.calls[0][0].content;
    assert.equal(JSON.parse(saved).project.items.at(-1).sizeUm.width, 100_000);
    const readProject = await browser.tauri.mock('read_project_text');
    await readProject.mockResolvedValue(saved);
    await openDialog.mockResolvedValue('C:\\test\\image.printstudio');
    await (await browser.$('button*=Open Project')).click();
    await (await browser.$('.source-image')).waitForExist();
    assert.equal(
      await (await browser.$('//label[.//span[normalize-space()="WIDTH (mm)"]]/input')).getValue(),
      '100',
    );
  });
});
