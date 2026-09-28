/* global browser, describe, it */

import assert from 'node:assert/strict';

async function field(name) {
  return browser.$(`//label[.//span[normalize-space()="${name}"]]/input`);
}

async function geometry() {
  return {
    x: await (await field('X (mm)')).getValue(),
    y: await (await field('Y (mm)')).getValue(),
    width: await (await field('WIDTH (mm)')).getValue(),
    height: await (await field('HEIGHT (mm)')).getValue(),
    rotation: await (await browser.$('select')).getValue(),
  };
}

async function replaceField(name, value) {
  await (await field(name)).click();
  await browser.keys(['Control', 'a']);
  await browser.keys(value);
  await browser.keys('Tab');
}

describe('physical sheet canvas', () => {
  it('launches with canonical A4 geometry and keeps edits independent of view changes', async () => {
    assert.equal(await (await browser.$('#canvas-title')).getText(), 'A4 · front');
    assert.equal(await (await browser.$('.sheet-canvas')).isExisting(), true);
    assert.deepEqual(await geometry(), {
      x: '20',
      y: '30',
      width: '50',
      height: '50',
      rotation: '0',
    });

    await replaceField('X (mm)', '25');
    assert.equal((await geometry()).x, '25');

    const beforeView = await geometry();
    await (await browser.$('button[aria-label="Zoom in"]')).click();
    await (await browser.$('button[aria-label="Zoom out"]')).click();
    await (await browser.$('button*=Fit sheet')).click();
    assert.deepEqual(await geometry(), beforeView);

    await replaceField('X (mm)', '500');
    assert.equal((await geometry()).x, '25');
    assert.match(await (await browser.$('[role="status"]')).getText(), /physical sheet/);
  });

  it('saves and reopens exact edited geometry through the Tauri project commands', async () => {
    await browser.refresh();
    const saveDialog = await browser.tauri.mock('plugin:dialog|save');
    const writeProject = await browser.tauri.mock('write_project_text_atomic');
    await saveDialog.mockResolvedValue('C:\\test\\canvas.printstudio');
    await writeProject.mockResolvedValue(null);

    await replaceField('X (mm)', '25');
    await replaceField('Y (mm)', '35');
    await replaceField('WIDTH (mm)', '60');
    await replaceField('HEIGHT (mm)', '40');
    await (await browser.$('select')).selectByAttribute('value', '90');
    const expected = { x: '25', y: '35', width: '60', height: '40', rotation: '90' };
    assert.deepEqual(await geometry(), expected);

    await (await browser.$('button*=Save As')).click();
    await writeProject.update();
    assert.equal(writeProject.mock.calls.length, 1);
    const saved = writeProject.mock.calls[0][0];
    assert.equal(saved.path, 'C:\\test\\canvas.printstudio');
    const payload = JSON.parse(saved.content);
    assert.equal(payload.project.sheets[0].front.placements[0].originUm.x, 25_000);
    assert.equal(payload.project.sheets[0].front.placements[0].originUm.y, 35_000);

    await replaceField('X (mm)', '50');
    const openDialog = await browser.tauri.mock('plugin:dialog|open');
    const readProject = await browser.tauri.mock('read_project_text');
    await openDialog.mockResolvedValue('C:\\test\\canvas.printstudio');
    await readProject.mockResolvedValue(saved.content);
    await (await browser.$('button*=Open Project')).click();
    assert.deepEqual(await geometry(), expected);
  });
});
