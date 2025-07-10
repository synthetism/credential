/**
 * Quick validation script for the new Result pattern in CredentialUnit
 */

import { Signer } from '@synet/keys';
import { CredentialUnit, type BaseCredentialSubject } from './src/index';

async function testCredentialResult() {
  console.log('🧪 Testing CredentialUnit with Result pattern...\n');

  // Setup
  const signer = await Signer.generate('ed25519', { name: 'test-signer' });
  const key = signer.createKey();
  const credential = CredentialUnit.create();

  // Test 1: Should fail without capabilities
  console.log('Test 1: Issue credential without capabilities');
  const subject: BaseCredentialSubject = {
    holder: {
      id: 'did:example:123',
      name: 'Alice Smith'
    }
  };
  
  const failResult = await credential.issueCredential(subject, 'TestCredential', 'did:example:issuer');
  console.log('  Result:', failResult.isFailure ? '❌ Failed (expected)' : '✅ Succeeded (unexpected)');
  console.log('  Error:', failResult.errorMessage);
  console.log();

  // Test 2: Learn capabilities and succeed
  console.log('Test 2: Issue credential with capabilities');
  credential.learn([key.teach()]);
  
  const successResult = await credential.issueCredential(subject, 'TestCredential', 'did:example:issuer');
  console.log('  Result:', successResult.isSuccess ? '✅ Succeeded' : '❌ Failed');
  if (successResult.isSuccess) {
    console.log('  Credential ID:', successResult.value.id);
    console.log('  Credential Type:', successResult.value.type);
    console.log('  Proof Type:', successResult.value.proof.type);
  } else {
    console.log('  Error:', successResult.errorMessage);
  }
  console.log();

  // Test 3: Verify the credential
  if (successResult.isSuccess) {
    console.log('Test 3: Verify credential');
    const verifyResult = await credential.verifyCredential(successResult.value);
    console.log('  Result:', verifyResult.isSuccess ? '✅ Succeeded' : '❌ Failed');
    if (verifyResult.isSuccess) {
      console.log('  Verified:', verifyResult.value.verified);
      console.log('  Issuer:', verifyResult.value.issuer);
      console.log('  Subject:', verifyResult.value.subject);
    } else {
      console.log('  Error:', verifyResult.errorMessage);
    }
  }

  console.log('\n🎉 All tests completed!');
}

testCredentialResult().catch(console.error);
