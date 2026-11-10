/**
 * Generates the PWA icons without external image dependencies.
 * Draws a midnight tile with a blue→violet gradient and a stylised forge mark.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
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

function png(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const lerp = (a, b, t) => a + (b - a) * t
const inRoundedRect = (x, y, size, radius) => {
  const r = size * radius
  const min = r
  const max = size - r
  if (x >= min && x <= max) return true
  if (y >= min && y <= max) return true
  const cx = x < min ? min : max
  const cy = y < min ? min : max
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let r = 10, g = 13, b = 22, a = 255
      if (!inRoundedRect(x, y, size, 0.22)) {
        a = 0
      } else {
        // soft radial glow
        const d = Math.hypot(x - cx, y - cy) / (size * 0.5)
        const glow = Math.max(0, 1 - d) ** 2
        r += glow * 26
        g += glow * 38
        b += glow * 80

        // circular gradient plate
        const ringR = size * 0.34
        const rr = Math.hypot(x - cx, y - cy)
        if (rr < ringR) {
          const t = (x + y) / (size * 2)
          r = lerp(46, 139, t)
          g = lerp(96, 92, t)
          b = lerp(255, 246, t)
        }

        // stylised flame mark: rounded base with a tapered apex
        const base = (x - cx) ** 2 + (y - (cy + size * 0.055)) ** 2 < (size * 0.135) ** 2
        const t = (y - (cy - size * 0.27)) / (size * 0.36)
        const taper = t >= 0 && t <= 1 && Math.abs(x - (cx + (1 - t) * size * 0.025)) < t * size * 0.125
        if (base || taper) {
          r = 255
          g = 255
          b = 255
        }
      }
      px[i] = Math.round(Math.max(0, Math.min(255, r)))
      px[i + 1] = Math.round(Math.max(0, Math.min(255, g)))
      px[i + 2] = Math.round(Math.max(0, Math.min(255, b)))
      px[i + 3] = a
    }
  }
  return png(size, px)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', draw(192))
writeFileSync('public/icon-512.png', draw(512))
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b6cff"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#0a0d16"/>
  <circle cx="256" cy="256" r="168" fill="url(#g)"/>
  <path d="M256 140c34 44 62 70 62 116a62 62 0 0 1-124 0c0-26 12-44 30-64 2 22 10 32 20 38 8-30 6-54 12-90z" fill="#fff"/>
  <circle cx="256" cy="330" r="26" fill="#0a0d16"/>
</svg>
`,
)
console.log('icons generated')
