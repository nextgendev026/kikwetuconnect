const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]
const outDir = path.join(__dirname, '..', 'public', 'icons')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// Generate a simple green square with gold "K" as PNG
async function generate(size) {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0E7A0E"/>
        <stop offset="100%" style="stop-color:#1B5E20"/>
      </linearGradient>
      <linearGradient id="k" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700"/>
        <stop offset="100%" style="stop-color:#F9A825"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="url(#g)"/>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui" font-weight="900" font-size="${size * 0.625}"
          fill="url(#k)" transform="rotate(-12 ${size / 2} ${size / 2})">K</text>
    <circle cx="${size * 0.81}" cy="${size * 0.19}" r="${size * 0.156}" fill="url(#k)" opacity="0.9"/>
  </svg>`

  const buf = Buffer.from(svg)
  await sharp(buf).resize(size, size).png().toFile(path.join(outDir, `icon-${size}x${size}.png`))
  console.log(`Generated icon-${size}x${size}.png`)

  // Maskable version (safe zone = 80% centered)
  const maskable = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0E7A0E"/>
        <stop offset="100%" style="stop-color:#1B5E20"/>
      </linearGradient>
      <linearGradient id="k" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700"/>
        <stop offset="100%" style="stop-color:#F9A825"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui" font-weight="900" font-size="${size * 0.625}"
          fill="url(#k)" transform="rotate(-12 ${size / 2} ${size / 2})">K</text>
    <circle cx="${size * 0.81}" cy="${size * 0.19}" r="${size * 0.156}" fill="url(#k)" opacity="0.9"/>
  </svg>`

  const buf2 = Buffer.from(maskable)
  await sharp(buf2).resize(size, size).png().toFile(path.join(outDir, `icon-${size}x${size}-maskable.png`))
  console.log(`Generated icon-${size}x${size}-maskable.png`)
}

;(async () => {
  for (const s of sizes) await generate(s)
  console.log('Done!')
})()
