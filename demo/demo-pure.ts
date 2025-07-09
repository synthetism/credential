/**
 * Demo of the new pure @synet/credential API
 * 
 * This demo showcases the clean, composable, and secure Key/Signer 
 * architecture and pure credential functions with the new CredentialKey interface.
 * 
 * Note: This demo uses a local key implementation to demonstrate the decoupling.
 * In production, you can use @synet/keys or any other key provider that implements
 * the CredentialKey interface.
 */

import { 
  issueVC, 
  verifyVC, 
  CredentialUtils,
  type CredentialKey,
  type IdentitySubject,
} from '../src/index';

// Local key implementation for demo purposes
// This demonstrates how any key provider can implement the CredentialKey interface
class DemoKey implements CredentialKey {
  public readonly id: string;
  public readonly publicKeyHex: string;
  public readonly type: string;
  public readonly meta: Record<string, unknown>;
  private readonly privateKeyHex: string;
  
  constructor(id: string, publicKeyHex: string, privateKeyHex: string) {
    this.id = id;
    this.publicKeyHex = publicKeyHex;
    this.privateKeyHex = privateKeyHex;
    this.type = 'Ed25519';
    this.meta = { source: 'demo', created: new Date().toISOString() };
  }

  canSign(): boolean {
    return !!this.privateKeyHex;
  }

  getPublicKey(): string {
    return this.publicKeyHex;
  }

  async sign(data: string): Promise<string> {
    if (!this.canSign()) {
      throw new Error('Cannot sign: no private key available');
    }
    // Simple demo signing (in production, use proper cryptography)
    return Buffer.from(`${data}:${this.privateKeyHex}`).toString('base64url');
  }

  async verify(data: string, signature: string): Promise<boolean> {
    try {
      const decoded = Buffer.from(signature, 'base64url').toString();
      const [originalData] = decoded.split(':');
      return originalData === data;
    } catch {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      publicKeyHex: this.publicKeyHex,
      type: this.type,
      meta: this.meta,
      canSign: this.canSign(),
    };
  }

  toVerificationMethod(controller: string) {
    return {
      id: `${controller}#${this.id}`,
      type: `${this.type}VerificationKey2020`,
      controller,
      publicKeyHex: this.publicKeyHex,
    };
  }

  toPublicKey(): CredentialKey {
    return new DemoPublicKey(this.id, this.publicKeyHex, this.type, this.meta);
  }
}

// Public-only key for verification
class DemoPublicKey implements CredentialKey {
  public readonly id: string;
  public readonly publicKeyHex: string;
  public readonly type: string;
  public readonly meta: Record<string, unknown>;
  
  constructor(id: string, publicKeyHex: string, type: string, meta: Record<string, unknown>) {
    this.id = id;
    this.publicKeyHex = publicKeyHex;
    this.type = type;
    this.meta = meta;
  }

  canSign(): boolean {
    return false;
  }

  getPublicKey(): string {
    return this.publicKeyHex;
  }

  async sign(_data: string): Promise<string> {
    throw new Error('Public key cannot sign');
  }

  async verify(data: string, signature: string): Promise<boolean> {
    try {
      const decoded = Buffer.from(signature, 'base64url').toString();
      const [originalData] = decoded.split(':');
      return originalData === data;
    } catch {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      publicKeyHex: this.publicKeyHex,
      type: this.type,
      meta: this.meta,
      canSign: this.canSign(),
    };
  }

  toVerificationMethod(controller: string) {
    return {
      id: `${controller}#${this.id}`,
      type: `${this.type}VerificationKey2020`,
      controller,
      publicKeyHex: this.publicKeyHex,
    };
  }

  toPublicKey(): CredentialKey {
    return this;
  }
}

// Helper function to create demo keys
function createDemoKey(id?: string): DemoKey {
  const keyId = id || `demo-key-${Date.now()}`;
  const publicKeyHex = `pub-${keyId}-${Math.random().toString(36).substring(2, 15)}`;
  const privateKeyHex = `priv-${keyId}-${Math.random().toString(36).substring(2, 15)}`;
  return new DemoKey(keyId, publicKeyHex, privateKeyHex);
}

async function main() {
  console.log('🔑 Pure @synet/credential API Demo');
  console.log('================================\n');

  // 1. Generate Keys with demo implementation
  console.log('1. Key Generation with CredentialKey Interface:');
  const issuerKey = createDemoKey('issuer-key');
  const verifierKey = createDemoKey('verifier-key');
  
  console.log(`   Issuer Key: ${issuerKey.id} (can sign: ${issuerKey.canSign()})`);
  console.log(`   Verifier Key: ${verifierKey.id} (can sign: ${verifierKey.canSign()})`);
  console.log(`   Public Keys: ${issuerKey.publicKeyHex.substring(0, 16)}...`);
  console.log(`   Key Type: ${issuerKey.type}\n`);

  // 2. Create DIDs
  console.log('2. DID Creation:');
  const issuerDid = `did:key:${issuerKey.publicKeyHex}`;
  
  console.log(`   Issuer DID: ${issuerDid}\n`);

  // 3. Issue Credentials
  console.log('3. Credential Issuance:');
  
  // Create identity credential subject
  const identitySubject: IdentitySubject = {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith',
    },
    issuedBy: {
      id: issuerDid,
      name: 'Synet Identity Authority',
    },
    scope: ['identity', 'authentication'],
  };

  // Issue with CredentialKey interface
  console.log('   Issuing with CredentialKey interface...');
  const credentialResult = await issueVC(
    issuerKey,
    identitySubject,
    'IdentityCredential',
    issuerDid,
    {
      meta: {
        version: '1.0.0',
        schema: 'https://synet.org/schemas/identity/v1',
      },
    }
  );

  if (credentialResult.success) {
    console.log(`   ✓ Credential issued: ${credentialResult.data.id}`);
    console.log(`   Type: ${credentialResult.data.type.join(', ')}`);
    console.log(`   Subject: ${credentialResult.data.credentialSubject.holder.name}`);
  } else {
    console.log(`   ✗ Credential failed: ${credentialResult.error}`);
    return;
  }

  console.log();

  // 4. Verify Credentials
  console.log('4. Credential Verification:');
  
  console.log('   Verifying with wrong key (should fail)...');
  const wrongVerifyResult = await verifyVC(verifierKey, credentialResult.data);
  
  if (wrongVerifyResult.success) {
    console.log(`   ✗ Wrong key verification should have failed`);
  } else {
    console.log(`   ✓ Wrong key verification correctly failed: ${wrongVerifyResult.error}`);
  }

  console.log('   Verifying with correct key...');
  const correctVerifyResult = await verifyVC(issuerKey, credentialResult.data);
  
  if (correctVerifyResult.success) {
    console.log(`   ✓ Correct key verification succeeded: ${correctVerifyResult.data.verified}`);
    console.log(`     Issuer: ${correctVerifyResult.data.issuer}`);
    console.log(`     Subject: ${correctVerifyResult.data.subject}`);
  } else {
    console.log(`   ✗ Correct key verification failed: ${correctVerifyResult.error}`);
  }

  console.log();

  // 5. Key Security Models
  console.log('5. Security Models:');
  
  // Public key (verification only)
  const publicKey = issuerKey.toPublicKey();
  console.log(`   Public key: ${publicKey.id} (can sign: ${publicKey.canSign()})`);
  
  // Try to sign with public key (should fail)
  console.log('   Attempting to sign with public key...');
  try {
    await publicKey.sign('test data');
    console.log('   ✗ Public key signing should have failed');
  } catch (error) {
    console.log(`   ✓ Public key signing correctly failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log();

  // 6. CredentialKey Interface Demo
  console.log('6. CredentialKey Interface Demo:');
  
  console.log('   Issuer Key JSON:');
  console.log(`   ${JSON.stringify(issuerKey.toJSON(), null, 2)}`);
  
  console.log('   Verification Method:');
  console.log(`   ${JSON.stringify(issuerKey.toVerificationMethod(issuerDid), null, 2)}`);

  console.log();

  // 7. Interface Compatibility
  console.log('7. Interface Compatibility:');
  
  // Demonstrate that any key implementing CredentialKey works
  const customKey = new DemoKey('custom-key', 'custom-pub-key', 'custom-priv-key');
  console.log(`   Custom Key: ${customKey.id} (can sign: ${customKey.canSign()})`);
  console.log(`   Interface Type: ${customKey.type}`);
  console.log(`   Metadata: ${JSON.stringify(customKey.meta)}`);

  console.log();

  // 8. Credential Utilities
  console.log('8. Credential Utilities:');
  
  if (credentialResult.success) {
    const credential = credentialResult.data;
    
    console.log(`   Credential ID: ${credential.id}`);
    console.log(`   Types: ${CredentialUtils.getCredentialTypes(credential).join(', ')}`);
    console.log(`   Primary Type: ${CredentialUtils.getPrimaryType(credential)}`);
    console.log(`   Has Identity Type: ${CredentialUtils.hasType(credential, 'IdentityCredential')}`);
    console.log(`   Is Expired: ${CredentialUtils.isExpired(credential)}`);
    console.log(`   Age: ${Math.round(CredentialUtils.getCredentialAge(credential) / 1000)} seconds`);
  }

  console.log();

  // 9. Architecture Benefits
  console.log('9. Architecture Benefits:');
  console.log('   ✓ Decoupled: Any key provider can implement CredentialKey interface');
  console.log('   ✓ Composable: Pure functions work with any CredentialKey implementation');
  console.log('   ✓ Type Safe: Interface abstraction prevents version conflicts');
  console.log('   ✓ Secure: Key implementation details are hidden behind interface');
  console.log('   ✓ Testable: Easy to mock keys for testing');
  console.log('   ✓ Flexible: Can use @synet/keys, HSM, or custom implementations');
  
  console.log('\n🎉 Demo completed successfully!');
  console.log('\n💡 Key Takeaways:');
  console.log('   • CredentialKey interface enables dependency decoupling');
  console.log('   • Any key provider can implement the interface');
  console.log('   • Version conflicts are avoided through interface abstraction');
  console.log('   • Pure functions are composable and type-safe');
  console.log('   • Security is maintained through controlled key exposure');
}

// Run the demo
main().catch(console.error);

// Run the demo
main().catch(console.error);
