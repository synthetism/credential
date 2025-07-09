/**
 * Pure Credential Functions for @synet/credential
 * 
 * This module provides pure, composable functions for issuing and verifying
 * W3C-compatible verifiable credentials using the new Key/Signer architecture.
 * 
 * Key design principles:
 * - Pure functions (no side effects)
 * - Composable and testable
 * - Type-safe operations
 * - Minimal dependencies
 * - Progressive security model
 * 
 * @author Synet Team
 */

import { createId } from './utils';
import type { CredentialKey } from './key';
import type {
  W3CVerifiableCredential,
  BaseCredentialSubject,
  CredentialIssueOptions,
  CredentialVerifyOptions,
  VerificationResult,
  ProofType,
} from './types-base';

// Note: In production, import from @synet/patterns when available
// For now, we'll use a simple Result implementation
interface ResultSuccess<T> {
  success: true;
  data: T;
  error?: never;
}

interface ResultFailure {
  success: false;
  data?: never;
  error: string;
}

export type Result<T> = ResultSuccess<T> | ResultFailure;

export const Result = {
  ok<T>(data: T): ResultSuccess<T> {
    return { success: true, data };
  },

  fail(error: string): ResultFailure {
    return { success: false, error };
  },
};


/**
 * Default W3C contexts
 */
const DEFAULT_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

/**
 * Generate a unique credential ID
 */
export function generateCredentialId(type: string): string {
  const cuid = createId();
  return `urn:synet:${type}:${cuid}`;
}

/**
 * Create a credential payload (without proof)
 */
export function createCredentialPayload<S extends BaseCredentialSubject>(
  subject: S,
  type: string | string[],
  issuerDid: string,
  options?: CredentialIssueOptions
): Omit<W3CVerifiableCredential<S>, 'proof'> {
  const typeArray = Array.isArray(type) ? type : [type];
  const appType = typeArray.find(t => t !== 'VerifiableCredential') || 'Generic';

  const context = options?.context
    ? [...DEFAULT_CONTEXT, ...options.context]
    : DEFAULT_CONTEXT;

  return {
    '@context': context,
    id: options?.vcId || generateCredentialId(appType),
    type: ['VerifiableCredential', ...typeArray],
    issuer: { id: issuerDid },
    issuanceDate: options?.issuanceDate || new Date().toISOString(),
    expirationDate: options?.expirationDate,
    credentialSubject: subject,
    meta: options?.meta,
  };
}

/**
 * Create a JWT proof for a credential
 */
export async function createJWTProof(
  payload: Omit<W3CVerifiableCredential, 'proof'>,
  key: CredentialKey,
  issuerDid?: string
): Promise<Result<ProofType>> {
  try {
    if (!key.canSign()) {
      return Result.fail('Key cannot sign: no private key or signer available');
    }

    const jwtHeader = {
      alg: 'EdDSA',
      typ: 'JWT',
    };

    const jwtPayload = {
      vc: payload,
      jti: payload.id,
      nbf: Math.floor(new Date(payload.issuanceDate).getTime() / 1000),
      iss: issuerDid || payload.issuer.id,
      ...(payload.expirationDate && {
        exp: Math.floor(new Date(payload.expirationDate).getTime() / 1000),
      }),
    };

    const headerB64 = base64urlEncode(JSON.stringify(jwtHeader));
    const payloadB64 = base64urlEncode(JSON.stringify(jwtPayload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const signature = await key.sign(signingInput);
    const jwt = `${signingInput}.${signature}`;

    return Result.ok({
      type: 'JwtProof2020',
      jwt,
      verificationMethod: issuerDid,
    });
  } catch (error) {
    return Result.fail(
      `Failed to create JWT proof: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Verify a JWT proof
 */
export async function verifyJWTProof(
  credential: W3CVerifiableCredential,
  verificationKey: CredentialKey,
  options?: CredentialVerifyOptions
): Promise<Result<VerificationResult>> {
  try {
    const { proof } = credential;

    if (!proof.jwt) {
      return Result.fail('No JWT found in proof');
    }

    const jwtParts = proof.jwt.split('.');
    if (jwtParts.length !== 3) {
      return Result.fail('Invalid JWT format');
    }

    const [headerB64, payloadB64, signature] = jwtParts;
    const signingInput = `${headerB64}.${payloadB64}`;

    try {
      const jwtPayload = JSON.parse(base64urlDecode(payloadB64));
      const issuerDid = jwtPayload.iss;

      // Verify signature
      const isValidSignature = await verificationKey.verify(signingInput, signature);

      if (!isValidSignature) {
        return Result.fail('Invalid signature');
      }

      // Check expiration if requested
      if (options?.checkExpiration !== false && jwtPayload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (now > jwtPayload.exp) {
          return Result.fail('Credential has expired');
        }
      }

      // Check issuer if requested
      if (options?.expectedIssuer && issuerDid !== options.expectedIssuer) {
        return Result.fail(`Unexpected issuer: ${issuerDid}`);
      }

      return Result.ok({
        verified: true,
        issuer: issuerDid,
        subject: credential.credentialSubject.holder.id,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate,
      });
    } catch (parseError) {
      return Result.fail(
        `Failed to parse JWT payload: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  } catch (error) {
    return Result.fail(
      `Failed to verify JWT proof: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Issue a new verifiable credential
 * 
 * Pure function that creates a complete W3C verifiable credential
 * with proof using the provided key.
 */
export async function issueVC<S extends BaseCredentialSubject>(
  subject: S,
  type: string | string[],
  issuerDid: string,
  options?: CredentialIssueOptions
): Promise<Result<W3CVerifiableCredential<S>>> {
  try {
 

    // Create credential payload
    const payload = createCredentialPayload(
      subject,
      type,
      issuerDid,
      options
    );

    // Create proof based on format
    const proofFormat = options?.proofFormat || 'jwt';

    let proofResult: Result<ProofType>;
    if (proofFormat === 'jwt') {
      proofResult = await createJWTProof(payload,  issuerDid);
    } else {
      return Result.fail(`Unsupported proof format: ${proofFormat}`);
    }

    if (!proofResult.success) {
      return Result.fail(`Failed to create proof: ${proofResult.error}`);
    }

    const credential: W3CVerifiableCredential<S> = {
      ...payload,
      proof: proofResult.data,
    };

    return Result.ok(credential);
  } catch (error) {
    return Result.fail(
      `Failed to issue credential: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Verify a verifiable credential
 * 
 * Pure function that verifies a W3C verifiable credential
 * using the provided verification key.
 */
export async function verifyVC(
  verificationKey: CredentialKey,
  credential: W3CVerifiableCredential,
  options?: CredentialVerifyOptions
): Promise<Result<VerificationResult>> {
  try {
    const { proof } = credential;

    // Verify based on proof type
    if (proof.type === 'JwtProof2020' && proof.jwt) {
      return await verifyJWTProof(credential, verificationKey, options);
    }

    return Result.fail(`Unsupported proof type: ${proof.type}`);
  } catch (error) {
    return Result.fail(
      `Failed to verify credential: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract credential metadata
 */
export function extractMetadata(credential: W3CVerifiableCredential): {
  id: string;
  type: string[];
  issuer: string;
  subject: string;
  issuanceDate: string;
  expirationDate?: string;
  version?: string;
  schema?: string;
} {
  return {
    id: credential.id,
    type: credential.type,
    issuer: credential.issuer.id,
    subject: credential.credentialSubject.holder.id,
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,
    version: credential.meta?.version,
    schema: credential.meta?.schema,
  };
}

/**
 * Validate credential structure
 */
export function validateCredential(credential: unknown): Result<W3CVerifiableCredential> {
  try {
    if (!credential || typeof credential !== 'object') {
      return Result.fail('Credential must be an object');
    }

    const vc = credential as Record<string, unknown>;

    // Check required fields
    const requiredFields = [
      '@context',
      'id',
      'type',
      'issuer',
      'issuanceDate',
      'credentialSubject',
      'proof',
    ];
    for (const field of requiredFields) {
      if (!(field in vc)) {
        return Result.fail(`Missing required field: ${field}`);
      }
    }

    // Validate context
    if (!Array.isArray(vc['@context'])) {
      return Result.fail('@context must be an array');
    }

    // Validate type
    if (!Array.isArray(vc.type)) {
      return Result.fail('type must be an array');
    }

    // Validate issuer
    if (!vc.issuer || typeof vc.issuer !== 'object' || !('id' in (vc.issuer as object))) {
      return Result.fail('issuer must be an object with id property');
    }

    // Validate credential subject
    if (!vc.credentialSubject || typeof vc.credentialSubject !== 'object') {
      return Result.fail('credentialSubject must be an object');
    }

    const subject = vc.credentialSubject as Record<string, unknown>;
    if (!subject.holder || typeof subject.holder !== 'object' || !('id' in (subject.holder as object))) {
      return Result.fail('credentialSubject must have a holder with id property');
    }

    // Validate proof
    if (!vc.proof || typeof vc.proof !== 'object' || !('type' in (vc.proof as object))) {
      return Result.fail('proof must be an object with type property');
    }

    return Result.ok(credential as W3CVerifiableCredential);
  } catch (error) {
    return Result.fail(
      `Invalid credential structure: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Utility functions for credential operations
 */
export const CredentialUtils = {
  /**
   * Check if a credential is expired
   */
  isExpired(credential: Pick<W3CVerifiableCredential, 'expirationDate'>): boolean {
    if (!credential.expirationDate) {
      return false;
    }

    return new Date(credential.expirationDate) < new Date();
  },

  /**
   * Get credential age in milliseconds
   */
  getCredentialAge(credential: Pick<W3CVerifiableCredential, 'issuanceDate'>): number {
    const issuanceDate = new Date(credential.issuanceDate);
    return Date.now() - issuanceDate.getTime();
  },

  /**
   * Get credential types without the base VerifiableCredential type
   */
  getCredentialTypes(credential: Pick<W3CVerifiableCredential, 'type'>): string[] {
    return credential.type.filter(t => t !== 'VerifiableCredential');
  },

  /**
   * Check if credential has a specific type
   */
  hasType(credential: Pick<W3CVerifiableCredential, 'type'>, type: string): boolean {
    return credential.type.includes(type);
  },

  /**
   * Get credential's primary type (first non-VerifiableCredential type)
   */
  getPrimaryType(credential: Pick<W3CVerifiableCredential, 'type'>): string {
    const types = CredentialUtils.getCredentialTypes(credential);
    return types[0] || 'Generic';
  },
};
