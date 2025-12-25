// bb84.js
// BB84 QKD Simulation with Eve (Intercept-Resend), QBER detection, and Privacy Amplification
// Run: node bb84.js

const crypto = require("crypto");

// -----------------------------
// Parameters (tune for demo)
// -----------------------------
const N = 2000;               // number of qubits Alice sends
const EVE_ENABLED = true;     // set false to see "no-eve" baseline
// const EVE_ENABLED = false;     // set false to see "no-eve" baseline
const EVE_INTERCEPT_RATE = 1; // 1.0 = intercept every qubit, 0.3 = intercept 30%
const SAMPLE_RATIO = 0.2;     // fraction of sifted bits used for QBER check
const QBER_THRESHOLD = 0.11;  // typical "suspicious" threshold for BB84 demo
const PA_OUTPUT_BYTES = 16;   // privacy amplification output length (bytes)

// -----------------------------
// Utilities
// -----------------------------
function randBit() {
  // crypto random 0/1
  return crypto.randomBytes(1)[0] & 1;
}

function randBasis() {
  // 0 = Z (rectilinear +), 1 = X (diagonal x)
  return randBit();
}

function bitToStr(b) {
  return b ? "1" : "0";
}

function basisToStr(basis) {
  return basis === 0 ? "Z" : "X";
}

function shuffleIndices(n) {
  // Fisher-Yates on indices
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = crypto.randomBytes(4).readUInt32BE(0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -----------------------------
// BB84 Model
// -----------------------------
//
// Alice chooses for each qubit:
//   - a random bit aBit[i]
//   - a random basis aBasis[i] (Z or X)
//
// Bob chooses a random basis bBasis[i] and measures.
// If Bob's basis matches Alice's basis -> measurement equals Alice bit (ideal channel)
// If basis mismatch -> measurement is random (50/50)
//
// Eve (Intercept-Resend):
//   - with probability intercept rate, Eve measures in random basis
//   - she resends the measured state to Bob
// This introduces errors when Eve chooses the wrong basis.
//
// We simulate measurement outcomes without complex quantum state math,
// using the standard BB84 probability rules.
//
// -----------------------------

function alicePrepare(N) {
  const aBits = new Array(N);
  const aBases = new Array(N);
  for (let i = 0; i < N; i++) {
    aBits[i] = randBit();
    aBases[i] = randBasis();
  }
  return { aBits, aBases };
}

function eveInterceptResend(aBit, aBasis) {
  // Eve chooses random basis, measures, and resends "her" result as the new state.
  const eBasis = randBasis();

  // Eve measurement:
  // if basis matches Alice => she gets correct bit
  // else random bit
  const eBit = (eBasis === aBasis) ? aBit : randBit();

  // Eve resends a state encoded in her basis with her measured bit.
  // We represent the new "effective" prepared state for Bob as (eBit, eBasis).
  return { preparedBit: eBit, preparedBasis: eBasis, eBasis, eBit };
}

function bobMeasure(preparedBit, preparedBasis, bBasis) {
  // Bob measurement:
  // if Bob basis matches prepared basis => he reads preparedBit
  // else random bit
  return (bBasis === preparedBasis) ? preparedBit : randBit();
}

function runBB84() {
  // Step 1: Alice prepares qubits
  const { aBits, aBases } = alicePrepare(N);

  // Step 2: Transmission (Eve may intercept)
  const bBases = new Array(N);
  const bBits = new Array(N);

  // For optional statistics
  let eveInterceptedCount = 0;

  for (let i = 0; i < N; i++) {
    bBases[i] = randBasis();

    // Default channel: state as Alice prepared
    let preparedBit = aBits[i];
    let preparedBasis = aBases[i];

    // Eve attacks
    if (EVE_ENABLED) {
      const roll = crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff;
      if (roll < EVE_INTERCEPT_RATE) {
        eveInterceptedCount++;
        const eve = eveInterceptResend(aBits[i], aBases[i]);
        preparedBit = eve.preparedBit;
        preparedBasis = eve.preparedBasis;
      }
    }

    // Bob measures what he receives
    bBits[i] = bobMeasure(preparedBit, preparedBasis, bBases[i]);
  }

  // Step 3: Sifting (keep only positions where bases match)
  const sifted = [];
  for (let i = 0; i < N; i++) {
    if (aBases[i] === bBases[i]) {
      sifted.push({
        index: i,
        aBit: aBits[i],
        bBit: bBits[i],
        basis: aBases[i],
      });
    }
  }

  // Step 4: Error-rate detection (QBER) by revealing a random sample
  const siftLen = sifted.length;
  const sampleCount = Math.max(1, Math.floor(siftLen * SAMPLE_RATIO));
  const order = shuffleIndices(siftLen);
  const sampleSet = new Set(order.slice(0, sampleCount));

  let errors = 0;
  for (let j = 0; j < siftLen; j++) {
    if (sampleSet.has(j)) {
      if (sifted[j].aBit !== sifted[j].bBit) errors++;
    }
  }
  const qber = errors / sampleCount;

  // Remove sample bits from the final raw key (since they were revealed)
  const rawKeyBits = [];
  for (let j = 0; j < siftLen; j++) {
    if (!sampleSet.has(j)) {
      // In real QKD you'd use Bob's bits (post error correction),
      // but in this simulation we keep Bob's bit as the shared key material.
      rawKeyBits.push(sifted[j].bBit);
    }
  }

  // Step 5: Decision: abort if QBER too high
  const suspicious = qber > QBER_THRESHOLD;

  // Step 6: Privacy amplification
  // We compress rawKeyBits into a shorter key using a hash.
  // This reduces Eve's possible information even if she learned some bits.
  const rawKeyBytes = bitsToBytes(rawKeyBits);
  const finalKey = privacyAmplify(rawKeyBytes, PA_OUTPUT_BYTES);

  return {
    N,
    eveEnabled: EVE_ENABLED,
    eveInterceptRate: EVE_INTERCEPT_RATE,
    eveInterceptedCount,
    siftLen,
    sampleCount,
    errors,
    qber,
    suspicious,
    rawKeyBitsLen: rawKeyBits.length,
    finalKeyHex: finalKey.toString("hex"),
  };
}

function bitsToBytes(bits) {
  // Pack bits (0/1) into bytes
  const byteLen = Math.ceil(bits.length / 8);
  const buf = Buffer.alloc(byteLen, 0);
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i] & 1;
    const byteIndex = Math.floor(i / 8);
    const bitIndex = 7 - (i % 8); // big-endian bit packing
    buf[byteIndex] |= bit << bitIndex;
  }
  return buf;
}

function privacyAmplify(rawKeyBytes, outBytes) {
  // Simple privacy amplification:
  // finalKey = SHA-256(rawKey || salt) then truncate
  // In real systems you'd use universal hashing; this is a clean demo.
  const salt = crypto.randomBytes(16);
  const digest = crypto
    .createHash("sha256")
    .update(rawKeyBytes)
    .update(salt)
    .digest();
  return digest.subarray(0, outBytes);
}

// -----------------------------
// Run + print nicely (if standalone)
// -----------------------------
if (require.main === module) {
  const result = runBB84();

  console.log("=== BB84 QKD Simulation (JS) ===");
  console.log(`N qubits sent:               ${result.N}`);
  console.log(`Eve enabled:                ${result.eveEnabled}`);
  console.log(`Eve intercept rate:         ${result.eveInterceptRate}`);
  if (result.eveEnabled) {
    console.log(`Eve intercepted count:      ${result.eveInterceptedCount}`);
  }
  console.log(`Sifted bits (basis match):  ${result.siftLen}`);
  console.log(`Sampled for QBER check:     ${result.sampleCount}`);
  console.log(`Sample errors:              ${result.errors}`);
  console.log(`QBER (error rate):          ${(result.qber * 100).toFixed(2)}%`);
  console.log(`QBER threshold:             ${(QBER_THRESHOLD * 100).toFixed(2)}%`);
  console.log(`Detected eavesdropping?:    ${result.suspicious ? "YES (ABORT)" : "NO (OK)"}`);
  console.log(`Raw key bits left:          ${result.rawKeyBitsLen}`);
  console.log(`Final key (PA, hex):        ${result.finalKeyHex}`);
}

module.exports = { runBB84 };
