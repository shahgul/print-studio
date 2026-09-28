import { Length, Point2D, type Size2D } from '@print-studio/units-geometry';

export type ScreenPoint = Readonly<{ x: number; y: number }>;
export type ScreenSize = Readonly<{ width: number; height: number }>;
export type SheetViewport = Readonly<{
  pixelsPerMillimetre: number;
  offsetX: number;
  offsetY: number;
}>;

function requirePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be positive and finite`);
  }
}

export function fitSheet(sheet: Size2D, screen: ScreenSize, marginPixels = 32): SheetViewport {
  requirePositive(screen.width, 'screen width');
  requirePositive(screen.height, 'screen height');
  if (!Number.isFinite(marginPixels) || marginPixels < 0) {
    throw new RangeError('screen margin must be non-negative and finite');
  }
  const availableWidth = screen.width - marginPixels * 2;
  const availableHeight = screen.height - marginPixels * 2;
  requirePositive(availableWidth, 'available screen width');
  requirePositive(availableHeight, 'available screen height');

  const sheetWidth = sheet.width.toMillimetres();
  const sheetHeight = sheet.height.toMillimetres();
  requirePositive(sheetWidth, 'sheet width');
  requirePositive(sheetHeight, 'sheet height');
  const pixelsPerMillimetre = Math.min(availableWidth / sheetWidth, availableHeight / sheetHeight);

  return {
    pixelsPerMillimetre,
    offsetX: (screen.width - sheetWidth * pixelsPerMillimetre) / 2,
    offsetY: (screen.height - sheetHeight * pixelsPerMillimetre) / 2,
  };
}

export function physicalToScreen(point: Point2D, viewport: SheetViewport): ScreenPoint {
  return {
    x: viewport.offsetX + point.x.toMillimetres() * viewport.pixelsPerMillimetre,
    y: viewport.offsetY + point.y.toMillimetres() * viewport.pixelsPerMillimetre,
  };
}

export function screenToPhysical(point: ScreenPoint, viewport: SheetViewport): Point2D {
  requirePositive(viewport.pixelsPerMillimetre, 'viewport scale');
  return Point2D.of(
    Length.mm((point.x - viewport.offsetX) / viewport.pixelsPerMillimetre),
    Length.mm((point.y - viewport.offsetY) / viewport.pixelsPerMillimetre),
  );
}

export function panViewport(viewport: SheetViewport, dx: number, dy: number): SheetViewport {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw new RangeError('pan delta must be finite');
  }
  return { ...viewport, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy };
}

export function zoomViewportAt(
  viewport: SheetViewport,
  factor: number,
  anchor: ScreenPoint,
): SheetViewport {
  requirePositive(factor, 'zoom factor');
  requirePositive(viewport.pixelsPerMillimetre, 'viewport scale');
  const pixelsPerMillimetre = viewport.pixelsPerMillimetre * factor;
  requirePositive(pixelsPerMillimetre, 'new viewport scale');

  return {
    pixelsPerMillimetre,
    offsetX: anchor.x - (anchor.x - viewport.offsetX) * factor,
    offsetY: anchor.y - (anchor.y - viewport.offsetY) * factor,
  };
}
