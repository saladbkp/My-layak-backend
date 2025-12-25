<p align="center">
  <img src="https://dummyimage.com/1300x260/0a0a0a/00eaff&text=MyLayak+Kiosk+Prototype" width="100%">
</p>

<h1 align="center">MyLayak — Zero-Trust Eligibility Kiosk </h1>

<h3 align="center">
MyLayak is a zero-trust eligibility platform that lets citizens instantly discover government services they already qualify for — without exposing personal data.

</h3>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-00c853?style=flat-square">
  <img src="https://img.shields.io/badge/demo-prototype-blue?style=flat-square">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square">
</p>

---

# 📌 Overview
**MYLAYAK** is a **Proactive Eligibility Wallet** that fixes Malaysia’s biggest subsidy problem — eligibility doesn’t equal receiving. Today, millions of citizens qualify for support but miss out due to forms, scattered systems, and scams that make the process confusing and unsafe.

MyLayak changes this by combining **MyDigital ID steganographic QR verification**, **Soulbound Eligibility Tokens (SETs)**, and a **zero-trust security architecture** to instantly verify eligibility **without exposing any personal data**.

It consolidates verified eligibility attributes such as **B40**, **student**, **senior citizen**, and **STR-related status** into a single secure wallet, then automatically matches citizens to services they already qualify for.

**No applications. No repeated uploads. No fraud.**

**MyLayak makes benefits find the people — securely, instantly, and for everyone.**

---

FINAL 
info       ------------>
security ------------>
```
                     ┌──────────────────────────────────────────────┐
                     │                MyDigital ID                  │
                     │  (National Identity Provider / IdP)          │
                     │──────────────────────────────────────────────│
                     │  • Performs biometric login                  │
                     │  • Issues OIDC ID Token (sub = hash ID)      │
                     │  • Never sends personal data                 │
                     └──────────────────────────────────────────────┘
                                           │
                                           │ OIDC (ID Token: sub, amr, loa)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                                MyLayak App                                 │
│         (Zero-Trust Orchestrator — No sensitive data stored)               │
│────────────────────────────────────────────────────────────────────────────│
│  • Receives hashed citizen ID (sub)                                        │
│  • Queries Gov Eligibility Service using sub                               │
│  • Verifies PQC-signed SET Tokens                                          │
│  • Only displays eligibility outcomes to citizen                           │
│  • Never sees raw income, documents, or identity                           │
└────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ API Call (sub only)
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │                 Gov Eligibility Service                 │
              │ (Authoritative Source of Eligibility Decisions)         │
              │─────────────────────────────────────────────────────────│
              │  Internal data fusion via secure gov network:           │
              │   • LHDN  → Income Band                                 │
              │   • DOSM  → Household classification                    │
              │   • eKasih → Poverty / welfare                          │
              │   • NRD   → Age / citizenship                           │
              │                                                         │
              │  Computes attributes (B40/M40/T20, student, senior…)    │
              │  Generates SET Token payload                            │
              │  Signs token using PQC key stored in HSM                │
              └─────────────────────────────────────────────────────────┘
                                           │
                                           │ PQC-Signed SET Token
                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│           MyLayak Backend — Token Validator & Service Gateway              │
│────────────────────────────────────────────────────────────────────────────│
│  • Validates PQC signature using Gov public key                            │
│  • Stores token reference (not token itself)                               │
│  • Exposes "Eligible services" to kiosk                                    │
│  • Sends only minimal disclosure attributes to agencies                    │
└────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ Rendered result only (no tokens)
                                           ▼
               ┌───────────────────────────────────────────────┐
               │         Untrusted Public Kiosk (UI)           │
               │───────────────────────────────────────────────│
               │  • Displays services and messages             │
               │  • Never stores data                          │
               │  • Never receives tokens                      │
               │  • Zero state, zero trust                     │
               └───────────────────────────────────────────────┘

```

---
# Backend

## 1 TOKEN -> SET with JWT TOKEN with key 
```
const SECRET_KEY = "my-layak-secret-key-very-secure";

const payload = {
	sub: hashedID,
	attributes: {
		category: category,
		is_student: citizenData.employment_status === 'Student',
		has_dependents: citizenData.dependents > 0
	},
	nonce: crypto.randomBytes(16).toString('hex'),
	iat: Date.now(),
	exp: Date.now() + (1000 * 60 * 60) // 1 hour validity
};
```
SPECIAL obfuscation + deobfuscate
XOR first 2 with sign + ROT13 
so eyJhbGciOiJIUzI1NiIs -> ZGpFYPjZRyx1WUkxNOy5

DOUBLE LAYER -> KEY STORED IN BACKEND + OBFUSCATE JWT PATTERN

TO GENERATE
```
C:\Users\Asus\Desktop\MyLayak\test>node generate-token.js
=== START: Generate Token (Offline Simulation) ===

[Step 0] Establishing Quantum-Safe Key via BB84 Protocol
   > QKD Successful. QBER: 0.00%
   > Shared Secret Key Established: 5a8ce476fb06f2548ae2190fb54eae1e
   > (Note: In a real scenario, this key is never exposed, only used for signing)
[Step 1] Processing User Data for: Ali Bin Abu (900101-14-1234)
   > Category Determined: B40
   > IC Hashed: 135f46f51b7d824...

[Step 2] Constructing Token Payload
   > Attributes: {"category":"B40","is_student":false,"has_dependents":true}

[Step 3] Signing Token (Simulating PQC)
   > PQC Signature Generated: PQC-SIG-c3900a9675b6...

[Step 4] Creating JWT
   > JWT Created: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMzVmNDZmNTFiN2Q4MjQ5NDI1Njc5YzBjNjM4OTZjM2Q4ODUyYzI0YWQyZWU0NjVmMzNmYWU3OWU5ZmM3Njk0IiwiYXR0cmlidXRlcyI6eyJjYXRlZ29yeSI6IkI0MCIsImlzX3N0dWRlbnQiOmZhbHNlLCJoYXNfZGVwZW5kZW50cyI6dHJ1ZX0sIm5vbmNlIjoiMTU0MTVmYTIxNWU3MmQwNzI2MTgzZDIxZjRlMzBjZjciLCJpYXQiOjE3NjY2NzY4ODc5MjUsImV4cCI6MTc2NjY4MDQ4NzkyNSwicHFjX3NpZ25hdHVyZSI6IlBRQy1TSUctYzM5MDBhOTY3NWI2MmU3NGQwNjhmZjUyOTljODg0NDU2NjA0YzM0MmRmNmJjNTMwZGQzYmJkNWIxYjNkMGViMSJ9.boODt-bG2UTXtYoUsv0aOOBTSN8cbe5OFg7xAdzETlM...

[Step 5] Obfuscating Token (Steganographic Protection)

==================================================
FINAL GENERATED TOKEN (Copy this for verification):
==================================================
OkLSYOMdNF59CO4EVFZzMQ0srEVTVEOuZN1kIFfBEEpDWU1OojRQQl4VTvfTNP09IF89MQtnUP40VDR1U35GUafCCtW7qvpeIUfyWIWhNtZBAP8MJNV2AFHWEakJPULNYDRBRS8ZWPqWBktnpub5TSHhTPgLSuRlOQpJZH8sBFS-YNHxqQ1RSF5eQDMbSmDQCOphLt0fAtgvAwqlPGf9MlZpID4OWQpmpk0UOSVvQN0UMN8eFN1aSxD9BNpsSS4jWtNiQwffpP0BXKLSXG5iAvp-CEZwAucKOOHGDE0OCagwZON-nQHADjI5QUb5VQxqVaRWQDk4TkAKrvjKPFZEUEDQAGc8PEy8SDyVUTLIVQ4IQmp_FQfyUF4MXDkFBDtTKNZSYHpuTGHGPw4csvjSSaL6ImgmsER3oGxmBvL6T2MIYNjYLu4nJ1RfQ2k7PlAzGN8rRGjnCmbYQNpPUaIEPHVCMz0pCFpQPvkwXUxTYuLOU0SFAwMtYQV-GGI0XG4UCPZMB1jORm0sYlcaMubsWF4uCkfontfnAt0NClE3WjIIrjfGIKxFNSDwCkypNN89VtbMMjtWMutwNwZVSDjrCSfiTNL6QGxNHl4yZ1jPSF0B.boODt-bG2UTXtYoUsv0aOOBTSN8cbe5OFg7xAdzETlM
==================================================

NOTE: Because the key was generated dynamically via BB84,
you MUST update verify-token.js with the key below to verify this token:
Key: 5a8ce476fb06f2548ae2190fb54eae1e
==================================================

```

TO VERFIY
```
C:\Users\Asus\Desktop\MyLayak\test>node verify-token.js OkLSYOMdNF59CO4EVFZzMQ0srEVTVEOuZN1kIFfBEEpDWU1OojRQQl4VTvfTNP09IF89MQtnUP40VDR1U35GUafCCtW7qvpeIUfyWIWhNtZBAP8MJNV2AFHWEakJPULNYDRBRS8ZWPqWBktnpub5TSHhTPgLSuRlOQpJZH8sBFS-YNHxqQ1RSF5eQDMbSmDQCOphLt0fAtgvAwqlPGf9MlZpID4OWQpmpk0UOSVvQN0UMN8eFN1aSxD9BNpsSS4jWtNiQwffpP0BXKLSXG5iAvp-CEZwAucKOOHGDE0OCagwZON-nQHADjI5QUb5VQxqVaRWQDk4TkAKrvjKPFZEUEDQAGc8PEy8SDyVUTLIVQ4IQmp_FQfyUF4MXDkFBDtTKNZSYHpuTGHGPw4csvjSSaL6ImgmsER3oGxmBvL6T2MIYNjYLu4nJ1RfQ2k7PlAzGN8rRGjnCmbYQNpPUaIEPHVCMz0pCFpQPvkwXUxTYuLOU0SFAwMtYQV-GGI0XG4UCPZMB1jORm0sYlcaMubsWF4uCkfontfnAt0NClE3WjIIrjfGIKxFNSDwCkypNN89VtbMMjtWMutwNwZVSDjrCSfiTNL6QGxNHl4yZ1jPSF0B.boODt-bG2UTXtYoUsv0aOOBTSN8cbe5OFg7xAdzETlM 5a8ce476fb06f2548ae2190fb54eae1e
=== START: Verify Token (Offline Simulation) ===

Using Secret Key: 5a8ce...
Input Token: OkLSYOMdNF59CO4EVFZzMQ0srEVTVE...

[Step 1] De-obfuscating Token...
   > Success! Recovered standard JWT format.
   > Header: eyJhbGciOi...
   > Payload: eyJzdWIiOi...
   > Signature: boODt-bG2U...

[Step 2] Verifying JWT Integrity & Signature...
   > Signature Valid. Token is authentic.

[Step 3] Decoding Attributes
   > User Hash (sub): 135f46f51b7d824...
   > Category: B40
   > Is Student: false
   > Has Dependents: true

[Step 4] Checking Quantum-Safe Signature
   > PQC Signature Found: PQC-SIG-c3900a9675b6...
   > [PASS] Token is Quantum-Safe.

=== VERIFICATION COMPLETE: SUCCESS ===
```

## 2 QR STEGA SCANNER  
```
const payload = qr.data;
visible payload: DIGITALID:SESSION=ABC123

const ts = bitsToInt(bits.slice(0, 32));
const tag = bitsToInt(bits.slice(32));
SECRET = CHANGE_ME_SECRET
const expected = hmac32(SECRET, `${payload}|${ts}`);

TAG MUST == expected
```
WHAT THE DIFF? HOW TO STEGA INSIDE?

QR CODE have its own Error-Correction Area
design to be fault tolerant 
- You **intentionally choose specific QR squares** that:
    - Do **not affect normal scanning**
    - Are normally ignored by standard scanners
- You use these squares to:
    - Represent **0s and 1s**
    - Encode a **timestamp + cryptographic fingerprint**

- 👀 **Humans cannot see the difference**
- 📱 **Normal QR scanners do not detect it**

attack even generate the qr code by the visible payload also cannot regenerate it 
because the scanner is different 
<img width="591" height="577" alt="image" src="https://github.com/user-attachments/assets/d99f1448-9a4d-4509-bdd0-cbae58e2400d" />


now the issue is ik upload image confirm can work, but idk scan this can work or not (idh cam)

TO GENERATE
```
C:\Users\Asus\Desktop\MyLayak\test>node generate-qr.js
[+] QR generated
[+] timestamp: 1766676989
[+] tag: 8a9bca1b
```

TO VERIFY
```
C:\Users\Asus\Desktop\MyLayak\test>node scanner-qr.js qr.png
[*] Scanning file: qr.png
[+] visible payload: DIGITALID:SESSION=ABC123
[+] timestamp: 1766676989 diff: 38
[+] tag: 8a9bca1b
[+] expected: 8a9bca1b
✅ VALID QR (has stega + time bound)

C:\Users\Asus\Desktop\MyLayak\test>node scanner-qr.js fake.png
[*] Scanning file: fake.png
[+] visible payload: DIGITALID:SESSION=ABC123
[+] timestamp: 2971662352 diff: 1204985320
[+] tag: 137389be
[+] expected: c7e40c99
❌ INVALID: stega mismatch

C:\Users\Asus\Desktop\MyLayak\test>node scanner-qr.js qr.png
[*] Scanning file: qr.png
[+] visible payload: DIGITALID:SESSION=ABC123
[+] timestamp: 1766676989 diff: 61
[+] tag: 8a9bca1b
[+] expected: 8a9bca1b
❌ INVALID: expired
```

## 3 QUANTUM 
currently using bb84
注意!!! 
不是"量子比 AES/RSA/ECC 更安全"
而是"量子让 --> 偷密钥 这件事可被发现、可被拒绝、不可事后回溯"

QKD 不依赖"算不出来"
QKD 依赖"不能被观察而不留下痕迹"

Explanation of record now, decrypt later 
attackers can store encrypted traffic today and decrypt it years later when stronger computers (especially quantum computers) become available.
QKD prevents this by making the encryption keys unavailable forever, even in the future.

THIS IS NORMAL CASE 
```
PS C:\Users\Asus\Desktop\MyLayak> node .\test\bb84.js
=== BB84 QKD Simulation (JS) ===
N qubits sent:               2000
Eve enabled:                false
Eve intercept rate:         1
Sifted bits (basis match):  992
Sampled for QBER check:     198
Sample errors:              0
QBER (error rate):          0.00%
QBER threshold:             11.00%
Detected eavesdropping?:    NO (OK)
Raw key bits left:          794
Final key (PA, hex):        a6caeb34829596c40b0f7a2bc965ed4a
```

THIS IS ATTACKER CASE
```
PS C:\Users\Asus\Desktop\MyLayak> node .\test\bb84.js
=== BB84 QKD Simulation (JS) ===
N qubits sent:               2000
Eve enabled:                true
Eve intercept rate:         1
Eve intercepted count:      2000
Sifted bits (basis match):  977
Sampled for QBER check:     195
Sample errors:              51
QBER (error rate):          26.15%
QBER threshold:             11.00%
Detected eavesdropping?:    YES (ABORT)
Raw key bits left:          782
Final key (PA, hex):        e880ed40b1c8591fe2083eb65d4b81e9
```


**MYLAYAK makes benefits find the people securely, instantly, and for everyone.**

---
