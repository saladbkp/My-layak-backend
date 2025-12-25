// scanner.js
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const jsQR = require("jsqr");
const crypto = require("crypto");

// ================= CONFIG =================
const SECRET = Buffer.from("CHANGE_ME_SECRET");
const N = 37;
const BORDER = 4;
const HIDDEN_BITS = 64;
const TIME_WINDOW = 60;

// ================= HELPERS =================
function hmac32(key, msg) {
  return crypto.createHmac("sha256", key).update(msg).digest().readUInt32BE(0);
}

function bitsToInt(bits) {
  return bits.reduce((a, b) => (a << 1) | b, 0) >>> 0;
}

function getEmbedCoords() {
  const n = 37;
  const coords = [];

  const bad = (x, y) =>
    (x <= 8 && y <= 8) ||
    (x >= n - 9 && y <= 8) ||
    (x <= 8 && y >= n - 9) ||
    x === 6 ||
    y === 6 ||
    (x >= 28 && x <= 32 && y >= 28 && y <= 32) ||
    (y === 8 && (x <= 8 || x >= n - 8)) ||
    (x === 8 && (y <= 8 || y >= n - 8));

  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      if (bad(x, y)) continue;
      coords.push([x, y]);
      if (coords.length === HIDDEN_BITS) return coords;
    }
  }
}

// ================= MAIN =================
(async () => {
  const args = process.argv.slice(2);
  const filename = args[0] || "qr.png";
  
  console.log(`[*] Scanning file: ${filename}`);
  
  try {
    const img = await loadImage(filename);
    const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, img.width, img.height);

  const qr = jsQR(imgData.data, img.width, img.height);
  if (!qr) return console.log("[-] QR decode failed");

  const payload = qr.data;
  console.log("[+] visible payload:", payload);

  // assume perfect frontal (PoC)
  const moduleSize = img.width / (N + BORDER * 2);
  const coords = getEmbedCoords();

  const bits = coords.map(([x, y]) => {
    const cx = Math.floor((x + BORDER + 0.5) * moduleSize);
    const cy = Math.floor((y + BORDER + 0.5) * moduleSize);
    const idx = (cy * img.width + cx) * 4;
    return imgData.data[idx] < 128 ? 1 : 0;
  });

  const ts = bitsToInt(bits.slice(0, 32));
  const tag = bitsToInt(bits.slice(32));

  const now = Math.floor(Date.now() / 1000);
  const expected = hmac32(SECRET, `${payload}|${ts}`);

  console.log("[+] timestamp:", ts, "diff:", Math.abs(now - ts));
  console.log("[+] tag:", tag.toString(16));
  console.log("[+] expected:", expected.toString(16));

  if (tag !== expected) return console.log("❌ INVALID: stega mismatch");
  if (Math.abs(now - ts) > TIME_WINDOW)
    return console.log("❌ INVALID: expired");

  console.log("✅ VALID QR (has stega + time bound)");
  } catch (err) {
    console.error(`[-] Error loading image: ${err.message}`);
    process.exit(1);
  }
})();
