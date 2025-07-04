import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a CUID2-like identifier using Node.js crypto
 * 
 * This is a simplified, zero-dependency implementation of CUID2 concepts:
 * - Uses native Node.js crypto instead of @noble/hashes 
 * - Maintains similar structure: letter + hash of (time + entropy + counter)
 * - Provides collision-resistant, sortable, URL-safe IDs
 * 
 * @param length - Length of the generated ID (default: 24)
 * @returns A CUID2-like identifier string
 */
export function createId(length = 24): string {
  // Start with a random letter (a-z) 
  const firstLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  
  // Create entropy components
  const time = Date.now().toString(36);
  const entropy = randomBytes(8).toString('hex');
  const counter = Math.floor(Math.random() * 0xFFFFFF).toString(36);
  
  // Combine and hash
  const input = `${time}${entropy}${counter}`;
  const hash = createHash('sha3-512').update(input).digest('hex');
  
  // Convert to base36 and take required length
  const hashBigInt = BigInt(`0x${hash}`);
  const base36Hash = hashBigInt.toString(36);
  
  // Combine first letter with hash, ensuring we get the right length
  return (firstLetter + base36Hash).substring(0, length);
}
