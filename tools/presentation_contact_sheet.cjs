const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require(path.join(process.env.TEMP, 'auto-paper-ppt/node_modules/@napi-rs/canvas'));
const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../presentation_v10');
async function main() {
  const names = fs.readdirSync(dir).filter(n => /^slide-\d+\.png$/.test(n)).sort();
  const canvas = createCanvas(2000, Math.ceil(names.length / 4) * 303);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce2e3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < names.length; i++) {
    const img = await loadImage(path.join(dir, names[i]));
    const x = (i % 4) * 500 + 8, y = Math.floor(i / 4) * 303 + 8;
    ctx.drawImage(img, x, y, 484, 272.25);
    ctx.fillStyle = '#202628';
    ctx.font = '14px Arial';
    ctx.fillText(String(i + 1).padStart(2, '0'), x, y + 289);
  }
  fs.writeFileSync(path.join(dir, 'contact-sheet.png'), canvas.toBuffer('image/png'));
}
main().catch(e => { console.error(e); process.exit(1); });
