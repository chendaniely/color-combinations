import { deflateSync } from 'node:zlib'

// A minimal PNG encoder, so the browser tests can upload a REAL image file
// without adding an image library or committing a photograph to the repo.
// (Committing a face photo would also be a poor fit for a project whose whole
// premise is that photographs never leave the device.)

function crc32(buf: Buffer): number {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([len, typed, crc])
}

/**
 * An 8-bit RGB PNG. `pixel(x, y)` returns [r, g, b] per pixel, so a test can
 * paint something face-like (a warm oval on a plain ground) rather than a flat
 * rectangle.
 */
export function makePng(
  width: number, height: number,
  pixel: (x: number, y: number) => [number, number, number],
): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3))
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y)
      raw[o++] = r; raw[o++] = g; raw[o++] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // colour type: truecolour
  ihdr[10] = 0  // deflate
  ihdr[11] = 0  // adaptive filtering
  ihdr[12] = 0  // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// A crude portrait: mid-brown oval "face" on a light-grey ground, with a darker
// band across the top for "hair". Enough for the pipeline to sample real,
// distinguishable colours; not enough to be a face any detector would accept,
// which is exactly the "we couldn't find a face" path worth exercising.
export function syntheticPortrait(width = 480, height = 640): Buffer {
  const cx = width / 2, cy = height * 0.55
  const rx = width * 0.28, ry = height * 0.3
  return makePng(width, height, (x, y) => {
    const inOval = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
    if (y < height * 0.18) return [40, 30, 26]      // hair band
    if (inOval) return [198, 152, 122]               // skin
    return [236, 236, 232]                           // near-white ground
  })
}
