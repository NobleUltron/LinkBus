/**
 * Deterministic pseudo-QR matrix generator.
 * The real system stores a base64 QR from SimpleSoftwareIO/QrCode; here we render a
 * stable, scannable-looking matrix derived from the ticket number so every ticket
 * always draws the identical pattern.
 */
export function qrMatrix(value: string, size = 21): boolean[][] {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) % 1000 / 1000;
  };

  const grid: boolean[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  const inFinder = (r: number, c: number) => {
    const zones = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0]];

    return zones.some(([zr, zc]) => r >= zr && r < zr + 7 && c >= zc && c < zc + 7);
  };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (inFinder(r, c)) continue;
      grid[r][c] = rand() > 0.5;
    }
  }

  // Draw the three finder patterns.
  const finders = [
  [0, 0],
  [0, size - 7],
  [size - 7, 0]];

  finders.forEach(([zr, zc]) => {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[zr + r][zc + c] = edge || core;
      }
    }
  });

  return grid;
}