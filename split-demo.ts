/**
 * Demonstration of the Split Architecture
 * 
 * This example shows how the new split architecture works:
 * 1. Universal base types in types-base.ts
 * 2. Synet-specific extensions in types-synet.ts
 * 3. How other clients can extend the base types
 */

// Option 1: Use only base types (for maximum universality)
import { 
  W3CVerifiableCredential, 
  IdentitySubject, 
  AssetSubject, 
  BaseCredentialType,
  Intelligence,
} from './src/types-base';

// Option 2: Use Synet types (includes base types + Synet extensions)
import { 
  SynetVerifiableCredential, 
  IpAssetSubject, 
  GatewayIdentitySubject, 
  SynetCredentialType,
  SynetHolder,
} from './src/types-synet';

// Option 3: Mix and match - use base types and extend them yourself
import type { 
  BaseCredentialSubject, 
  Holder, 
  VerifiableResource 
} from './src/types-base';

// Example: Client creates their own credential types
const MyCredentialTypes = {
  // Academic
  Degree: "DegreeCredential",
  Certificate: "CertificateCredential",
  
  // Professional
  License: "LicenseCredential",
  
  // IoT
  Device: "DeviceCredential",
  SensorData: "SensorDataCredential",
} as const;

// Client extends base types
interface DegreeSubject extends BaseCredentialSubject {
  degree: string;
  university: string;
  graduationDate: string;
  gpa?: number;
}

interface DeviceSubject extends BaseCredentialSubject {
  deviceId: string;
  deviceType: string;
  manufacturer: string;
  capabilities: string[];
}

// Client can create union types
type MyCredentialType = 
  | typeof MyCredentialTypes[keyof typeof MyCredentialTypes]
  | typeof SynetCredentialType[keyof typeof SynetCredentialType];

console.log('🏗️ Split Architecture Demonstration');
console.log('');

console.log('1. Base Types (Universal):');
console.log('   📦 BaseCredentialType:', Object.values(BaseCredentialType));
console.log('   🧠 Intelligence:', Object.values(Intelligence));
console.log('');

console.log('2. Synet Types (Extended):');
console.log('   📦 SynetCredentialType:', Object.values(SynetCredentialType));
console.log('');

console.log('3. Client Types (Custom):');
console.log('   📦 MyCredentialTypes:', Object.values(MyCredentialTypes));
console.log('');

console.log('4. Architecture Benefits:');
console.log('   ✅ Base types are stable and reusable');
console.log('   ✅ Synet types extend without breaking base');
console.log('   ✅ Clients can extend base types easily');
console.log('   ✅ All types are W3C-compatible');
console.log('   ✅ Type safety maintained throughout');
console.log('');

console.log('5. Usage Examples:');
console.log('   📋 Universal: Use types-base.ts for max compatibility');
console.log('   🌐 Synet: Use types-synet.ts for Synet ecosystem');
console.log('   🔧 Custom: Extend base types for your own needs');
console.log('');

console.log('✨ This architecture provides the best of both worlds:');
console.log('   - Clean, stable base types');
console.log('   - Powerful Synet extensions');
console.log('   - Easy client extensibility');
console.log('   - Single dependency for everything');

export type {
  MyCredentialType,
  DegreeSubject,
  DeviceSubject,
};

export {
  MyCredentialTypes,
};
