## Description

Brief description of the changes made in this pull request.

## Type of Change

Please delete options that are not relevant.

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Style update (formatting, missing semi colons, etc; no logic change)
- [ ] ♻️ Refactor (no functional changes, code improvements)
- [ ] ⚡ Performance improvements
- [ ] ✅ Test additions or updates
- [ ] 🔧 Configuration changes
- [ ] 🚀 CI/CD improvements

## Related Issues

Closes #(issue number)
Related to #(issue number)

## Testing

### Before submitting this PR, please make sure:

- [ ] I have run the full test suite and it passes
- [ ] I have added tests for any new functionality
- [ ] I have updated existing tests if needed
- [ ] I have run `npm run lint` and there are no errors
- [ ] I have run `npm run typecheck` and there are no errors
- [ ] I have run `npm run format` to ensure consistent formatting
- [ ] I have run `npm run openapi:validate` and it passes
- [ ] I have run `npm run openapi:coverage` and it passes

### Manual Testing

- [ ] I have tested the changes locally
- [ ] I have tested the changes in a staging environment (if applicable)
- [ ] I have verified the API endpoints work as expected
- [ ] I have checked that the documentation is accurate

## Code Quality

### Code Review Checklist

- [ ] Code follows the project's style guidelines
- [ ] Code is self-documenting with clear variable and function names
- [ ] Code includes appropriate error handling
- [ ] Code includes appropriate logging
- [ ] No console.log statements in production code
- [ ] No hardcoded secrets or sensitive data
- [ ] Input validation is implemented where necessary
- [ ] Security considerations have been addressed

### Performance Considerations

- [ ] Database queries are optimized
- [ ] API responses are properly cached where appropriate
- [ ] Memory usage is reasonable
- [ ] No unnecessary network requests

## Documentation

### API Changes

If this PR includes API changes:

- [ ] I have updated the OpenAPI specification (`openapi.yaml`)
- [ ] I have added or updated API documentation
- [ ] I have provided example requests/responses
- [ ] I have documented any breaking changes

### Code Documentation

- [ ] I have added JSDoc comments for new functions
- [ ] I have updated existing documentation
- [ ] I have added inline comments for complex logic

## Breaking Changes

If this PR includes breaking changes:

- [ ] I have documented the breaking changes
- [ ] I have provided migration instructions
- [ ] I have updated the changelog
- [ ] I have incremented the major version number

## Security

- [ ] I have reviewed the changes for security implications
- [ ] I have ensured no sensitive data is exposed
- [ ] I have validated all user inputs
- [ ] I have followed OWASP guidelines

## Deployment

### Environment Variables

- [ ] No new environment variables are required
- [ ] New environment variables are documented
- [ ] Default values are provided where appropriate

### Database Changes

- [ ] No database changes are required
- [ ] Database migrations are included
- [ ] Database changes are backward compatible
- [ ] Database changes are tested

## Screenshots

If applicable, add screenshots to help explain your changes:

### Before
![Before screenshot](url)

### After
![After screenshot](url)

## Additional Notes

Any additional information that reviewers should know:

- **Performance Impact**: Description of any performance implications
- **Security Considerations**: Any security-related notes
- **Testing Notes**: Special testing considerations
- **Deployment Notes**: Special deployment considerations

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

## Reviewers

Please tag relevant reviewers:

- [ ] @username (for API changes)
- [ ] @username (for database changes)
- [ ] @username (for security review)
- [ ] @username (for documentation review)

---

**Note**: Please ensure all checks pass before requesting review. This helps maintain code quality and reduces review time. 