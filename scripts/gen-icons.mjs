// Generates MyTube PNG icons (red rounded square + white play triangle).
// No deps — hand-rolls a minimal PNG encoder using zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'icons')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * (size * 4 + 1) + 1 + x * 4
      raw[dst] = pixels[src]
      raw[dst + 1] = pixels[src + 1]
      raw[dst + 2] = pixels[src + 2]
      raw[dst + 3] = pixels[src + 3]
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const radius = size * 0.22
  // play triangle bounds (centered)
  const tLeft = size * 0.38
  const tRight = size * 0.66
  const tTop = size * 0.3
  const tBottom = size * 0.7

  const set = (x, y, r, g, b, a) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }

  const inRounded = (x, y) => {
    const rx = Math.min(x, size - 1 - x)
    const ry = Math.min(y, size - 1 - y)
    if (rx >= radius || ry >= radius) return true
    const dx = radius - rx
    const dy = radius - ry
    return dx * dx + dy * dy <= radius * radius
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) {
        set(x, y, 0, 0, 0, 0)
        continue
      }
      // triangle test
      const t = (y - tTop) / (tBottom - tTop)
      const triRightAtY = tLeft + (tRight - tLeft) * (1 - Math.abs(2 * t - 1))
      const inTriangle = x >= tLeft && x <= triRightAtY && y >= tTop && y <= tBottom
      if (inTriangle) set(x, y, 255, 255, 255, 255)
      else set(x, y, 255, 0, 0, 255)
    }
  }
  return encodePNG(size, px)
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), makeIcon(size))
  console.log(`icons/icon${size}.png`)
}
