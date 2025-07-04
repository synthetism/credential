/**
 * Extension Example: How to extend @synet/credential with custom types
 * 
 * This example demonstrates how clients can extend the credential system
 * with their own credential types while maintaining type safety and
 * compatibility with the existing Synet ecosystem.
 */

// 1. Extend Credential Types
const CustomCredentialTypes = {
  // Academic credentials
  Degree: "DegreeCredential",
  Certificate: "CertificateCredential",
  
  // Professional credentials
  License: "LicenseCredential",
  Certification: "CertificationCredential",
  
  // IoT credentials
  DeviceIdentity: "DeviceIdentityCredential",
  SensorData: "SensorDataCredential",
} as const;

type CustomCredentialType = typeof CustomCredentialTypes[keyof typeof CustomCredentialTypes];

// 2. Extend Intelligence Types
const CustomIntelligenceTypes = {
  quantum: "Quantum",
  collective: "Collective",
  augmented: "Augmented",
} as const;

type CustomIntelligenceType = typeof CustomIntelligenceTypes[keyof typeof CustomIntelligenceTypes];

console.log('🔧 Extension Pattern Demo');
console.log('Available Custom Credential Types:', Object.values(CustomCredentialTypes));
console.log('Available Custom Intelligence Types:', Object.values(CustomIntelligenceTypes));

export {
  CustomCredentialTypes,
  CustomIntelligenceTypes,
};
