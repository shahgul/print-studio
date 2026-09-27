const MICROMETRES_PER_MILLIMETRE = 1_000;
const MICROMETRES_PER_CENTIMETRE = 10_000;
const MICROMETRES_PER_INCH = 25_400;
const PDF_POINTS_PER_INCH = 72;

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function roundPhysical(value: number): number {
  assertFinite(value, 'physical value');

  const rounded = value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);

  if (!Number.isSafeInteger(rounded)) {
    throw new RangeError('physical value exceeds safe integer precision');
  }

  return rounded;
}

function assertCanonicalMicrometres(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('micrometres must be a safe integer');
  }
}

/**
 * Immutable physical length.
 *
 * The canonical representation is an integer number of micrometres. External
 * units are rounded once at the construction boundary to the nearest
 * micrometre, making subsequent geometry deterministic.
 */
export class Length {
  readonly #micrometres: number;

  private constructor(micrometres: number) {
    assertCanonicalMicrometres(micrometres);
    this.#micrometres = micrometres;
  }

  static um(micrometres: number): Length {
    return new Length(micrometres);
  }

  static mm(millimetres: number): Length {
    assertFinite(millimetres, 'millimetres');
    return new Length(roundPhysical(millimetres * MICROMETRES_PER_MILLIMETRE));
  }

  static cm(centimetres: number): Length {
    assertFinite(centimetres, 'centimetres');
    return new Length(roundPhysical(centimetres * MICROMETRES_PER_CENTIMETRE));
  }

  static inches(inches: number): Length {
    assertFinite(inches, 'inches');
    return new Length(roundPhysical(inches * MICROMETRES_PER_INCH));
  }

  static points(points: number): Length {
    assertFinite(points, 'points');
    return new Length(roundPhysical((points * MICROMETRES_PER_INCH) / PDF_POINTS_PER_INCH));
  }

  static zero(): Length {
    return new Length(0);
  }

  get micrometres(): number {
    return this.#micrometres;
  }

  toMillimetres(): number {
    return this.#micrometres / MICROMETRES_PER_MILLIMETRE;
  }

  toCentimetres(): number {
    return this.#micrometres / MICROMETRES_PER_CENTIMETRE;
  }

  toInches(): number {
    return this.#micrometres / MICROMETRES_PER_INCH;
  }

  toPoints(): number {
    return (this.#micrometres * PDF_POINTS_PER_INCH) / MICROMETRES_PER_INCH;
  }

  add(other: Length): Length {
    return new Length(this.#checkedCanonical(this.#micrometres + other.#micrometres));
  }

  subtract(other: Length): Length {
    return new Length(this.#checkedCanonical(this.#micrometres - other.#micrometres));
  }

  multiply(factor: number): Length {
    assertFinite(factor, 'factor');
    return new Length(roundPhysical(this.#micrometres * factor));
  }

  divide(divisor: number): Length {
    assertFinite(divisor, 'divisor');

    if (divisor === 0) {
      throw new RangeError('divisor must not be zero');
    }

    return new Length(roundPhysical(this.#micrometres / divisor));
  }

  abs(): Length {
    return this.#micrometres < 0 ? new Length(-this.#micrometres) : this;
  }

  equals(other: Length): boolean {
    return this.#micrometres === other.#micrometres;
  }

  compare(other: Length): -1 | 0 | 1 {
    if (this.#micrometres < other.#micrometres) {
      return -1;
    }

    if (this.#micrometres > other.#micrometres) {
      return 1;
    }

    return 0;
  }

  isNegative(): boolean {
    return this.#micrometres < 0;
  }

  isZero(): boolean {
    return this.#micrometres === 0;
  }

  #checkedCanonical(value: number): number {
    assertCanonicalMicrometres(value);
    return value;
  }
}

export class Point2D {
  private constructor(
    readonly x: Length,
    readonly y: Length,
  ) {}

  static of(x: Length, y: Length): Point2D {
    return new Point2D(x, y);
  }

  translate(dx: Length, dy: Length): Point2D {
    return new Point2D(this.x.add(dx), this.y.add(dy));
  }

  equals(other: Point2D): boolean {
    return this.x.equals(other.x) && this.y.equals(other.y);
  }
}

export class Size2D {
  private constructor(
    readonly width: Length,
    readonly height: Length,
  ) {}

  static of(width: Length, height: Length): Size2D {
    if (width.isNegative() || height.isNegative()) {
      throw new RangeError('size dimensions must be non-negative');
    }

    return new Size2D(width, height);
  }

  areaSquareMillimetres(): number {
    return (this.width.micrometres * this.height.micrometres) / 1_000_000;
  }

  equals(other: Size2D): boolean {
    return this.width.equals(other.width) && this.height.equals(other.height);
  }

  isEmpty(): boolean {
    return this.width.isZero() || this.height.isZero();
  }
}

type InsetsInput = Readonly<{
  top: Length;
  right: Length;
  bottom: Length;
  left: Length;
}>;

export class Insets {
  private constructor(
    readonly top: Length,
    readonly right: Length,
    readonly bottom: Length,
    readonly left: Length,
  ) {}

  static of(input: InsetsInput): Insets {
    for (const value of [input.top, input.right, input.bottom, input.left]) {
      if (value.isNegative()) {
        throw new RangeError('insets must be non-negative');
      }
    }

    return new Insets(input.top, input.right, input.bottom, input.left);
  }

  static uniform(value: Length): Insets {
    return Insets.of({
      top: value,
      right: value,
      bottom: value,
      left: value,
    });
  }

  horizontal(): Length {
    return this.left.add(this.right);
  }

  vertical(): Length {
    return this.top.add(this.bottom);
  }
}

export class Rect {
  private constructor(
    readonly origin: Point2D,
    readonly size: Size2D,
  ) {}

  static of(origin: Point2D, size: Size2D): Rect {
    return new Rect(origin, size);
  }

  static fromXYWH(x: Length, y: Length, width: Length, height: Length): Rect {
    return new Rect(Point2D.of(x, y), Size2D.of(width, height));
  }

  get left(): Length {
    return this.origin.x;
  }

  get top(): Length {
    return this.origin.y;
  }

  get right(): Length {
    return this.origin.x.add(this.size.width);
  }

  get bottom(): Length {
    return this.origin.y.add(this.size.height);
  }

  containsPoint(point: Point2D): boolean {
    return (
      point.x.compare(this.left) >= 0 &&
      point.x.compare(this.right) <= 0 &&
      point.y.compare(this.top) >= 0 &&
      point.y.compare(this.bottom) <= 0
    );
  }

  containsRect(other: Rect): boolean {
    return (
      other.left.compare(this.left) >= 0 &&
      other.right.compare(this.right) <= 0 &&
      other.top.compare(this.top) >= 0 &&
      other.bottom.compare(this.bottom) <= 0
    );
  }

  intersects(other: Rect): boolean {
    return (
      this.left.compare(other.right) < 0 &&
      this.right.compare(other.left) > 0 &&
      this.top.compare(other.bottom) < 0 &&
      this.bottom.compare(other.top) > 0
    );
  }

  intersection(other: Rect): Rect | null {
    if (!this.intersects(other)) {
      return null;
    }

    const left = Length.um(Math.max(this.left.micrometres, other.left.micrometres));
    const top = Length.um(Math.max(this.top.micrometres, other.top.micrometres));
    const right = Length.um(Math.min(this.right.micrometres, other.right.micrometres));
    const bottom = Length.um(Math.min(this.bottom.micrometres, other.bottom.micrometres));

    return Rect.fromXYWH(left, top, right.subtract(left), bottom.subtract(top));
  }

  translate(dx: Length, dy: Length): Rect {
    return new Rect(this.origin.translate(dx, dy), this.size);
  }

  inset(insets: Insets): Rect {
    const width = this.size.width.subtract(insets.horizontal());
    const height = this.size.height.subtract(insets.vertical());

    if (width.isNegative() || height.isNegative()) {
      throw new RangeError('insets exceed rectangle dimensions');
    }

    return new Rect(
      Point2D.of(this.left.add(insets.left), this.top.add(insets.top)),
      Size2D.of(width, height),
    );
  }

  equals(other: Rect): boolean {
    return this.origin.equals(other.origin) && this.size.equals(other.size);
  }
}

export enum QuarterTurn {
  Deg0 = 0,
  Deg90 = 90,
  Deg180 = 180,
  Deg270 = 270,
}

export function rotateSize(size: Size2D, rotation: QuarterTurn): Size2D {
  switch (rotation) {
    case QuarterTurn.Deg0:
    case QuarterTurn.Deg180:
      return size;
    case QuarterTurn.Deg90:
    case QuarterTurn.Deg270:
      return Size2D.of(size.height, size.width);
  }
}
