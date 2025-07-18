/**
 * Synet-specific Verifiable Credential types
 *
 * This module extends the base universal types with Synet-specific implementations
 * for networking, identity, authorization, and asset management.
 *
 * Key design principles:
 * - Extends universal base types from @synet/credential
 * - Synet-specific networking and identity concepts
 * - Concrete implementations for Synet ecosystem
 * - Demonstrates the extension pattern for other clients
 */

import type {
  W3CVerifiableCredential,
  BaseCredentialSubject,
  IdentitySubject,
  AuthorizationSubject,
  AssetSubject,
  GovernanceSubject,
  DeclarationSubject,
  BaseCredentialType,
  Intelligence,
  Holder,
  VerifiableResource,
  CredentialDelegation,
  ProofType,
  CredentialIssueOptions,
  CredentialVerifyOptions,
  CredentialStorage,
  CredentialResult,
  VerificationResult,
} from "./types-base";

// Synet-specific alias for Holder
export interface SynetHolder extends Holder {
  id: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Synet-specific credential alias
 *
 * This creates the dependency moat by aliasing SynetVerifiableCredential
 * to W3CVerifiableCredential, ensuring maximum compatibility while
 * maintaining Synet's identity.
 */
export type SynetVerifiableCredential<
  S extends BaseCredentialSubject = BaseCredentialSubject,
> = W3CVerifiableCredential<S>;

// Extended Identity types for Synet networking

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

export interface MarketIdentitySubject extends IdentitySubject {
  marketId: string; // Unique market ID
  title: string; // Human-readable name
  description?: string; // Optional, markdown or plain
  ipfsUri?: string; // Content or schema of the market
  tags?: string[]; // For discovery
  regionId?: string; // Optional for geo/routing reasons
  version?: string; // Schema version, market rules, etc.
}

// Extended Authorization types for Synet

export interface IntelligenceAuthorizationSubject extends AuthorizationSubject {
  intelligence: Intelligence; // The intelligence that is authorized
  witnesses?: SynetHolder[]; // Optional witnesses to the authorization
  certifications?: string[];
}


export interface RootAuthorizationSubject extends AuthorizationSubject {
  networkId: string;
}

export interface GatewayAuthorizationSubject extends AuthorizationSubject {
  networkId: string;
  regionId: string;
  ip: string;
  cidr: string;
  ipPoolId: string;
  validUntil?: string;
}

// Extended Asset types for Synet

export interface FungibleAssetSubject extends AssetSubject {
  quantity: number;
  totalSupply: number; // Total supply of the fungible asset
}

export interface NonFungibleAssetSubject extends AssetSubject {
  uniqueIdentifier?: string; // Optional: Unique identifier for the non-fungible asset
}

export interface DataAssetSubject extends AssetSubject {
  licensedBy?: SynetHolder;
  scope?: string[]; // Purpose of the data (e.g. "analytics", "storage", "training")
}

export interface IpAssetSubject extends AssetSubject {
  networkId: string;
  ip: string;
}

export interface IpPoolAssetSubject extends AssetSubject {
  networkId: string;
  cidr: string;
  regionId?: string; // Enforcing region for the IP pool
}

// Extended Governance types for Synet

export interface PolicySubject extends GovernanceSubject {
  // Additional policy-specific fields can be added here
}

export interface RootPolicySubject extends PolicySubject {
  networkId: string;
  policyId: string;
  version: string;
}

// Extended Declaration types for Synet

export interface NetworkDeclarationSubject extends DeclarationSubject {
  networkId: string;
  policyId: string;
  ipv4?: string;
  ipv6?: string;
  cidr?: string;
  networkType?: string;
  topology?: string;
  rootUrl?: string;
}

// Synet-specific subjects that don't map to base types

export interface RoutingSubject extends BaseCredentialSubject {
  ip: string; // Synet IP
  publicKey: string; // WireGuard public key
  endpoint: string; // IP:port (or gateway relay ID)
  networkId: string;
  issuedBy: SynetHolder; // A trusted gateway or root
}

// Synet credential types - concrete implementations
export const SynetCredentialType = {
  // Identity types
  Identity: "IdentityCredential",
  Authorization: "AuthorizationCredential",
  Asset: "AssetCredential",
  Governance: "GovernanceCredential",
  Declaration: "DeclarationCredential",

  RootIdentity: "RootIdentityCredential",
  GatewayIdentity: "GatewayIdentityCredential",
  MarketIdentity: "MarketIdentityCredential",

  // Authorization types
  RootAuthorization: "RootAuthorizationCredential",
  GatewayAuthorization: "GatewayAuthorizationCredential",
  IntelligenceAuthorization: "IntelligenceAuthorizationCredential",

  // Asset types
  DataAsset: "DataAssetCredential",
  IpPool: "IpPoolAssetCredential",
  Ip: "IpAssetCredential",
  FungibleAsset: "FungibleAssetCredential",
  NonFungibleAsset: "NonFungibleAssetCredential",

  // Governance types
  RootPolicy: "RootPolicyCredential",

  // Declaration types
  NetworkDeclaration: "NetworkDeclarationCredential",

  // Synet-specific
  Routing: "RoutingCredential",
} as const;

export type SynetCredentialTypeValues =
  (typeof SynetCredentialType)[keyof typeof SynetCredentialType];

// Re-export base types for convenience
export type {
  W3CVerifiableCredential,
  BaseCredentialSubject,
  IdentitySubject,
  AuthorizationSubject,
  AssetSubject,
  GovernanceSubject,
  DeclarationSubject,
  BaseCredentialType,
  Intelligence,
  Holder,
  VerifiableResource,
  CredentialDelegation,
  ProofType,
  CredentialIssueOptions,
  CredentialVerifyOptions,
  CredentialStorage,
  CredentialResult,
  VerificationResult,
} from "./types-base";
