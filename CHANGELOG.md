# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-07-22

### Added

- **Unit Architecture Doctrine v1.0.5** implementation with props-based construction
- **CredentialConfig interface** for consistent API patterns with @synet/keys and @synet/did
- **Enhanced Documentation** with updated API examples matching @synet/keys v1.0.6 patterns
- **Comprehensive README** refresh with current Unit Architecture patterns

### Changed

- **API Consistency**: Updated all documentation examples to use @synet/keys v1.0.6 config-based patterns
- **Props-based Construction**: `Credential.create(config?: CredentialConfig)` with metadata property
- **Enhanced Unit Architecture**: Full compliance with Unit Architecture Doctrine v1.0.5
- **Updated Examples**: All README examples now use correct `Signer.create({ privateKeyPEM, publicKeyPEM, keyType })` format

### Technical

- **Maintained Backward Compatibility**: All existing APIs remain functional
- **26 Tests Passing**: Full test suite verification with updated patterns
- **Zero Breaking Changes**: Purely additive enhancements and documentation improvements

## [1.0.2] 

### Added

- Initial Unit Architecture implementation
- W3C Verifiable Credential support
- JWT proof format
- Result pattern for error handling
