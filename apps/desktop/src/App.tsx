import { importSourceBytes } from '@print-studio/document-import';
import { Project, SourceKind, type Source } from '@print-studio/domain';
import { Length, Size2D } from '@print-studio/units-geometry';
import { renderProjectToPdf } from '@print-studio/pdf-engine';
import { ProjectPersistence } from '@print-studio/project-file';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createTauriProjectTextStore, ensureProjectExtension } from './project-io';
import { createTauriSourceBytesReader } from './source-io';
import { revalidateProjectSources } from './source-revalidation';
import { createLiveSourceMonitor, createTauriSourceWatchService } from './source-watch';
import { createStarterProject } from './starter-project';
import { SheetCanvas } from './SheetCanvas';
import { ProjectHistory } from './project-history';
import { placeImageOnSheet } from './image-placement';
import { useImagePreviews } from './image-previews';
import { createTauriPdfWriter, ensurePdfExtension } from './pdf-export';

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
  const pdfWriter = useMemo(() => createTauriPdfWriter(), []);
  const [project, setProject] = useState(createStarterProject);
  const historyRef = useRef<ProjectHistory | null>(null);
  const history = (historyRef.current ??= new ProjectHistory(project));
  const projectRef = useRef(project);
  projectRef.current = project;
  const sourcePathsKey = JSON.stringify(project.sources.map((candidate) => candidate.filePath));
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState('The A4 sheet shows canonical physical geometry.');
  const [isBusy, setIsBusy] = useState(false);
  const [imageWidth, setImageWidth] = useState('100');
  const [imageHeight, setImageHeight] = useState('50');
  const resolveSourceBytes = useCallback(
    (source: Source) => sourceReader.read(source.filePath),
    [sourceReader],
  );
  const imagePreviews = useImagePreviews(project, resolveSourceBytes);

  const selectSource = (selected: Source | null) => {
    setSource(selected);
    const raster = selected?.pages[0]?.raster;
    if (raster)
      setImageHeight(
        String(Number(((Number(imageWidth) * raster.pixelHeight) / raster.pixelWidth).toFixed(3))),
      );
  };

  const sheet = project.sheets[0];
  const item = project.items[0];
  const placement = sheet?.front.placements[0];

  useEffect(() => {
    let disposed = false;
    let stopMonitor: (() => Promise<void>) | null = null;

    const updateFromLiveCheck = (checked: Project) => {
      if (disposed) {
        return;
      }

      const revalidated = history.updateSources(checked);
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
  }, [sourcePathsKey, sourceReader, sourceWatch, history]);

  const publishProject = useCallback((next: Project) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  const handleHistory = useCallback(
    (direction: 'undo' | 'redo') => {
      publishProject(direction === 'undo' ? history.undo() : history.redo());
      setStatus(
        direction === 'undo' ? 'Undid physical geometry edit.' : 'Redid physical geometry edit.',
      );
    },
    [history, publishProject],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        isBusy ||
        (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))
      )
        return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const direction =
        key === 'z' ? (event.shiftKey ? 'redo' : 'undo') : key === 'y' ? 'redo' : null;
      if (!direction) return;
      event.preventDefault();
      if (direction === 'undo' ? history.canUndo : history.canRedo) handleHistory(direction);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [history, isBusy, handleHistory]);

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
        publishProject(history.reset(revalidated));
        setProjectPath(selected);
        selectSource(revalidated.sources.at(-1) ?? null);

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

      selectSource(imported);
      const current = projectRef.current;
      publishProject(
        history.reset(
          Project.create({
            id: current.id,
            items: current.items,
            sheets: current.sheets,
            sources: [...current.sources, imported],
          }),
        ),
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

  function handlePlaceImage() {
    if (!source) return;
    try {
      if (!imageWidth.trim() || !imageHeight.trim())
        throw new RangeError('enter both physical dimensions');
      const next = placeImageOnSheet(projectRef.current, source.id, {
        itemId: crypto.randomUUID(),
        placementId: crypto.randomUUID(),
        size: Size2D.of(Length.mm(Number(imageWidth)), Length.mm(Number(imageHeight))),
      });
      publishProject(history.record(next));
      setStatus(
        `Placed ${source.displayName} at ${imageWidth} × ${imageHeight} mm, X=20, Y=30 mm.`,
      );
    } catch (error) {
      setStatus(`Image placement failed: ${String(error)}`);
    }
  }

  async function handleExportPdf() {
    setIsBusy(true);
    try {
      const snapshot = projectRef.current;
      const bytes = await renderProjectToPdf(snapshot, { resolveSourceBytes });
      const selected = await save({
        title: 'Export exact-size PDF',
        defaultPath: `${snapshot.id}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!selected) return;
      const path = ensurePdfExtension(selected);
      await pdfWriter.writeAtomic(path, bytes);
      setStatus(
        `Exported ${path}. Print at Actual Size / 100%; printer margins and scaling are not verified.`,
      );
    } catch (error) {
      setStatus(`PDF export failed: ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="project-panel" aria-labelledby="app-title">
        <div className="project-heading">
          <div>
            <p className="eyebrow">Print Studio · M1.8 exact-size image output</p>
            <h1 id="app-title">Work on the sheet.</h1>
            <p className="lede">
              Arrange objects on a real-size sheet. Screen zoom changes the view; the project keeps
              positions and dimensions in millimetres.
            </p>
          </div>

          <div className="actions" aria-label="Source and project actions">
            <button
              type="button"
              onClick={() => handleHistory('undo')}
              disabled={isBusy || !history.canUndo}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => handleHistory('redo')}
              disabled={isBusy || !history.canRedo}
            >
              Redo
            </button>
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
            <button type="button" onClick={handleExportPdf} disabled={isBusy}>
              Export PDF…
            </button>
          </div>
        </div>

        <SheetCanvas
          project={project}
          onProjectChange={(next, group) => publishProject(history.record(next, group))}
          onStatus={setStatus}
          imagePreviews={imagePreviews}
        />

        <section className="checkpoint" aria-labelledby="source-heading">
          {project.sources.length > 0 && (
            <label className="source-picker">
              Source
              <select
                aria-label="Current source"
                value={source?.id ?? ''}
                onChange={(event) =>
                  selectSource(
                    project.sources.find((candidate) => candidate.id === event.target.value) ??
                      null,
                  )
                }
              >
                {project.sources.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.displayName} · {candidate.availability}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current source</p>
              <h2 id="source-heading">{source?.displayName ?? 'Nothing imported yet'}</h2>
            </div>
            <span className="source-kind">
              {source ? `${source.kind} · ${source.availability}` : '—'}
            </span>
          </div>

          {source?.kind === SourceKind.Image && (
            <div className="image-placement-form">
              <label>
                Image width (mm)
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={imageWidth}
                  aria-label="Image width (mm)"
                  onChange={(event) => {
                    setImageWidth(event.target.value);
                    const raster = source.pages[0]?.raster;
                    if (raster && Number(event.target.value) > 0)
                      setImageHeight(
                        String(
                          Number(
                            (
                              (Number(event.target.value) * raster.pixelHeight) /
                              raster.pixelWidth
                            ).toFixed(3),
                          ),
                        ),
                      );
                  }}
                />
              </label>
              <label>
                Image height (mm)
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={imageHeight}
                  aria-label="Image height (mm)"
                  onChange={(event) => setImageHeight(event.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={handlePlaceImage}
                disabled={isBusy || source.availability !== 'AVAILABLE'}
              >
                Place image on sheet
              </button>
              <p>
                Preserve image aspect. Placement starts at X=20, Y=30 mm; existing objects remain.
                Export at 100%, then measure a real print.
              </p>
            </div>
          )}

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
