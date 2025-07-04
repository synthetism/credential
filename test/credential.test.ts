/**
 * Test suite for @synet/credential
 * 
 * This test suite verifies the core functionality of the credential service
 * including issuing, verifying, and storing credentials.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialService, CredentialUtils } from '../src/credential-service';
import { MemoryCredentialStorageAdapter } from './storage-adapter';
import type { 
  W3CVerifiableCredential, 
  IdentitySubject, 
  BaseCredentialSubject,
  KeyManager 
} from '../src/types-synet';

describe('CredentialService', () => {
  let credentialService: CredentialService;
  let keyManager: KeyManager;
  let storage: MemoryCredentialStorageAdapter;
  let issuerDid: string;
  let keyId: string;

  beforeEach(async () => {
    // Create a simple key manager for testing
    keyManager = CredentialUtils.createSimpleKeyManager();
    
    // Create a test key
    const keyResult = await keyManager.createKey();
    keyId = keyResult.keyId;
    issuerDid = `did:key:${keyResult.publicKey}`;
    
    // Create credential service
    credentialService = new CredentialService(keyManager, issuerDid, keyId);
    
    // Create storage
    storage = new MemoryCredentialStorageAdapter();
  });

  describe('Credential Generation', () => {
    it('should generate a valid credential ID', () => {
      const id = CredentialService.generateCredentialId('TestCredential');
      expect(id).toMatch(/^urn:synet:TestCredential:[a-z0-9]+$/);
    });

    it('should create a credential payload', () => {
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

      const payload = CredentialService.createCredentialPayload(
        subject,
        'IdentityCredential',
        issuerDid,
        {
          vcId: 'test-credential-id',
          issuanceDate: '2025-01-01T00:00:00Z',
        }
      );

      expect(payload.id).toBe('test-credential-id');
      expect(payload.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(payload.issuer.id).toBe(issuerDid);
      expect(payload.issuanceDate).toBe('2025-01-01T00:00:00Z');
      expect(payload.credentialSubject).toEqual(subject);
    });
  });

  describe('Credential Issuance', () => {
    it('should issue a valid credential', async () => {
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

      const result = await credentialService.issueVC(
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

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (!result.success || !result.data) {
        throw new Error('Failed to issue credential');
      }
      
      const credential = result.data;
      expect(credential.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(credential.issuer.id).toBe(issuerDid);
      expect(credential.proof).toBeDefined();
      expect(credential.proof.type).toBe('JwtProof2020');
      expect(credential.proof.jwt).toBeDefined();
      expect(credential.meta?.version).toBe('1.0.0');
    });

    it('should fail when no issuer is specified', async () => {
      const serviceWithoutIssuer = new CredentialService(keyManager);
      
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:key:test123',
        },
      };

      const result = await serviceWithoutIssuer.issueVC(subject, 'TestCredential');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No issuer DID specified');
    });
  });

  describe('Credential Verification', () => {
    it('should verify a valid credential', async () => {
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

      // Issue a credential
      const issueResult = await credentialService.issueVC(
        subject,
        'IdentityCredential',
        issuerDid
      );

      expect(issueResult.success).toBe(true);
      const credential = issueResult.data as W3CVerifiableCredential;

      // Verify the credential
      const verifyResult = await credentialService.verifyVC(credential);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.verified).toBe(true);
      expect(verifyResult.data?.issuer).toBe(issuerDid);
      expect(verifyResult.data?.subject).toBe('did:key:test123');
    });

    it('should detect expired credentials', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:key:test123',
        },
      };

      // Issue an expired credential
      const issueResult = await credentialService.issueVC(
        subject,
        'TestCredential',
        issuerDid,
        {
          issuanceDate: '2020-01-01T00:00:00Z',
          expirationDate: '2020-01-02T00:00:00Z',
        }
      );

      expect(issueResult.success).toBe(true);
      const credential = issueResult.data as W3CVerifiableCredential;

      // Verify with expiration check
      const verifyResult = await credentialService.verifyVC(credential, {
        checkExpiration: true,
      });
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toContain('expired');
    });
  });

  describe('Credential Validation', () => {
    it('should validate a well-formed credential', () => {
      const credential: W3CVerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'test-credential-id',
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: { id: issuerDid },
        issuanceDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          holder: {
            id: 'did:key:test123',
          },
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'test.jwt.signature',
        },
      };

      const result = CredentialService.validateCredential(credential);
      expect(result.success).toBe(true);
    });

    it('should reject malformed credentials', () => {
      const malformedCredential = {
        id: 'test-credential-id',
        // Missing required fields
      };

      const result = CredentialService.validateCredential(malformedCredential);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field');
    });
  });

  describe('Utility Functions', () => {
    it('should extract credential metadata', () => {
      const credential: W3CVerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'test-credential-id',
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: { id: issuerDid },
        issuanceDate: '2025-01-01T00:00:00Z',
        credentialSubject: {
          holder: {
            id: 'did:key:test123',
          },
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'test.jwt.signature',
        },
        meta: {
          version: '1.0.0',
          schema: 'https://test.schema.org/1.0.0',
        },
      };

      const metadata = CredentialService.extractMetadata(credential);
      
      expect(metadata.id).toBe('test-credential-id');
      expect(metadata.type).toEqual(['VerifiableCredential', 'TestCredential']);
      expect(metadata.issuer).toBe(issuerDid);
      expect(metadata.subject).toBe('did:key:test123');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.schema).toBe('https://test.schema.org/1.0.0');
    });

    it('should check credential expiration', () => {
      const expiredCredential: W3CVerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'test-credential-id',
        type: ['VerifiableCredential'],
        issuer: { id: issuerDid },
        issuanceDate: '2020-01-01T00:00:00Z',
        expirationDate: '2020-01-02T00:00:00Z',
        credentialSubject: {
          holder: { id: 'did:key:test123' },
        },
        proof: { type: 'JwtProof2020', jwt: 'test.jwt.signature' },
      };

      const nonExpiredCredential: W3CVerifiableCredential = {
        ...expiredCredential,
        expirationDate: '2030-01-01T00:00:00Z',
      };

      expect(CredentialUtils.isExpired(expiredCredential)).toBe(true);
      expect(CredentialUtils.isExpired(nonExpiredCredential)).toBe(false);
    });

    it('should parse DIDs correctly', () => {
      const validDid = 'did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx';
      const invalidDid = 'not-a-did';

      const validResult = CredentialUtils.parseDID(validDid);
      expect(validResult).toEqual({
        method: 'key',
        identifier: 'z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx',
      });

      const invalidResult = CredentialUtils.parseDID(invalidDid);
      expect(invalidResult).toBeNull();
    });
  });
});

describe('Storage', () => {
  let storage: MemoryCredentialStorageAdapter;
  let credential: W3CVerifiableCredential;

  beforeEach(() => {
    storage = new MemoryCredentialStorageAdapter();
    credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'test-credential-id',
      type: ['VerifiableCredential', 'TestCredential'],
      issuer: { id: 'did:key:test-issuer' },
      issuanceDate: '2025-01-01T00:00:00Z',
      credentialSubject: {
        holder: {
          id: 'did:key:test123',
          name: 'Test User',
        },
      },
      proof: {
        type: 'JwtProof2020',
        jwt: 'test.jwt.signature',
      },
    };
  });

  describe('Basic Operations', () => {
    it('should save and load credentials', async () => {
      await storage.save(credential);
      
      const loaded = await storage.load('test-credential-id');
      expect(loaded).toEqual(credential);
    });

    it('should return null for non-existent credentials', async () => {
      const loaded = await storage.load('non-existent-id');
      expect(loaded).toBeNull();
    });

    it('should delete credentials', async () => {
      await storage.save(credential);
      await storage.delete('test-credential-id');
      
      const loaded = await storage.load('test-credential-id');
      expect(loaded).toBeNull();
    });

    it('should list all credentials', async () => {
      await storage.save(credential);
      
      const secondCredential = {
        ...credential,
        id: 'test-credential-id-2',
      };
      await storage.save(secondCredential);
      
      const list = await storage.list();
      expect(list).toHaveLength(2);
      expect(list).toContain(credential);
      expect(list).toContain(secondCredential);
    });

    it('should search credentials', async () => {
      await storage.save(credential);
      
      const results = await storage.search({ 
        'credentialSubject.holder.name': 'Test User' 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(credential);
    });

    it('should clear all credentials', async () => {
      await storage.save(credential);
      await storage.clear();
      
      const count = await storage.count();
      expect(count).toBe(0);
    });
  });
});

describe('Integration Test', () => {
  it('should perform a complete credential lifecycle', async () => {
    // Setup
    const keyManager = CredentialUtils.createSimpleKeyManager();
    const keyResult = await keyManager.createKey();
    const keyId = keyResult.keyId;
    const issuerDid = `did:key:${keyResult.publicKey}`;
    const credentialService = new CredentialService(keyManager, issuerDid, keyId);
    const storage = new MemoryCredentialStorageAdapter();

    // Issue a credential
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

    const issueResult = await credentialService.issueVC(
      subject,
      'IdentityCredential',
      issuerDid,
      {
        meta: {
          version: '1.0.0',
        },
      }
    );

    expect(issueResult.success).toBe(true);
    const credential = issueResult.data as W3CVerifiableCredential;

    // Store the credential
    await storage.save(credential);

    // Verify the credential
    const verifyResult = await credentialService.verifyVC(credential);
    expect(verifyResult.success).toBe(true);

    // Retrieve from storage
    const storedCredential = await storage.load(credential.id);
    expect(storedCredential).toEqual(credential);

    // Search for the credential
    const searchResults = await storage.search({
      'credentialSubject.holder.name': 'Test User',
    });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]).toEqual(credential);

    // Validate the credential structure
    const validationResult = CredentialService.validateCredential(credential);
    expect(validationResult.success).toBe(true);

    // Extract metadata
    const metadata = CredentialService.extractMetadata(credential);
    expect(metadata.id).toBe(credential.id);
    expect(metadata.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
    expect(metadata.issuer).toBe(issuerDid);
    expect(metadata.subject).toBe('did:key:test123');
    expect(metadata.version).toBe('1.0.0');
  });
});
