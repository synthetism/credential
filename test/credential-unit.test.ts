/**
 * Test for @synet/credential CredentialUnit
 * 
 * This demonstrates the integration pattern:
 * signer -> credential -> issue VC
 */

import { CredentialUnit } from '../src/credential';

async function testCredentialUnit() {
  console.log('🎓 Testing @synet/credential CredentialUnit\n');

  // Create credential unit
  const credential = new CredentialUnit();
  console.log('✅ Created:', credential.whoami());
  console.log('✅ Initial capabilities:', credential.capabilities());

  // Test 1: Try to issue without learning (should fail)
  console.log('\n1️⃣ Testing issue without crypto capabilities...');
  try {
    await credential.execute('issue', 
      { id: 'did:example:123', name: 'Alice Smith' },
      'UniversityDegree',
      'did:example:university'
    );
    console.log('❌ Should have failed');
  } catch (error) {
    console.log('✅ Expected error:', (error as Error).message);
  }

  // Test 2: Learn crypto capabilities
  console.log('\n2️⃣ Learning crypto capabilities...');

  // Mock signer that teaches sign/verify
  const mockSigner = {
    teach: () => ({
      unitId: 'mock-signer',
      capabilities: {
        sign: async (...args: unknown[]) => {
          const data = args[0] as string;
          return `signature-${data.length}-${Date.now()}`;
        },
        verify: async (...args: unknown[]) => {
          const [data, signature] = args as [string, string];
          return signature.includes(`signature-${data.length}`);
        }
      }
    })
  };

  credential.learn([mockSigner.teach()]);
  console.log('✅ Updated capabilities:', credential.capabilities());

  // Test 3: Issue credential successfully
  console.log('\n3️⃣ Issue credential with learned capabilities...');
  try {
    const vc = await credential.execute('issue', 
      { id: 'did:example:123', name: 'Alice Smith', degree: 'Computer Science' },
      'UniversityDegree',
      'did:example:university'
    ) as { id: string; credentialSubject: { name: string }; proof: { type: string; jws?: string } };
    console.log('✅ Credential issued successfully!');
    console.log('📄 VC ID:', vc.id);
    console.log('📄 Subject:', vc.credentialSubject.name);
    console.log('🔏 Proof type:', vc.proof.type);
    console.log('🔏 Has signature:', !!vc.proof.jws);
  } catch (error) {
    console.log('❌ Issue failed:', (error as Error).message);
  }

  // Test 4: Verify credential
  console.log('\n4️⃣ Verify issued credential...');
  try {
    const mockCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'urn:synet:credential:test',
      type: ['VerifiableCredential', 'UniversityDegree'],
      issuer: 'did:example:university',
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: 'did:example:123', name: 'Alice Smith' },
      proof: {
        type: 'JsonWebSignature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:example:university#keys-1',
        proofPurpose: 'assertionMethod',
        jws: 'signature-123-1234567890'
      }
    };

    const result = await credential.execute('verify', mockCredential);
    console.log('✅ Verification result:', result);
  } catch (error) {
    console.log('❌ Verification failed:', (error as Error).message);
  }

  // Test 5: Validate structure only
  console.log('\n5️⃣ Validate credential structure...');
  try {
    const validationResult = await credential.execute('validate', {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: 'urn:synet:credential:test',
      type: ['VerifiableCredential', 'UniversityDegree'],
      issuer: 'did:example:university',
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: 'did:example:123', name: 'Alice Smith' },
      proof: {
        type: 'JsonWebSignature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:example:university#keys-1',
        proofPurpose: 'assertionMethod'
      }
    });
    console.log('✅ Structure validation:', validationResult);
  } catch (error) {
    console.log('❌ Structure validation failed:', (error as Error).message);
  }

  // Test 6: Teaching
  console.log('\n6️⃣ Teaching credential capabilities...');
  const teachingContract = credential.teach();
  console.log('✅ Teaching contract:', Object.keys(teachingContract.capabilities));

  console.log('\n🎉 All tests completed!');
  console.log('\n💡 Integration Pattern Demonstrated:');
  console.log('   1. Create CredentialUnit');
  console.log('   2. Learn crypto capabilities from Signer/Keys');
  console.log('   3. Issue W3C-compliant verifiable credentials');
  console.log('   4. Verify and validate credentials');
  console.log('   5. Teach credential capabilities to other units');
}

// Run the test
testCredentialUnit().catch(console.error);
