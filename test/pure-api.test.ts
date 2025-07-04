/**
 * Test suite for the new pure credential API
 * 
 * This test suite verifies the new Key/Signer architecture and pure 
 * credential functions for issuing and verifying credentials.
 */

import { describe, it, expect } from 'vitest';
import { 
  Key, 
  isDirectKey, 
  isSignerKey, 
  isPublicKey,
  issueVC,
  verifyVC,
  generateCredentialId,
  createCredentialPayload,
  validateCredential,
  extractMetadata,
  CredentialUtils,
  type DirectKey,
  type SignerKey,
  type PublicKey,
  type W3CVerifiableCredential,
} from '../src/index';
import type { IdentitySubject } from '../src/types-synet';
import { generateTestDirectKey, generateTestSignerKey, createDIDFromKey } from './helpers';

describe('Pure Credential API', () => {
  describe('Key Architecture', () => {
    it('should create a direct key', () => {
      const key = generateTestDirectKey();
      
      expect(key.id).toBeTruthy();
      expect(key.publicKeyHex).toBeTruthy();
      expect(key.privateKeyHex).toBeTruthy();
      expect(key.type).toBe('Ed25519');
      expect(key.canSign()).toBe(true);
      expect(isDirectKey(key)).toBe(true);
      expect(isSignerKey(key)).toBe(false);
      expect(isPublicKey(key)).toBe(false);
    });

    it('should create a signer key', () => {
      const key = generateTestSignerKey();
      
      expect(key.id).toBeTruthy();
      expect(key.publicKeyHex).toBeTruthy();
      expect(key.privateKeyHex).toBeUndefined();
      expect(key.signer).toBeTruthy();
      expect(key.canSign()).toBe(true);
      expect(isDirectKey(key)).toBe(false);
      expect(isSignerKey(key)).toBe(true);
      expect(isPublicKey(key)).toBe(false);
    });

    it('should create a public key', () => {
      const directKey = generateTestDirectKey();
      const publicKey = directKey.toPublicKey();
      
      expect(publicKey.id).toBe(directKey.id);
      expect(publicKey.publicKeyHex).toBe(directKey.publicKeyHex);
      expect(publicKey.privateKeyHex).toBeUndefined();
      expect(publicKey.signer).toBeUndefined();
      expect(publicKey.canSign()).toBe(false);
      expect(isDirectKey(publicKey)).toBe(false);
      expect(isSignerKey(publicKey)).toBe(false);
      expect(isPublicKey(publicKey)).toBe(true);
    });

    it('should sign and verify with direct key', async () => {
      const key = generateTestDirectKey();
      const data = 'test-data';
      
      const signature = await key.sign(data);
      expect(signature).toBeTruthy();
      
      const isValid = await key.verify(data, signature);
      expect(isValid).toBe(true);
      
      const isInvalid = await key.verify('wrong-data', signature);
      expect(isInvalid).toBe(false);
    });

    it('should sign and verify with signer key', async () => {
      const key = generateTestSignerKey();
      const data = 'test-data';
      
      const signature = await key.sign(data);
      expect(signature).toBeTruthy();
      
      const isValid = await key.verify(data, signature);
      expect(isValid).toBe(true);
    });

    it('should create DID from key', () => {
      const key = generateTestDirectKey();
      const did = createDIDFromKey(key);
      
      expect(did).toMatch(/^did:key:z[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);
      expect(did.length).toBeGreaterThan(20);
    });

    it('should export key as JSON', () => {
      const key = generateTestDirectKey();
      const json = key.toJSON();
      
      expect(json).toEqual({
        id: key.id,
        publicKeyHex: key.publicKeyHex,
        type: key.type,
        meta: key.meta,
        canSign: true,
      });
      
      // Private key should not be included
      expect('privateKeyHex' in json).toBe(false);
    });

    it('should create verification method', () => {
      const key = generateTestDirectKey();
      const controller = 'did:key:controller123';
      const verificationMethod = key.toVerificationMethod(controller);
      
      expect(verificationMethod).toEqual({
        id: `${controller}#${key.id}`,
        type: `${key.type}VerificationKey2020`,
        controller,
        publicKeyHex: key.publicKeyHex,
      });
    });
  });

  describe('Pure Credential Functions', () => {
    it('should generate credential ID', () => {
      const id = generateCredentialId('TestCredential');
      expect(id).toMatch(/^urn:synet:TestCredential:[a-z0-9]+$/);
    });

    it('should create credential payload', () => {
      const issuerKey = generateTestDirectKey();
      const issuerDid = createDIDFromKey(issuerKey);
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test123',
          name: 'Test User',
        },
        issuedBy: {
          id: issuerDid,
          name: 'Test Issuer',
        },
      };

      const payload = createCredentialPayload(
        subject,
        'IdentityCredential',
        issuerDid,
        {
          vcId: 'test-credential-id',
          issuanceDate: '2025-01-01T00:00:00Z',
          meta: {
            version: '1.0.0',
          },
        }
      );

      expect(payload.id).toBe('test-credential-id');
      expect(payload.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(payload.issuer.id).toBe(issuerDid);
      expect(payload.issuanceDate).toBe('2025-01-01T00:00:00Z');
      expect(payload.credentialSubject).toEqual(subject);
      expect(payload.meta?.version).toBe('1.0.0');
    });

    it('should issue and verify credential with direct key', async () => {
      const issuerKey = generateTestDirectKey();
      const issuerDid = createDIDFromKey(issuerKey);
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test123',
          name: 'Test User',
        },
        issuedBy: {
          id: issuerDid,
          name: 'Test Issuer',
        },
      };

      // Issue credential
      const issueResult = await issueVC(
        issuerKey,
        subject,
        'IdentityCredential',
        issuerDid,
        {
          issuanceDate: '2025-01-01T00:00:00Z',
          meta: {
            version: '1.0.0',
          },
        }
      );

      expect(issueResult.success).toBe(true);
      if (!issueResult.success) return;

      const credential = issueResult.data;
      expect(credential.id).toBeTruthy();
      expect(credential.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(credential.issuer.id).toBe(issuerDid);
      expect(credential.proof).toBeTruthy();
      expect(credential.proof.type).toBe('JwtProof2020');
      expect(credential.proof.jwt).toBeTruthy();

      // Verify credential
      const verifyResult = await verifyVC(issuerKey, credential);
      
      expect(verifyResult.success).toBe(true);
      if (!verifyResult.success) return;

      const verification = verifyResult.data;
      expect(verification.verified).toBe(true);
      expect(verification.issuer).toBe(issuerDid);
      expect(verification.subject).toBe(subject.holder.id);
    });

    it('should issue and verify credential with signer key', async () => {
      const issuerKey = generateTestSignerKey();
      const issuerDid = createDIDFromKey(issuerKey);
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test123',
          name: 'Test User',
        },
        issuedBy: {
          id: issuerDid,
          name: 'Test Issuer',
        },
      };

      // Issue credential
      const issueResult = await issueVC(
        issuerKey,
        subject,
        'IdentityCredential',
        issuerDid
      );

      expect(issueResult.success).toBe(true);
      if (!issueResult.success) return;

      const credential = issueResult.data;
      expect(credential.proof.type).toBe('JwtProof2020');

      // Verify credential
      const verifyResult = await verifyVC(issuerKey, credential);
      
      expect(verifyResult.success).toBe(true);
      if (!verifyResult.success) return;

      expect(verifyResult.data.verified).toBe(true);
    });

    it('should fail to issue with public key', async () => {
      const issuerKey = generateTestDirectKey();
      const publicKey = issuerKey.toPublicKey();
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test123',
          name: 'Test User',
        },
        issuedBy: {
          id: 'did:key:test-issuer',
          name: 'Test Issuer',
        },
      };

      // Should fail to issue
      const issueResult = await issueVC(
        publicKey,
        subject,
        'IdentityCredential',
        'did:key:test-issuer'
      );

      expect(issueResult.success).toBe(false);
      expect(issueResult.error).toContain('Key cannot sign');
    });

    it('should validate credential structure', () => {
      const issuerKey = generateTestDirectKey();
      const issuerDid = createDIDFromKey(issuerKey);
      
      const validCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'test-credential-id',
        type: ['VerifiableCredential', 'IdentityCredential'],
        issuer: { id: issuerDid },
        issuanceDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          holder: {
            id: 'did:key:test123',
            name: 'Test User',
          },
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'test-jwt',
        },
      };

      const validResult = validateCredential(validCredential);
      expect(validResult.success).toBe(true);

      const invalidCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        // Missing required fields
      };

      const invalidResult = validateCredential(invalidCredential);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('Missing required field');
    });

    it('should extract credential metadata', () => {
      const issuerKey = generateTestDirectKey();
      const issuerDid = createDIDFromKey(issuerKey);
      
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'test-credential-id',
        type: ['VerifiableCredential', 'IdentityCredential'],
        issuer: { id: issuerDid },
        issuanceDate: '2025-01-01T00:00:00Z',
        expirationDate: '2026-01-01T00:00:00Z',
        credentialSubject: {
          holder: {
            id: 'did:key:test123',
            name: 'Test User',
          },
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'test-jwt',
        },
        meta: {
          version: '1.0.0',
          schema: 'https://example.com/schema',
        },
      };

      const metadata = extractMetadata(credential as W3CVerifiableCredential);
      
      expect(metadata.id).toBe('test-credential-id');
      expect(metadata.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(metadata.issuer).toBe(issuerDid);
      expect(metadata.subject).toBe('did:key:test123');
      expect(metadata.issuanceDate).toBe('2025-01-01T00:00:00Z');
      expect(metadata.expirationDate).toBe('2026-01-01T00:00:00Z');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.schema).toBe('https://example.com/schema');
    });
  });

  describe('Credential Utils', () => {
    it('should check if credential is expired', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // +1 day
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // -1 day
      
      const validCredential = {
        expirationDate: futureDate,
      };
      
      const expiredCredential = {
        expirationDate: pastDate,
      };
      
      const noExpirationCredential = {};
      
      expect(CredentialUtils.isExpired(validCredential)).toBe(false);
      expect(CredentialUtils.isExpired(expiredCredential)).toBe(true);
      expect(CredentialUtils.isExpired(noExpirationCredential)).toBe(false);
    });

    it('should get credential age', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // -1 day
      const credential = {
        issuanceDate: pastDate,
      };
      
      const age = CredentialUtils.getCredentialAge(credential);
      expect(age).toBeGreaterThan(86400000 - 1000); // Allow 1 second tolerance
    });

    it('should get credential types', () => {
      const credential = {
        type: ['VerifiableCredential', 'IdentityCredential', 'TestCredential'],
      };
      
      const types = CredentialUtils.getCredentialTypes(credential);
      expect(types).toEqual(['IdentityCredential', 'TestCredential']);
    });

    it('should check if credential has type', () => {
      const credential = {
        type: ['VerifiableCredential', 'IdentityCredential'],
      };
      
      expect(CredentialUtils.hasType(credential, 'IdentityCredential')).toBe(true);
      expect(CredentialUtils.hasType(credential, 'TestCredential')).toBe(false);
    });

    it('should get primary type', () => {
      const credential = {
        type: ['VerifiableCredential', 'IdentityCredential', 'TestCredential'],
      };
      
      const primaryType = CredentialUtils.getPrimaryType(credential);
      expect(primaryType).toBe('IdentityCredential');
    });
  });
});
