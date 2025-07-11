/**
 * Quick verification script to check that signatures are now base64url encoded
 */

import { Signer } from '@synet/keys';
import { Credential } from '../src/credential';

async function main() {
  // Create a signer
  const signer = Signer.generate('ed25519', { name: 'test-signer' });
  
  if (!signer) {
    throw new Error('Failed to create signer');
  }

  console.log('✓ Created signer');

  // Create key from signer
  const key = signer.createKey();
  
  if (!key) {
    throw new Error('Failed to create key');
  }

  console.log('✓ Created key');

  // Test direct signing
  const testData = 'Hello, World!';
  const signature = await signer.sign(testData);
  
  console.log('✓ Generated signature:', signature);
  console.log('✓ Signature length:', signature.length);
  
  // Check for base64url characteristics
  const hasBase64Chars = /[+/=]/.test(signature);
  const hasBase64UrlChars = /[-_]/.test(signature);
  
  console.log('✓ Has base64 chars (+/=):', hasBase64Chars);
  console.log('✓ Has base64url chars (-_):', hasBase64UrlChars);
  
  if (!hasBase64Chars && hasBase64UrlChars) {
    console.log('✅ Signature is properly base64url encoded');
  } else if (hasBase64Chars && !hasBase64UrlChars) {
    console.log('❌ Signature is still base64 encoded');
  } else {
    console.log('❓ Signature format is unclear');
  }
  
  // Test verification
  const isValid = await signer.verify(testData, signature);
  console.log('✓ Signature verification:', isValid);
  
  // Test with credential unit
  const credential = Credential.create();
  credential.learn([key.teach()]);
  
  const subject = {
    holder: {
      id: 'did:example:123',
      name: 'Test User'
    }
  };
  
  const vc = await credential.issueCredential(subject, 'TestCredential', 'did:example:123');
  
  if (vc?.isSuccess) {
    const credential_data = vc.value;
    console.log('✓ Issued credential');
    console.log('✓ JWT:', credential_data.proof.jwt);
    
    // Check JWT signature part
    const jwt = credential_data.proof.jwt;
    if (!jwt) {
      console.log('❌ No JWT in credential');
      return;
    }
    
    const jwtParts = jwt.split('.');
    const jwtSignature = jwtParts[2];
    
    const jwtHasBase64Chars = /[+/=]/.test(jwtSignature);
    const jwtHasBase64UrlChars = /[-_]/.test(jwtSignature);
    
    console.log('✓ JWT signature has base64 chars (+/=):', jwtHasBase64Chars);
    console.log('✓ JWT signature has base64url chars (-_):', jwtHasBase64UrlChars);
    
    if (!jwtHasBase64Chars && jwtHasBase64UrlChars) {
      console.log('✅ JWT signature is properly base64url encoded');
    } else if (jwtHasBase64Chars && !jwtHasBase64UrlChars) {
      console.log('❌ JWT signature is still base64 encoded');
    } else {
      console.log('❓ JWT signature format is unclear');
    }
    
    // Test verification
    const verifyResult = await credential.verifyCredential(credential_data);
    if (verifyResult.isSuccess) {
      console.log('✓ Credential verification:', verifyResult.value.verified);
    } else {
      console.log('❌ Verification failed:', verifyResult?.errorMessage);
    }
  } else {
    console.log('❌ Failed to issue credential:', vc?.errorMessage);
  }
}

main().catch(console.error);
