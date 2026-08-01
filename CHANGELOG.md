# Changelog

All notable changes to Duka Ecommerce are documented in this file.

The project follows Semantic Versioning:

- **MAJOR**: incompatible changes
- **MINOR**: backward-compatible features
- **PATCH**: backward-compatible fixes

## [Unreleased]

### Added

- Added Phase 1 monetization controls: private product economics, delivery-zone
  fees, minimum-order enforcement, free-delivery thresholds, server-trusted
  pricing breakdowns, conversion events, and an admin profitability dashboard.

### Security

- Added a global authenticated-session policy with a 30-minute inactivity
  timeout, five-minute warning, eight-hour maximum duration, cross-tab logout,
  and activity-aware renewal. Anonymous guest checkout remains uninterrupted.

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
