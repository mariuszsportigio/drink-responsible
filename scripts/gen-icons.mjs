// Generates PWA icons as raw PNGs (no deps): dark bg, amber form-ring, mint core.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixelFn) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      const i = row + 1 + x * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [11, 15, 13, 255]
const AMBER = [245, 165, 36, 255]
const TRACK = [50, 58, 48, 255]
const MINT = [52, 211, 153, 255]

function draw(S) {
  return png(S, (x, y) => {
    const dx = x - S / 2 + 0.5
    const dy = y - S / 2 + 0.5
    const d = Math.hypot(dx, dy)
    let c = BG
    const rOut = 0.40 * S
    const rIn = 0.29 * S
    if (d >= rIn && d <= rOut) {
      let ang = Math.atan2(dx, -dy) // 0 = top, clockwise
      if (ang < 0) ang += Math.PI * 2
      c = ang <= Math.PI * 2 * 0.7 ? AMBER : TRACK
    } else if (d < 0.17 * S) {
      c = MINT
    }
    return c
  })
}

mkdirSync(new URL('../public', import.meta.url), { recursive: true })
for (const [name, size] of [['pwa-512.png', 512], ['pwa-192.png', 192], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), draw(size))
  console.log('wrote public/' + name)
}
