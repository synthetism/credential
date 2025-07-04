#!/usr/bin/env node

/**
 * @synet/credential demonstration script
 * 
 * This script demonstrates the full capabilities of the credential library
 * including issuing, verifying, and storing credentials.
 */

import { CredentialService, CredentialUtils } from './src/credential-service';
import { JSONCredentialStorageAdapter } from './test/storage-adapter';
import type {
  W3CVerifiableCredential,
  IdentitySubject,
  AuthorizationSubject,
  DataAssetSubject,
  SynetCredentialType,
} from './src/types-synet';

async function main() {
  console.log('🚀 @synet/credential Demonstration\n');

  // Create key manager and credentials service
  console.log('1. Setting up credential service...');
  const keyManager = CredentialUtils.createSimpleKeyManager();
  const { keyId, publicKey } = await keyManager.createKey();
  const issuerDid = `did:key:${publicKey}`;
  
  console.log(`   Issuer DID: ${issuerDid}`);
  console.log(`   Key ID: ${keyId}`);
  
  const credentialService = new CredentialService(keyManager, issuerDid, keyId);
  const storage = new JSONCredentialStorageAdapter('./demo-credentials.json');

  // Issue an Identity Credential
  console.log('\n2. Issuing Identity Credential...');
  const identitySubject: IdentitySubject = {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith',
    },
    issuedBy: {
      id: issuerDid,
      name: 'Trust Authority',
    },
    scope: ['identity', 'verification'],
  };

  const identityResult = await credentialService.issueVC(
    identitySubject,
    'IdentityCredential',
    issuerDid,
    {
      expirationDate: '2030-12-31T23:59:59Z',
      meta: {
        version: '1.0.0',
        schema: 'https://schema.synet.org/IdentityCredential/1.0.0',
      },
    }
  );

  if (!identityResult.success) {
    console.error('❌ Failed to issue identity credential:', identityResult.error);
    return;
  }

  const identityCredential = identityResult.data;
  console.log(`   ✅ Issued: ${identityCredential.id}`);
  console.log(`   📋 Type: ${identityCredential.type.join(', ')}`);
  console.log(`   👤 Subject: ${identityCredential.credentialSubject.holder.name}`);

  // Store the credential
  await storage.save(identityCredential);
  console.log('   💾 Stored in JSON file');

  // Verify the credential
  console.log('\n3. Verifying Identity Credential...');
  const verifyResult = await credentialService.verifyVC(identityCredential);
  
  if (verifyResult.success && verifyResult.data?.verified) {
    console.log('   ✅ Credential verified successfully');
    console.log(`   🔍 Issuer: ${verifyResult.data.issuer}`);
    console.log(`   🎯 Subject: ${verifyResult.data.subject}`);
  } else {
    console.log('   ❌ Verification failed:', verifyResult.error);
  }

  // Issue an Authorization Credential
  console.log('\n4. Issuing Authorization Credential...');
  const authSubject: AuthorizationSubject = {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith',
    },
    authorizedBy: {
      id: issuerDid,
      name: 'System Administrator',
    },
    scope: 'admin:read,write',
    metadata: {
      permissions: ['read', 'write', 'admin'],
      resourceType: 'database',
      environment: 'production',
    },
  };

  const authResult = await credentialService.issueVC(
    authSubject,
    'AuthorizationCredential',
    issuerDid,
    {
      expirationDate: '2025-12-31T23:59:59Z',
      meta: {
        version: '1.0.0',
        schema: 'https://schema.synet.org/AuthorizationCredential/1.0.0',
      },
    }
  );

  if (authResult.success) {
    const authCredential = authResult.data;
    console.log(`   ✅ Issued: ${authCredential.id}`);
    console.log(`   🔐 Authorization: ${authCredential.credentialSubject.scope}`);
    await storage.save(authCredential);
    console.log('   💾 Stored in JSON file');
  }

  // Issue a Data Asset Credential
  console.log('\n5. Issuing Data Asset Credential...');
  const dataSubject: DataAssetSubject = {
    holder: {
      id: 'did:key:alice123',
      name: 'Alice Smith',
    },
    issuedBy: {
      id: issuerDid,
      name: 'Data Authority',
    },
    licensedBy: {
      id: 'did:key:data-provider',
      name: 'Data Provider Corp',
    },
    scope: ['analytics', 'training'],
    metadata: {
      dataType: 'medical-records',
      size: '10GB',
      format: 'JSON',
      privacy: 'anonymized',
    },
    verifiableResource: {
      ipfsUri: 'ipfs://QmX1234567890abcdef',
      hash: 'sha256:abcd1234567890ef',
      mirrors: ['ar://xyz123', 'ipns://mirror.example.com'],
    },
  };

  const dataResult = await credentialService.issueVC(
    dataSubject,
    'DataAssetCredential',
    issuerDid,
    {
      expirationDate: '2026-12-31T23:59:59Z',
      meta: {
        version: '1.0.0',
        schema: 'https://schema.synet.org/DataAssetCredential/1.0.0',
      },
    }
  );

  if (dataResult.success) {
    const dataCredential = dataResult.data;
    console.log(`   ✅ Issued: ${dataCredential.id}`);
    console.log(`   📊 Data Type: ${dataCredential.credentialSubject.metadata?.dataType}`);
    console.log(`   🔗 IPFS: ${dataCredential.credentialSubject.verifiableResource?.ipfsUri}`);
    await storage.save(dataCredential);
    console.log('   💾 Stored in JSON file');
  }

  // Demonstrate storage and search
  console.log('\n6. Storage and Search Operations...');
  
  // List all credentials
  const allCredentials = await storage.list();
  console.log(`   📂 Total credentials stored: ${allCredentials.length}`);

  // Search by holder
  const aliceCredentials = await storage.search({
    'credentialSubject.holder.id': 'did:key:alice123',
  });
  console.log(`   🔍 Credentials for Alice: ${aliceCredentials.length}`);

  // Search by type
  const identityCredentials = await storage.search({
    'type': 'IdentityCredential',
  });
  console.log(`   🆔 Identity credentials: ${identityCredentials.length}`);

  // Get storage statistics
  const stats = await storage.getStats();
  console.log('\n7. Storage Statistics:');
  console.log(`   📊 Total credentials: ${stats.totalCredentials}`);
  console.log(`   📁 File size: ${stats.fileSize} bytes`);
  console.log('   📋 Credential types:', Object.entries(stats.types));
  console.log('   👥 Issuers:', Object.entries(stats.issuers));

  // Demonstrate credential validation
  console.log('\n8. Credential Validation...');
  for (const credential of allCredentials) {
    const validation = CredentialService.validateCredential(credential);
    const metadata = CredentialService.extractMetadata(credential);
    const isExpired = CredentialUtils.isExpired(credential);
    
    console.log(`   📜 ${credential.id}:`);
    console.log(`      ✅ Valid: ${validation.success}`);
    console.log(`      ⏰ Expired: ${isExpired}`);
    console.log(`      🏷️  Types: ${metadata.type.join(', ')}`);
  }

  // Demonstrate DID parsing
  console.log('\n9. DID Parsing...');
  const did = issuerDid;
  const parsed = CredentialUtils.parseDID(did);
  if (parsed) {
    console.log(`   🆔 DID: ${did}`);
    console.log(`   🔧 Method: ${parsed.method}`);
    console.log(`   🔑 Identifier: ${parsed.identifier}`);
  }

  // Test expired credential handling
  console.log('\n10. Testing Expired Credential...');
  const expiredResult = await credentialService.issueVC(
    identitySubject,
    'TestCredential',
    issuerDid,
    {
      issuanceDate: '2020-01-01T00:00:00Z',
      expirationDate: '2020-01-02T00:00:00Z',
    }
  );

  if (expiredResult.success) {
    const expiredCredential = expiredResult.data;
    const verifyExpired = await credentialService.verifyVC(expiredCredential, {
      checkExpiration: true,
    });
    
    console.log(`    ⏰ Expired credential verification: ${verifyExpired.success ? 'passed' : 'failed (expected)'}`);
    if (!verifyExpired.success) {
      console.log(`    📝 Error: ${verifyExpired.error}`);
    }
  }

  console.log('\n✨ Demonstration complete!');
  console.log('\n📁 Check ./demo-credentials.json for stored credentials');
  
  // Cleanup - save final state
  await storage.flush();
}

// Run the demonstration
main().catch(console.error);
