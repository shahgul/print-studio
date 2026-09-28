import { importSourceBytes } from '@print-studio/document-import';
import { Project, type Source } from '@print-studio/domain';
import { ProjectPersistence } from '@print-studio/project-file';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';

import { createTauriProjectTextStore, ensureProjectExtension } from './project-io';
import { createTauriSourceBytesReader } from './source-io';
import { revalidateProjectSources } from './source-revalidation';
import { createLiveSourceMonitor, createTauriSourceWatchService } from './source-watch';
import { createStarterProject } from './starter-project';
import { SheetCanvas } from './SheetCanvas';

const PROJECT_FILTER = [
  {
    name: 'Print Studio Project',
    extensions: ['printstudio'],
  },
];

const SOURCE_FILTER = [
  {
    name: 'Supported documents',
    extensions: ['pdf', 'png', 'jpg', 'jpeg'],
  },
];

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function formatPhysicalSize(source: Source): string {
  const size = source.pages[0]?.physicalSize;
  if (!size) {
    return 'Unknown — no trusted DPI';
  }

  return `${size.width.toMillimetres().toFixed(2)} × ${size.height.toMillimetres().toFixed(2)} mm`;
}

function formatRaster(source: Source): string {
  const raster = source.pages[0]?.raster;
  if (!raster) {
    return 'Vector/PDF page';
  }

  return `${raster.pixelWidth} × ${raster.pixelHeight} px`;
}

function formatDensity(source: Source): string {
  const density = source.pages[0]?.raster?.densityDpi;
  if (!density) {
    return 'Not declared';
  }

  return `${density.x.toFixed(2)} × ${density.y.toFixed(2)} DPI`;
}

export function App() {
  const persistence = useMemo(() => new ProjectPersistence(createTauriProjectTextStore()), []);
  const sourceReader = useMemo(() => createTauriSourceBytesReader(), []);
  const sourceWatch = useMemo(() => createTauriSourceWatchService(), []);
  const [project, setProject] = useState(createStarterProject);
  const projectRef = useRef(project);
  projectRef.current = project;
  const sourcePathsKey = JSON.stringify(project.sources.map((candidate) => candidate.filePath));
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState('The A4 sheet shows canonical physical geometry.');
  const [isBusy, setIsBusy] = useState(false);

  const sheet = project.sheets[0];
  const item = project.items[0];
  const placement = sheet?.front.placements[0];

  useEffect(() => {
    let disposed = false;
    let stopMonitor: (() => Promise<void>) | null = null;

    const updateFromLiveCheck = (revalidated: Project) => {
      if (disposed) {
        return;
      }

      projectRef.current = revalidated;
      setProject(revalidated);
      setSource((current) => {
        if (current) {
          return (
            revalidated.sources.find((candidate) => candidate.id === current.id) ??
            revalidated.sources.at(-1) ??
            null
          );
        }

        return revalidated.sources.at(-1) ?? null;
      });

      const missing = revalidated.sources.filter(
        (candidate) => candidate.availability === 'MISSING',
      ).length;
      const changed = revalidated.sources.filter(
        (candidate) => candidate.availability === 'CHANGED',
      ).length;

      setStatus(
        `Live source check: ${revalidated.sources.length} source(s); ${missing} missing, ${changed} changed.`,
      );
    };

    void createLiveSourceMonitor({
      project: projectRef.current,
      service: sourceWatch,
      revalidate: () => revalidateProjectSources(projectRef.current, sourceReader),
      onProject: updateFromLiveCheck,
      onError: (error) => {
        if (!disposed) {
          setStatus(`Live source check failed: ${String(error)}`);
        }
      },
    }).then((stop) => {
      if (disposed) {
        void stop();
      } else {
        stopMonitor = stop;
      }
    });

    return () => {
      disposed = true;
      if (stopMonitor) {
        void stopMonitor();
      }
    };
  }, [sourcePathsKey, sourceReader, sourceWatch]);

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

  async function handleOpenProject() {
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
        const revalidated = await revalidateProjectSources(restored, sourceReader);
        setProject(revalidated);
        setProjectPath(selected);
        setSource(revalidated.sources.at(-1) ?? null);

        const missing = revalidated.sources.filter(
          (candidate) => candidate.availability === 'MISSING',
        ).length;
        const changed = revalidated.sources.filter(
          (candidate) => candidate.availability === 'CHANGED',
        ).length;

        setStatus(
          `Opened ${selected}. ${revalidated.sources.length} source(s) revalidated; ${missing} missing, ${changed} changed.`,
        );
      }
    } catch (error) {
      setStatus(`Open failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImportSource() {
    setIsBusy(true);
    try {
      const selected = await open({
        title: 'Import PDF or Image',
        multiple: false,
        directory: false,
        filters: SOURCE_FILTER,
      });

      if (typeof selected !== 'string') {
        return;
      }

      const bytes = await sourceReader.read(selected);
      const imported = await importSourceBytes({
        sourceId: crypto.randomUUID(),
        displayName: fileNameFromPath(selected),
        filePath: selected,
        bytes,
      });

      setSource(imported);
      setProject(
        Project.create({
          id: project.id,
          items: project.items,
          sheets: project.sheets,
          sources: [...project.sources, imported],
        }),
      );
      setStatus(
        `Imported and attached ${imported.displayName}: ${imported.pages.length} page(s), ${imported.byteLength.toLocaleString()} bytes.`,
      );
    } catch (error) {
      setStatus(`Import failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="project-panel" aria-labelledby="app-title">
        <div className="project-heading">
          <div>
            <p className="eyebrow">Print Studio · M1.6 physical sheet</p>
            <h1 id="app-title">Work on the sheet.</h1>
            <p className="lede">
              Arrange objects on a real-size sheet. Screen zoom changes the view; the project keeps
              positions and dimensions in millimetres.
            </p>
          </div>

          <div className="actions" aria-label="Source and project actions">
            <button type="button" onClick={handleImportSource} disabled={isBusy}>
              Import…
            </button>
            <button type="button" onClick={handleOpenProject} disabled={isBusy}>
              Open Project…
            </button>
            <button type="button" onClick={handleSave} disabled={isBusy}>
              Save
            </button>
            <button type="button" onClick={handleSaveAs} disabled={isBusy}>
              Save As…
            </button>
          </div>
        </div>

        <SheetCanvas project={project} onProjectChange={setProject} onStatus={setStatus} />

        <section className="checkpoint" aria-labelledby="source-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current source</p>
              <h2 id="source-heading">{source?.displayName ?? 'Nothing imported yet'}</h2>
            </div>
            <span className="source-kind">
              {source ? `${source.kind} · ${source.availability}` : '—'}
            </span>
          </div>

          <div className="truth-grid">
            <article>
              <span>Sources in project</span>
              <strong>{project.sources.length}</strong>
            </article>
            <article>
              <span>Intrinsic pixels</span>
              <strong>{source ? formatRaster(source) : '—'}</strong>
            </article>
            <article>
              <span>Declared density</span>
              <strong>{source ? formatDensity(source) : '—'}</strong>
            </article>
            <article>
              <span>Physical size · page 1</span>
              <strong>{source ? formatPhysicalSize(source) : '—'}</strong>
            </article>
          </div>

          <div className="file-path">
            <span>Fingerprint</span>
            <code>{source ? `SHA-256 · ${source.fingerprint.value}` : '—'}</code>
          </div>
          <div className="file-path">
            <span>Source file</span>
            <code>{source?.filePath ?? 'Choose Import… to inspect a real file'}</code>
          </div>
        </section>

        <section className="checkpoint muted-checkpoint" aria-labelledby="project-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">M1.4 regression</p>
              <h2 id="project-heading">Physical project remains intact.</h2>
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
        </section>

        <div className="status" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {isBusy ? 'Working…' : status}
        </div>

        <p className="test-note">Source availability remains live while you work on the sheet.</p>
      </section>
    </main>
  );
}
