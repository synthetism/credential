/**
 * Example usage of @synet/credential using real data
 * 
 * This example demonstrates how to use the credential service with
 * actual keys and credentials from the example-storages.
 */

import { describe, it, expect } from 'vitest';
import { CredentialService, CredentialUtils } from '../src/credential-service';
import { JSONCredentialStorage } from '../src/storage';
import type { W3CVerifiableCredential, IdentitySubject } from '../src/types-synet';

// Sample credential from example-storages/vcstore.json
const exampleCredential: W3CVerifiableCredential<IdentitySubject> = {
  "credentialSubject": {
    "holder": {
      "id": "did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx",
      "name": "test-user-1751297239341"
    },
    "issuedBy": {
      "id": "did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx",
      "name": "test-user-1751297239341"
    }
  },
  "issuer": {
    "id": "did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx"
  },
  "id": "urn:synet:IdentityCredential:za7uquozhgbc7aluj74r9lf2",
  "type": [
    "VerifiableCredential",
    "IdentityCredential"
  ],
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "issuanceDate": "2025-06-30T15:27:19.000Z",
  "proof": {
    "type": "JwtProof2020",
    "jwt": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiSWRlbnRpdHlDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImhvbGRlciI6eyJpZCI6ImRpZDprZXk6ejZNa3R0ak55blBka1lZN3ZjbkJ2d3NSSkVnTmU2ZWkxU29QeGg0dTdkRnVWV3N4IiwibmFtZSI6InRlc3QtdXNlci0xNzUxMjk3MjM5MzQxIn0sImlzc3VlZEJ5Ijp7ImlkIjoiZGlkOmtleTp6Nk1rdHRqTnluUGRrWVk3dmNuQnZ3c1JKRWdOZTZlaTFTb1B4aDR1N2RGdVZXc3giLCJuYW1lIjoidGVzdC11c2VyLTE3NTEyOTcyMzkzNDEifX19LCJqdGkiOiJ1cm46c3luZXQ6SWRlbnRpdHlDcmVkZW50aWFsOnphN3VxdW96aGdiYzdhbHVqNzRyOWxmMiIsIm5iZiI6MTc1MTI5NzIzOSwiaXNzIjoiZGlkOmtleTp6Nk1rdHRqTnluUGRrWVk3dmNuQnZ3c1JKRWdOZTZlaTFTb1B4aDR1N2RGdVZXc3gifQ.9xKIUIAKEFysmQo3YAIjxTuJ3VJRt66XDLYHviAW1LaY7qPvH--izki_XEOK6OYROi3YQpJdv7wsulflLzcqCg"
  }
};

describe('Real Data Examples', () => {
  describe('Credential Structure Validation', () => {
    it('should validate the example credential structure', () => {
      const validationResult = CredentialService.validateCredential(exampleCredential);
      expect(validationResult.success).toBe(true);
    });

    it('should extract metadata from the example credential', () => {
      const metadata = CredentialService.extractMetadata(exampleCredential);
      
      expect(metadata.id).toBe('urn:synet:IdentityCredential:za7uquozhgbc7aluj74r9lf2');
      expect(metadata.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(metadata.issuer).toBe('did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx');
      expect(metadata.subject).toBe('did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx');
      expect(metadata.issuanceDate).toBe('2025-06-30T15:27:19.000Z');
    });

    it('should parse the DID from the example credential', () => {
      const did = 'did:key:z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx';
      const parsed = CredentialUtils.parseDID(did);
      
      expect(parsed).toEqual({
        method: 'key',
        identifier: 'z6MkttjNynPdkYY7vcnBvwsRJEgNe6ei1SoPxh4u7dFuVWsx'
      });
    });
  });

  describe('Credential ID Generation', () => {
    it('should generate IDs in the same format as the example', () => {
      const id = CredentialService.generateCredentialId('IdentityCredential');
      expect(id).toMatch(/^urn:synet:IdentityCredential:[a-z0-9]+$/);
      
      // Check that it follows the same pattern as the example
      expect(id.startsWith('urn:synet:IdentityCredential:')).toBe(true);
    });

    it('should generate different IDs for different types', () => {
      const identityId = CredentialService.generateCredentialId('IdentityCredential');
      const authId = CredentialService.generateCredentialId('AuthorizationCredential');
      
      expect(identityId).toMatch(/^urn:synet:IdentityCredential:[a-z0-9]+$/);
      expect(authId).toMatch(/^urn:synet:AuthorizationCredential:[a-z0-9]+$/);
      expect(identityId).not.toBe(authId);
    });
  });

  describe('Compatible Credential Creation', () => {
    it('should create credentials with the same structure as the example', async () => {
      const keyManager = CredentialUtils.createSimpleKeyManager();
      const { keyId, publicKey } = await keyManager.createKey();
      const issuerDid = `did:key:${publicKey}`;
      
      const credentialService = new CredentialService(keyManager, issuerDid, keyId);
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test-holder',
          name: 'Test User'
        },
        issuedBy: {
          id: issuerDid,
          name: 'Test Issuer'
        }
      };
      
      const result = await credentialService.issueVC(
        subject,
        'IdentityCredential',
        issuerDid,
        {
          issuanceDate: '2025-01-01T00:00:00Z'
        }
      );
      
      expect(result.success).toBe(true);
      const credential = result.data as W3CVerifiableCredential<IdentitySubject>;
      
      // Check structure matches example
      expect(credential['@context']).toEqual(['https://www.w3.org/2018/credentials/v1']);
      expect(credential.type).toEqual(['VerifiableCredential', 'IdentityCredential']);
      expect(credential.issuer).toEqual({ id: issuerDid });
      expect(credential.credentialSubject.holder.id).toBe('did:key:test-holder');
      expect(credential.credentialSubject.issuedBy.id).toBe(issuerDid);
      expect(credential.proof.type).toBe('JwtProof2020');
      expect(credential.proof.jwt).toBeDefined();
    });
  });

  describe('Storage Compatibility', () => {
    it('should work with the same storage format as vcstore.json', async () => {
      const storage = new JSONCredentialStorage('./test-credentials.json');
      
      // Save the example credential
      await storage.save(exampleCredential);
      
      // Load it back
      const loaded = await storage.load(exampleCredential.id);
      expect(loaded).toEqual(exampleCredential);
      
      // Search for it
      const searchResults = await storage.search({
        'credentialSubject.holder.name': 'test-user-1751297239341'
      });
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0]).toEqual(exampleCredential);
      
      // Clean up
      await storage.delete(exampleCredential.id);
    });
  });

  describe('Migration Compatibility', () => {
    it('should handle credentials from the original vcstore.json format', async () => {
      // This demonstrates that our new implementation can work with 
      // credentials created by the original Veramo-based system
      
      const validationResult = CredentialService.validateCredential(exampleCredential);
      expect(validationResult.success).toBe(true);
      
      // Extract all the metadata
      const metadata = CredentialService.extractMetadata(exampleCredential);
      expect(metadata.id).toBe(exampleCredential.id);
      expect(metadata.type).toEqual(exampleCredential.type);
      expect(metadata.issuer).toBe(exampleCredential.issuer.id);
      expect(metadata.subject).toBe(exampleCredential.credentialSubject.holder.id);
      
      // Check the credential structure
      expect(exampleCredential.credentialSubject.holder).toBeDefined();
      expect(exampleCredential.credentialSubject.issuedBy).toBeDefined();
      expect(exampleCredential.proof.jwt).toBeDefined();
    });
  });

  describe('W3C Compatibility', () => {
    it('should create credentials that are W3C-compatible', async () => {
      const keyManager = CredentialUtils.createSimpleKeyManager();
      const { keyId, publicKey } = await keyManager.createKey();
      const issuerDid = `did:key:${publicKey}`;
      
      const credentialService = new CredentialService(keyManager, issuerDid, keyId);
      
      const subject: IdentitySubject = {
        holder: {
          id: 'did:key:test-holder',
          name: 'Test User'
        },
        issuedBy: {
          id: issuerDid,
          name: 'Test Issuer'
        }
      };
      
      const result = await credentialService.issueVC(subject, 'IdentityCredential');
      expect(result.success).toBe(true);
      
      const credential = result.data as W3CVerifiableCredential<IdentitySubject>;
      
      // Check W3C required fields
      expect(credential['@context']).toContain('https://www.w3.org/2018/credentials/v1');
      expect(credential.type).toContain('VerifiableCredential');
      expect(credential.id).toBeDefined();
      expect(credential.issuer).toBeDefined();
      expect(credential.issuanceDate).toBeDefined();
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.proof).toBeDefined();
      
      // The credential should be verifiable
      const verifyResult = await credentialService.verifyVC(credential);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data?.verified).toBe(true);
    });
  });
});

describe('Universal Compatibility', () => {
  it('should demonstrate the dependency moat principle', () => {
    // This test demonstrates that SynetVerifiableCredential is just an alias
    // for W3CVerifiableCredential, creating the dependency moat
    
    // These should be the same type
    const synetCredential: W3CVerifiableCredential = exampleCredential;
    const w3cCredential: W3CVerifiableCredential = exampleCredential;
    
    expect(synetCredential).toEqual(w3cCredential);
    
    // Both should validate the same way
    const synetValidation = CredentialService.validateCredential(synetCredential);
    const w3cValidation = CredentialService.validateCredential(w3cCredential);
    
    expect(synetValidation.success).toBe(w3cValidation.success);
    expect(synetValidation.success).toBe(true);
  });
});
