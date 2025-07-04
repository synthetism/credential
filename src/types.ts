/**
 * Universal W3C-compatible Verifiable Credential types
 * 
 * This module provides the foundational types for verifiable credentials
 * that are compatible with both W3C standards and Synet's extended functionality.
 * 
 * Key design principles:
 * - Universal compatibility (W3C and Synet)
 * - Type safety and composability
 * - Minimal dependencies
 * - Extensible for future needs
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

export interface BaseCredentialSubject {
  holder: Holder;
  [key: string]: unknown;
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

/**
 * W3C-compatible Verifiable Credential interface
 * 
 * This is the universal interface that serves as both the W3C standard
 * and Synet's extended credential type. By aliasing SynetVerifiableCredential
 * to this interface, we create a dependency moat that works with any
 * W3C-compatible system while maintaining Synet's extended functionality.
 */
export interface W3CVerifiableCredential<S extends BaseCredentialSubject = BaseCredentialSubject> {
  '@context': string[];
  id: string;
  type: string[];
  issuer: { id: string };
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

/**
 * Synet-specific credential alias
 * 
 * This creates the dependency moat by aliasing SynetVerifiableCredential
 * to W3CVerifiableCredential, ensuring maximum compatibility while
 * maintaining Synet's identity.
 */
export type SynetVerifiableCredential<S extends BaseCredentialSubject = BaseCredentialSubject> = 
  W3CVerifiableCredential<S>;

// Extended credential subject types for Synet ecosystem

export interface IdentitySubject extends BaseCredentialSubject {
  issuedBy: Holder;
  scope?: string[]; // optional: claim purpose or restriction
}

export interface RootIdentitySubject extends IdentitySubject {
  networkId: string;
  poolCidr: string; // The IP range operated by root
  url?: string; // Optional URL for more info
}

export interface GatewayIdentitySubject extends IdentitySubject {
  networkId: string;
  regionId?: string;
  cidr?: string;
  ip?: string;
  ipPoolId?: string;
  publicKeyHex?: string; // optional, for rotation
}

export interface AuthorizationSubject extends BaseCredentialSubject {
  authorizedBy: Holder; // Who authorized the entity
  scope?: string;
  metadata?: Record<string, unknown>;
  schemaUri?: string;
  verifiableResource?: VerifiableResource;
}

export interface BaseAssetSubject extends BaseCredentialSubject {
  issuedBy: Holder;
  delegated?: CredentialDelegation;
  parentAssetId?: string;
  schemaUri?: string;
  metadata?: Record<string, unknown>;
  verifiableResource?: VerifiableResource;
}

export interface DataAssetSubject extends BaseAssetSubject {
  licensedBy?: Holder;
  scope?: string[]; // Purpose of the data (e.g. "analytics", "storage", "training")
}

export interface IpAssetSubject extends BaseAssetSubject {
  networkId: string;
  ip: string;
}

export interface IpPoolAssetSubject extends BaseAssetSubject {
  networkId: string;
  cidr: string;
  regionId?: string; // Enforcing region for the IP pool
}

export interface BaseGovernanceSubject extends BaseCredentialSubject {
  issuedBy: Holder; // Who issued the governance credential
  metadata?: Record<string, unknown>;
  schemaUri?: string;
  verifiableResource?: VerifiableResource;
}

export interface PolicySubject extends BaseGovernanceSubject {
  issuedBy: Holder;
}

export interface RootPolicySubject extends BaseGovernanceSubject {
  networkId: string;
  policyId: string;
  version: string;
}

export interface NetworkDeclarationSubject extends BaseGovernanceSubject {
  networkId: string;
  policyId: string;
  ipv4?: string;
  ipv6?: string;
  cidr?: string;
  networkType?: string;
  topology?: string;
  rootUrl?: string;
}

export interface RoutingSubject extends BaseCredentialSubject {
  ip: string; // Synet IP
  publicKey: string; // WireGuard public key
  endpoint: string; // IP:port (or gateway relay ID)
  networkId: string;
  issuedBy: Holder; // A trusted gateway or root
}

// Credential type enums for type safety
export enum CredentialType {
  // Identity
  Identity = "IdentityCredential",
  RootIdentity = "RootIdentityCredential",
  GatewayIdentity = "GatewayIdentityCredential",

  // Authorization
  Authorization = "AuthorizationCredential",
  GatewayAuthorization = "GatewayAuthorizationCredential",
  IntelligenceAuthorization = "IntelligenceAuthorizationCredential",

  // Assets
  DataAsset = "DataAssetCredential",
  IpPool = "IpPoolAssetCredential",
  Ip = "IpAssetCredential",

  // Governance
  RootPolicy = "RootPolicyCredential",
  NetworkDeclaration = "NetworkDeclarationCredential",
}

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
  proofFormat?: 'jwt' | 'jsonld';
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
export interface CredentialStorage<T extends W3CVerifiableCredential = W3CVerifiableCredential> {
  save(credential: T): Promise<void>;
  load(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
  list(): Promise<T[]>;
  search(query: Record<string, unknown>): Promise<T[]>;
}

// Key management interface for signing/verification
export interface KeyManager {
  sign(data: string, keyId: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;
  getPublicKey(keyId: string): Promise<string>;
  createKey(type?: string): Promise<{ keyId: string; publicKey: string }>;
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
