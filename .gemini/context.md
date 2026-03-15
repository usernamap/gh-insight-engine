# GitHub Insight Engine - Context

## Current State
- **Version**: 0.1.129
- **Last Updated**: 2026-03-15
- **Status**: npm audit remediation completed and validated (root + mcp)

## Active Workstream
### Security Remediation (npm audit)
- Root vulnerabilities were scoped to `@stoplight/spectral-*` transitive dependencies.
- Targeted fixes implemented through npm `overrides`:
  - `@stoplight/spectral-core -> minimatch@3.1.5`
  - `@stoplight/spectral-ruleset-bundler -> rollup@2.80.0`
- CI security workflow extended with `mcp/` audit gate.

## Validation Baseline
- `npm run openapi:validate`
- `npm run lint`
- `npm run typecheck`
- `npm audit --audit-level=moderate`
- `npm audit --prefix mcp --package-lock-only --audit-level=moderate`

## Notes
- Existing dirty lockfiles were preserved and remediation was applied on top.
- No runtime or API behavior changes were introduced.
