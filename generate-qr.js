// generator.js
const QRCode = require("qrcode-generator");
const { createCanvas } = require("canvas");
const crypto = require("crypto");
const fs = require("fs");

// ================= CONFIG =================
const SECRET = Buffer.from("CHANGE_ME_SECRET");
const VERSION = 5;      // 固定版本
const ECC = "H";
const SCALE = 12;
const BORDER = 4;
const HIDDEN_BITS = 64;

// ================= HELPERS =================
function hmac32(key, msg) {
  return crypto.createHmac("sha256", key).update(msg).digest().readUInt32BE(0);
}

function intToBitsBE(x, bits) {
  return [...Array(bits)].map((_, i) => (x >> (bits - 1 - i)) & 1);
}

function getEmbedCoords() {
  const n = 37;
  const coords = [];

  const isFinder = (x, y) =>
    (x <= 8 && y <= 8) ||
    (x >= n - 9 && y <= 8) ||
    (x <= 8 && y >= n - 9);

  const isTiming = (x, y) => x === 6 || y === 6;
  const isAlign = (x, y) => x >= 28 && x <= 32 && y >= 28 && y <= 32;
  const isFormat = (x, y) =>
    (y === 8 && (x <= 8 || x >= n - 8)) ||
    (x === 8 && (y <= 8 || y >= n - 8));

  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      if (isFinder(x, y) || isTiming(x, y) || isAlign(x, y) || isFormat(x, y))
        continue;
      coords.push([x, y]);
      if (coords.length === HIDDEN_BITS) return coords;
    }
  }
  throw "Not enough coords";
}

// ================= MAIN =================
const visiblePayload = "DIGITALID:SESSION=ABC123";

const qr = QRCode(VERSION, ECC);
qr.addData(visiblePayload);
qr.make();

const ts = Math.floor(Date.now() / 1000);
const tag = hmac32(SECRET, `${visiblePayload}|${ts}`);
const hiddenBits = [
  ...intToBitsBE(ts, 32),
  ...intToBitsBE(tag, 32),
];

const coords = getEmbedCoords();
const count = qr.getModuleCount();
const matrix = [];
for (let r = 0; r < count; r++) {
  const row = [];
  for (let c = 0; c < count; c++) {
    row.push(qr.isDark(r, c));
  }
  matrix.push(row);
}

// 强制写入 stega bits
coords.forEach(([x, y], i) => {
  matrix[y][x] = hiddenBits[i] === 1;
});

// 绘制
const size = (37 + BORDER * 2) * SCALE;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "#fff";
ctx.fillRect(0, 0, size, size);
ctx.fillStyle = "#000";

for (let y = 0; y < 37; y++) {
  for (let x = 0; x < 37; x++) {
    if (matrix[y][x]) {
      ctx.fillRect(
        (x + BORDER) * SCALE,
        (y + BORDER) * SCALE,
        SCALE,
        SCALE
      );
    }
  }
}

fs.writeFileSync("./qr.png", canvas.toBuffer());
console.log("[+] QR generated");
console.log("[+] timestamp:", ts);
console.log("[+] tag:", tag.toString(16));
