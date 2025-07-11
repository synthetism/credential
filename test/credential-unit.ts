/**
 * Test for @synet/credential Credential
 * 
 * This demonstrates the integration pattern:
 * signer -> credential -> issue VC
 */
import { Credential } from '../src/credential';

async function testCredential() {
  console.log('🎓 Testing @synet/credential Credential\n');

  // Create credential unit
  const credential = Credential.create();
  console.log('✅ Created:', credential.whoami());
  console.log('✅ Initial capabilities:', credential.capabilities());

  // Test 1: Try to issue without learning (should fail)
  console.log('\n1️⃣ Testing issue without crypto capabilities...');
  const issueResult = await credential.issueCredential(
    { holder: { id: 'did:example:123', name: 'Alice Smith' } },
    'UniversityDegree',
    'did:example:university'
  );
  
  if (issueResult.isFailure) {
    console.log('✅ Expected failure:', issueResult.errorMessage);
  } else {
    console.log('❌ Should have failed');
  }

  // Test 2: Learn crypto capabilities
  console.log('\n2️⃣ Learning crypto capabilities...');

  // Mock signer that teaches sign/verify/getPublicKey
  const mockSigner = {
    teach: () => ({
      unitId: 'mock-signer',
      capabilities: {
        getPublicKey: async () => {
          return 'mock-public-key';
        },
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
  const vcResult = await credential.issueCredential(
    { holder: { id: 'did:example:123', name: 'Alice Smith', degree: 'Computer Science' } },
    'UniversityDegree',
    'did:example:university'
  );
  
  if (vcResult.isSuccess) {
    const vc = vcResult.value;
    console.log('✅ Credential issued successfully!');
    console.log('📄 VC ID:', vc.id);
    console.log('📄 Subject:', vc.credentialSubject.holder.name);
    console.log('🔏 Proof type:', vc.proof.type);
    console.log('🔏 Has signature:', !!vc.proof.jwt);
  } else {
    console.log('❌ Issue failed:', vcResult.errorMessage);
  }

  // Test 4: Verify credential
  console.log('\n4️⃣ Verify issued credential...');
  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:synet:credential:test',
    type: ['VerifiableCredential', 'UniversityDegree'],
    issuer: { id: 'did:example:university' },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { holder: { id: 'did:example:123', name: 'Alice Smith' } },
    proof: {
      type: 'JwtProof2020',
      jwt: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJpZCI6InVybjpzeW5ldDpjcmVkZW50aWFsOnRlc3QiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVW5pdmVyc2l0eURlZ3JlZSJdLCJpc3N1ZXIiOnsiaWQiOiJkaWQ6ZXhhbXBsZTp1bml2ZXJzaXR5In0sImlzc3VhbmNlRGF0ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaG9sZGVyIjp7ImlkIjoiZGlkOmV4YW1wbGU6MTIzIiwibmFtZSI6IkFsaWNlIFNtaXRoIn19fSwianRpIjoidXJuOnN5bmV0OmNyZWRlbnRpYWw6dGVzdCIsIm5iZiI6MTcwNDA2NzIwMCwiaXNzIjoiZGlkOmV4YW1wbGU6dW5pdmVyc2l0eSJ9.signature-123-1234567890'
    }
  };

  const verifyResult = await credential.verifyCredential(mockCredential);
  
  if (verifyResult.isSuccess) {
    console.log('✅ Verification result:', verifyResult.value);
  } else {
    console.log('❌ Verification failed:', verifyResult.errorMessage);
  }

  // Test 5: Validate structure only
  console.log('\n5️⃣ Validate credential structure...');
  const structureResult = await credential.validateStructure({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:synet:credential:test',
    type: ['VerifiableCredential', 'UniversityDegree'],
    issuer: { id: 'did:example:university' },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { holder: { id: 'did:example:123', name: 'Alice Smith' } },
    proof: {
      type: 'JwtProof2020',
      jwt: 'fake.jwt.token'
    }
  });
  
  console.log('✅ Structure validation:', structureResult);

  // Test 6: Teaching
  console.log('\n6️⃣ Teaching credential capabilities...');
  const teachingContract = credential.teach();
  console.log('✅ Teaching contract:', Object.keys(teachingContract.capabilities));

  console.log('\n🎉 All tests completed!');
  console.log('\n💡 Integration Pattern Demonstrated:');
  console.log('   1. Create Credential');
  console.log('   2. Learn crypto capabilities from Signer/Keys');
  console.log('   3. Issue W3C-compliant verifiable credentials');
  console.log('   4. Verify and validate credentials');
  console.log('   5. Teach credential capabilities to other units');
}

// Run the test
testCredential().catch(console.error);
