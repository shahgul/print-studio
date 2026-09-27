import { describe, expect, it } from 'vitest';

import { Insets, Length, Point2D, QuarterTurn, Rect, Size2D, rotateSize } from './index';

describe('Length', () => {
  it('uses exact integer micrometres for metric input', () => {
    expect(Length.mm(1).micrometres).toBe(1_000);
    expect(Length.cm(1).micrometres).toBe(10_000);
    expect(Length.mm(210).micrometres).toBe(210_000);
    expect(Length.mm(297).micrometres).toBe(297_000);
  });

  it('converts one inch to 25.4 mm and 72 PDF points', () => {
    const oneInch = Length.inches(1);

    expect(oneInch.micrometres).toBe(25_400);
    expect(oneInch.toMillimetres()).toBe(25.4);
    expect(oneInch.toPoints()).toBeCloseTo(72, 12);
  });

  it('converts 72 PDF points to one inch within micrometre precision', () => {
    const length = Length.points(72);

    expect(length.micrometres).toBe(25_400);
    expect(length.toInches()).toBeCloseTo(1, 12);
  });

  it('rounds non-integral physical inputs to the nearest micrometre deterministically', () => {
    expect(Length.mm(0.0004).micrometres).toBe(0);
    expect(Length.mm(0.0005).micrometres).toBe(1);
    expect(Length.points(1).micrometres).toBe(353);
  });

  it('round-trips common units within one micrometre', () => {
    const source = Length.mm(123.456);

    expect(Length.inches(source.toInches()).micrometres).toBe(source.micrometres);
    expect(Length.points(source.toPoints()).micrometres).toBe(source.micrometres);
  });

  it('supports deterministic arithmetic', () => {
    expect(Length.mm(10).add(Length.mm(2.5)).toMillimetres()).toBe(12.5);
    expect(Length.mm(10).subtract(Length.mm(2.5)).toMillimetres()).toBe(7.5);
    expect(Length.mm(10).multiply(1.25).toMillimetres()).toBe(12.5);
    expect(Length.mm(10).divide(4).toMillimetres()).toBe(2.5);
  });

  it('supports negative values for coordinates and calibration offsets', () => {
    expect(Length.mm(-1.25).micrometres).toBe(-1_250);
  });

  it('rejects non-finite values and unsafe canonical values', () => {
    expect(() => Length.mm(Number.NaN)).toThrow();
    expect(() => Length.mm(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => Length.um(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });

  it('rejects division by zero', () => {
    expect(() => Length.mm(10).divide(0)).toThrow();
  });

  it('compares lengths by canonical value', () => {
    const a = Length.mm(10);
    const b = Length.cm(1);
    const c = Length.mm(11);

    expect(a.equals(b)).toBe(true);
    expect(a.compare(c)).toBe(-1);
    expect(c.compare(a)).toBe(1);
    expect(a.compare(b)).toBe(0);
  });
});

describe('Size2D', () => {
  it('creates a physical size and exposes area in square millimetres', () => {
    const size = Size2D.of(Length.mm(210), Length.mm(297));

    expect(size.width.toMillimetres()).toBe(210);
    expect(size.height.toMillimetres()).toBe(297);
    expect(size.areaSquareMillimetres()).toBe(62_370);
  });

  it('rejects negative dimensions', () => {
    expect(() => Size2D.of(Length.mm(-1), Length.mm(10))).toThrow();
  });
});

describe('Insets', () => {
  it('creates uniform physical insets', () => {
    const insets = Insets.uniform(Length.mm(5));

    expect(insets.top.toMillimetres()).toBe(5);
    expect(insets.right.toMillimetres()).toBe(5);
    expect(insets.bottom.toMillimetres()).toBe(5);
    expect(insets.left.toMillimetres()).toBe(5);
  });

  it('rejects negative inset values', () => {
    expect(() =>
      Insets.of({
        top: Length.mm(1),
        right: Length.mm(1),
        bottom: Length.mm(-1),
        left: Length.mm(1),
      }),
    ).toThrow();
  });
});

describe('Rect', () => {
  const rect = Rect.fromXYWH(Length.mm(20), Length.mm(30), Length.mm(50), Length.mm(40));

  it('derives physical edges from origin and size', () => {
    expect(rect.left.toMillimetres()).toBe(20);
    expect(rect.top.toMillimetres()).toBe(30);
    expect(rect.right.toMillimetres()).toBe(70);
    expect(rect.bottom.toMillimetres()).toBe(70);
  });

  it('contains points on its boundary', () => {
    expect(rect.containsPoint(Point2D.of(Length.mm(20), Length.mm(30)))).toBe(true);
    expect(rect.containsPoint(Point2D.of(Length.mm(70), Length.mm(70)))).toBe(true);
    expect(rect.containsPoint(Point2D.of(Length.mm(70.001), Length.mm(70)))).toBe(false);
  });

  it('contains another rectangle when all edges fit', () => {
    const inner = Rect.fromXYWH(Length.mm(25), Length.mm(35), Length.mm(10), Length.mm(10));

    expect(rect.containsRect(inner)).toBe(true);
  });

  it('treats edge-touching rectangles as non-overlapping', () => {
    const touching = Rect.fromXYWH(Length.mm(70), Length.mm(30), Length.mm(10), Length.mm(10));

    expect(rect.intersects(touching)).toBe(false);
    expect(rect.intersection(touching)).toBeNull();
  });

  it('returns the physical intersection for positive-area overlap', () => {
    const overlapping = Rect.fromXYWH(Length.mm(60), Length.mm(60), Length.mm(20), Length.mm(20));

    const intersection = rect.intersection(overlapping);

    expect(intersection).not.toBeNull();
    expect(intersection?.origin.x.toMillimetres()).toBe(60);
    expect(intersection?.origin.y.toMillimetres()).toBe(60);
    expect(intersection?.size.width.toMillimetres()).toBe(10);
    expect(intersection?.size.height.toMillimetres()).toBe(10);
  });

  it('translates without changing size', () => {
    const moved = rect.translate(Length.mm(5), Length.mm(-10));

    expect(moved.origin.x.toMillimetres()).toBe(25);
    expect(moved.origin.y.toMillimetres()).toBe(20);
    expect(moved.size.equals(rect.size)).toBe(true);
  });

  it('insets a rectangle and rejects insets larger than the rectangle', () => {
    const inset = rect.inset(Insets.uniform(Length.mm(5)));

    expect(inset.origin.x.toMillimetres()).toBe(25);
    expect(inset.origin.y.toMillimetres()).toBe(35);
    expect(inset.size.width.toMillimetres()).toBe(40);
    expect(inset.size.height.toMillimetres()).toBe(30);

    expect(() => rect.inset(Insets.uniform(Length.mm(30)))).toThrow();
  });
});

describe('quarter-turn size rotation', () => {
  const size = Size2D.of(Length.mm(210), Length.mm(297));

  it.each([
    [QuarterTurn.Deg0, 210, 297],
    [QuarterTurn.Deg90, 297, 210],
    [QuarterTurn.Deg180, 210, 297],
    [QuarterTurn.Deg270, 297, 210],
  ])('rotates %s degrees', (rotation, widthMm, heightMm) => {
    const rotated = rotateSize(size, rotation);

    expect(rotated.width.toMillimetres()).toBe(widthMm);
    expect(rotated.height.toMillimetres()).toBe(heightMm);
  });
});
