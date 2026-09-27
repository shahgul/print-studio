export function requireNonEmptyId(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${name} must not be empty`);
  }

  return normalized;
}

export function requireNonEmptyName(value: string, name: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError(`${name} must not be empty`);
  }

  return normalized;
}
