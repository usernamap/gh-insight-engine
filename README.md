# GitHub Insight Engine

[![Version](https://img.shields.io/badge/version-0.1.43-blue.svg)](https://github.com/usernamap/gh-insight-engine)
[![npm](https://img.shields.io/badge/npm-v11.4.2-yellow.svg)](https://www.npmjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![rest api](https://img.shields.io/badge/Rest_API-green.svg)](https://github.lucas-blanchard.com)

> **The most powerful GitHub analytics API ever built** - Fetch, analyze, visualize, and optimize your development journey with comprehensive insights powered by AI.

## 🚀 Features

### Core Analytics
- **Complete GitHub Profile Analysis** - Deep insights into your development patterns
- **Repository Analytics** - DevOps maturity, code quality, and community health metrics
- **AI-Powered Insights** - GPT-4 analysis of code quality, security, and career recommendations
- **Real-time Data Collection** - Live GitHub API integration with graceful degradation

### Advanced Capabilities
- **Unified Refresh Endpoint** - Update all user data in one request (`POST /refresh/{username}`)
- **Automatic Scheduling** - Configurable daily/weekly/monthly data updates
- **Comprehensive Error Handling** - Partial success support with detailed reporting
- **JWT Authentication** - Secure API access with GitHub token validation

### Developer Experience
- **OpenAPI Documentation** - Complete API specification with interactive docs
- **TypeScript Strict Mode** - Full type safety and modern development practices
- **Comprehensive Logging** - Detailed audit trail for debugging and monitoring
- **Rate Limiting** - Respects GitHub API limits with intelligent throttling

## 📋 Quick Start

### Prerequisites
- Node.js >= 18.14.0
- MongoDB (local or cloud)
- GitHub Classic Token with required scopes

### Installation

```bash
# Clone the repository
git clone https://github.com/usernamap/gh-insight-engine.git
cd gh-insight-engine

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:push

# Start development server
npm run dev
```

### Environment Configuration

```env
# Database
DATABASE_URL=mongodb://localhost:27017/github_insight_engine

# GitHub API
GH_TOKEN=your_github_classic_token
GITHUB_USERNAME=your_username
GITHUB_FULL_NAME=Your Full Name

# OpenAI (for AI analysis)
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3000
NODE_ENV=development

# JWT Security
JWT_SECRET=your_jwt_secret

# Automatic Scheduling (Optional)
SCHEDULE_ENABLED=false
SCHEDULE_FREQUENCY=weekly
SCHEDULE_TIME=02:00
SCHEDULE_TIMEZONE=Europe/Paris
SCHEDULE_AUTH_TOKEN=
```

## 🔧 API Usage

### Authentication
```bash
# Login with GitHub token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "octocat",
    "fullName": "The Octocat",
    "githubToken": "ghp_xxxxxxxxxxxxxxxxxxxx"
  }'
```

### Complete Data Refresh
```bash
# Refresh all user data in one request
curl -X POST http://localhost:3000/api/refresh/octocat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Individual Operations
```bash
# Collect user profile
curl -X POST http://localhost:3000/api/users/octocat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Collect repositories
curl -X POST http://localhost:3000/api/repositories/octocat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Run AI analysis
curl -X POST http://localhost:3000/api/ai/octocat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 API Endpoints

### Core Operations
- `POST /api/auth/login` - GitHub token authentication
- `POST /api/refresh/{username}` - **Complete data refresh** (NEW)
- `POST /api/users/{username}` - Collect user profile
- `POST /api/repositories/{username}` - Collect repositories
- `POST /api/ai/{username}` - Run AI analysis

### Data Retrieval
- `GET /api/users/{username}` - Get user profile
- `GET /api/repositories/{username}` - Get repositories with analytics
- `GET /api/summary/{username}` - Get comprehensive developer summary
- `GET /api/ai/{username}` - Get AI analysis results

### System
- `GET /api/health` - Health check
- `GET /api/ping` - Connectivity test
- `GET /api/ai/status` - AI service status

## Automatic Scheduling

The application includes an automatic scheduling system that can update user data at configurable intervals without manual intervention.

### Configuration

Enable automatic scheduling by setting these environment variables:

```env
# Enable automatic scheduling
SCHEDULE_ENABLED=true

# Scheduling frequency (daily, weekly, monthly)
SCHEDULE_FREQUENCY=weekly

# Execution time in 24h format
SCHEDULE_TIME=02:00

# Timezone for execution
SCHEDULE_TIMEZONE=Europe/Paris

# Required user information
GITHUB_USERNAME=your_github_username
GITHUB_FULL_NAME=Your Full Name
GH_TOKEN=your_github_classic_token
```

### How It Works

The scheduling service automatically:

1. **Retrieves Authentication Tokens**: Calls `POST /auth/login` to get a valid JWT token
2. **Manages Token Expiration**: Automatically renews tokens when they expire (24h default)
3. **Executes Scheduled Updates**: Calls `POST /api/refresh/{username}` at the configured intervals
4. **Handles Errors Gracefully**: Logs failures and continues operation

### Features

- **Automatic Token Management**: No manual token configuration required
- **Flexible Scheduling**: Daily, weekly, or monthly updates
- **Timezone Support**: Configurable timezone for execution
- **Error Handling**: Robust error handling with detailed logging
- **Status Monitoring**: Check scheduling status via service methods

### Example Usage

```typescript
import { SchedulingService } from '@/services/SchedulingService';

// Get scheduling status
const status = SchedulingService.getInstance().getStatus();
console.log('Scheduling enabled:', status.enabled);
console.log('Next run:', status.nextRun);

// Test configuration immediately
const success = await SchedulingService.getInstance().testConfiguration();
```

### Security

- Tokens are automatically retrieved and managed
- No manual token storage required
- Automatic token renewal prevents expiration issues
- All operations are logged for audit purposes

## 🏗️ Architecture

```
GitHub API → Data Collection → MongoDB Storage → AI Analysis → API Response
     ↓              ↓              ↓              ↓              ↓
  Rate Limiting  Error Handling  Data Models  OpenAI GPT-4  JWT Auth
```

### Key Components
- **GitHubService** - Handles all GitHub API interactions
- **AIAnalysisService** - OpenAI GPT-4 integration for insights
- **SchedulingService** - Automatic data refresh management
- **RefreshController** - Unified endpoint for complete data updates

## 🧪 Development

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## 📚 Documentation

- **API Documentation**: `http://localhost:3000/` (interactive OpenAPI docs)
- **OpenAPI Spec**: `openapi.yaml`
- **Technical Documentation**: [`docs/README.md`](docs/README.md)
- **Contributing Guide**: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Code of Conduct**: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- **Security Policy**: [`SECURITY.md`](SECURITY.md)
- **Changelog**: [`CHANGELOG.md`](CHANGELOG.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Setting up your development environment
- Code style and conventions
- Testing guidelines
- Pull request process
- Release procedures

For quick start:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/usernamap/gh-insight-engine/issues)
- **Documentation**: [API Docs](http://localhost:3000/)
- **Discussions**: [GitHub Discussions](https://github.com/usernamap/gh-insight-engine/discussions)

---

**Built with ❤️ for the developer community**

❤️ [Donation Link](https://lucas-blanchard.com/don) ❤️

## 🏆 Acknowledgements
