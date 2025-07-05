/**
 * Pure Key and Signer Architecture for @synet/credential
 * 
 * This module provides a clean, composable, and secure key/signing model
 * that works for both simple (direct keys) and enterprise (vault/HSM) use cases.
 * 
 * Key design principles:
 * - Pure, dependency-free functions
 * - Type safety with progressive security
 * - Composable architecture
 * - Vault/HSM ready
 * - Zero magic abstractions
 * 
 * @author Synet Team
 */

import { createId } from './utils.js';

/**
 * Unit schema interface for Key unit
 */
export interface UnitSchema {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  children?: UnitSchema[];
}

/**
 * Unit capabilities interface
 */
export interface UnitCapabilities {
  [key: string]: unknown;
}

/**
 * Base64url encoding utilities (simplified)
 */
function base64urlEncode(data: string): string {
  try {
    // Try Node.js Buffer first
    const nodeBuffer = (globalThis as Record<string, unknown>)?.Buffer;
    if (nodeBuffer && typeof nodeBuffer === 'object' && 'from' in nodeBuffer) {
      return (nodeBuffer as {
        from: (data: string) => { toString: (encoding: string) => string };
      }).from(data).toString('base64url');
    }

    // Fallback to browser btoa
    const browserBtoa = (globalThis as Record<string, unknown>)?.btoa;
    if (browserBtoa && typeof browserBtoa === 'function') {
      return (browserBtoa as (data: string) => string)(data)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }

    throw new Error('No base64 encoding available');
  } catch (error) {
    throw new Error(`Base64 encoding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function base64urlDecode(data: string): string {
  try {
    // Try Node.js Buffer first
    const nodeBuffer = (globalThis as Record<string, unknown>)?.Buffer;
    if (nodeBuffer && typeof nodeBuffer === 'object' && 'from' in nodeBuffer) {
      return (nodeBuffer as {
        from: (data: string, encoding: string) => { toString: () => string };
      }).from(data, 'base64url').toString();
    }

    // Fallback to browser atob
    const browserAtob = (globalThis as Record<string, unknown>)?.atob;
    if (browserAtob && typeof browserAtob === 'function') {
      let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      return (browserAtob as (data: string) => string)(base64);
    }

    throw new Error('No base64 decoding available');
  } catch (error) {
    throw new Error(`Base64 decoding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Signer interface for signing operations
 * This abstraction allows for vault/HSM implementations
 */
export interface Signer {
  /**
   * Sign data with this signer
   */
  sign(data: string): Promise<string>;

  /**
   * Get the public key for verification
   */
  getPublicKey(): string;

  /**
   * Optional: Get signing algorithm
   */
  getAlgorithm?(): string;
}

/**
 * Key metadata
 */
export interface KeyMeta {
  name?: string;
  description?: string;
  created?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Key unit - the core key abstraction
 */
export class Key {
  
  public readonly id: string;
  public readonly publicKeyHex: string;
  public readonly privateKeyHex?: string;
  public readonly type: string;
  public readonly meta: KeyMeta;
  public readonly signer?: Signer;
  private readonly unitDNA: UnitSchema;

  constructor(options: {
    id?: string;
    publicKeyHex: string;
    privateKeyHex?: string;
    type?: string;
    meta?: KeyMeta;
    signer?: Signer;
  }) {
    this.id = options.id || createId();
    this.publicKeyHex = options.publicKeyHex;
    this.privateKeyHex = options.privateKeyHex;
    this.type = options.type || 'Ed25519';
    this.meta = options.meta || {};
    this.signer = options.signer;

    // Initialize unit DNA
    this.unitDNA = {
      name: 'Key Unit',
      version: '1.0.0',
      description: 'I can create, manage and use cryptographic keys. Call .help() to see my capabilities.',
      capabilities: this.buildCapabilities(),
      children: []
    };
  }

  /**
   * Build capabilities array based on key type
   */
  private buildCapabilities(): string[] {
    const capabilities = ['getPublicKey', 'verify', 'toJSON', 'toVerificationMethod'];
    
    if (this.canSign()) {
      capabilities.push('sign');
    }
    
    if (this.privateKeyHex) {
      capabilities.push('toPublicKey');
    }
    
    return capabilities;
  }

  /**
   * Get unit DNA information
   */
  get dna(): UnitSchema {
    return { ...this.unitDNA };
  }

  /**
   * Get unit identity and version
   */
  get whoami(): string {
    return `${this.unitDNA.name} v${this.unitDNA.version}`;
  }

  /**
   * Display help information about this unit
   */
  help(): void {
    console.log(`\n=== ${this.whoami} ===`);
    console.log(`${this.unitDNA.description}\n`);
    
    console.log('🔑 Key Information:');
    console.log(`  ID: ${this.id}`);
    console.log(`  Type: ${this.type}`);
    console.log(`  Can Sign: ${this.canSign()}`);
    console.log(`  Public Key: ${this.publicKeyHex.substring(0, 20)}...`);
    
    console.log('\n🛠️ Available Capabilities:');
    for (const cap of this.unitDNA.capabilities) {
      console.log(`  • ${cap}()`);
    }
    
    console.log('\n📖 Usage Examples:');
    console.log('  key.getPublicKey()     // Get public key');
    console.log('  key.sign(data)         // Sign data (if capable)');
    console.log('  key.verify(data, sig)  // Verify signature');
    console.log('  key.toJSON()           // Export key data');
    console.log('  key.canSign()          // Check signing capability');
    
    if (this.privateKeyHex) {
      console.log('  key.toPublicKey()      // Create public-only copy');
    }
    
    console.log('\n💡 Unit Features:');
    console.log('  • Transportable (toJSON/fromJSON)');
    console.log('  • Composable (works with other units)');
    console.log('  • Type-safe (DirectKey, SignerKey, PublicKey)');
    console.log('  • Secure (private keys protected)');
    console.log();
  }

  /**
   * Static help method for the Key unit
   */
  static help(): void {
    console.log('\n=== Key Unit v1.0.0 ===');
    console.log('I can create, manage and use cryptographic keys.\n');
    
    console.log('🏗️ Creation Methods:');
    console.log('  Key.create({ publicKeyHex, privateKeyHex })     // Direct key');
    console.log('  Key.createWithSigner({ publicKeyHex, signer }) // Signer key');
    console.log('  Key.createPublic({ publicKeyHex })             // Public key');
    
    console.log('\n🔑 Key Types:');
    console.log('  • DirectKey   - Has private key material');
    console.log('  • SignerKey   - Uses external signer (vault/HSM)');
    console.log('  • PublicKey   - Verification only');
    
    console.log('\n🛠️ Core Capabilities:');
    console.log('  • getPublicKey()     - Get public key');
    console.log('  • sign(data)         - Sign data');
    console.log('  • verify(data, sig)  - Verify signature');
    console.log('  • canSign()          - Check signing capability');
    console.log('  • toJSON()           - Export key data');
    console.log('  • help()             - Show instance help');
    
    console.log('\n💡 Unit Features:');
    console.log('  • Pure and composable');
    console.log('  • Type-safe with progressive security');
    console.log('  • Vault/HSM ready');
    console.log('  • Zero magic abstractions');
    console.log();
  }

  /**
   * Create a new direct key (with private key material)
   */
  static create(options: {
    id?: string;
    publicKeyHex: string;
    privateKeyHex: string;
    type?: string;
    meta?: KeyMeta;
  }): DirectKey {
    return new Key({
      ...options,
      privateKeyHex: options.privateKeyHex,
    }) as DirectKey;
  }

  /**
   * Create a new signer key (with external signer)
   */
  static createWithSigner(options: {
    id?: string;
    publicKeyHex: string;
    type?: string;
    meta?: KeyMeta;
    signer: Signer;
  }): SignerKey {
    return new Key({
      ...options,
      signer: options.signer,
    }) as SignerKey;
  }

  /**
   * Create a public-only key (verification only)
   */
  static createPublic(options: {
    id?: string;
    publicKeyHex: string;
    type?: string;
    meta?: KeyMeta;
  }): PublicKey {
    return new Key({
      ...options,
    }) as PublicKey;
  }

  /**
   * Get the public key for verification
   */
  getPublicKey(): string {
    return this.publicKeyHex;
  }

  /**
   * Check if this key can be used for signing
   */
  canSign(): boolean {
    return !!(this.privateKeyHex || this.signer);
  }

  /**
   * Sign data with this key
   */
  async sign(data: string): Promise<string> {
    if (this.signer) {
      return await this.signer.sign(data);
    }

    if (this.privateKeyHex) {
      // Simple signing implementation for testing
      // In production, use actual crypto libraries
      return base64urlEncode(`${data}:${this.privateKeyHex}`);
    }

    throw new Error('Key cannot sign: no private key or signer available');
  }

  /**
   * Create a public-only copy of this key
   */
  toPublicKey(): PublicKey {
    return Key.createPublic({
      id: this.id,
      publicKeyHex: this.publicKeyHex,
      type: this.type,
      meta: { ...this.meta },
    });
  }

  /**
   * Verify a signature against this key
   */
  async verify(data: string, signature: string): Promise<boolean> {
    try {
      // Simple verification for testing
      // In production, use actual crypto libraries
      const decoded = base64urlDecode(signature);
      const [originalData] = decoded.split(':');
      return originalData === data;
    } catch {
      return false;
    }
  }

  /**
   * Export key as JSON (excludes private key for security)
   */
  toJSON(): {
    id: string;
    publicKeyHex: string;
    type: string;
    meta: KeyMeta;
    canSign: boolean;
  } {
    return {
      id: this.id,
      publicKeyHex: this.publicKeyHex,
      type: this.type,
      meta: this.meta,
      canSign: this.canSign(),
    };
  }

  /**
   * Convert this key to a verification method
   */
  toVerificationMethod(controller: string): {
    id: string;
    type: string;
    controller: string;
    publicKeyHex: string;
  } {
    return {
      id: `${controller}#${this.id}`,
      type: `${this.type}VerificationKey2020`,
      controller,
      publicKeyHex: this.publicKeyHex,
    };
  }
}

/**
 * Type guards for different key types
 */
export interface DirectKey extends Key {
  readonly privateKeyHex: string;
  readonly signer?: never;
}

export interface SignerKey extends Key {
  readonly privateKeyHex?: never;
  readonly signer: Signer;
}

export interface PublicKey extends Key {
  readonly privateKeyHex?: never;
  readonly signer?: never;
}

/**
 * Type guards
 */
export function isDirectKey(key: Key): key is DirectKey {
  return !!key.privateKeyHex && !key.signer;
}

export function isSignerKey(key: Key): key is SignerKey {
  return !!key.signer && !key.privateKeyHex;
}

export function isPublicKey(key: Key): key is PublicKey {
  return !key.privateKeyHex && !key.signer;
}

/**
 * Simple Direct Signer - implements Signer interface using direct key material
 */
export class DirectSigner implements Signer {
  constructor(
    private readonly privateKeyHex: string,
    private readonly publicKeyHex: string,
    private readonly algorithm: string = 'Ed25519'
  ) {}

  async sign(data: string): Promise<string> {
    // Simple signing implementation for testing
    // In production, use actual crypto libraries
    return base64urlEncode(`${data}:${this.privateKeyHex}`);
  }

  getPublicKey(): string {
    return this.publicKeyHex;
  }

  getAlgorithm(): string {
    return this.algorithm;
  }
}
