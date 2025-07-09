/**
 * Debug script to compare JWT payload with credential data
 */

import realWorldData from './example-data/0en.json';
import { base64urlDecode } from '../src/utils';

const existingCredential = realWorldData.identity.credential;
const jwt = existingCredential.proof.jwt;

console.log('=== EXISTING CREDENTIAL ===');
const { proof: _proof, ...credentialWithoutProof } = existingCredential;
console.log(JSON.stringify(credentialWithoutProof, null, 2));

console.log('\n=== JWT PAYLOAD ===');
const [headerB64, payloadB64, signature] = jwt.split('.');
const jwtPayload = JSON.parse(base64urlDecode(payloadB64));
console.log(JSON.stringify(jwtPayload.vc, null, 2));

console.log('\n=== COMPARISON ===');
console.log('Are they equal?', JSON.stringify(jwtPayload.vc) === JSON.stringify(credentialWithoutProof));

// Check key differences
console.log('\n=== KEY DIFFERENCES ===');
const jwtKeys = Object.keys(jwtPayload.vc).sort();
const credKeys = Object.keys(credentialWithoutProof).sort();

console.log('JWT keys:', jwtKeys);
console.log('Credential keys:', credKeys);

// Check for differences in each key
for (const key of new Set([...jwtKeys, ...credKeys])) {
  if (JSON.stringify(jwtPayload.vc[key]) !== JSON.stringify(credentialWithoutProof[key])) {
    console.log(`\nDifference in "${key}":`);
    console.log('JWT:', JSON.stringify(jwtPayload.vc[key]));
    console.log('Credential:', JSON.stringify(credentialWithoutProof[key]));
  }
}
