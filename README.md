# @synet/credential

```
   _____                  _   
  / ____|                | |               
 | (___  _   _ _ __   ___| |_              
  \___ \| | | | '_ \ / _ \ __|             
  ____) | |_| | | | |  __/ |_              
 |_____/ \__, |_| |_|\___|\__|             
          __/ |                            
     ____|___/          _            _   _       _ 
    / ____|            | |          | | (_)     | |
   | |     _ __ ___  __| | ___ _ __ | |_ _  __ _| |
   | |    | '__/ _ \/ _` |/ _ \ '_ \| __| |/ _` | |
   | |____| | |  __/ (_| |  __/ | | | |_| | (_| | |
    \_____|_|  \___|\__,_|\___|_| |_|\__|_|\__,_|_|
                                           
version: 1.0.0  
```

**Production-ready W3C Verifiable Credentials** built on battle-tested @synet/keys. Issue, verify, and manage credentials with zero dependencies and full TypeScript support.

## Why @synet/credential?

✅ **W3C Standard Compatible** - Real verifiable credentials that work everywhere  
✅ **Built on @synet/keys** - Inherits 211 tests, 87% coverage, zero dependencies  
✅ **JWT Proof Format** - Industry-standard, widely supported  
✅ **Type Safe** - Full TypeScript support with proper error handling  
✅ **Simple & Powerful** - Clean functions + intelligent units that learn capabilities  
✅ **Production Ready** - Used in real identity systems and credential workflows  

**Supported**: Ed25519, RSA, secp256k1 keys • JWT proofs • W3C data model • Custom credential types

## Quick Start

### Option 1: Direct Functions (Simple & Fast)

Perfect for straightforward credential workflows:

```typescript
import { generateKeyPair, Signer } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { issueVC, verifyVC } from '@synet/credential';

// 1. Generate issuer keys
const keyPair = generateKeyPair('ed25519');

// 2. Create signer from keys  
const signer = Signer.create(
  keyPair.privateKey,
  keyPair.publicKey,
  'ed25519',
  { purpose: 'credential-issuing' }
);

// 3. Create proper DID
const issuerDid = createDIDKey(keyPair.publicKey, 'ed25519');

// 4. Issue a university degree credential
const credential = await issueVC(
  signer,
  {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith'
    },
    degree: 'Computer Science',
    university: 'Tech University',
    graduationYear: 2024
  },
  'UniversityDegreeCredential',
  issuerDid
);

if (credential.success) {
  console.log('✅ Credential issued:', credential.data.id);
  
  // 5. Verify the credential
  const verification = await verifyVC(signer, credential.data);
  console.log('✅ Verified:', verification.success);
} else {
  console.error('❌ Failed:', credential.error);
}
```

### Option 2: Credential (Advanced Learning)

For complex systems where units need to learn capabilities:

```typescript
import { generateKeyPair, Signer } from '@synet/keys';
import { Credential } from '@synet/credential';

// 1. Create issuer signer
const keyPair = generateKeyPair('ed25519');
const issuerSigner = Signer.create(keyPair.privateKey, keyPair.publicKey, 'ed25519');

// 2. Create credential unit
const credential = Credential.create();

// 3. Unit learns from signer (no private key transfer!)
const key = issuerSigner.createKey();
const capabilities = key.teach();
await credential.learn([capabilities]);

// 4. Now the unit can issue credentials autonomously
const credentialResult = await credential.issueCredential(
  {
    holder: { id: 'did:key:alice', name: 'Alice' },
    certification: 'Blockchain Developer',
    level: 'Advanced'
  },
  'CertificationCredential',
  issuerDid
);

console.log('🎓 Credential:', credential?.id);
```

**When to use each:**
- **Option 1**: Simple apps, document signing, quick prototypes
- **Option 2**: Complex identity systems, distributed workflows, enterprise apps

## Real-World Examples

### University Degree Credential

```typescript
import { generateKeyPair, Signer } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { issueVC, verifyVC } from '@synet/credential';

// University issuer setup
const universityKeys = generateKeyPair('ed25519');
const universitySigner = Signer.create(
  universityKeys.privateKey,
  universityKeys.publicKey,
  'ed25519'
);
const universityDid = createDIDKey(universityKeys.publicKey, 'ed25519');

// Issue degree credential
const degreeCredential = await issueVC(
  universitySigner,
  {
    holder: {
      id: 'did:key:student123',
      name: 'Alice Johnson'
    },
    degree: 'Master of Computer Science',
    university: 'Tech University',
    graduationDate: '2024-06-15',
    gpa: 3.85,
    honors: 'Magna Cum Laude'
  },
  'UniversityDegreeCredential',
  universityDid
);

console.log('🎓 Degree issued:', degreeCredential.data?.id);
```

### Employment Verification

```typescript
// Employer issuer setup
const employerKeys = generateKeyPair('ed25519');
const employerSigner = Signer.create(
  employerKeys.privateKey,
  employerKeys.publicKey,
  'ed25519'
);
const employerDid = createDIDKey(employerKeys.publicKey, 'ed25519');

// Issue employment credential
const employmentCredential = await issueVC(
  employerSigner,
  {
    employee: {
      id: 'did:key:employee456',
      name: 'Bob Smith'
    },
    employer: {
      name: 'Tech Corp Inc.',
      id: employerDid
    },
    position: 'Senior Software Engineer',
    startDate: '2022-03-01',
    endDate: '2024-07-31',
    salary: '$95,000',
    status: 'Good Standing'
  },
  'EmploymentCredential',
  employerDid
);

console.log('💼 Employment verified:', employmentCredential.data?.id);
```

### Multi-Party Verification Workflow

```typescript
// University verifies the degree credential
const degreeVerification = await verifyVC(universitySigner, degreeCredential.data);

// Employer verifies the employment credential  
const employmentVerification = await verifyVC(employerSigner, employmentCredential.data);

// Third party (bank) verifies both credentials
const bankKeys = generateKeyPair('ed25519');
const bankSigner = Signer.create(bankKeys.privateKey, bankKeys.publicKey, 'ed25519');

// Bank can verify without being the issuer
const bankVerifyDegree = await verifyVC(bankSigner, degreeCredential.data);
const bankVerifyEmployment = await verifyVC(bankSigner, employmentCredential.data);

console.log('🏦 Bank verification results:');
console.log('   Degree valid:', bankVerifyDegree.success);
console.log('   Employment valid:', bankVerifyEmployment.success);
```

## Core Functions

Battle-tested functions for credential operations:

### Credential Issuance

```typescript
import { issueVC, createCredentialSubject } from '@synet/credential';

// Issue a credential
const result = await issueVC(
  signer,                    // Signer from @synet/keys
  credentialSubject,         // Your credential data
  'CredentialType',          // W3C credential type
  issuerDid                  // DID of the issuer
);

// Create properly structured credential subject
const subject = createCredentialSubject({
  holder: { id: 'did:key:alice', name: 'Alice' },
  university: 'Tech University',
  degree: 'Computer Science'
});
```

### Credential Verification

```typescript
import { verifyVC, validateCredentialStructure } from '@synet/credential';

// Verify credential signature and integrity
const verification = await verifyVC(signer, credential);

if (verification.success) {
  console.log('✅ Valid credential');
  console.log('Issuer:', verification.data.issuer);
  console.log('Subject:', verification.data.subject);
} else {
  console.error('❌ Invalid:', verification.error);
}

// Validate W3C structure only (no signature verification)
const structureValid = validateCredentialStructure(credential);
```

### Credential Utilities

```typescript
import { 
  extractCredentialData, 
  getCredentialType, 
  isExpired,
  createCredentialId 
} from '@synet/credential';

// Extract data from credential
const data = extractCredentialData(credential);

// Get credential type
const type = getCredentialType(credential); // 'UniversityDegreeCredential'

// Check if expired
const expired = isExpired(credential);

// Generate unique credential ID
const credentialId = createCredentialId('IdentityCredential');
```

// 2. Create proper DID from the key
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');

// 3. Create Key unit for signing
const issuerKey = Key.fromKeyPair('ed25519', keyPair.publicKey, keyPair.privateKey, {
  name: 'issuer-key'
});

// 4. Issue credential with proper DID
const result = await issueVC(
  ## Credential (Advanced)

For complex systems, use the intelligent Credential that learns capabilities:

### Basic Credential Usage

```typescript
import { Credential } from '@synet/credential';
import { generateKeyPair, Signer } from '@synet/keys';

// 1. Create credential unit
const credential = Credential.create();

// 2. Create signer
const keyPair = generateKeyPair('ed25519');
const signer = Signer.create(keyPair.privateKey, keyPair.publicKey, 'ed25519');

// 3. Unit learns from signer (no private key transfer!)
const key = signer.createKey();
const capabilities = key.teach();
await credential.learn([capabilities]);

// 4. Now the unit can operate autonomously
const credentialResult = await credential.issueCredential(
  credentialSubject,
  'CertificationCredential',
  issuerDid
);
```

### Credential API

```typescript
class Credential {
  // Creation
  static create(): Credential
  
  // Learning capabilities
  learn(capabilities: TeachingCapabilities[]): Promise<boolean>
  
  // Operations (after learning)
  async issueCredential(subject: any, type: string, issuerDid: string): Promise<SynetVerifiableCredential | null>
  async verifyCredential(credential: any): Promise<VerificationResult | null>
  validateStructure(credential: any): boolean
  
  // Unit interface
  async execute(command: string, params?: any): Promise<Result<any>>
  capabilities(): string[]
  whoami(): string
}
```

## API Reference

### Core Functions

```typescript
// Issue verifiable credential
issueVC(
  signer: Signer,              // From @synet/keys
  subject: BaseCredentialSubject,
  type: string,
  issuerDid: string
): Promise<Result<SynetVerifiableCredential>>

// Verify verifiable credential  
verifyVC(
  signer: Signer,              // From @synet/keys
  credential: SynetVerifiableCredential
): Promise<Result<VerificationResult>>

// Validate credential structure
validateCredentialStructure(
  credential: any
): boolean

// Create credential subject
createCredentialSubject(
  data: Record<string, any>
): BaseCredentialSubject
```

### Types

```typescript
interface SynetVerifiableCredential<T = BaseCredentialSubject> {
  '@context': string[];
  id: string;
  type: string[];
  issuer: { id: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: T;
  proof: {
    type: 'JwtProof2020';
    jwt: string;
    verificationMethod: string;
  };
}

interface VerificationResult {
  verified: boolean;
  issuer: string;
  subject: string;
  issuanceDate: string;
  expirationDate?: string;
}

interface BaseCredentialSubject {
  holder: {
    id: string;
    name?: string;
  };
  [key: string]: any;
}
```

## Installation

```bash
npm install @synet/credential @synet/keys @synet/did
```

The package requires `@synet/keys` for cryptographic operations and `@synet/did` for proper DID creation.

## Error Handling

All functions return `Result<T>` for type-safe error handling:

```typescript
import { issueVC } from '@synet/credential';

const result = await issueVC(signer, subject, 'TestCredential', issuerDid);

if (result.isSuccess()) {
  const credential = result.getData();
  console.log('✅ Credential issued:', credential.id);
} else {
  const error = result.getError();
  console.error('❌ Failed to issue:', error.message);
}
```

## Common Patterns

### Multiple Credentials

```typescript
// Issue multiple credentials for a single holder
const credentials = await Promise.all([
  issueVC(signer, degreeSubject, 'UniversityDegreeCredential', universityDid),
  issueVC(signer, employmentSubject, 'EmploymentCredential', employerDid),
  issueVC(signer, certificationSubject, 'CertificationCredential', certifierDid)
]);

console.log(`Issued ${credentials.length} credentials`);
```

### Credential Chain Verification

```typescript
// Verify a chain of related credentials
const verifyCredentialChain = async (credentials: SynetVerifiableCredential[]) => {
  const results = await Promise.all(
    credentials.map(cred => verifyVC(signer, cred))
  );
  
  return results.every(result => result.isSuccess());
};
```

### Custom Credential Types

```typescript
interface SkillCredentialSubject extends BaseCredentialSubject {
  skill: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  endorsedBy: string;
  validUntil?: string;
}

const skillCredential = await issueVC(
  signer,
  {
    holder: { id: 'did:key:dev123', name: 'Jane Developer' },
    skill: 'TypeScript',
    level: 'Expert',
    endorsedBy: 'Senior Tech Lead'
  } as SkillCredentialSubject,
  'SkillCredential',
  organizationDid
);
```

## Testing

The architecture makes testing simple with predictable pure functions:

```typescript
import { issueVC, verifyVC } from '@synet/credential';
import { generateKeyPair, Signer } from '@synet/keys';

describe('Credential Tests', () => {
  let signer: Signer;
  let issuerDid: string;

  beforeEach(() => {
    const keyPair = generateKeyPair('ed25519');
    signer = Signer.create(keyPair.privateKey, keyPair.publicKey, 'ed25519');
    issuerDid = `did:key:${keyPair.publicKey}`;
  });

  test('should issue and verify credential', async () => {
    const subject = {
      holder: { id: 'did:key:test', name: 'Test User' },
      test: true
    };

    const issueResult = await issueVC(signer, subject, 'TestCredential', issuerDid);
    expect(issueResult.isSuccess()).toBe(true);

    const credential = issueResult.getData();
    const verifyResult = await verifyVC(signer, credential);
    expect(verifyResult.isSuccess()).toBe(true);
  });
});
```

---

Built on [@synet/keys](../keys) • Part of the [Synet](/) ecosystem

// Create proper standards-compliant DID from Key unit
const issuerDid = createDIDKey(key.publicKeyHex, 'Ed25519');
```

### Credential Operations

```typescript
import { issueVC, verifyVC } from '@synet/credential';

// Issue a credential
const result = await issueVC(
  key,               // Key unit from @synet/keys
  subject,
  'IdentityCredential',
  issuerDid,
  options
);

// Verify a credential
const verification = await verifyVC(key, credential);
```

### Utility Functions

```typescript
import { 
  generateCredentialId, 
  createCredentialPayload,
  validateCredential,
  CredentialUtils 
} from '@synet/credential';

// Generate credential ID
const id = generateCredentialId('IdentityCredential');

// Create credential payload
const payload = createCredentialPayload(subject, 'IdentityCredential', issuerDid);

// Validate credential structure
const validation = validateCredential(credential);

// Utility operations
const isExpired = CredentialUtils.isExpired(credential);
const age = CredentialUtils.getCredentialAge(credential);
```

## CredentialKey Interface

### Version Conflicts

When two packages depend on different versions of the same library, you can get **"Type incompatibility"** errors even when the functionality is identical. This is especially problematic with key types:

```typescript
// This fails if @synet/keys v1.0.0 and v1.0.1 are used together
import { Key as KeyV1 } from '@synet/keys@1.0.0';
import { Key as KeyV2 } from '@synet/keys@1.0.1';

// Type error: KeyV1 is not assignable to KeyV2
function useKey(key: KeyV2) { ... }
useKey(keyV1Instance); // ❌ Type error!
```

### The Solution: CredentialKey Interface

`@synet/credential` defines its own `CredentialKey` interface that acts as a **dependency moat**:

```typescript
// In @synet/credential/src/key.ts
export interface CredentialKey {
  readonly id: string;
  readonly publicKeyHex: string;
  readonly type: string;
  readonly meta: Record<string, unknown>;
  
  canSign(): boolean;
  getPublicKey(): string;
  sign(data: string): Promise<string>;
  verify(data: string, signature: string): Promise<boolean>;
  toJSON(): object;
  toVerificationMethod(controller: string): object;
}
```

### How It Works

1. **Credential functions only use the interface**:

   ```typescript
   // Uses interface, not concrete type
   export async function issueVC(
     key: CredentialKey, // ← Interface, not @synet/keys Key
     subject: BaseCredentialSubject,
     type: string,
     issuerDid: string
   ): Promise<Result<W3CVerifiableCredential>>
   ```
2. **Any key provider can implement the interface**:

   ```typescript
   // @synet/keys Key implements CredentialKey
   import { Key } from '@synet/keys';
   const key = await Key.generate();
   await issueVC(key, subject, type, issuerDid); // ✅ Works!

   // Custom key provider
   class MyCustomKey implements CredentialKey {
     // ... implement interface methods
   }
   const customKey = new MyCustomKey();
   await issueVC(customKey, subject, type, issuerDid); // ✅ Also works!
   ```
3. **Version conflicts are prevented**:

   ```typescript
   // Different versions of @synet/keys both implement CredentialKey
   import { Key as KeyV1 } from '@synet/keys@1.0.0';
   import { Key as KeyV2 } from '@synet/keys@1.0.1';

   const keyV1 = await KeyV1.generate();
   const keyV2 = await KeyV2.generate();

   // Both work with credential functions
   await issueVC(keyV1, subject, type, issuerDid); // ✅ Works!
   await issueVC(keyV2, subject, type, issuerDid); // ✅ Works!
   ```

### Example: Multiple Key Providers

```typescript
import { Key as SynetKey } from '@synet/keys';
import { VaultKey } from '@company/vault-keys';
import { HSMKey } from '@company/hsm-keys';
import { issueVC } from '@synet/credential';

// All implement CredentialKey interface
const synetKey = await SynetKey.generate();
const vaultKey = new VaultKey(vaultConfig);
const hsmKey = new HSMKey(hsmConfig);

// All work with credential functions
await issueVC(synetKey, subject, type, issuerDid); // ✅
await issueVC(vaultKey, subject, type, issuerDid); // ✅
await issueVC(hsmKey, subject, type, issuerDid);   // ✅
```

This pattern ensures that `@synet/credential` remains stable and compatible while allowing maximum flexibility in key management solutions.
