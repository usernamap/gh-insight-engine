# GitHub Insight Engine - Context

## Current State
- **Version**: 0.1.121
- **Last Updated**: 2026-01-30T03:45:00+01:00
- **Status**: API error fixes applied, builds and lints successfully

## Recent Changes (2026-01-30)
### Fixed GitHub API Pipeline Errors
- **OpenAI**: `max_tokens` → `max_completion_tokens` in 3 files
- **GraphQL**: Fixed releases pagination (`first` on connection)
- **Packages API**: Added `package_type` iteration (6 types)
- **Branch Protection**: Status states (`protected`, `not_protected`, `plan_restricted`, `no_permission`)
- **Traffic**: Permission detection returns `no_permission` state
- **Security**: Per-endpoint status detection (`ok`, `disabled`, `no_permission`, `error`)

## Pending Work
- **Rate Limiting**: Full implementation deferred (requires queue-based architecture)
- **GraphQL Fields**: Some fields (`hasDownloads`, `vulnerabilityAlertsEnabled`, etc.) may need validation against GitHub schema if errors persist

## Key Files Modified
- `src/config/openai.ts` - OpenAI config
- `src/services/AIAnalysisService.ts` - AI analysis
- `src/controllers/AIController.ts` - AI controller
- `src/services/GitHubService.ts` - GitHub API calls

## Build Commands
```bash
npm run typecheck  # Type checking
npm run lint       # Linting
npm run dev        # Development server
npm run build      # Production build
```
