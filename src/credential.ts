/**
 * @synet/credential - Unit-based W3C Verifiable Credential operations
 *
 * This unit provides W3C-compatible verifiable credential operations
 * using the learning pattern to acquire crypto capabilities from
 * other units (@synet/signer, @synet/keys, etc.)
 *
 * Key features:
 * - Learning-based architecture (no tight coupling)
 * - Progressive capability acquisition
 * - W3C-compatible credential formats using existing types
 * - Composable with crypto units
 * - Uses existing issueVC/verifyVC functions internally
 *
 * Usage pattern:
 * ```typescript
 * const signer = new Signer();
 * const credential = new Credential();
 *
 * // Learn crypto capabilities
 * credential.learn([signer.teach()]);
 *
 * // Issue credential
 * const vc = await credential.execute('issue', subject, type, issuer);
 * ```
 *
 * @author Synet Team
 */

import { Unit, createUnitSchema, type TeachingContract } from "@synet/unit";
import { createId, base64urlDecode, base64urlEncode } from "./utils";
import { Result, type VerificationResult } from "./result";
import type {
  W3CVerifiableCredential,
  BaseCredentialSubject,
  CredentialIssueOptions,
  CredentialVerifyOptions,
  ProofType,
} from "./types-base";

const DEFAULT_CONTEXT = ["https://www.w3.org/2018/credentials/v1"];

// ==========================================
// CREDENTIAL IMPLEMENTATION
// ==========================================

export class Credential extends Unit {
  private _audit: string[] = [];
  private _log: string[] = [];

  private constructor() {
    super(
      createUnitSchema({
        id: "credential",
        version: "1.0.0",
      }),
    );
  }

  static create(): Credential {
    // Initialize audit and log

    return new Credential();
  }

  getAudit(): string[] {
    return this._audit;
  }

  getLog(): string[] {
    return this._log;
  }

  private log(msg: string): void {
    this._log.push(msg);

    if (this.can("logger.log")) {
      this.execute("logger.log", { id: this.dna.id, message: msg });
    }
  }

  whoami(): string {
    return `Credential@${this.dna.id} - W3C Verifiable Credential operations`;
  }

  capabilities(): string[] {
    return this._getAllCapabilities();
  }

  help(): void {
    console.log(`
🎓 Credential - W3C Verifiable Credential Operations

Native Methods:
- issueCredential(subject, type, issuerDid, options?): Create W3C Verifiable Credentials
- verifyCredential(credential, options?): Verify credential signatures and structure  
- validateStructure(credential): Validate credential structure without crypto

Required Learning:
- Learn from @synet/keys Key unit to get: getPublicKey, sign, verify

Usage Pattern:
1. Create unit: const credential = new Credential()
2. Learn from key: credential.learn([key.teach()])
3. Issue VC: await credential.issueCredential(subject, type, issuer)

Example:
const signer = Signer.generate('ed25519');
const key = signer.createKey();
const credential = new Credential();
credential.learn([key.teach()]);
const result = await credential.issueCredential(
  { id: 'did:example:123', name: 'Alice' },
  'UniversityDegree', 
  'did:example:university'
);
    `);
  }

  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        issueCredential: (...args: unknown[]) =>
          this.issueCredential(
            args[0] as BaseCredentialSubject,
            args[1] as string | string[],
            args[2] as string,
            args[3] as CredentialIssueOptions | undefined,
          ),
        verifyCredential: (...args: unknown[]) =>
          this.verifyCredential(
            args[0] as W3CVerifiableCredential,
            args[1] as CredentialVerifyOptions | undefined,
          ),
        validateStructure: (...args: unknown[]) =>
          this.validateStructure(args[0] as W3CVerifiableCredential),
        // Deprecated methods for backwards compatibility
      },
    };
  }

  // ==========================================
  // CORE CREDENTIAL OPERATIONS
  // ==========================================

  /**
   * Issue a verifiable credential using Result pattern
   * Requires learned getPublicKey and sign capabilities from Key
   */
  async issueCredential<S extends BaseCredentialSubject>(
    subject: S,
    type: string | string[],
    issuerDid: string,
    options?: CredentialIssueOptions,
  ): Promise<Result<W3CVerifiableCredential<S>>> {
    try {
      // Check capabilities first
      if (!this.can("getPublicKey") || !this.can("sign")) {
        return Result.fail(
          "Cannot issue credential: missing getPublicKey or sign capability. Learn from a crypto unit.",
        );
      }

      // Create credential payload
      const payload = this.createCredentialPayload(
        subject,
        type,
        issuerDid,
        options,
      );

      // Create proof based on format
      const proofFormat = options?.proofFormat || "jwt";

      let proof: ProofType;

      if (proofFormat === "jwt") {
        const proofResult = await this.createJWTProof(payload, issuerDid);

        if (!proofResult.isSuccess) {
          return Result.fail(
            `Failed to create JWT proof: ${proofResult.errorMessage}`,
          );
        }

        proof = proofResult.value;
      } else {
        // Unsupported proof format
        return Result.fail(`Unsupported proof format: ${proofFormat}`);
      }

      const credential: W3CVerifiableCredential<S> = {
        ...payload,
        proof: proof as ProofType,
      };

      return Result.success(credential);
    } catch (error) {
      return Result.fail(
        `Failed to issue credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Verify a verifiable credential using Result pattern
   *
   * Verifies a W3C verifiable credential using the learned capabilities.
   */
  async verifyCredential(
    credential: W3CVerifiableCredential,
    options?: CredentialVerifyOptions,
  ): Promise<Result<VerificationResult>> {
    try {
      // Check capabilities first
      if (!this.can("getPublicKey") || !this.can("verify")) {
        return Result.fail("Missing getPublicKey or verify capability");
      }

      // Validate credential structure
      if (!credential || !credential.proof) {
        return Result.fail("Invalid credential: missing proof");
      }

      const { proof } = credential;

      // Verify based on proof type
      if (proof.type === "JwtProof2020" && proof.jwt) {
        return await this.verifyJWTProof(credential, options);
      }

      return Result.fail(`Unsupported proof type: ${proof.type}`);
    } catch (error) {
      return Result.fail(
        `Failed to verify credential: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  createCredentialPayload<S extends BaseCredentialSubject>(
    subject: S,
    type: string | string[],
    issuerDid: string,
    options?: CredentialIssueOptions,
  ): Omit<W3CVerifiableCredential<S>, "proof"> {
    const typeArray = Array.isArray(type) ? type : [type];
    const appType =
      typeArray.find((t) => t !== "VerifiableCredential") || "Generic";

    const context = options?.context
      ? [...DEFAULT_CONTEXT, ...options.context]
      : DEFAULT_CONTEXT;

    return {
      "@context": context,
      id: options?.vcId || this.generateCredentialId(appType),
      type: ["VerifiableCredential", ...typeArray],
      issuer: { id: issuerDid },
      issuanceDate: options?.issuanceDate || new Date().toISOString(),
      expirationDate: options?.expirationDate,
      credentialSubject: subject,
      meta: options?.meta,
    };
  }

  generateCredentialId(type: string): string {
    const cuid = createId();
    return `urn:synet:${type}:${cuid}`;
  }

  /**
   * Create a JWT proof for a credential
   * Follows JWT standard (RFC 7515) - uses base64url encoding for signature
   */
  async createJWTProof(
    payload: Omit<W3CVerifiableCredential, "proof">,
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

      // Get signature from signer (returns base64)
      const base64Signature = (await this.execute(
        "sign",
        signingInput,
      )) as string;

      if (!base64Signature) {
        return Result.fail("Failed to sign JWT proof");
      }

      // The signature is already in base64url format from the Signer
      const jwt = `${signingInput}.${base64Signature}`;

      const proof: ProofType = {
        type: "JwtProof2020",
        jwt,
        verificationMethod: issuerDid,
      };

      return Result.success(proof);
    } catch (error) {
      return Result.fail(
        `Failed to create JWT proof: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Verify a JWT proof using Result pattern
   * Converts base64url signature back to base64 for verification
   */
  async verifyJWTProof(
    credential: W3CVerifiableCredential,
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

      const [headerB64, payloadB64, base64urlSignature] = jwtParts;
      const signingInput = `${headerB64}.${payloadB64}`;

      try {
        const jwtPayload = JSON.parse(base64urlDecode(payloadB64));
        const issuerDid = jwtPayload.iss;

        if (!this.can("getPublicKey") || !this.can("verify")) {
          return Result.fail("Missing getPublicKey or verify capability");
        }

        // The signature is already in base64url format - our verify function handles both formats
        // Verify signature
        const isValidSignature = await this.execute(
          "verify",
          signingInput,
          base64urlSignature,
        );

        if (!isValidSignature) {
          return Result.fail("Invalid signature");
        }

        // Verify that the JWT payload matches the credential payload
        const expectedVc = jwtPayload.vc;
        if (!expectedVc) {
          return Result.fail("Missing vc claim in JWT payload");
        }

        // Create a copy of the credential without the proof for comparison
        const { proof: _proof, ...credentialWithoutProof } = credential;

        // Veramo-style verification: JWT vc claim contains subset of credential fields
        // We verify that all fields in JWT vc exist and match in the credential
        for (const [key, value] of Object.entries(expectedVc)) {
          const credentialValue = (
            credentialWithoutProof as Record<string, unknown>
          )[key];
          if (JSON.stringify(credentialValue) !== JSON.stringify(value)) {
            return Result.fail(
              `JWT payload field "${key}" does not match credential data`,
            );
          }
        }

        // Additional verification: ensure required fields are present in credential
        if (
          !credentialWithoutProof.id ||
          !credentialWithoutProof.issuer ||
          !credentialWithoutProof.issuanceDate
        ) {
          return Result.fail("Missing required credential fields");
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

        const verificationResult: VerificationResult = {
          verified: true,
          issuer: issuerDid,
          subject: credential.credentialSubject.holder.id,
          issuanceDate: credential.issuanceDate,
          expirationDate: credential.expirationDate,
        };

        return Result.success(verificationResult);
      } catch (parseError) {
        return Result.fail(
          `Failed to parse JWT payload: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          parseError instanceof Error ? parseError : undefined,
        );
      }
    } catch (error) {
      return Result.fail(
        `Failed to verify JWT proof: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Validate credential structure without cryptographic verification
   */
  async validateStructure(credential: W3CVerifiableCredential): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check required fields
    if (!credential || typeof credential !== "object") {
      return { valid: false, reason: "Invalid credential structure" };
    }

    if (!credential["@context"] || !Array.isArray(credential["@context"])) {
      return { valid: false, reason: "Missing or invalid @context" };
    }

    if (
      !credential.type ||
      !Array.isArray(credential.type) ||
      !credential.type.includes("VerifiableCredential")
    ) {
      return { valid: false, reason: "Missing or invalid type" };
    }

    if (!credential.issuer) {
      return { valid: false, reason: "Missing issuer" };
    }

    if (!credential.issuanceDate) {
      return { valid: false, reason: "Missing issuanceDate" };
    }

    if (!credential.credentialSubject || !credential.credentialSubject.holder) {
      return { valid: false, reason: "Missing or invalid credentialSubject" };
    }

    if (!credential.proof) {
      return { valid: false, reason: "Missing proof" };
    }

    return { valid: true };
  }

  /**
   * Check if this unit can perform a capability
   */
  can(capability: string): boolean {
    return this.capabilities().includes(capability);
  }

  /**
   * Learn capabilities from other units (especially @synet/keys Key)
   */
  learn(contracts: TeachingContract[]): void {
    for (const contract of contracts) {
      for (const [cap, impl] of Object.entries(contract.capabilities)) {
        // Learn key capabilities that we need for credential operations
        if (cap === "getPublicKey" || cap === "sign" || cap === "verify") {
          this._addCapability(cap, impl);
          console.debug(
            `📚 Credential learned: ${cap} from ${contract.unitId}`,
          );
          this.log(`Learned capability: ${cap} from ${contract.unitId}`);
        }
      }
    }

    // Call parent learn for any other capabilities
    super.learn(contracts);
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default Credential;
