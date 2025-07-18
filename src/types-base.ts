/**
 * Universal W3C-compatible Verifiable Credential types
 *
 * This module provides the foundational types for verifiable credentials
 * that are compatible with both W3C standards and any extended functionality.
 *
 * Key design principles:
 * - Universal compatibility (W3C and beyond)
 * - Type safety and composability
 * - Minimal dependencies
 * - Extensible base classes for client implementations
 */

export interface ProofType {
  type: string;
  proofValue?: string;
  created?: string;
  verificationMethod?: string;
  proofPurpose?: string;
  jwt?: string; // JWT proof format
  [x: string]: unknown;
}

export interface Holder {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface VerifiableResource {
  ipfsUri: string; // Required
  hash: string; // SHA-256 or multihash

  /**
   * Optional content mirrors for redundancy and faster resolution.
   * @use ar://, ipns://, dat://, sia://, don't use web2 if absolutely necessary
   * Avoid using Web2 (http:// or https://) unless absolutely necessary.
   * Verifiers must always validate mirror content against the declared hash.
   */
  mirrors?: string[];
}

export interface CredentialDelegation {
  id: string;
  delegatedBy: Holder; // Who delegated the asset
  delegatedTo: Holder; // Who the asset is delegated to
  validFrom: string; // Start date of delegation
  validUntil: string; // End date of delegation
  [key: string]: unknown; // Additional properties can be added as needed
}

export interface BaseCredentialSubject {
  holder: Holder;
  [key: string]: unknown;
}

/**
 * Create a new credential subject type by extending the base credential subject with custom properties
 */
export type CreateCredentialSubject<T> = BaseCredentialSubject & T;

/**
 * W3C-compatible Verifiable Credential interface
 *
 * This is the universal interface that serves as both the W3C standard
 * and any extended credential type. By aliasing extended credential types
 * to this interface, we create a dependency moat that works with any
 * W3C-compatible system while maintaining extended functionality.
 */
export interface W3CVerifiableCredential<
  S extends BaseCredentialSubject = BaseCredentialSubject,
> {
  "@context": string[];
  id: string;
  type: string[];
  issuer: Holder;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: S;
  proof: ProofType;
  meta?: {
    version?: string; // e.g. "1.0.0"
    schema?: string; // e.g. "https://synthetism.org/schemas/IpAsset/1.0.0"
    [key: string]: unknown;
  };
}

// Base credential subject types - stable, reusable, highly extensible

export interface IdentitySubject extends BaseCredentialSubject {
  issuedBy: Holder;
  scope?: string[]; // optional: claim purpose or restriction
}

export interface AuthorizationSubject extends BaseCredentialSubject {
  authorizedBy: Holder; // Who authorized the entity
  scope?: string[];
  metadata?: Record<string, unknown>;
  schemaUri?: string;
  verifiableResource?: VerifiableResource;
}

export interface AssetSubject extends BaseCredentialSubject {
  issuedBy: Holder;
  delegated?: CredentialDelegation;
  parentAssetId?: string;
  schemaUri?: string;
  metadata?: Record<string, unknown>;
  verifiableResource?: VerifiableResource;
}

export interface GovernanceSubject extends BaseCredentialSubject {
  issuedBy: Holder; // Who issued the governance credential
  metadata?: Record<string, unknown>;
  schemaUri?: string;
  verifiableResource?: VerifiableResource;
}

export interface DeclarationSubject extends BaseCredentialSubject {
  issuedBy: Holder; // Who issued the declaration
  metadata?: Record<string, unknown>;
  schemaUri?: string;
  verifiableResource?: VerifiableResource;
}

// Base credential types - extensible string types for client implementations
export const BaseCredentialType = {
  Identity: "IdentityCredential",
  Authorization: "AuthorizationCredential",
  Asset: "AssetCredential",
  Governance: "GovernanceCredential",
  Declaration: "DeclarationCredential",
} as const;

export type BaseCredentialTypeValues =
  (typeof BaseCredentialType)[keyof typeof BaseCredentialType];

// Intelligence classification - universal concept
export enum Intelligence {
  human = "Human",
  ai = "AI",
  hybrid = "Hybrid",
  swarm = "Swarm",
  superintelligent = "Superintelligent",
}

// Credential operation options
export interface CredentialIssueOptions {
  vcId?: string;
  context?: string[];
  issuanceDate?: string;
  expirationDate?: string;
  proofFormat?: "jwt" | "jsonld";
  meta?: {
    version?: string;
    schema?: string;
    [key: string]: unknown;
  };
}

export interface CredentialVerifyOptions {
  checkExpiration?: boolean;
  checkIssuer?: boolean;
  expectedIssuer?: string;
  expectedSubject?: string;
  allowedProofTypes?: string[];
}

// Storage interface for credential persistence
export interface CredentialStorage<
  T extends W3CVerifiableCredential = W3CVerifiableCredential,
> {
  save(credential: T): Promise<void>;
  load(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
  list(): Promise<T[]>;
  search(query: Record<string, unknown>): Promise<T[]>;
}

// Result types for error handling
export interface CredentialResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  verified: boolean;
  issuer?: string;
  subject?: string;
  issuanceDate?: string;
  expirationDate?: string;
  errors?: string[];
  warnings?: string[];
}
