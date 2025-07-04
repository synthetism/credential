# @synet/credential

```bash
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

A universal library for issuing and verifying W3C-compatible verifiable credentials (VCs). Built with composability, extensibility, and minimalism in mind.

## Features

- ✅ **Pure Functions**: Composable, side-effect-free credential operations
- ✅ **Key/Signer Architecture**: Clean separation between keys and signing operations
- ✅ **Progressive Security**: From simple direct keys to enterprise vault/HSM integration
- ✅ **Universal W3C Compatibility**: Works with any W3C-compatible credential system
- ✅ **Type Safety**: Full TypeScript support with compile-time key type checking
- ✅ **Zero Dependencies**: Self-contained with native Node.js crypto (SHA-3 for cuid2)
- ✅ **Extensible**: Easy to extend for custom credential types and proof formats
- ✅ **JWT Proof Support**: Industry-standard JWT proof format
- ✅ **Testing Ready**: Comprehensive test suite and utilities

## Quick Start

```typescript
import { generateKeyPair } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { Key, issueVC, verifyVC } from '@synet/credential';

// 1. Generate a real cryptographic key pair
const keyPair = generateKeyPair('ed25519', { format: 'raw' });

// 2. Create a proper DID from the key
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');

// 3. Create a Key unit
const issuerKey = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

// 4. Create a credential subject
const subject = {
  holder: {
    id: 'did:key:alice123',
    name: 'Alice Smith',
  },
  issuedBy: {
    id: issuerDid,
    name: 'Synet Authority',
  },
};

// 4. Issue a credential
const result = await issueVC(
  issuerKey,
  subject,
  'IdentityCredential',
  issuerDid
);

if (result.success) {
  // 5. Verify the credential
  const verification = await verifyVC(issuerKey, result.data);
  console.log('Verified:', verification.success);
}
```

## Key Unit Architecture

The @synet/credential library implements a clean **Unit Architecture** where each Key is a self-contained unit with all necessary capabilities. This approach eliminates the need for external "manager" abstractions and provides maximum composability.

### The Key Unit

A Key is a complete, autonomous unit that:

- **Holds** cryptographic material (public key, optional private key)
- **Knows** its own capabilities (can it sign?)
- **Performs** operations (sign, verify etc.)
- **Transforms** itself (to public key, to verification method, etc.)

```typescript
// Key creation methods
const directKey = Key.create({
  publicKeyHex: '...',
  privateKeyHex: '...',
  type: 'Ed25519'
});

const signerKey = Key.createWithSigner({
  publicKeyHex: '...',
  signer: customSigner
});

const publicKey = Key.createPublic({
  publicKeyHex: '...'
});

// Key capabilities
key.canSign()              // Check if key can sign
key.getPublicKey()         // Get public key
key.toPublicKey()         // Create public-only copy
key.toVerificationMethod() // Create verification method
key.toJSON()              // Export (excludes private key)

// Key operations
await key.sign(data)       // Sign data
await key.verify(data, sig) // Verify signature

// DID creation (use @synet/did)
import { createDIDKey } from '@synet/did';
const did = createDIDKey(key.publicKeyHex, key.type);
```

### Progressive Security Models

The Key Unit architecture supports three security models:

#### 1. DirectKey (Simple)

```typescript
import { generateKeyPair } from '@synet/keys';

const keyPair = generateKeyPair('ed25519', { format: 'raw' });
const key = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

// Direct signing with private key material
await key.sign(data);
```

#### 2. SignerKey (Secure)

```typescript
// For vault/HSM integration
class VaultSigner implements Signer {
  async sign(data: string): Promise<string> {
    // Call vault/HSM for signing
    return await this.vault.sign(data);
  }
  
  getPublicKey(): string {
    return this.publicKey;
  }
}

const key = Key.createWithSigner({
  publicKeyHex: vaultPublicKey,
  signer: new VaultSigner()
});

// Secure signing without exposing private key
await key.sign(data);
```

#### 3. PublicKey (Verification Only)

```typescript
const publicKey = key.toPublicKey();

// Only verification, no signing
await publicKey.verify(data, signature);
publicKey.canSign(); // false
```

### Type Safety

The architecture provides compile-time type safety:

```typescript
// Type guards
function isDirectKey(key: Key): key is DirectKey;
function isSignerKey(key: Key): key is SignerKey;
function isPublicKey(key: Key): key is PublicKey;

// Usage
if (isDirectKey(key)) {
  // TypeScript knows key.privateKeyHex exists
  console.log(key.privateKeyHex);
}

if (isSignerKey(key)) {
  // TypeScript knows key.signer exists
  console.log(key.signer.getAlgorithm());
}
```

### Unit API Surface

Each Key unit exposes a complete, composable API:

```typescript
interface Key {
  // Identity
  readonly id: string;
  readonly publicKeyHex: string;
  readonly privateKeyHex?: string;
  readonly type: string;
  readonly meta: KeyMeta;
  readonly signer?: Signer;
  
  // Capabilities
  canSign(): boolean;
  getPublicKey(): string;
  
  // Operations
  sign(data: string): Promise<string>;
  verify(data: string, signature: string): Promise<boolean>;
  
  // Transformations
  toPublicKey(): PublicKey;
  toVerificationMethod(controller: string): VerificationMethod;
  toJSON(): KeyExport;
}
}
```

### Integration with @synet/keys

The Key Unit architecture integrates seamlessly with @synet/keys for proper cryptographic key generation:

```typescript
import { generateKeyPair } from '@synet/keys';
import { Key } from '@synet/credential';

// Generate real Ed25519 keys
const keyPair = generateKeyPair('ed25519', { format: 'raw' });

// Create Key unit
const key = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

// Create proper DID using @synet/did
import { createDIDKey } from '@synet/did';
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');

// Use in credential operations
const credential = await issueVC(key, subject, 'IdentityCredential', issuerDid);
```

### Pure Function API

The core credential functions are pure and composable:

```typescript
// Issue a verifiable credential
async function issueVC<S extends BaseCredentialSubject>(
  key: Key,                    // The signing key unit
  subject: S,                  // Credential subject
  type: string | string[],     // Credential type(s)
  issuerDid: string,           // Required issuer DID (use @synet/did)
  options?: CredentialIssueOptions
): Promise<Result<W3CVerifiableCredential<S>>>

// Verify a verifiable credential
async function verifyVC(
  verificationKey: Key,        // The verification key unit
  credential: W3CVerifiableCredential,
  options?: CredentialVerifyOptions
): Promise<Result<VerificationResult>>
```

### DID Creation Flow

**Important**: The Key Unit does not create DIDs directly. Use the proper flow with `@synet/did`:

```typescript
import { generateKeyPair } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { Key, issueVC } from '@synet/credential';

// 1. Generate cryptographic key pair
const keyPair = generateKeyPair('ed25519');

// 2. Create proper DID from the key
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');

// 3. Create Key unit for signing
const issuerKey = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

// 4. Issue credential with proper DID
const result = await issueVC(
  issuerKey,
  subject,
  'IdentityCredential',
  issuerDid  // Required: proper DID from @synet/did
);
```

This ensures proper DID standards compliance and avoids confusion between raw keys and proper DIDs.

### Key Unit Architecture Benefits

1. **No Manager Abstractions**: No need for KeyManager, SignerManager, etc.
2. **Self-Contained**: Each key knows its own capabilities
3. **Composable**: Pure functions with key units as parameters
4. **Type Safe**: Compile-time verification of key capabilities
5. **Progressive**: From simple to enterprise security models
6. **Testable**: Easy to mock and test individual units
7. **Extensible**: Easy to add new key types and signers

## API Reference

### Pure Functions

The core API consists of pure, composable functions:

```typescript
// Issue a verifiable credential
async function issueVC<S extends BaseCredentialSubject>(
  key: Key,
  subject: S,
  type: string | string[],
  issuerDid?: string,
  options?: CredentialIssueOptions
): Promise<Result<W3CVerifiableCredential<S>>>

// Verify a verifiable credential
async function verifyVC(
  verificationKey: Key,
  credential: W3CVerifiableCredential,
  options?: CredentialVerifyOptions
): Promise<Result<VerificationResult>>
```

### Key Classes

```typescript
// Direct Key - simple use case with private key material
const directKey = KeyUtils.generateKeyPair();
console.log(directKey.canSign()); // true

// Signer Key - enterprise use case with external signer
const signerKey = KeyUtils.generateSignerKey();
console.log(signerKey.canSign()); // true

// Public Key - verification only
const publicKey = directKey.toPublicKey();
console.log(publicKey.canSign()); // false
```

### Key Types

The library provides type-safe key operations:

```typescript
import { Key, isDirectKey, isSignerKey, isPublicKey } from '@synet/credential';

// Type guards for compile-time safety
if (isDirectKey(key)) {
  // key.privateKeyHex is available
  console.log('Private key available');
}

if (isSignerKey(key)) {
  // key.signer is available
  console.log('External signer available');
}

if (isPublicKey(key)) {
  // Verification only
  console.log('Public key only');
}
```

### Progressive Security

The architecture supports multiple security models:

```typescript
// 1. Simple - Direct key with private key material
const simpleKey = Key.create({
  publicKeyHex: 'pub_123',
  privateKeyHex: 'priv_123',
});

// 2. Secure - Key with external signer (vault/HSM)
const vaultKey = Key.createWithSigner({
  publicKeyHex: 'pub_456',
  signer: new VaultSigner(vaultConfig),
});

// 3. Verification - Public key only
const publicKey = Key.createPublic({
  publicKeyHex: 'pub_789',
});
```

### Credential Utilities

Helper functions for common credential operations:

```typescript
import { CredentialUtils } from '@synet/credential';

// Check if credential is expired
const isExpired = CredentialUtils.isExpired(credential);

// Get credential age
const age = CredentialUtils.getCredentialAge(credential);

// Get credential types (excluding VerifiableCredential)
const types = CredentialUtils.getCredentialTypes(credential);

// Check if credential has specific type
const hasType = CredentialUtils.hasType(credential, 'IdentityCredential');

// Get primary type
const primaryType = CredentialUtils.getPrimaryType(credential);
```

## Architecture

### 1. **Base Types** (`types-base.ts`)

Universal, stable, reusable types that work with any W3C-compatible system:

- `IdentitySubject`, `AuthorizationSubject`, `AssetSubject`
- `GovernanceSubject`, `DeclarationSubject`
- `BaseCredentialType` enum
- `Intelligence` classification

### 2. **Key/Signer Model** (`key.ts`)

Clean separation between keys and signing operations:

- `Key` class with multiple creation patterns
- `Signer` interface for external signing
- Type-safe key operations with compile-time checking
- Progressive security from simple to enterprise

### 3. **Pure Functions** (`credential.ts`)

Composable, side-effect-free credential operations:

- `issueVC()` - Issue verifiable credentials
- `verifyVC()` - Verify verifiable credentials
- `validateCredential()` - Validate credential structure
- `extractMetadata()` - Extract credential metadata

### 4. **Extendable W3C Credentials**

You can extend W3C Verifiable Credentials and create custom Subject or extend BaseSubject, while maintaining full compatibility, without breaking change ever happen.

### 5. **Benefits**

- **Universality**: Base types work with any system
- **Stability**: Core types remain stable across updates
- **Extensibility**: Easy to add new credential types
- **Composability**: Pure functions enable complex workflows
- **Security**: Progressive security model from simple to enterprise
- **Type Safety**: Compile-time key type checking
- **Synet Innovation**: Concrete implementations for Synet ecosystem
- **Single Dependency**: One library for everything

## Installation

```bash
npm install @synet/credential
```

## Usage Options

### Option 1: Universal (Base Types Only)

```typescript
import { 
  W3CVerifiableCredential, 
  IdentitySubject, 
  BaseCredentialType 
} from '@synet/credential/types-base';

// Use stable, universal types
const credential: W3CVerifiableCredential<IdentitySubject> = {
  // ... W3C-compatible credential
};
```

### Option 2: Synet Ecosystem (Advanced, network related)

```typescript
import { 
  SynetVerifiableCredential, 
  IpAssetSubject, 
  SynetCredentialType 
} from '@synet/credential';

// Use Synet-specific types + all base types
const ipCredential: SynetVerifiableCredential<IpAssetSubject> = {
  credentialSubject: {
    holder: { id: 'did:key:holder123' },
    issuedBy: { id: 'did:key:issuer123' },
    networkId: 'synet-main',
    ip: '10.0.0.1',
  },
  // ... other W3C properties
};
```

### Option 3: Custom Extension

```typescript
import { 
  BaseCredentialSubject, 
  W3CVerifiableCredential 
} from '@synet/credential/types-base';

// Extend base types for your needs
interface MyCustomSubject extends BaseCredentialSubject {
  customField: string;
  myData: Record<string, unknown>;
}

const MyCredentialTypes = {
  Custom: "MyCustomCredential",
} as const;
```

## Core API

The @synet/credential library provides a pure functional API for credential operations:

### Key Management

```typescript
import { generateKeyPair } from '@synet/keys';
import { Key } from '@synet/credential';

// Generate cryptographic key pair
const keyPair = generateKeyPair('ed25519', { format: 'raw' });

// Create Key units
const directKey = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

const publicKey = directKey.toPublicKey(); // Verification-only key
```

### DID Creation

```typescript
import { createDIDKey } from '@synet/did';

// Create proper standards-compliant DID
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');
```

### Credential Operations

```typescript
import { issueVC, verifyVC } from '@synet/credential';

// Issue a credential
const result = await issueVC(
  issuerKey,
  subject,
  'IdentityCredential',
  issuerDid,
  options
);

// Verify a credential
const verification = await verifyVC(verificationKey, credential);
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

## Credential Types

The library supports various credential types out of the box:

### Identity Credentials

- `IdentityCredential`: Basic identity assertion

### Authorization Credentials

- `AuthorizationCredential`: General authorization

### Asset Credentials

- `AssetCredential`: Base Asset Credential

### Governance Credentials

- `PolicyCredential`: Base Policy declaration

### Declaration Credentials

- `DeclarationCredential`: Base Policy declaration

## Custom Credential Subject Types

You can easily create custom credential types:

```typescript
interface CustomSubject extends BaseCredentialSubject {
  customField: string;
  additionalData: {
    value: number;
    metadata: Record<string, unknown>;
  };
}

const customSubject: CustomSubject = {
  holder: { id: 'did:key:holder123' },
  customField: 'custom-value',
  additionalData: {
    value: 42,
    metadata: { source: 'api', version: '1.0' },
  },
};

const result = await issueVC(
  issuerKey,
  customSubject,
  'CustomCredential',
  issuerDid
);
```

## Extending W3C Credentials

This library demonstrates how to extend W3C Verifiable Credentials while maintaining full compatibility. Here's how we achieved universal extensibility:

### Split Architecture Pattern

```typescript
// 1. Universal Base Types (types-base.ts)
export interface BaseCredentialSubject {
  holder: { id: string; name?: string };
  issuedBy?: { id: string; name?: string };
}

export interface IdentitySubject extends BaseCredentialSubject {
  // Universal identity properties
}

export const BaseCredentialType = {
  Identity: "IdentityCredential",
  Authorization: "AuthorizationCredential",
  Asset: "DataAssetCredential",
} as const;

/** 
 * 2. Your specific extensions @see types-synet.ts
*/

export interface IpAssetSubject extends BaseCredentialSubject {
  networkId: string;
  ip: string;
  subnet?: string;
  gateway?: string;
}

export const SynetCredentialType = {
  ...BaseCredentialType,  // Re-export base types
  IpAsset: "IpAssetCredential",
  GatewayIdentity: "GatewayIdentityCredential",
} as const;

// 3. Single Export Point (index.ts)
export * from './types-base';      // Universal types
export * from './types-synet';     // Synet-specific + base types
export * from './credential-service';
```

### Key Benefits

- **Universal Compatibility**: Base types work with any W3C system
- **Stable Foundation**: Core types remain unchanged across versions
- **Easy Extension**: Add new custom types without breaking existing code
- **Single Dependency**: One library for everything
- **Type Safety**: Full TypeScript support throughout

This pattern allows you to either use the universal base types or the extended Synet types, while maintaining complete W3C compatibility and enabling easy extension for your own use cases.

## Extending with Custom Types

The library is designed to be easily extensible. You can add your own credential types while maintaining full compatibility with the existing system:

```typescript
// 1. Define your custom credential types
const CustomCredentialTypes = {
  Degree: "DegreeCredential",
  Certificate: "CertificateCredential",
  License: "LicenseCredential",
  DeviceIdentity: "DeviceIdentityCredential",
} as const;

type CustomCredentialType = typeof CustomCredentialTypes[keyof typeof CustomCredentialTypes];

// 2. Create union type with Synet types
type MyCredentialType = SynetCredentialType | CustomCredentialType;

// 3. Define custom credential subjects
interface DegreeSubject extends BaseCredentialSubject {
  degree: string;
  major: string;
  university: string;
  graduationDate: string;
  gpa?: number;
}

// 4. Issue credential using pure API
import { generateKeyPair } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { Key, issueVC } from '@synet/credential';

// Generate keys and create DID
const keyPair = generateKeyPair('ed25519', { format: 'raw' });
const issuerDid = createDIDKey(keyPair.publicKey, 'Ed25519');
const issuerKey = Key.create({
  publicKeyHex: keyPair.publicKey,
  privateKeyHex: keyPair.privateKey,
  type: 'Ed25519'
});

const result = await issueVC(
  issuerKey,
  degreeSubject,
  CustomCredentialTypes.Degree,
  issuerDid
);
```

This approach allows you to:

- Add new credential types without modifying the core library
- Maintain type safety across your entire application
- Mix custom types with built-in Synet types
- Extend intelligence classifications similarly

## Testing

The library includes test utilities for easy testing:

```typescript
import { generateTestDirectKey, generateTestSignerKey, createDIDFromKey } from '@synet/credential/test/helpers';

// Generate test keys
const testKey = generateTestDirectKey('ed25519');
const testDid = createDIDFromKey(testKey);

// Use in your tests
const result = await issueVC(
  testKey,
  subject,
  'TestCredential',
  testDid
);
```

## Error Handling

All operations return a `Result` type for predictable error handling:

```typescript
const result = await issueVC(issuerKey, subject, 'TestCredential', issuerDid);

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Production Considerations

1. **Key Management**: Use a secure key management system (HSM, cloud KMS, etc.)
2. **DID Management**: Use proper DID creation with `@synet/did`
3. **Validation**: Implement additional validation layers for your use case
4. **Monitoring**: Add logging and monitoring for credential operations

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

Built with ❤️ by the Synet Team for a decentralized future.

## Design Decisions

### Signer Architecture Choice

The library uses **flat composition** rather than dependency injection within keys:

```typescript
// ✅ Chosen approach: Flat composition
const key = Key.createWithSigner({
  publicKeyHex: 'pub_123',
  signer: mySigner,  // Pass signer as property
});

// ❌ Alternative: Signer factory inside key
const key = Key.createWithSignerFactory({
  publicKeyHex: 'pub_123',
  createSigner: () => new VaultSigner(config),  // Create signer inside key
});
```

**Why flat composition?**

- **Dependency Moat**: Keys don't depend on signer implementations
- **Composability**: Signers can be created independently and reused
- **Testability**: Easy to mock signers for testing
- **Flexibility**: Same signer can be used with multiple keys
- **Separation of Concerns**: Key management and signing are separate responsibilities

This design allows for maximum flexibility while maintaining clean boundaries between components.
