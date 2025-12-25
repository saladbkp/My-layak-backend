const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { obfuscateToken } = require('../backend/obfuscator');
const { runBB84 } = require('./bb84');

// Configuration
// We will now use BB84 to generate the secret key dynamically!
// const SECRET_KEY = "my-layak-secret-key-very-secure"; 
let SECRET_KEY = ""; // Will be populated by QKD

// Simulation Data
const USER_INPUT = {
    ic: "900101-14-1234",
    name: "Ali Bin Abu",
    household_income: 2500, // Should be B40
    employment_status: "Self-Employed",
    dependents: 3
};

// ---------------------------------------------------------
// Helper Functions (Replicated from backend/server.js)
// ---------------------------------------------------------

function determineCategory(income) {
    if (income <= 4850) return 'B40';
    if (income <= 10959) return 'M40';
    return 'T20';
}

function hashIC(ic) {
    return crypto.createHash('sha256').update(ic).digest('hex');
}

function signToken(payload) {
    const signature = crypto.createHmac('sha256', SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');
    return `PQC-SIG-${signature}`;
}

// ---------------------------------------------------------
// Main Execution
// ---------------------------------------------------------

console.log("=== START: Generate Token (Offline Simulation) ===\n");

// 0. QKD Key Exchange (BB84)
console.log(`[Step 0] Establishing Quantum-Safe Key via BB84 Protocol`);
const qkdResult = runBB84();

if (qkdResult.suspicious) {
    console.error(`   > [CRITICAL] Eavesdropping detected! QBER: ${(qkdResult.qber * 100).toFixed(2)}%`);
    console.error(`   > Aborting Token Generation.`);
    process.exit(1);
}

SECRET_KEY = qkdResult.finalKeyHex;
console.log(`   > QKD Successful. QBER: ${(qkdResult.qber * 100).toFixed(2)}%`);
console.log(`   > Shared Secret Key Established: ${SECRET_KEY}`);
console.log(`   > (Note: In a real scenario, this key is never exposed, only used for signing)`);

// 1. Process Input
console.log(`[Step 1] Processing User Data for: ${USER_INPUT.name} (${USER_INPUT.ic})`);
const category = determineCategory(USER_INPUT.household_income);
const hashedID = hashIC(USER_INPUT.ic);
console.log(`   > Category Determined: ${category}`);
console.log(`   > IC Hashed: ${hashedID.substring(0, 15)}...`);

// 2. Prepare Payload
console.log(`\n[Step 2] Constructing Token Payload`);
const payload = {
    sub: hashedID,
    attributes: {
        category: category,
        is_student: USER_INPUT.employment_status === 'Student',
        has_dependents: USER_INPUT.dependents > 0
    },
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
    exp: Date.now() + (1000 * 60 * 60) // 1 hour validity
};
console.log(`   > Attributes: ${JSON.stringify(payload.attributes)}`);

// 3. Sign Token (PQC Simulation)
console.log(`\n[Step 3] Signing Token (Simulating PQC)`);
const pqcSignature = signToken(payload);
console.log(`   > PQC Signature Generated: ${pqcSignature.substring(0, 20)}...`);

// 4. Create JWT
console.log(`\n[Step 4] Creating JWT`);
const token = jwt.sign({
    ...payload,
    pqc_signature: pqcSignature
}, SECRET_KEY);
// console.log(`   > JWT Created: ${token.substring(0, 50)}...`);
console.log(`   > JWT Created: ${token}...`);

// 5. Obfuscate
console.log(`\n[Step 5] Obfuscating Token (Steganographic Protection)`);
const obfuscatedToken = obfuscateToken(token);

console.log("\n==================================================");
console.log("FINAL GENERATED TOKEN (Copy this for verification):");
console.log("==================================================");
console.log(obfuscatedToken);
console.log("==================================================");
console.log("\nNOTE: Because the key was generated dynamically via BB84,");
console.log("you MUST update verify-token.js with the key below to verify this token:");
console.log(`Key: ${SECRET_KEY}`);
console.log("==================================================");
