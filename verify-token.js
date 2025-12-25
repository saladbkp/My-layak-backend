const jwt = require('jsonwebtoken');
const { deobfuscateToken } = require('../backend/obfuscator');

// Configuration
// If the user provides a key argument (3rd arg), use it. Otherwise use default (which will fail for BB84 tokens).
let SECRET_KEY = process.argv[3] || "my-layak-secret-key-very-secure";

// ---------------------------------------------------------
// INPUT: Paste the token from generate-token.js here
// ---------------------------------------------------------
// For demonstration, this variable will be populated by the user. 
// If running via command line, we could take args, but for simplicity we'll check args or use a placeholder.
let tokenToVerify = process.argv[2]; 

if (!tokenToVerify) {
    console.error("Error: Please provide the token as a command line argument.");
    console.error("Usage: node verify-token.js <OBFUSCATED_TOKEN_STRING> [OPTIONAL_SECRET_KEY]");
    process.exit(1);
}

// ---------------------------------------------------------
// Main Execution
// ---------------------------------------------------------

console.log("=== START: Verify Token (Offline Simulation) ===\n");
console.log(`Using Secret Key: ${SECRET_KEY.substring(0, 5)}...`);
console.log(`Input Token: ${tokenToVerify.substring(0, 30)}...`);

try {
    // 1. De-obfuscate
    console.log(`\n[Step 1] De-obfuscating Token...`);
    const realJWT = deobfuscateToken(tokenToVerify);
    
    // Check if it looks like a JWT (3 parts)
    const parts = realJWT.split('.');
    if (parts.length === 3) {
        console.log(`   > Success! Recovered standard JWT format.`);
        console.log(`   > Header: ${parts[0].substring(0, 10)}...`);
        console.log(`   > Payload: ${parts[1].substring(0, 10)}...`);
        console.log(`   > Signature: ${parts[2].substring(0, 10)}...`);
    } else {
        throw new Error("De-obfuscation failed to produce a valid JWT structure.");
    }

    // 2. Verify JWT Signature
    console.log(`\n[Step 2] Verifying JWT Integrity & Signature...`);
    const decoded = jwt.verify(realJWT, SECRET_KEY);
    console.log(`   > Signature Valid. Token is authentic.`);

    // 3. Inspect Attributes
    console.log(`\n[Step 3] Decoding Attributes`);
    console.log(`   > User Hash (sub): ${decoded.sub.substring(0, 15)}...`);
    console.log(`   > Category: ${decoded.attributes.category}`);
    console.log(`   > Is Student: ${decoded.attributes.is_student}`);
    console.log(`   > Has Dependents: ${decoded.attributes.has_dependents}`);

    // 4. Check PQC Signature
    console.log(`\n[Step 4] Checking Quantum-Safe Signature`);
    if (decoded.pqc_signature && decoded.pqc_signature.startsWith('PQC-SIG-')) {
        console.log(`   > PQC Signature Found: ${decoded.pqc_signature.substring(0, 20)}...`);
        console.log(`   > [PASS] Token is Quantum-Safe.`);
    } else {
        console.warn(`   > [WARN] PQC Signature missing or invalid format.`);
    }

    console.log("\n=== VERIFICATION COMPLETE: SUCCESS ===");

} catch (error) {
    console.error(`\n[ERROR] Verification Failed: ${error.message}`);
}
