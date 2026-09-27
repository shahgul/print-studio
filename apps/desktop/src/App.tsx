import { open, save } from '@tauri-apps/plugin-dialog';
import { ProjectPersistence } from '@print-studio/project-file';
import { useMemo, useState } from 'react';

import { createTauriProjectTextStore, ensureProjectExtension } from './project-io';
import { createStarterProject } from './starter-project';

const PROJECT_FILTER = [
  {
    name: 'Print Studio Project',
    extensions: ['printstudio'],
  },
];

export function App() {
  const persistence = useMemo(
    () => new ProjectPersistence(createTauriProjectTextStore()),
    [],
  );
  const [project, setProject] = useState(createStarterProject);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [status, setStatus] = useState('Starter project is in memory and has not been saved yet.');
  const [isBusy, setIsBusy] = useState(false);

  const sheet = project.sheets[0];
  const item = project.items[0];
  const placement = sheet?.front.placements[0];

  async function saveTo(path: string) {
    const normalizedPath = ensureProjectExtension(path);
    await persistence.save(normalizedPath, project);
    setProjectPath(normalizedPath);
    setStatus(`Saved exact project geometry to ${normalizedPath}`);
  }

  async function handleSaveAs() {
    setIsBusy(true);
    try {
      const selected = await save({
        title: 'Save Print Studio Project',
        defaultPath: projectPath ?? `${project.id}.printstudio`,
        filters: PROJECT_FILTER,
      });

      if (selected) {
        await saveTo(selected);
      }
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    if (!projectPath) {
      await handleSaveAs();
      return;
    }

    setIsBusy(true);
    try {
      await saveTo(projectPath);
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpen() {
    setIsBusy(true);
    try {
      const selected = await open({
        title: 'Open Print Studio Project',
        multiple: false,
        directory: false,
        filters: PROJECT_FILTER,
      });

      if (typeof selected === 'string') {
        const restored = await persistence.load(selected);
        setProject(restored);
        setProjectPath(selected);
        setStatus(`Opened ${selected}. Geometry reconstructed from integer micrometres.`);
      }
    } catch (error) {
      setStatus(`Open failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="project-panel" aria-labelledby="app-title">
        <div className="project-heading">
          <div>
            <p className="eyebrow">Print Studio · M1.4 test surface</p>
            <h1 id="app-title">Save physical truth.</h1>
            <p className="lede">
              This temporary screen verifies that exact physical geometry survives a real Windows
              save, application restart, and reopen before we build source import and the full
              sheet canvas.
            </p>
          </div>

          <div className="actions" aria-label="Project file actions">
            <button type="button" onClick={handleOpen} disabled={isBusy}>
              Open…
            </button>
            <button type="button" onClick={handleSave} disabled={isBusy}>
              Save
            </button>
            <button type="button" onClick={handleSaveAs} disabled={isBusy}>
              Save As…
            </button>
          </div>
        </div>

        <div className="truth-grid">
          <article>
            <span>Project</span>
            <strong>{project.id}</strong>
          </article>
          <article>
            <span>Sheet</span>
            <strong>
              {sheet
                ? `${sheet.definition.size.width.toMillimetres()} × ${sheet.definition.size.height.toMillimetres()} mm`
                : '—'}
            </strong>
          </article>
          <article>
            <span>Item</span>
            <strong>
              {item
                ? `${item.size.width.toMillimetres()} × ${item.size.height.toMillimetres()} mm`
                : '—'}
            </strong>
          </article>
          <article>
            <span>Position</span>
            <strong>
              {placement
                ? `${placement.origin.x.toMillimetres()}, ${placement.origin.y.toMillimetres()} mm`
                : '—'}
            </strong>
          </article>
        </div>

        <div className="file-path">
          <span>Current file</span>
          <code>{projectPath ?? 'Not saved yet'}</code>
        </div>

        <div className="status" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {isBusy ? 'Working…' : status}
        </div>

        <p className="test-note">
          Windows test: save this starter project, close Print Studio, run it again, choose Open,
          and confirm the values above remain A4 210 × 297 mm, item 50 × 50 mm, position 20, 30 mm.
        </p>
      </section>
    </main>
  );
}
