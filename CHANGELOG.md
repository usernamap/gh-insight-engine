# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive contributing guidelines (CONTRIBUTING.md)
- Code of Conduct following Contributor Covenant standard
- Security policy with responsible disclosure guidelines
- GitHub Actions CI/CD pipeline
- Prettier configuration for consistent code formatting
- Issue and Pull Request templates
- Automated changelog generation

### Changed
- Updated Husky pre-commit hooks to use English messages
- Improved version bump script with better error handling
- Enhanced API coverage validation script

### Fixed
- Removed French language messages from scripts
- Fixed console.log statements in production code
- Improved error handling in version management

## [0.1.79] - 2024-01-XX

### Added
- Automatic scheduling system for data refresh
- Unified refresh endpoint (`POST /api/refresh/{username}`)
- Enhanced error handling with partial success support
- Comprehensive logging system
- Rate limiting for GitHub API calls

### Changed
- Improved JWT token management
- Enhanced database schema for better performance
- Updated OpenAPI documentation

### Fixed
- Authentication token expiration handling
- Database connection stability
- API response formatting

## [0.1.78] - 2024-01-XX

### Added
- AI-powered code quality analysis
- Developer career recommendations
- Repository analytics and insights
- GitHub profile analysis features

### Changed
- Enhanced GitHub API integration
- Improved data collection efficiency
- Updated authentication flow

### Fixed
- Memory leaks in long-running operations
- API response timeouts
- Data validation issues

## [0.1.77] - 2024-01-XX

### Added
- Initial release of GitHub Insight Engine
- Core API endpoints for user and repository data
- Basic authentication system
- MongoDB integration with Prisma
- OpenAPI documentation

### Changed
- Project structure and organization
- Development environment setup

### Fixed
- Initial bugs and stability issues

---

## Release Process

### Version Bumping

This project uses semantic versioning:

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes (backward compatible)

### Automated Release

Releases are automated using the following process:

1. **Version Update**: `npm run version:bump`
2. **Changelog Generation**: `npm run changelog`
3. **Release Creation**: `npm run release`

### Manual Release Steps

For manual releases:

```bash
# Update version
npm run version:bump

# Generate changelog
npm run changelog

# Build and test
npm run build
npm test

# Create git tag
git tag v$(node -p "require('./package.json').version")

# Push changes
git push origin main --tags
```

---

## Contributing to Changelog

When contributing to this project, please update the changelog by adding entries under the `[Unreleased]` section following the format above.

### Changelog Entry Types

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

### Example Entry

```markdown
### Added
- New feature for user authentication
- API endpoint for data export

### Changed
- Updated authentication flow to use JWT tokens
- Improved error handling in API responses

### Fixed
- Resolved memory leak in long-running operations
- Fixed incorrect data validation
``` 