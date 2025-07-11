/**
 * Basic tests for Credential using @synet/keys integration
 * 
 * These are integration tests since credentials cannot exist without cryptographic keys.
 * We use the signer -> key chain from @synet/keys to test the full credential lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Signer } from '@synet/keys';
import { Credential } from '../src/credential';
import type { BaseCredentialSubject, W3CVerifiableCredential } from '../src/types-base';

describe('Credential Basic Functionality', () => {
  let signer: Awaited<ReturnType<typeof Signer.generate>>;
  let key: ReturnType<typeof signer.createKey>;
  let credential: Credential;

  beforeEach(async () => {
    // Create the signer -> key chain
    signer = await Signer.generate('ed25519', { name: 'test-signer' });
    key = signer.createKey();
    credential = Credential.create();
  });

  describe('Unit Creation and Basic Properties', () => {
    it('should create credential unit successfully', () => {
      expect(credential).toBeDefined();
      expect(credential.whoami()).toContain('Credential');
      expect(credential.dna.id).toBe('credential');
      expect(credential.dna.version).toBe('1.0.0');
    });

    it('should start with no capabilities', () => {
      const caps = credential.capabilities();
      expect(caps).toEqual([]);
      expect(credential.can('sign')).toBe(false);
      expect(credential.can('getPublicKey')).toBe(false);
      expect(credential.can('verify')).toBe(false);
    });

    it('should fail operations without learning crypto capabilities', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:123',
          name: 'Alice Smith'
        }
      };

      const result = await credential.issueCredential(
        subject,
        'TestCredential',
        'did:example:issuer'
      );

      expect(result.isFailure).toBe(true);
      expect(result.errorMessage).toContain('Cannot issue credential: missing getPublicKey or sign capability');
    });
  });

  describe('Learning from Key Unit', () => {
    it('should learn crypto capabilities from key', () => {
      const contract = key.teach();
      credential.learn([contract]);

      expect(credential.can('sign')).toBe(true);
      expect(credential.can('getPublicKey')).toBe(true);
      expect(credential.can('verify')).toBe(true);
    });

    it('should learn namespaced capabilities', () => {
      const contract = key.teach();
      credential.learn([contract]);

      const caps = credential.capabilities();
      expect(caps).toContain('sign');
      expect(caps).toContain('getPublicKey');
      expect(caps).toContain('verify');
    });
  });

  describe('Credential Issuance', () => {
    beforeEach(() => {
      // Learn crypto capabilities before each test
      credential.learn([key.teach()]);
    });

    it('should issue a basic credential', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:123',
          name: 'Alice Smith'
        },
        degree: 'Computer Science'
      };

      const result = await credential.issueCredential(
        subject,
        'UniversityDegree',
        'did:example:university'
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const cred = result.value;
        expect(cred['@context']).toContain('https://www.w3.org/2018/credentials/v1');
        expect(cred.type).toContain('VerifiableCredential');
        expect(cred.type).toContain('UniversityDegree');
        expect(cred.issuer.id).toBe('did:example:university');
        expect(cred.credentialSubject).toEqual(subject);
        expect(cred.proof).toBeDefined();
        expect(cred.proof.type).toBe('JwtProof2020');
        expect(cred.proof.jwt).toBeDefined();
      }
    });

    it('should issue credential with multiple types', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:456',
          name: 'Bob Johnson'
        }
      };

      const result = await credential.issueCredential(
        subject,
        ['AlumniCredential', 'EducationCredential'],
        'did:example:school'
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const cred = result.value;
        expect(cred.type).toEqual(['VerifiableCredential', 'AlumniCredential', 'EducationCredential']);
      }
    });

    it('should issue credential with options', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:789',
          name: 'Carol Davis'
        }
      };

      const options = {
        vcId: 'custom:credential:id',
        expirationDate: '2025-12-31T23:59:59Z',
        meta: { institution: 'Test University' }
      };

      const result = await credential.issueCredential(
        subject,
        'Diploma',
        'did:example:university',
        options
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const cred = result.value;
        expect(cred.id).toBe('custom:credential:id');
        expect(cred.expirationDate).toBe('2025-12-31T23:59:59Z');
        expect(cred.meta).toEqual({ institution: 'Test University' });
      }
    });

    it('should generate proper credential IDs', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:test',
          name: 'Test User'
        }
      };

      const result = await credential.issueCredential(
        subject,
        'TestCredential',
        'did:example:issuer'
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const cred = result.value;
        expect(cred.id).toMatch(/^urn:synet:TestCredential:/);
      }
    });
  });

  describe('Credential Verification', () => {
    let issuedCredential: W3CVerifiableCredential;

    beforeEach(async () => {
      credential.learn([key.teach()]);
      
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:test',
          name: 'Test User'
        }
      };

      const result = await credential.issueCredential(
        subject,
        'TestCredential',
        'did:example:issuer'
      );

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        issuedCredential = result.value;
      }
    });

    it('should verify a valid credential', async () => {
      const result = await credential.verifyCredential(issuedCredential);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const verificationResult = result.value;
        expect(verificationResult.verified).toBe(true);
        expect(verificationResult.issuer).toBe('did:example:issuer');
        expect(verificationResult.subject).toBe('did:example:test');
      }
    });

    it('should fail verification with tampered credential', async () => {
      // Tamper with the credential
      const tamperedCredential = {
        ...issuedCredential,
        credentialSubject: {
          ...issuedCredential.credentialSubject,
          holder: {
            ...issuedCredential.credentialSubject.holder,
            name: 'Tampered Name'
          }
        }
      };

      const result = await credential.verifyCredential(tamperedCredential);

      expect(result.isFailure).toBe(true);
      expect(result.errorMessage).toContain('JWT payload field "credentialSubject" does not match credential data');
    });

    it('should fail verification without crypto capabilities', async () => {
      const freshCredential = Credential.create();
      
      const result = await freshCredential.verifyCredential(issuedCredential);

      expect(result.isFailure).toBe(true);
      expect(result.errorMessage).toContain('Missing getPublicKey or verify capability');
    });
  });

  describe('Credential Structure Validation', () => {
    beforeEach(() => {
      credential.learn([key.teach()]);
    });

    it('should validate a proper credential structure', async () => {
      const validCredential: W3CVerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:test:credential',
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: { id: 'did:example:issuer' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          holder: {
            id: 'did:example:subject',
            name: 'Test Subject'
          }
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'fake.jwt.token'
        }
      };

      const result = await credential.validateStructure(validCredential);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should detect missing required fields', async () => {
      const invalidCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        // Missing issuer, issuanceDate, credentialSubject, proof
      } as unknown as W3CVerifiableCredential;

      const result = await credential.validateStructure(invalidCredential);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing issuer');
    });
  });

  describe('Error Handling', () => {
    it('should return Result with error for operations without capabilities', async () => {
      const subject: BaseCredentialSubject = {
        holder: {
          id: 'did:example:test',
          name: 'Test User'
        }
      };

      // Test issueCredential failure
      const issueResult = await credential.issueCredential(subject, 'TestCredential', 'did:example:issuer');
      expect(issueResult.isFailure).toBe(true);
      expect(issueResult.errorMessage).toContain('Cannot issue credential: missing getPublicKey or sign capability');

      // Test verifyCredential failure with valid credential structure but no capabilities
      const mockCredential: W3CVerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'urn:test:credential',
        type: ['VerifiableCredential', 'TestCredential'],
        issuer: { id: 'did:example:issuer' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          holder: {
            id: 'did:example:subject',
            name: 'Test Subject'
          }
        },
        proof: {
          type: 'JwtProof2020',
          jwt: 'fake.jwt.token'
        }
      };

      const verifyResult = await credential.verifyCredential(mockCredential);
      expect(verifyResult.isFailure).toBe(true);
      expect(verifyResult.errorMessage).toContain('Missing getPublicKey or verify capability');
    });

  
  });

  describe('Teaching Capabilities', () => {
    beforeEach(() => {
      credential.learn([key.teach()]);
    });

    it('should teach credential operations to other units', () => {
      const contract = credential.teach();

      expect(contract.unitId).toBe('credential');
      expect(contract.capabilities.issueCredential).toBeDefined();
      expect(contract.capabilities.verifyCredential).toBeDefined();
      expect(contract.capabilities.validateStructure).toBeDefined();

    });

    it('should allow other units to learn credential operations', () => {
      // Create a mock unit that can learn
      const mockUnit = {
        capabilities: new Map(),
        learn: function(contracts: { capabilities: Record<string, unknown> }[]) {
          for (const contract of contracts) {
            for (const [cap, impl] of Object.entries(contract.capabilities)) {
              this.capabilities.set(cap, impl);
            }
          }
        },
        can: function(cap: string) {
          return this.capabilities.has(cap);
        }
      };

      const contract = credential.teach();
      mockUnit.learn([contract]);

      expect(mockUnit.can('issueCredential')).toBe(true);
      expect(mockUnit.can('verifyCredential')).toBe(true);
      expect(mockUnit.can('validateStructure')).toBe(true);
    });
  });
});
