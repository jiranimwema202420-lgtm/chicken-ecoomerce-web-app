# Changelog

All notable changes to Duka Ecommerce are documented in this file.

The project follows Semantic Versioning:

- **MAJOR**: incompatible changes
- **MINOR**: backward-compatible features
- **PATCH**: backward-compatible fixes

## [Unreleased]

### Security

- Updated Next.js and pinned patched image/CSS processing dependencies.
- Added rate limits to payment initiation and order-status requests.
- Verified M-Pesa callback amount, phone, receipt uniqueness, and order linkage
  before applying payment or inventory changes.
- Added canonical-role authorization support, revoked-token checks, stricter
  product upload types, and additional browser security headers.
- Removed tracked environment and source backup files and expanded ignore rules.

### Added

- Accessible skip navigation, responsive menu behavior, clearer catalogue
  actions, truthful service standards, and improved footer navigation.
- Scalable application structure and version metadata.
- GitHub Actions validation workflow.
- Health and version API endpoints.
- Controlled semantic release scripts.
