/* global browser, describe, document, it */

import assert from 'node:assert/strict';

describe('compiled Print Studio app', () => {
  it('launches the physical sheet in Windows WebView2', async () => {
    const state = await browser.execute(() => {
      const x = [...document.querySelectorAll('label')]
        .find((label) => label.querySelector('span')?.textContent === 'X (mm)')
        ?.querySelector('input')?.value;
      return {
        title: document.querySelector('#canvas-title')?.textContent,
        hasCanvas: Boolean(document.querySelector('.sheet-canvas')),
        x,
      };
    });
    assert.deepEqual(state, { title: 'A4 · front', hasCanvas: true, x: '20' });
  });
});
