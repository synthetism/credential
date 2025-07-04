/**
 * Universal Credential Service
 *
 * A pure, dependency-free service for issuing and verifying W3C-compatible
 * verifiable credentials. This service provides the core functionality for
 * credential management without external dependencies (except for patterns).
 *
 * Key features:
 * - Pure functions for credential operations
 * - Type-safe credential handling
 * - Extensible for different proof formats
 * - Compatible with any key management system
 * - Minimal dependencies (only @synet/patterns for Result)
 *
 * @author Synet Team
 */

import { createId } from "@paralleldrive/cuid2";

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

type Result<T> = ResultSuccess<T> | ResultFailure;

const Result = {
  ok<T>(data: T): ResultSuccess<T> {
    return { success: true, data };
  },

  fail(error: string): ResultFailure {
    return { success: false, error };
  },
};

// Base64url encoding utilities (simplified)
function base64urlEncode(data: string): string {
  try {
    // Try Node.js Buffer first
    const nodeBuffer = (globalThis as Record<string, unknown>)?.Buffer;
    if (nodeBuffer && typeof nodeBuffer === "object" && "from" in nodeBuffer) {
      return (
        nodeBuffer as {
          from: (data: string) => { toString: (encoding: string) => string };
        }
      )
        .from(data)
        .toString("base64url");
    }

    // Fallback to browser btoa
    const browserBtoa = (globalThis as Record<string, unknown>)?.btoa;
    if (browserBtoa && typeof browserBtoa === "function") {
      return (browserBtoa as (data: string) => string)(data)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    }

    throw new Error("No base64 encoding available");
  } catch (error) {
    throw new Error(
      `Base64 encoding failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function base64urlDecode(data: string): string {
  try {
    // Try Node.js Buffer first
    const nodeBuffer = (globalThis as Record<string, unknown>)?.Buffer;
    if (nodeBuffer && typeof nodeBuffer === "object" && "from" in nodeBuffer) {
      return (
        nodeBuffer as {
          from: (data: string, encoding: string) => { toString: () => string };
        }
      )
        .from(data, "base64url")
        .toString();
    }

    // Fallback to browser atob
    const browserAtob = (globalThis as Record<string, unknown>)?.atob;
    if (browserAtob && typeof browserAtob === "function") {
      let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      return (browserAtob as (data: string) => string)(base64);
    }

    throw new Error("No base64 decoding available");
  } catch (error) {
    throw new Error(
      `Base64 decoding failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
import type {
  W3CVerifiableCredential,
  BaseCredentialSubject,
  CredentialIssueOptions,
  CredentialVerifyOptions,
  VerificationResult,
  KeyManager,
  ProofType,
} from "./types-base";

/**
 * Pure credential service for issuing and verifying VCs
 */
export class CredentialService {
  private static readonly DEFAULT_CONTEXT = [
    "https://www.w3.org/2018/credentials/v1",
  ];

  constructor(
    private readonly keyManager?: KeyManager,
    private readonly defaultIssuerDid?: string,
    private readonly defaultKeyId?: string,
  ) {}

  /**
   * Generate a unique credential ID
   */
  static generateCredentialId(type: string): string {
    const cuid = createId();
    return `urn:synet:${type}:${cuid}`;
  }

  /**
   * Create a credential payload (without proof)
   */
  static createCredentialPayload<S extends BaseCredentialSubject>(
    subject: S,
    type: string | string[],
    issuerDid: string,
    options?: CredentialIssueOptions,
  ): Omit<W3CVerifiableCredential<S>, "proof"> {
    const typeArray = Array.isArray(type) ? type : [type];
    const appType =
      typeArray.find((t) => t !== "VerifiableCredential") || "Generic";

    const context = options?.context
      ? [...CredentialService.DEFAULT_CONTEXT, ...options.context]
      : CredentialService.DEFAULT_CONTEXT;

    return {
      "@context": context,
      id: options?.vcId || CredentialService.generateCredentialId(appType),
      type: ["VerifiableCredential", ...typeArray],
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
  static async createJWTProof(
    payload: Omit<W3CVerifiableCredential, "proof">,
    keyManager: KeyManager,
    keyId: string,
    issuerDid?: string,
  ): Promise<Result<ProofType>> {
    try {
      const jwtHeader = {
        alg: "EdDSA",
        typ: "JWT",
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

      const signature = await keyManager.sign(signingInput, keyId);
      const jwt = `${signingInput}.${signature}`;

      return Result.ok({
        type: "JwtProof2020",
        jwt,
      });
    } catch (error) {
      return Result.fail(
        `Failed to create JWT proof: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a JWT proof
   */
  static async verifyJWTProof(
    credential: W3CVerifiableCredential,
    keyManager: KeyManager,
    options?: CredentialVerifyOptions,
  ): Promise<Result<VerificationResult>> {
    try {
      const { proof } = credential;

      if (!proof.jwt) {
        return Result.fail("No JWT found in proof");
      }

      const jwtParts = proof.jwt.split(".");
      if (jwtParts.length !== 3) {
        return Result.fail("Invalid JWT format");
      }

      const [headerB64, payloadB64, signature] = jwtParts;
      const signingInput = `${headerB64}.${payloadB64}`;

      try {
        const jwtPayload = JSON.parse(base64urlDecode(payloadB64));
        const issuerDid = jwtPayload.iss;

        // Get public key for verification - use the issuer DID as key ID
        const publicKey = await keyManager.getPublicKey(issuerDid);

        // Verify signature
        const isValidSignature = await keyManager.verify(
          signingInput,
          signature,
          publicKey,
        );

        if (!isValidSignature) {
          return Result.fail("Invalid signature");
        }

        // Check expiration if requested
        if (options?.checkExpiration !== false && jwtPayload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (now > jwtPayload.exp) {
            return Result.fail("Credential has expired");
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
          `Failed to parse JWT payload: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }
    } catch (error) {
      return Result.fail(
        `Failed to verify JWT proof: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Issue a new verifiable credential
   */
  async issueVC<S extends BaseCredentialSubject>(
    subject: S,
    type: string | string[],
    issuerDid?: string,
    options?: CredentialIssueOptions,
  ): Promise<Result<W3CVerifiableCredential<S>>> {
    try {
      const effectiveIssuerDid = issuerDid || this.defaultIssuerDid;

      if (!effectiveIssuerDid) {
        return Result.fail("No issuer DID specified and no default configured");
      }

      if (!this.keyManager) {
        return Result.fail("No key manager configured");
      }

      // Create credential payload
      const payload = CredentialService.createCredentialPayload(
        subject,
        type,
        effectiveIssuerDid,
        options,
      );

      // Create proof based on format
      const proofFormat = options?.proofFormat || "jwt";

      let proofResult: Result<ProofType>;
      if (proofFormat === "jwt") {
        const keyId = this.defaultKeyId || effectiveIssuerDid;
        proofResult = await CredentialService.createJWTProof(
          payload,
          this.keyManager,
          keyId,
          effectiveIssuerDid,
        );
      } else {
        return Result.fail(`Unsupported proof format: ${proofFormat}`);
      }

      if (!proofResult.success) {
        return Result.fail(`Failed to create proof: ${proofResult.error}`);
      }

      const credential: W3CVerifiableCredential<S> = {
        ...payload,
        proof: proofResult.data as ProofType,
      };

      return Result.ok(credential);
    } catch (error) {
      return Result.fail(
        `Failed to issue credential: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a verifiable credential
   */
  async verifyVC(
    credential: W3CVerifiableCredential,
    options?: CredentialVerifyOptions,
  ): Promise<Result<VerificationResult>> {
    try {
      if (!this.keyManager) {
        return Result.fail("No key manager configured");
      }

      const { proof } = credential;

      // Verify based on proof type
      if (proof.type === "JwtProof2020" && proof.jwt) {
        return await CredentialService.verifyJWTProof(
          credential,
          this.keyManager,
          options,
        );
      }

      return Result.fail(`Unsupported proof type: ${proof.type}`);
    } catch (error) {
      return Result.fail(
        `Failed to verify credential: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract credential metadata
   */
  static extractMetadata(credential: W3CVerifiableCredential): {
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
  static validateCredential(
    credential: unknown,
  ): Result<W3CVerifiableCredential> {
    try {
      if (!credential || typeof credential !== "object") {
        return Result.fail("Credential must be an object");
      }

      const vc = credential as Record<string, unknown>;

      // Check required fields
      const requiredFields = [
        "@context",
        "id",
        "type",
        "issuer",
        "issuanceDate",
        "credentialSubject",
        "proof",
      ];
      for (const field of requiredFields) {
        if (!(field in vc)) {
          return Result.fail(`Missing required field: ${field}`);
        }
      }

      // Validate context
      if (!Array.isArray(vc["@context"])) {
        return Result.fail("@context must be an array");
      }

      // Validate type
      if (!Array.isArray(vc.type)) {
        return Result.fail("type must be an array");
      }

      // Validate issuer
      if (
        !vc.issuer ||
        typeof vc.issuer !== "object" ||
        !("id" in (vc.issuer as object))
      ) {
        return Result.fail("issuer must be an object with id property");
      }

      // Validate credential subject
      if (!vc.credentialSubject || typeof vc.credentialSubject !== "object") {
        return Result.fail("credentialSubject must be an object");
      }

      const subject = vc.credentialSubject as Record<string, unknown>;
      if (
        !subject.holder ||
        typeof subject.holder !== "object" ||
        !("id" in (subject.holder as object))
      ) {
        return Result.fail(
          "credentialSubject must have a holder with id property",
        );
      }

      // Validate proof
      if (
        !vc.proof ||
        typeof vc.proof !== "object" ||
        !("type" in (vc.proof as object))
      ) {
        return Result.fail("proof must be an object with type property");
      }

      return Result.ok(credential as W3CVerifiableCredential);
    } catch (error) {
      return Result.fail(
        `Invalid credential structure: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Utility functions for credential operations
 */
export const CredentialUtils = {
  /**
   * Create a simple key manager for testing/development
   */
  createSimpleKeyManager(): KeyManager {
    const keys = new Map<string, { privateKey: string; publicKey: string }>();
    const didToKeyMapping = new Map<string, string>();

    return {
      async sign(data: string, keyId: string): Promise<string> {
        const key = keys.get(keyId);
        if (!key) {
          throw new Error(`Key not found: ${keyId}`);
        }
        // Simple signature (in production, use actual crypto)
        return base64urlEncode(`${data}:${key.privateKey}`);
      },

      async verify(
        data: string,
        signature: string,
        publicKey: string,
      ): Promise<boolean> {
        try {
          const decoded = base64urlDecode(signature);
          const [originalData] = decoded.split(":");
          return originalData === data;
        } catch {
          return false;
        }
      },

      async getPublicKey(keyId: string): Promise<string> {
        // Try direct key lookup first
        const key = keys.get(keyId);
        if (key) {
          return key.publicKey;
        }

        // Try DID-based lookup
        const actualKeyId = didToKeyMapping.get(keyId);
        if (actualKeyId) {
          const didKey = keys.get(actualKeyId);
          if (didKey) {
            return didKey.publicKey;
          }
        }

        throw new Error(`Key not found: ${keyId}`);
      },

      async createKey(
        type = "Ed25519",
      ): Promise<{ keyId: string; publicKey: string }> {
        const keyId = createId();
        const privateKey = createId();
        const publicKey = `pub_${keyId}`;

        keys.set(keyId, { privateKey, publicKey });

        // Also create a DID mapping
        const did = `did:key:${publicKey}`;
        didToKeyMapping.set(did, keyId);

        return { keyId, publicKey };
      },
    };
  },

  /**
   * Parse a DID and extract key information
   */
  parseDID(did: string): { method: string; identifier: string } | null {
    const parts = did.split(":");
    if (parts.length < 3 || parts[0] !== "did") {
      return null;
    }

    return {
      method: parts[1],
      identifier: parts.slice(2).join(":"),
    };
  },

  /**
   * Check if a credential is expired
   */
  isExpired(credential: W3CVerifiableCredential): boolean {
    if (!credential.expirationDate) {
      return false;
    }

    return new Date(credential.expirationDate) < new Date();
  },

  /**
   * Get credential age in milliseconds
   */
  getCredentialAge(credential: W3CVerifiableCredential): number {
    const issuanceDate = new Date(credential.issuanceDate);
    return Date.now() - issuanceDate.getTime();
  },
};

export default CredentialService;
