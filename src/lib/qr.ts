/**
 * Pure TypeScript Minimal QR Code Generator (Byte Mode, ISO/IEC 18004)
 * Zero external dependencies. Generates SVG paths / 2D module matrices.
 */

// GF(256) math
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, v = 1; i < 255; i++) {
  EXP[i] = v;
  EXP[i + 255] = v;
  LOG[v] = i;
  v = (v << 1) ^ (v & 0x80 ? 0x11d : 0);
}

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  const logX = LOG[x] ?? 0;
  const logY = LOG[y] ?? 0;
  return EXP[logX + logY] ?? 0;
}

function polyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
  const r = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    const pVal = p[i] ?? 0;
    for (let j = 0; j < q.length; j++) {
      const qVal = q[j] ?? 0;
      const idx = i + j;
      r[idx] = (r[idx] ?? 0) ^ gfMul(pVal, qVal);
    }
  }
  return r;
}

function getGenerator(ecCount: number): Uint8Array {
  let g: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const expVal = EXP[i] ?? 0;
    g = polyMul(g, new Uint8Array([1, expVal]));
  }
  return g;
}

function calcEcc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getGenerator(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = res[i] ?? 0;
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        const genVal = gen[j] ?? 0;
        const idx = i + j;
        res[idx] = (res[idx] ?? 0) ^ gfMul(genVal, factor);
      }
    }
  }
  return res.slice(data.length);
}

// Version table parameters for Low error correction (byte mode)
interface QrVersionInfo {
  version: number;
  size: number;
  totalDataBytes: number;
  ecBytes: number;
  alignments: number[];
}

const VERSIONS: QrVersionInfo[] = [
  { version: 1, size: 21, totalDataBytes: 19, ecBytes: 7, alignments: [] },
  { version: 2, size: 25, totalDataBytes: 34, ecBytes: 10, alignments: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 55, ecBytes: 15, alignments: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 80, ecBytes: 20, alignments: [6, 26] },
  { version: 5, size: 37, totalDataBytes: 108, ecBytes: 26, alignments: [6, 30] },
  { version: 6, size: 41, totalDataBytes: 136, ecBytes: 36, alignments: [6, 34] },
  { version: 7, size: 45, totalDataBytes: 156, ecBytes: 40, alignments: [6, 22, 38] },
  { version: 8, size: 49, totalDataBytes: 194, ecBytes: 48, alignments: [6, 24, 42] },
  { version: 9, size: 53, totalDataBytes: 232, ecBytes: 60, alignments: [6, 26, 46] },
  { version: 10, size: 57, totalDataBytes: 274, ecBytes: 72, alignments: [6, 28, 50] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);

  // Pick smallest fitting version
  const neededData = textBytes.length + (textBytes.length < 256 ? 2 : 3);
  const ver = VERSIONS.find((v) => v.totalDataBytes >= neededData);
  if (!ver) {
    throw new Error('Text is too long for this QR generator');
  }

  // 1. Bit buffer: Mode byte (0100) + count + payload + term
  const bits: number[] = [0, 1, 0, 0];
  const countBits = ver.version <= 9 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((textBytes.length >> i) & 1);
  }
  for (const b of textBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
  }

  // Terminator (up to 4 zeroes)
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Convert bits to bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bits[i + j] ?? 0);
    }
    dataBytes.push(b);
  }

  // Pad bytes: 0xEC, 0x11
  const pad = [0xec, 0x11];
  let pIdx = 0;
  while (dataBytes.length < ver.totalDataBytes) {
    dataBytes.push(pad[pIdx % 2] ?? 0xec);
    pIdx++;
  }

  // Calculate ECC
  const ecc = calcEcc(new Uint8Array(dataBytes), ver.ecBytes);
  const finalBytes = [...dataBytes, ...ecc];

  // 2. Build Matrix
  const N = ver.size;
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false) as boolean[]);
  const isFunction: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false) as boolean[]);

  const setModule = (r: number, c: number, v: boolean) => {
    const row = matrix[r];
    const fnRow = isFunction[r];
    if (row && fnRow) {
      row[c] = v;
      fnRow[c] = true;
    }
  };

  // Finder patterns
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBlack =
          r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setModule(r0 + r, c0 + c, isBlack);
      }
    }
    // Separators
    for (let i = -1; i <= 7; i++) {
      for (const [r, c] of [
        [r0 - 1, c0 + i],
        [r0 + 7, c0 + i],
        [r0 + i, c0 - 1],
        [r0 + i, c0 + 7],
      ]) {
        if (r !== undefined && c !== undefined && r >= 0 && r < N && c >= 0 && c < N) {
          setModule(r, c, false);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(N - 8, 8, true);

  // Alignment patterns
  for (const r of ver.alignments) {
    for (const c of ver.alignments) {
      if (isFunction[r]?.[c]) continue;
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const isBlack = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0);
          setModule(r + i, c + j, isBlack);
        }
      }
    }
  }

  // Format bits (mask 0, Low ECC: 111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) setModule(8, i, formatBits[i] === 1);
  setModule(8, 7, formatBits[6] === 1);
  setModule(8, 8, formatBits[7] === 1);
  setModule(7, 8, formatBits[8] === 1);
  for (let i = 9; i < 15; i++) setModule(14 - i, 8, formatBits[i] === 1);

  for (let i = 0; i < 7; i++) setModule(N - 1 - i, 8, formatBits[i] === 1);
  for (let i = 7; i < 15; i++) setModule(8, N - 15 + i, formatBits[i] === 1);

  // 3. Place Data in 2-column zig-zag right to left
  let byteIdx = 0;
  let bitIdx = 7;
  let up = true;

  for (let right = N - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = up
      ? Array.from({ length: N }, (_, i) => N - 1 - i)
      : Array.from({ length: N }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r]?.[c]) {
          let bit = false;
          if (byteIdx < finalBytes.length) {
            const byteVal = finalBytes[byteIdx] ?? 0;
            bit = ((byteVal >> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              byteIdx++;
            }
          }
          // Mask 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            bit = !bit;
          }
          const row = matrix[r];
          if (row) {
            row[c] = bit;
          }
        }
      }
    }
    up = !up;
  }

  return matrix;
}
