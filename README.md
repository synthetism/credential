# @synet/credential

A universal, dependency-moat library for issuing and verifying W3C-compatible verifiable credentials (VCs). Built with composability, extensibility, and minimalism in mind.

## Features

- ✅ **Universal W3C Compatibility**: Works with any W3C-compatible credential system
- ✅ **Type Safety**: Full TypeScript support with comprehensive type definitions
- ✅ **Minimal Dependencies**: Only depends on battle-tested libraries
- ✅ **Extensible**: Easy to extend for custom credential types and proof formats
- ✅ **Storage Agnostic**: Use any storage backend (JSON, database, etc.)
- ✅ **JWT Proof Support**: Industry-standard JWT proof format
- ✅ **Testing Ready**: Comprehensive test suite and utilities

## Installation

```bash
npm install @synet/credential
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

## Philosophy

This library embodies the "dependency moat" principle - by providing a universal, W3C-compatible interface, it creates a protective barrier that allows systems to evolve independently while maintaining compatibility. The `SynetVerifiableCredential` is aliased to `W3CVerifiableCredential`, ensuring maximum compatibility while preserving the ability to extend functionality.

Built with ❤️ by the Synet Team for a decentralized future.
