import {
  Project,
  Source,
  SourceAvailability,
  SourceFingerprint,
  SourceKind,
  SourcePage,
} from '@print-studio/domain';
import { Length, QuarterTurn } from '@print-studio/units-geometry';
import { deserializeProject, serializeProject } from '@print-studio/project-file';
import { describe, expect, it } from 'vitest';

import { editCanvasItem } from './canvas-project';
import { ProjectHistory } from './project-history';
import { createStarterProject } from './starter-project';

const x = (project: Project) => project.sheets[0]!.front.placements[0]!.origin.x.micrometres;

describe('project editing history', () => {
  it('undoes and redoes multiple exact physical edits and roundtrips the current project', () => {
    const history = new ProjectHistory(createStarterProject());
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(25.125) }));
    history.record(
      editCanvasItem(history.project, 'starter-placement', {
        width: Length.mm(60),
        rotation: QuarterTurn.Deg90,
      }),
    );
    history.undo();
    expect(x(history.project)).toBe(25_125);
    expect(history.project.items[0]!.size.width.micrometres).toBe(50_000);
    history.undo();
    expect(x(history.project)).toBe(20_000);
    history.redo();
    history.redo();
    expect(serializeProject(deserializeProject(serializeProject(history.project)))).toBe(
      serializeProject(history.project),
    );
    expect(history.project.items[0]!.size.width.micrometres).toBe(60_000);
    expect(history.project.sheets[0]!.front.placements[0]!.rotation).toBe(90);
  });

  it('groups pointer moves into one action and keeps separate gestures distinct', () => {
    const history = new ProjectHistory(createStarterProject());
    const gesture = {};
    for (const value of [21, 22, 23]) {
      history.record(
        editCanvasItem(history.project, 'starter-placement', { x: Length.mm(value) }),
        gesture,
      );
    }
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(24) }), {});
    history.undo();
    expect(x(history.project)).toBe(23_000);
    history.undo();
    expect(x(history.project)).toBe(20_000);
    expect(history.canUndo).toBe(false);
    history.redo();
    expect(x(history.project)).toBe(23_000);
  });

  it('preserves redo after no-op or rejected edits, but drops it for a new edit', () => {
    const history = new ProjectHistory(createStarterProject());
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(25) }));
    history.undo();
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(20) }));
    expect(() =>
      history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(500) })),
    ).toThrow();
    expect(history.canRedo).toBe(true);
    history.record(editCanvasItem(history.project, 'starter-placement', { y: Length.mm(35) }));
    expect(history.canRedo).toBe(false);
  });

  it('retains external source collections when undoing geometry', () => {
    const source = Source.create({
      id: 'image',
      kind: SourceKind.Image,
      displayName: 'test.png',
      filePath: 'C:\\test.png',
      fingerprint: SourceFingerprint.sha256('a'.repeat(64)),
      byteLength: 3,
      pages: [SourcePage.image({ id: 'page', index: 0, pixelWidth: 100, pixelHeight: 50 })],
    });
    const starter = createStarterProject();
    const history = new ProjectHistory(Project.create({ ...starter, sources: [source] }));
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(25) }));
    const refreshed = Project.create({
      ...history.project,
      sources: [source.withAvailability(SourceAvailability.Missing)],
    });
    history.updateSources(refreshed);
    history.undo();
    expect(history.project.sources).toEqual(refreshed.sources);
    expect(history.project.sources[0]!.availability).toBe(SourceAvailability.Missing);
    expect(x(history.project)).toBe(20_000);
    history.redo();
    expect(history.project.sources).toEqual(refreshed.sources);
  });

  it('bounds history and clears both branches on opening a project', () => {
    const history = new ProjectHistory(createStarterProject());
    for (let value = 21; value <= 125; value++) {
      history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(value) }));
    }
    for (let count = 0; count < 100; count++) history.undo();
    expect(x(history.project)).toBe(25_000);
    expect(history.canUndo).toBe(false);
    history.undo();
    expect(x(history.project)).toBe(25_000);
    history.reset(createStarterProject());
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    history.redo();
    expect(x(history.project)).toBe(20_000);
  });

  it('does not overwrite newer geometry when a live source check finishes', () => {
    const checked = createStarterProject();
    const history = new ProjectHistory(checked);
    history.record(editCanvasItem(history.project, 'starter-placement', { x: Length.mm(25) }));
    history.updateSources(checked);
    expect(x(history.project)).toBe(25_000);
    history.undo();
    expect(x(history.project)).toBe(20_000);
  });

  it('drops a gesture that returns to its starting geometry', () => {
    const starter = createStarterProject();
    const history = new ProjectHistory(starter);
    const group = {};
    history.record(editCanvasItem(starter, 'starter-placement', { x: Length.mm(25) }), group);
    history.record(starter, group);
    expect(history.canUndo).toBe(false);
    expect(x(history.project)).toBe(20_000);
  });
});
