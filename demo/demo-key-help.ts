/**
 * Demo of the Key unit help functionality
 */

import { Key } from '../src/key.js';
import { generateTestDirectKey } from '../test/helpers.js';

async function demoKeyHelp() {
  console.log('=== Key Unit Help Demo ===\n');

  // Static help
  console.log('1. Static Key.help():');
  Key.help();

  // Create a key instance
  console.log('\n2. Creating a DirectKey instance:');
  const key = generateTestDirectKey('ed25519');
  console.log(`✓ Created key: ${key.id}`);

  // Instance help
  console.log('\n3. Instance key.help():');
  key.help();

  // Show DNA and whoami
  console.log('\n4. Unit DNA and identity:');
  console.log('key.whoami:', key.whoami);
  console.log('key.dna:', JSON.stringify(key.dna, null, 2));

  // Show capabilities in action
  console.log('\n5. Capabilities in action:');
  console.log('key.getPublicKey():', `${key.getPublicKey().substring(0, 20)}...`);
  console.log('key.canSign():', key.canSign());
  
  const testData = 'hello world';
  const signature = await key.sign(testData);
  console.log('key.sign("hello world"):', `${signature.substring(0, 20)}...`);
  
  const isValid = await key.verify(testData, signature);
  console.log('key.verify(data, signature):', isValid);

  // Show JSON export
  console.log('\n6. JSON export:');
  const keyJSON = key.toJSON();
  console.log('key.toJSON():', JSON.stringify(keyJSON, null, 2));

  console.log('\n=== Demo Complete ===');
}

// Run the demo
demoKeyHelp().catch(console.error);
