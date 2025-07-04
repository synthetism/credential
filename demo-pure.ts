/**
 * Demo of the new pure @synet/credential API
 * 
 * This demo showcases the clean, composable, and secure Key/Signer 
 * architecture and pure credential functions.
 */

import { 
  Key, 
  issueVC, 
  verifyVC, 
  isDirectKey, 
  isSignerKey,
  CredentialUtils,
  type IdentitySubject,
  type DirectKey,
  type SignerKey,
} from './src/index';
import { generateTestDirectKey, generateTestSignerKey, createDIDFromKey } from './test/helpers';

async function main() {
  console.log('🔑 Pure @synet/credential API Demo');
  console.log('================================\n');

  // 1. Generate Keys
  console.log('1. Key Generation:');
  const issuerKey = generateTestDirectKey();
  const signerKey = generateTestSignerKey();
  
  console.log(`   Direct Key: ${issuerKey.id} (can sign: ${issuerKey.canSign()})`);
  console.log(`   Signer Key: ${signerKey.id} (can sign: ${signerKey.canSign()})`);
  console.log(`   Types: Direct=${isDirectKey(issuerKey)}, Signer=${isSignerKey(signerKey)}\n`);

  // 2. Create DIDs
  console.log('2. DID Creation:');
  const issuerDid = createDIDFromKey(issuerKey);
  const signerDid = createDIDFromKey(signerKey);
  
  console.log(`   Issuer DID: ${issuerDid}`);
  console.log(`   Signer DID: ${signerDid}\n`);

  // 3. Issue Credentials
  console.log('3. Credential Issuance:');
  
  // Create identity credential subject
  const identitySubject: IdentitySubject = {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith',
    },
    issuedBy: {
      id: issuerDid,
      name: 'Synet Identity Authority',
    },
    scope: ['identity', 'authentication'],
  };

  // Issue with direct key
  console.log('   Issuing with direct key...');
  const directResult = await issueVC(
    issuerKey,
    identitySubject,
    'IdentityCredential',
    issuerDid,
    {
      meta: {
        version: '1.0.0',
        schema: 'https://synet.org/schemas/identity/v1',
      },
    }
  );

  if (directResult.success) {
    console.log(`   ✓ Direct credential issued: ${directResult.data.id}`);
  } else {
    console.log(`   ✗ Direct credential failed: ${directResult.error}`);
  }

  // Issue with signer key
  console.log('   Issuing with signer key...');
  const signerResult = await issueVC(
    signerKey,
    identitySubject,
    'IdentityCredential',
    signerDid,
    {
      meta: {
        version: '1.0.0',
        schema: 'https://synet.org/schemas/identity/v1',
      },
    }
  );

  if (signerResult.success) {
    console.log(`   ✓ Signer credential issued: ${signerResult.data.id}`);
  } else {
    console.log(`   ✗ Signer credential failed: ${signerResult.error}`);
  }

  console.log();

  // 4. Verify Credentials
  console.log('4. Credential Verification:');
  
  if (directResult.success) {
    console.log('   Verifying direct credential...');
    const directVerifyResult = await verifyVC(issuerKey, directResult.data);
    
    if (directVerifyResult.success) {
      console.log(`   ✓ Direct credential verified: ${directVerifyResult.data.verified}`);
      console.log(`     Issuer: ${directVerifyResult.data.issuer}`);
      console.log(`     Subject: ${directVerifyResult.data.subject}`);
    } else {
      console.log(`   ✗ Direct credential verification failed: ${directVerifyResult.error}`);
    }
  }

  if (signerResult.success) {
    console.log('   Verifying signer credential...');
    const signerVerifyResult = await verifyVC(signerKey, signerResult.data);
    
    if (signerVerifyResult.success) {
      console.log(`   ✓ Signer credential verified: ${signerVerifyResult.data.verified}`);
      console.log(`     Issuer: ${signerVerifyResult.data.issuer}`);
      console.log(`     Subject: ${signerVerifyResult.data.subject}`);
    } else {
      console.log(`   ✗ Signer credential verification failed: ${signerVerifyResult.error}`);
    }
  }

  console.log();

  // 5. Key Security Models
  console.log('5. Security Models:');
  
  // Public key (verification only)
  const publicKey = issuerKey.toPublicKey();
  console.log(`   Public key: ${publicKey.id} (can sign: ${publicKey.canSign()})`);
  
  // Try to sign with public key (should fail)
  console.log('   Attempting to sign with public key...');
  try {
    await publicKey.sign('test data');
    console.log('   ✗ Public key signing should have failed');
  } catch (error) {
    console.log(`   ✓ Public key signing correctly failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log();

  // 6. Credential Utilities
  console.log('6. Credential Utilities:');
  
  if (directResult.success) {
    const credential = directResult.data;
    
    console.log(`   Credential ID: ${credential.id}`);
    console.log(`   Types: ${CredentialUtils.getCredentialTypes(credential).join(', ')}`);
    console.log(`   Primary Type: ${CredentialUtils.getPrimaryType(credential)}`);
    console.log(`   Has Identity Type: ${CredentialUtils.hasType(credential, 'IdentityCredential')}`);
    console.log(`   Is Expired: ${CredentialUtils.isExpired(credential)}`);
    console.log(`   Age: ${Math.round(CredentialUtils.getCredentialAge(credential) / 1000)} seconds`);
  }

  console.log();

  // 7. Progressive Security
  console.log('7. Progressive Security:');
  console.log('   ✓ Simple: DirectKey with private key material');
  console.log('   ✓ Secure: SignerKey with external signer (vault/HSM ready)');
  console.log('   ✓ Verification: PublicKey for verification-only operations');
  console.log('   ✓ Type Safety: Compile-time key type checking');
  console.log('   ✓ Pure Functions: No side effects, fully composable');
  console.log('   ✓ Dependency Free: No external key management dependencies');
  
  console.log('\n🎉 Demo completed successfully!');
}

// Run the demo
main().catch(console.error);
