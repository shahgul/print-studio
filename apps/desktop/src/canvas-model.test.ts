import { Length, Point2D, Size2D } from '@print-studio/units-geometry';
import { describe, expect, it } from 'vitest';

import {
  fitSheet,
  panViewport,
  physicalToScreen,
  screenToPhysical,
  zoomViewportAt,
} from './canvas-model';

const a4 = Size2D.of(Length.mm(210), Length.mm(297));

describe('physical sheet viewport', () => {
  it('fits A4 inside a viewport with an explicit screen margin', () => {
    const viewport = fitSheet(a4, { width: 900, height: 700 }, 40);
    const topLeft = physicalToScreen(Point2D.of(Length.zero(), Length.zero()), viewport);
    const bottomRight = physicalToScreen(Point2D.of(a4.width, a4.height), viewport);

    expect(viewport.pixelsPerMillimetre).toBeCloseTo(620 / 297);
    expect(topLeft.x).toBeGreaterThanOrEqual(40);
    expect(topLeft.y).toBe(40);
    expect(bottomRight.x).toBeLessThanOrEqual(860);
    expect(bottomRight.y).toBe(660);
  });

  it('round-trips screen points to canonical micrometres', () => {
    const viewport = fitSheet(a4, { width: 900, height: 700 }, 40);
    const point = Point2D.of(Length.mm(20.123), Length.mm(30.456));
    const screen = physicalToScreen(point, viewport);

    expect(screenToPhysical(screen, viewport).equals(point)).toBe(true);
  });

  it('keeps an anchored physical point fixed through zoom and supports pan', () => {
    const initial = fitSheet(a4, { width: 900, height: 700 }, 40);
    const anchor = { x: 250, y: 300 };
    const physicalBefore = screenToPhysical(anchor, initial);
    const zoomed = zoomViewportAt(initial, 1.5, anchor);
    const panned = panViewport(zoomed, 12, -7);

    expect(screenToPhysical(anchor, zoomed).equals(physicalBefore)).toBe(true);
    expect(panned.offsetX).toBe(zoomed.offsetX + 12);
    expect(panned.offsetY).toBe(zoomed.offsetY - 7);
    expect(initial.pixelsPerMillimetre).toBeLessThan(zoomed.pixelsPerMillimetre);
  });

  it('rejects unusable viewport dimensions and zoom', () => {
    expect(() => fitSheet(a4, { width: 0, height: 700 }, 40)).toThrow(RangeError);
    const viewport = fitSheet(a4, { width: 900, height: 700 }, 40);
    expect(() => zoomViewportAt(viewport, 0, { x: 0, y: 0 })).toThrow(RangeError);
  });
});
