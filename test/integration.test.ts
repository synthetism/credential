/**
 * Integration test for @synet/keys Key with @synet/credential functions
 * 
 * This test verifies that the CredentialKey interface abstraction works correctly,
 * allowing @synet/keys to integrate seamlessly with @synet/credential without
 * tight coupling or version conflicts.
 */

import { describe, it, expect } from 'vitest';
import { Key, type CredentialKey } from '@synet/keys';
import { issueVC, verifyVC, type IdentitySubject } from '../src/index';

describe('Key Integration with Credential Functions', () => {
  it('should work with issueVC and verifyVC functions', async () => {
    // 1. Generate a key using @synet/keys
    const issuerKey = await Key.generate('ed25519', { 
      name: 'integration-test-key',
      purpose: 'credential-signing' 
    });

    // 2. Verify Key implements CredentialKey interface
    expect(issuerKey).toHaveProperty('id');
    expect(issuerKey).toHaveProperty('publicKeyHex');
    expect(issuerKey).toHaveProperty('type');
    expect(issuerKey).toHaveProperty('meta');
    expect(typeof issuerKey.canSign).toBe('function');
    expect(typeof issuerKey.getPublicKey).toBe('function');
    expect(typeof issuerKey.sign).toBe('function');
    expect(typeof issuerKey.verify).toBe('function');
    expect(typeof issuerKey.toJSON).toBe('function');
    expect(typeof issuerKey.toVerificationMethod).toBe('function');

    // 3. Type-check: Key should be assignable to CredentialKey
    const credentialKey: CredentialKey = issuerKey; // Should not cause type error
    expect(credentialKey).toBeDefined();

    // 4. Create test credential subject
    const issuerDid = `did:key:${issuerKey.publicKeyHex}`;
    const identitySubject: IdentitySubject = {
      holder: {
        id: 'did:key:alice123',
        name: 'Alice Smith',
      },
      issuedBy: {
        id: issuerDid,
        name: 'Integration Test Authority',
      },
      scope: ['identity', 'authentication'],
    };

    // 5. Issue credential using @synet/keys Key with @synet/credential issueVC
    const issueResult = await issueVC(
      issuerKey, // @synet/keys Key used as CredentialKey
      identitySubject,
      'IdentityCredential',
      issuerDid,
      {
        meta: {
          version: '1.0.0',
          schema: 'https://synet.org/schemas/identity/v1',
          testType: 'integration',
        },
      }
    );

    // 6. Verify issuance succeeded
    expect(issueResult.success).toBe(true);
    if (!issueResult.success) return;

    const credential = issueResult.data;
    expect(credential.id).toBeDefined();
    expect(credential.type).toContain('VerifiableCredential');
    expect(credential.type).toContain('IdentityCredential');
    expect(credential.issuer.id).toBe(issuerDid);
    expect(credential.credentialSubject.holder.name).toBe('Alice Smith');
    expect(credential.proof).toBeDefined();
    expect(credential.proof.type).toBe('JwtProof2020');
    expect(credential.meta?.testType).toBe('integration');

    // 7. Verify credential using @synet/keys Key with @synet/credential verifyVC
    const verifyResult = await verifyVC(
      issuerKey, // Same @synet/keys Key used for verification
      credential
    );

    // 8. Verify verification succeeded
    expect(verifyResult.success).toBe(true);
    if (!verifyResult.success) return;

    const verificationResult = verifyResult.data;
    expect(verificationResult.verified).toBe(true);
    expect(verificationResult.issuer).toBe(issuerDid);
    expect(verificationResult.subject).toBe('did:key:alice123');
    expect(verificationResult.issuanceDate).toBeDefined();
  });

  it('should fail verification with wrong key', async () => {
    // 1. Generate issuer and verifier keys
    const issuerKey = await Key.generate('ed25519', { name: 'issuer-key' });
    const verifierKey = await Key.generate('ed25519', { name: 'wrong-verifier-key' });

    const issuerDid = `did:key:${issuerKey.publicKeyHex}`;
    const identitySubject: IdentitySubject = {
      holder: {
        id: 'did:key:bob456',
        name: 'Bob Johnson',
      },
      issuedBy: {
        id: issuerDid,
        name: 'Test Authority',
      },
      scope: ['identity'],
    };

    // 2. Issue credential with issuer key
    const issueResult = await issueVC(
      issuerKey,
      identitySubject,
      'IdentityCredential',
      issuerDid
    );

    expect(issueResult.success).toBe(true);
    if (!issueResult.success) return;

    // 3. Try to verify with wrong key (should fail)
    const verifyResult = await verifyVC(
      verifierKey, // Different key, should fail
      issueResult.data
    );

    expect(verifyResult.success).toBe(false);
    expect(verifyResult.error).toContain('Invalid signature');
  });

  it('should work with migrated keys from existing key pairs', async () => {
    // 1. Simulate existing key pair (e.g., from legacy system)
    const existingPublicKey = 'existing-public-key-hex-data-12345';
    const existingPrivateKey = 'existing-private-key-hex-data-67890';

    // 2. Create migrated key
    const migratedKey = Key.fromKeyPair(
      'ed25519',
      existingPublicKey,
      existingPrivateKey,
      {
        name: 'migrated-legacy-key',
        source: 'legacy-system',
        migrated: true,
      }
    );

    // 3. Verify key properties
    expect(migratedKey.id).toBeDefined();
    expect(migratedKey.publicKeyHex).toBe(existingPublicKey);
    expect(migratedKey.type).toBe('ed25519');
    expect(migratedKey.meta.source).toBe('legacy-system');
    expect(migratedKey.meta.migrated).toBe(true);
    expect(migratedKey.canSign()).toBe(true);

    // 4. Use migrated key with credential functions
    const issuerDid = `did:key:${migratedKey.publicKeyHex}`;
    const identitySubject: IdentitySubject = {
      holder: {
        id: 'did:key:charlie789',
        name: 'Charlie Brown',
      },
      issuedBy: {
        id: issuerDid,
        name: 'Migrated Authority',
      },
      scope: ['identity'],
    };

    const issueResult = await issueVC(
      migratedKey,
      identitySubject,
      'IdentityCredential',
      issuerDid
    );

    expect(issueResult.success).toBe(true);
    if (!issueResult.success) return;

    // 5. Verify with same migrated key
    const verifyResult = await verifyVC(migratedKey, issueResult.data);
    expect(verifyResult.success).toBe(true);
    if (!verifyResult.success) return;
    expect(verifyResult.data.verified).toBe(true);
  });

  it('should demonstrate version independence', async () => {
    // This test demonstrates that the interface abstraction prevents version conflicts
    
    // 1. Create a key using @synet/keys
    const key = await Key.generate('ed25519', { name: 'version-test-key' });
    
    // 2. Check that key satisfies CredentialKey interface contract
    const interfaceCheck = (credKey: CredentialKey) => {
      expect(typeof credKey.id).toBe('string');
      expect(typeof credKey.publicKeyHex).toBe('string');
      expect(typeof credKey.type).toBe('string');
      expect(typeof credKey.meta).toBe('object');
      expect(typeof credKey.canSign).toBe('function');
      expect(typeof credKey.getPublicKey).toBe('function');
      expect(typeof credKey.sign).toBe('function');
      expect(typeof credKey.verify).toBe('function');
      expect(typeof credKey.toJSON).toBe('function');
      expect(typeof credKey.toVerificationMethod).toBe('function');
      
      return true;
    };
    
    // 3. Key should satisfy interface without explicit casting
    expect(interfaceCheck(key)).toBe(true);
    
    // 4. Key should work with credential functions regardless of version
    const issuerDid = `did:key:${key.publicKeyHex}`;
    const identitySubject: IdentitySubject = {
      holder: {
        id: 'did:key:version123',
        name: 'Version Test User',
      },
      issuedBy: {
        id: issuerDid,
        name: 'Version Test Authority',
      },
      scope: ['version-test'],
    };

    const result = await issueVC(key, identitySubject, 'IdentityCredential', issuerDid);
    expect(result.success).toBe(true);
  });

  it('should work with public-only keys for verification', async () => {
    // 1. Generate a full key for signing
    const signingKey = await Key.generate('ed25519', { name: 'signing-key' });
    
    // 2. Create a public-only key for verification
    const publicOnlyKey = Key.createPublic(
      'ed25519',
      signingKey.publicKeyHex,
      { name: 'public-only-key', purpose: 'verification-only' }
    );

    // 3. Verify public key properties
    expect(publicOnlyKey.canSign()).toBe(false);
    expect(publicOnlyKey.getPublicKey()).toBe(signingKey.publicKeyHex);
    expect(publicOnlyKey.publicKeyHex).toBe(signingKey.publicKeyHex);

    // 4. Issue credential with signing key
    const issuerDid = `did:key:${signingKey.publicKeyHex}`;
    const identitySubject: IdentitySubject = {
      holder: {
        id: 'did:key:public123',
        name: 'Public Key Test User',
      },
      issuedBy: {
        id: issuerDid,
        name: 'Public Key Test Authority',
      },
      scope: ['public-key-test'],
    };

    const issueResult = await issueVC(
      signingKey,
      identitySubject,
      'IdentityCredential',
      issuerDid
    );

    expect(issueResult.success).toBe(true);
    if (!issueResult.success) return;

    // 5. Verify with public-only key (should work)
    const verifyResult = await verifyVC(publicOnlyKey, issueResult.data);
    expect(verifyResult.success).toBe(true);
    if (!verifyResult.success) return;
    expect(verifyResult.data.verified).toBe(true);

    // 6. Try to sign with public-only key (should fail)
    try {
      await issueVC(publicOnlyKey, identitySubject, 'IdentityCredential', issuerDid);
      expect.fail('Public-only key should not be able to sign');
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
    }
  });
});
