/**
 * Test helpers for credential tests
 * Uses @synet/keys for proper key generation
 */

import { generateKeyPair, type KeyPair } from '@synet/keys';
import { createDIDKey } from '@synet/did';
import { Key, DirectSigner, type DirectKey, type SignerKey } from '../src/key';
import { createId } from '../src/utils.js';

/**
 * Generate a test DirectKey using @synet/keys
 */
export function generateTestDirectKey(type: 'ed25519' | 'secp256k1' = 'ed25519'): DirectKey {
  const keyPair = generateKeyPair(type, { format: 'raw' });
  
  return Key.create({
    id: createId(),
    publicKeyHex: keyPair.publicKey,
    privateKeyHex: keyPair.privateKey,
    type: type === 'ed25519' ? 'Ed25519' : 'Secp256k1',
    meta: {
      created: new Date().toISOString(),
      source: '@synet/keys',
    },
  });
}

/**
 * Generate a test SignerKey using @synet/keys
 */
export function generateTestSignerKey(type: 'ed25519' | 'secp256k1' = 'ed25519'): SignerKey {
  const keyPair = generateKeyPair(type, { format: 'raw' });
  const signer = new DirectSigner(
    keyPair.privateKey,
    keyPair.publicKey,
    type === 'ed25519' ? 'Ed25519' : 'Secp256k1'
  );
  
  return Key.createWithSigner({
    id: createId(),
    publicKeyHex: keyPair.publicKey,
    type: type === 'ed25519' ? 'Ed25519' : 'Secp256k1',
    signer,
    meta: {
      created: new Date().toISOString(),
      source: '@synet/keys',
    },
  });
}

/**
 * Create a proper DID from a key using @synet/did
 */
export function createDIDFromKey(key: DirectKey | SignerKey): string {
  // Map our key types to @synet/did types
  const didKeyType = key.type === 'Ed25519' ? 'Ed25519' : 'secp256k1';
  return createDIDKey(key.publicKeyHex, didKeyType);
}

/**
 * Generate both direct and signer keys for testing
 */
export function generateTestKeys(type: 'ed25519' | 'secp256k1' = 'ed25519') {
  return {
    directKey: generateTestDirectKey(type),
    signerKey: generateTestSignerKey(type),
  };
}
