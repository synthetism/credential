/**
 * Real-world data tests for CredentialUnit using actual Veramo data
 * 
 * These tests use real credential data from Veramo implementation to validate that:
 * 1. We can recreate signers from existing private keys
 * 2. We can verify existing credentials 
 * 3. We can issue new credentials that match the format
 * 4. "Same data in, same data out" principle works
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Signer, hexToPem } from '@synet/keys';
import { CredentialUnit } from '../src/credential';
import type { BaseCredentialSubject, W3CVerifiableCredential } from '../src/types-base';
import * as crypto from 'node:crypto';

// Import real-world test data
import realWorldData from './example-data/0en.json';

/**
 * Convert Ed25519 private key from hex to PEM format
 */
function hexPrivateKeyToPem(hexKey: string): string {
  // Ed25519 private keys are 64 bytes (32 private + 32 public)
  // Extract the private key part (first 32 bytes)
  const privateKeyBytes = Buffer.from(hexKey.substring(0, 64), 'hex');
  
  // Create PKCS8 DER format for Ed25519 private key
  const pkcs8Header = Buffer.from([
    0x30, 0x2e, // SEQUENCE, 46 bytes
    0x02, 0x01, 0x00, // INTEGER version 0
    0x30, 0x05, // SEQUENCE, 5 bytes
    0x06, 0x03, 0x2b, 0x65, 0x70, // OID for Ed25519
    0x04, 0x22, // OCTET STRING, 34 bytes
    0x04, 0x20 // OCTET STRING, 32 bytes (the actual private key)
  ]);
  
  const derKey = Buffer.concat([pkcs8Header, privateKeyBytes]);
  
  // Create private key object and export as PEM
  const privateKeyObj = crypto.createPrivateKey({
    key: derKey,
    format: 'der',
    type: 'pkcs8'
  });
  
  return privateKeyObj.export({
    type: 'pkcs8',
    format: 'pem'
  }).toString();
}

describe('CredentialUnit Real-World Data Tests', () => {
  let signer: Signer;
  let key: ReturnType<typeof signer.createKey>;
  let credential: CredentialUnit;

  // Extract data from the real-world example
  const testData = {
    did: realWorldData.identity.did,
    privateKeyHex: realWorldData.identity.privateKeyHex,
    publicKeyHex: realWorldData.identity.publicKeyHex,
    existingCredential: realWorldData.identity.credential as W3CVerifiableCredential,
    kid: realWorldData.identity.kid
  };

  beforeEach(async () => {
    // Convert hex keys to PEM format
    const privateKeyPEM = hexPrivateKeyToPem(testData.privateKeyHex);
    const publicKeyPEM = hexToPem(testData.publicKeyHex, 'ed25519');
    
    if (!privateKeyPEM || !publicKeyPEM) {
      throw new Error('Failed to convert hex keys to PEM format');
    }
    
    // Create signer from existing private key material
    const createdSigner = Signer.create(privateKeyPEM, publicKeyPEM, 'ed25519', {
      name: '0en-test-signer'
    });
    
    if (!createdSigner) {
      throw new Error('Failed to create signer from existing key material');
    }
    
    signer = createdSigner;
    key = signer.createKey();
    
    if (!key) {
      throw new Error('Failed to create key from signer');
    }
    
    credential = new CredentialUnit();
    
    // Learn crypto capabilities
    credential.learn([key.teach()]);
  });

  describe('Verification of Existing Real Credentials', () => {
    it('should verify the existing Veramo credential', async () => {
      const result = await credential.verifyCredential(testData.existingCredential);

      if (!result) {
        console.log('Verification failed with error:', credential.error);
        console.log('Stack:', credential.stack);
      }

      expect(result).not.toBeNull();
      if (result) {
        expect(result.verified).toBe(true);
        expect(result.issuer).toBe(testData.did);
        expect(result.subject).toBe(testData.did);
        expect(result.issuanceDate).toBe('2025-07-09T11:43:25.000Z');
      }
    });

    it('should validate the structure of existing credential', async () => {
      const result = await credential.validateStructure(testData.existingCredential);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should decode and verify the JWT from existing credential', async () => {
      const { proof } = testData.existingCredential;
      
      expect(proof.type).toBe('JwtProof2020');
      expect(proof.jwt).toBeDefined();
      
      if (proof.jwt) {
        // The JWT should be properly formatted
        const jwtParts = proof.jwt.split('.');
        expect(jwtParts).toHaveLength(3);
        
        // Verify using our unit
        const result = await credential.verifyCredential(testData.existingCredential);
        expect(result?.verified).toBe(true);
      }
    });
  });

  describe('Same Data In, Same Data Out', () => {
    it('should recreate identical credential with same input data', async () => {
      // Extract the original credential data
      const originalSubject = testData.existingCredential.credentialSubject;
      const originalIssuer = testData.existingCredential.issuer.id;
      const originalType = testData.existingCredential.type.filter(t => t !== 'VerifiableCredential');
      const originalIssuanceDate = testData.existingCredential.issuanceDate;

      // Issue new credential with same data
      const newCredential = await credential.issueCredential(
        originalSubject,
        originalType,
        originalIssuer,
        {
          vcId: testData.existingCredential.id,
          issuanceDate: originalIssuanceDate
        }
      );

      expect(newCredential).not.toBeNull();
      if (newCredential) {
        // Should have identical structure (except proof)
        expect(newCredential.id).toBe(testData.existingCredential.id);
        expect(newCredential.type).toEqual(testData.existingCredential.type);
        expect(newCredential.issuer).toEqual(testData.existingCredential.issuer);
        expect(newCredential.issuanceDate).toBe(testData.existingCredential.issuanceDate);
        expect(newCredential.credentialSubject).toEqual(testData.existingCredential.credentialSubject);
        expect(newCredential['@context']).toEqual(testData.existingCredential['@context']);
        
        // Proof will be different (new JWT) but should be valid
        expect(newCredential.proof.type).toBe('JwtProof2020');
        expect(newCredential.proof.jwt).toBeDefined();
        expect(newCredential.proof.jwt).not.toBe(testData.existingCredential.proof.jwt); // Different signature
        
        // But the new credential should verify
        const verifyResult = await credential.verifyCredential(newCredential);
        expect(verifyResult?.verified).toBe(true);
      }
    });

    it('should create new credential with same issuer identity', async () => {
      // Create a new credential for the same identity
      const subject: BaseCredentialSubject = {
        holder: {
          id: testData.did,
          name: '0en'
        },
        issuedBy: {
          id: testData.did,
          name: '0en'
        },
        // Add some new data
        testField: 'new credential data'
      };

      const newCredential = await credential.issueCredential(
        subject,
        'IdentityCredential',
        testData.did
      );

      expect(newCredential).not.toBeNull();
      if (newCredential) {
        expect(newCredential.issuer.id).toBe(testData.did);
        expect(newCredential.credentialSubject.holder.id).toBe(testData.did);
        expect(newCredential.credentialSubject.holder.name).toBe('0en');
        
        // Should verify with same key
        const verifyResult = await credential.verifyCredential(newCredential);
        expect(verifyResult?.verified).toBe(true);
        expect(verifyResult?.issuer).toBe(testData.did);
      }
    });
  });

  describe('Key Material Validation', () => {
    it('should work with the exact key material from Veramo', async () => {
      // Verify we're using the right key material
      expect(testData.privateKeyHex).toBe('ce4ad6a60ee4331e711033a500bf935b21ef209b2501bd63a1dbb2a85e2648f8878403abd8b32881ce5ceb125ed97563ad483ea5f43d71b012184657ce07d8cb');
      expect(testData.publicKeyHex).toBe('878403abd8b32881ce5ceb125ed97563ad483ea5f43d71b012184657ce07d8cb');
      expect(testData.did).toBe('did:key:z6MkoaFqc5NmLYjYC7RACiYcC9g2C2PA3ss9e4jeCwbNKmvz');

      // The signer should be created from this material
      const publicKey = await signer.getPublicKey();
      expect(publicKey).toBeDefined();
      
      // Should be able to sign and verify
      const testMessage = 'test signing with real key material';
      const signature = await signer.sign(testMessage);
      expect(signature).toBeDefined();
      
      const isValid = await signer.verify(testMessage, signature);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong key material', async () => {
      // Create a different signer
      const wrongSigner = Signer.generate('ed25519', { name: 'wrong-signer' });
      
      if (!wrongSigner) {
        throw new Error('Failed to create wrong signer');
      }
      
      const wrongKey = wrongSigner.createKey();
      
      if (!wrongKey) {
        throw new Error('Failed to create wrong key');
      }
      
      const wrongCredential = new CredentialUnit();
      wrongCredential.learn([wrongKey.teach()]);

      // Try to verify the existing credential with wrong key
      const result = await wrongCredential.verifyCredential(testData.existingCredential);
      
      expect(result).toBeNull();
      expect(wrongCredential.error).toContain('Invalid signature');
    });
  });

  describe('Format Compatibility', () => {
    it('should produce JWT proofs compatible with Veramo format', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: testData.did,
          name: '0en'
        },
        issuedBy: {
          id: testData.did,
          name: '0en'
        }
      };

      const newCredential = await credential.issueCredential(
        subject,
        'IdentityCredential',
        testData.did
      );

      expect(newCredential).not.toBeNull();
      if (newCredential) {
        // Should have same JWT structure as Veramo
        expect(newCredential.proof.type).toBe('JwtProof2020');
        expect(newCredential.proof.jwt).toBeDefined();
        
        if (newCredential.proof.jwt) {
          const jwtParts = newCredential.proof.jwt.split('.');
          expect(jwtParts).toHaveLength(3);
          
          // Decode header
          const header = JSON.parse(atob(jwtParts[0].replace(/-/g, '+').replace(/_/g, '/')));
          expect(header.alg).toBe('EdDSA');
          expect(header.typ).toBe('JWT');
          
          // Decode payload
          const payload = JSON.parse(atob(jwtParts[1].replace(/-/g, '+').replace(/_/g, '/')));
          expect(payload.vc).toBeDefined();
          expect(payload.iss).toBe(testData.did);
          expect(payload.jti).toBe(newCredential.id);
        }
      }
    });

    it('should maintain W3C context and type arrays', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: testData.did,
          name: '0en'
        }
      };

      const newCredential = await credential.issueCredential(
        subject,
        ['IdentityCredential', 'TestCredential'],
        testData.did
      );

      expect(newCredential).not.toBeNull();
      if (newCredential) {
        expect(newCredential['@context']).toEqual(['https://www.w3.org/2018/credentials/v1']);
        expect(newCredential.type).toEqual(['VerifiableCredential', 'IdentityCredential', 'TestCredential']);
      }
    });
  });
});
