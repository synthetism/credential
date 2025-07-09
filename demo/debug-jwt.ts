/**
 * Debug script to analyze the JWT from the real Veramo credential
 */

import realWorldData from './example-data/0en.json';
import { base64urlDecode } from '../src/utils';

const existingCredential = realWorldData.identity.credential;
const jwt = existingCredential.proof.jwt;

console.log('JWT:', jwt);
console.log('');

const [headerB64, payloadB64, signature] = jwt.split('.');

console.log('Header B64:', headerB64);
console.log('Payload B64:', payloadB64);
console.log('Signature B64:', signature);
console.log('');

// Decode header
const header = JSON.parse(base64urlDecode(headerB64));
console.log('Header:', JSON.stringify(header, null, 2));
console.log('');

// Decode payload
const payload = JSON.parse(base64urlDecode(payloadB64));
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');

// Analyze signature
console.log('Signature length:', signature.length);
console.log('Signature (first 50 chars):', signature.substring(0, 50));

// Try to decode signature
try {
  const sigBytes = Buffer.from(signature, 'base64url');
  console.log('Signature bytes length:', sigBytes.length);
  console.log('Signature hex:', sigBytes.toString('hex'));
} catch (e) {
  console.log('Failed to decode signature:', e.message);
}
