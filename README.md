# @synet/credential

A universal, dependency-moat library for issuing and verifying W3C-compatible verifiable credentials (VCs). Built with composability, extensibility, and minimalism in mind.

## Features

- ✅ **Universal W3C Compatibility**: Works with any W3C-compatible credential system
- ✅ **Split Architecture**: Clean separation between universal base types and Synet-specific extensions
- ✅ **Type Safety**: Full TypeScript support with comprehensive type definitions
- ✅ **Minimal Dependencies**: Only depends on battle-tested libraries
- ✅ **Extensible**: Easy to extend for custom credential types and proof formats
- ✅ **Storage Agnostic**: Use any storage backend (JSON, database, etc.)
- ✅ **JWT Proof Support**: Industry-standard JWT proof format
- ✅ **Testing Ready**: Comprehensive test suite and utilities

## Architecture

This library uses a **split architecture** that provides maximum flexibility:

### 1. **Base Types** (`types-base.ts`)
Universal, stable, reusable types that work with any W3C-compatible system:
- `IdentitySubject`, `AuthorizationSubject`, `AssetSubject`
- `GovernanceSubject`, `DeclarationSubject`
- `BaseCredentialType` enum
- `Intelligence` classification

### 2. **Synet Types** (`types-synet.ts`)
Synet-specific extensions that demonstrate the extension pattern:
- `IpAssetSubject`, `IpPoolAssetSubject` (networking-specific)
- `GatewayIdentitySubject`, `RootIdentitySubject` (Synet roles)
- `SynetCredentialType` enum (extended credential types)
- Includes re-exports of all base types

### 3. **Benefits**
- **Universality**: Base types work with any system
- **Stability**: Core types remain stable across updates
- **Extensibility**: Easy to add new credential types
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

### Option 2: Synet Ecosystem (Recommended)
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

## Quick Start

```typescript
import { CredentialService, CredentialUtils } from '@synet/credential';
import type { IdentitySubject } from '@synet/credential';

// Create a key manager (or use your own)
const keyManager = CredentialUtils.createSimpleKeyManager();
const { keyId, publicKey } = await keyManager.createKey();
const issuerDid = `did:key:${publicKey}`;

// Create credential service
const credentialService = new CredentialService(keyManager, issuerDid, keyId);

// Issue a credential
const subject: IdentitySubject = {
  holder: {
    id: 'did:key:holder123',
    name: 'John Doe',
  },
  issuedBy: {
    id: issuerDid,
    name: 'Trust Authority',
  },
};

const result = await credentialService.issueVC(
  subject,
  'IdentityCredential',
  issuerDid,
  {
    expirationDate: '2030-01-01T00:00:00Z',
    meta: {
      version: '1.0.0',
      schema: 'https://schema.org/IdentityCredential',
    },
  }
);

if (result.success) {
  console.log('Credential issued:', result.data);
  
  // Verify the credential
  const verifyResult = await credentialService.verifyVC(result.data);
  console.log('Verification result:', verifyResult.data);
}
```

## Core API

### CredentialService

The main service for issuing and verifying credentials.

```typescript
class CredentialService {
  constructor(
    keyManager?: KeyManager,
    defaultIssuerDid?: string,
    defaultKeyId?: string
  );

  async issueVC<S extends BaseCredentialSubject>(
    subject: S,
    type: string | string[],
    issuerDid?: string,
    options?: CredentialIssueOptions
  ): Promise<Result<W3CVerifiableCredential<S>>>;

  async verifyVC(
    credential: W3CVerifiableCredential,
    options?: CredentialVerifyOptions
  ): Promise<Result<VerificationResult>>;
}
```

### Storage

Simple storage implementations for credentials.

```typescript
import { JSONCredentialStorage, MemoryCredentialStorage } from '@synet/credential';

// File-based storage
const fileStorage = new JSONCredentialStorage('./credentials.json');

// In-memory storage (for testing)
const memoryStorage = new MemoryCredentialStorage();

// Use storage
await fileStorage.save(credential);
const loaded = await fileStorage.load(credential.id);
```

### Types

Universal W3C-compatible types with Synet extensions.

```typescript
import type {
  W3CVerifiableCredential,
  SynetVerifiableCredential, // Alias for W3CVerifiableCredential
  BaseCredentialSubject,
  IdentitySubject,
  AuthorizationSubject,
  DataAssetSubject,
  // ... many more
} from '@synet/credential';
```

## Credential Types

The library supports various credential types out of the box:

### Identity Credentials

- `IdentityCredential`: Basic identity assertion
- `RootIdentityCredential`: Root authority identity
- `GatewayIdentityCredential`: Gateway node identity

### Authorization Credentials

- `AuthorizationCredential`: General authorization
- `GatewayAuthorizationCredential`: Gateway authorization
- `IntelligenceAuthorizationCredential`: AI/Intelligence authorization

### Asset Credentials

- `DataAssetCredential`: Data asset ownership/licensing
- `IpAssetCredential`: IP address assignment
- `IpPoolAssetCredential`: IP pool management

### Governance Credentials

- `PolicyCredential`: Policy declaration
- `NetworkDeclarationCredential`: Network governance

## Custom Credential Types

You can easily create custom credential types:

```typescript
interface CustomSubject extends BaseCredentialSubject {
  customField: string;
  additionalData: {
    value: number;
    metadata: Record<string, unknown>;
  };
}

const customCredential = await credentialService.issueVC<CustomSubject>(
  {
    holder: { id: 'did:key:holder123' },
    customField: 'custom-value',
    additionalData: {
      value: 42,
      metadata: { source: 'api', version: '1.0' },
    },
  },
  'CustomCredential'
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

// 2. Synet Extensions (types-synet.ts)
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
- **Easy Extension**: Add new types without breaking existing code
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

// 4. Use with the credential service
const degreeSubject: DegreeSubject = {
  holder: { id: 'did:key:student123', name: 'Jane Doe' },
  degree: 'Bachelor of Science',
  major: 'Computer Science',
  university: 'Tech University',
  graduationDate: '2023-05-15',
  gpa: 3.8,
};

const credential = await credentialService.issueVC(
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

See `extension-example.ts` for a complete working example.

## Key Management

The library is designed to work with any key management system. For production use, integrate with your preferred key management solution:

```typescript
interface KeyManager {
  sign(data: string, keyId: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
  getPublicKey(keyId: string): Promise<string>;
  createKey(type?: string): Promise<{ keyId: string; publicKey: string }>;
}
```

## Proof Formats

Currently supports:

- **JWT Proof**: Industry-standard JWT-based proofs (default)
- **Extensible**: Easy to add new proof formats

## Storage Backends

- **JSON File Storage**: Simple file-based storage for development
- **Memory Storage**: In-memory storage for testing
- **Custom Storage**: Implement the `CredentialStorage` interface

## Validation and Utilities

```typescript
import { CredentialService, CredentialUtils } from '@synet/credential';

// Validate credential structure
const validation = CredentialService.validateCredential(credential);

// Extract metadata
const metadata = CredentialService.extractMetadata(credential);

// Check expiration
const isExpired = CredentialUtils.isExpired(credential);

// Parse DIDs
const didParts = CredentialUtils.parseDID('did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx');
```

## Testing

The library includes comprehensive test utilities:

```typescript
import { CredentialUtils } from '@synet/credential';

// Create a test key manager
const testKeyManager = CredentialUtils.createSimpleKeyManager();

// Use in your tests
const { keyId, publicKey } = await testKeyManager.createKey();
```

## Error Handling

All operations return a `Result` type for predictable error handling:

```typescript
const result = await credentialService.issueVC(subject, 'TestCredential');

if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Production Considerations

1. **Key Management**: Use a secure key management system (HSM, cloud KMS, etc.)
2. **Storage**: Use a production-grade database for credential storage
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
