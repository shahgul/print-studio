import { getPlacementBounds, type Project } from '@print-studio/domain';
import { Length, QuarterTurn } from '@print-studio/units-geometry';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

import {
  fitSheet,
  panViewport,
  zoomViewportAt,
  type ScreenPoint,
  type SheetViewport,
} from './canvas-model';
import { editCanvasItem, type CanvasItemEdit } from './canvas-project';

type Props = Readonly<{
  project: Project;
  onProjectChange: (project: Project) => void;
  onStatus: (message: string) => void;
}>;

type Interaction =
  | Readonly<{ kind: 'pan'; start: ScreenPoint; viewport: SheetViewport }>
  | Readonly<{
      kind: 'move' | 'resize';
      start: ScreenPoint;
      viewport: SheetViewport;
      project: Project;
      placementId: string;
    }>;

type NumericField = 'x' | 'y' | 'width' | 'height';
type NumericDraft = Readonly<{ placementId: string; field: NumericField; value: string }>;

const FIT_MARGIN_PX = 42;
const MIN_SCALE = 0.2;
const MAX_SCALE = 20;

function formatMillimetres(value: Length): string {
  return Number(value.toMillimetres().toFixed(3)).toString();
}

export function SheetCanvas({ project, onProjectChange, onStatus }: Props) {
  const sheet = project.sheets[0];
  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 900, height: 620 });
  const [manualViewport, setManualViewport] = useState<SheetViewport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    sheet?.front.placements[0]?.id ?? null,
  );
  const [numericDraft, setNumericDraft] = useState<NumericDraft | null>(null);

  const sheetWidthUm = sheet?.definition.size.width.micrometres;
  const sheetHeightUm = sheet?.definition.size.height.micrometres;
  const fittedViewport = useMemo(
    () => (sheet ? fitSheet(sheet.definition.size, screenSize, FIT_MARGIN_PX) : null),
    [sheetWidthUm, sheetHeightUm, screenSize],
  );
  const viewport = manualViewport ?? fittedViewport;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      const bounds = svg.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        setScreenSize({ width: bounds.width, height: bounds.height });
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [sheetWidthUm, sheetHeightUm]);

  useEffect(() => {
    if (!sheet?.front.placements.some((placement) => placement.id === selectedId)) {
      setSelectedId(sheet?.front.placements[0]?.id ?? null);
    }
  }, [sheet, selectedId]);

  if (!sheet || !viewport) {
    return <section className="canvas-empty">Add a sheet to see the physical canvas.</section>;
  }

  const selectedPlacement = sheet.front.placements.find((placement) => placement.id === selectedId);
  const selectedItem = project.items.find((item) => item.id === selectedPlacement?.itemId);
  const sheetWidth = sheet.definition.size.width.toMillimetres();
  const sheetHeight = sheet.definition.size.height.toMillimetres();
  const xTicks = Array.from({ length: Math.floor(sheetWidth / 10) + 1 }, (_, index) => index * 10);
  const yTicks = Array.from({ length: Math.floor(sheetHeight / 10) + 1 }, (_, index) => index * 10);

  const commitEdit = (placementId: string, edit: CanvasItemEdit, base = project) => {
    try {
      onProjectChange(editCanvasItem(base, placementId, edit));
      onStatus('Physical geometry updated. Save to persist the project.');
    } catch (error) {
      onStatus(`Placement unchanged: ${String(error)}`);
    }
  };

  const localPoint = (event: PointerEvent<SVGSVGElement>): ScreenPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.target as Element;
    const placementId = target.getAttribute('data-placement-id');
    const start = localPoint(event);
    if (placementId) {
      setSelectedId(placementId);
      interaction.current = {
        kind: target.getAttribute('data-action') === 'resize' ? 'resize' : 'move',
        start,
        viewport,
        project,
        placementId,
      };
    } else {
      interaction.current = { kind: 'pan', start, viewport };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = interaction.current;
    if (!active) return;
    const point = localPoint(event);
    const dx = point.x - active.start.x;
    const dy = point.y - active.start.y;
    if (active.kind === 'pan') {
      setManualViewport(panViewport(active.viewport, dx, dy));
      return;
    }

    const placement = active.project.sheets
      .flatMap((candidate) => candidate.front.placements)
      .find((candidate) => candidate.id === active.placementId);
    const item = active.project.items.find((candidate) => candidate.id === placement?.itemId);
    if (!placement || !item) return;
    const deltaX = Length.mm(dx / active.viewport.pixelsPerMillimetre);
    const deltaY = Length.mm(dy / active.viewport.pixelsPerMillimetre);
    if (active.kind === 'move') {
      commitEdit(
        active.placementId,
        {
          x: placement.origin.x.add(deltaX),
          y: placement.origin.y.add(deltaY),
        },
        active.project,
      );
    } else {
      const turned =
        placement.rotation === QuarterTurn.Deg90 || placement.rotation === QuarterTurn.Deg270;
      commitEdit(
        active.placementId,
        {
          width: turned ? item.size.width.add(deltaY) : item.size.width.add(deltaX),
          height: turned ? item.size.height.add(deltaX) : item.size.height.add(deltaY),
        },
        active.project,
      );
    }
  };

  const handleZoom = (factor: number) => {
    const nextScale = viewport.pixelsPerMillimetre * factor;
    if (nextScale < MIN_SCALE || nextScale > MAX_SCALE) return;
    setManualViewport(
      zoomViewportAt(viewport, factor, {
        x: screenSize.width / 2,
        y: screenSize.height / 2,
      }),
    );
  };

  const commitNumericDraft = () => {
    if (!numericDraft || numericDraft.value.trim() === '') {
      setNumericDraft(null);
      return;
    }
    const numeric = Number(numericDraft.value);
    if (Number.isFinite(numeric)) {
      commitEdit(numericDraft.placementId, { [numericDraft.field]: Length.mm(numeric) });
    }
    setNumericDraft(null);
  };

  return (
    <section className="canvas-section" aria-labelledby="canvas-title">
      <div className="canvas-header">
        <div>
          <p className="eyebrow">M1.6 · Physical sheet</p>
          <h2 id="canvas-title">{sheet.definition.name} · front</h2>
          <p>
            {formatMillimetres(sheet.definition.size.width)} ×{' '}
            {formatMillimetres(sheet.definition.size.height)} mm · screen scale{' '}
            {viewport.pixelsPerMillimetre.toFixed(2)} px/mm
          </p>
        </div>
        <div className="canvas-tools" aria-label="Canvas view controls">
          <button type="button" onClick={() => handleZoom(0.8)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setManualViewport(null)}>
            Fit sheet
          </button>
          <button type="button" onClick={() => handleZoom(1.25)} aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
      <div className="canvas-layout">
        <svg
          ref={svgRef}
          className="sheet-canvas"
          width="100%"
          height="620"
          role="img"
          aria-label={`${sheet.definition.name} sheet, ${sheet.front.placements.length} placements. Select an item to edit its physical geometry.`}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            interaction.current = null;
          }}
          onPointerCancel={() => {
            interaction.current = null;
          }}
          onKeyDown={(event) => {
            if (
              !selectedPlacement ||
              !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
            )
              return;
            event.preventDefault();
            const step = Length.mm(event.shiftKey ? 10 : event.altKey ? 0.1 : 1);
            const x = selectedPlacement.origin.x;
            const y = selectedPlacement.origin.y;
            const edit =
              event.key === 'ArrowLeft'
                ? { x: x.subtract(step) }
                : event.key === 'ArrowRight'
                  ? { x: x.add(step) }
                  : event.key === 'ArrowUp'
                    ? { y: y.subtract(step) }
                    : { y: y.add(step) };
            commitEdit(selectedPlacement.id, edit);
          }}
        >
          <rect width="100%" height="100%" fill="transparent" />
          <g
            transform={`translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.pixelsPerMillimetre})`}
          >
            <rect className="sheet-paper" x="0" y="0" width={sheetWidth} height={sheetHeight} />
            {xTicks.map((x) => (
              <g key={`x-${x}`}>
                <line className="ruler-tick" x1={x} x2={x} y1={0} y2={x % 50 === 0 ? 4 : 2} />
                {x % 50 === 0 && (
                  <text
                    className="ruler-label"
                    x={x + 1}
                    y={8}
                    fontSize={9 / viewport.pixelsPerMillimetre}
                  >
                    {x}
                  </text>
                )}
              </g>
            ))}
            {yTicks.map((y) => (
              <g key={`y-${y}`}>
                <line className="ruler-tick" x1={0} x2={y % 50 === 0 ? 4 : 2} y1={y} y2={y} />
                {y % 50 === 0 && (
                  <text
                    className="ruler-label"
                    x={6}
                    y={y + 2}
                    fontSize={9 / viewport.pixelsPerMillimetre}
                  >
                    {y}
                  </text>
                )}
              </g>
            ))}
            <rect
              className="sheet-guide"
              x={sheet.definition.usableBounds.left.toMillimetres()}
              y={sheet.definition.usableBounds.top.toMillimetres()}
              width={sheet.definition.usableBounds.size.width.toMillimetres()}
              height={sheet.definition.usableBounds.size.height.toMillimetres()}
            />
            {sheet.front.placements.map((placement) => {
              const item = project.items.find((candidate) => candidate.id === placement.itemId);
              if (!item) return null;
              const bounds = getPlacementBounds(item, placement);
              const x = bounds.left.toMillimetres();
              const y = bounds.top.toMillimetres();
              const width = bounds.size.width.toMillimetres();
              const height = bounds.size.height.toMillimetres();
              const selected = placement.id === selectedId;
              const handleSize = 12 / viewport.pixelsPerMillimetre;
              return (
                <g key={placement.id}>
                  <rect
                    data-placement-id={placement.id}
                    className={selected ? 'canvas-item selected' : 'canvas-item'}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                  />
                  <text
                    className="item-label"
                    x={x + 4}
                    y={y + 8}
                    fontSize={11 / viewport.pixelsPerMillimetre}
                    pointerEvents="none"
                  >
                    {item.id}
                  </text>
                  {selected && (
                    <rect
                      data-placement-id={placement.id}
                      data-action="resize"
                      className="resize-handle"
                      x={x + width - handleSize / 2}
                      y={y + height - handleSize / 2}
                      width={handleSize}
                      height={handleSize}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <aside className="geometry-inspector" aria-label="Selected item geometry">
          <p className="eyebrow">Geometry · millimetres</p>
          {selectedPlacement && selectedItem ? (
            <>
              <strong>{selectedItem.id}</strong>
              <div className="geometry-fields">
                {(
                  [
                    ['x', selectedPlacement.origin.x],
                    ['y', selectedPlacement.origin.y],
                    ['width', selectedItem.size.width],
                    ['height', selectedItem.size.height],
                  ] as const
                ).map(([field, value]) => (
                  <label key={field}>
                    <span>{field.toUpperCase()} (mm)</span>
                    <input
                      type="number"
                      step="0.001"
                      value={
                        numericDraft?.placementId === selectedPlacement.id &&
                        numericDraft.field === field
                          ? numericDraft.value
                          : formatMillimetres(value)
                      }
                      onFocus={() =>
                        setNumericDraft({
                          placementId: selectedPlacement.id,
                          field,
                          value: formatMillimetres(value),
                        })
                      }
                      onChange={(event) =>
                        setNumericDraft({
                          placementId: selectedPlacement.id,
                          field,
                          value: event.target.value,
                        })
                      }
                      onBlur={commitNumericDraft}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') setNumericDraft(null);
                      }}
                    />
                  </label>
                ))}
                <label>
                  <span>Rotation</span>
                  <select
                    value={selectedPlacement.rotation}
                    onChange={(event) =>
                      commitEdit(selectedPlacement.id, {
                        rotation: Number(event.target.value) as QuarterTurn,
                      })
                    }
                  >
                    {[0, 90, 180, 270].map((rotation) => (
                      <option key={rotation} value={rotation}>
                        {rotation}°
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="canvas-help">
                Drag to move; drag the corner to resize. Arrow keys nudge 1 mm, Shift + arrows 10
                mm, Alt + arrows 0.1 mm.
              </p>
            </>
          ) : (
            <p>Select a placement on the sheet.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
