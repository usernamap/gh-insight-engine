export const OPENAI_CONSTANTS = {
  MODEL: 'gpt-5-mini',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.3,
  TEST_MAX_TOKENS: 10,
  TEST_MESSAGE: 'Hello',
  ROLES: {
    USER: 'user',
    SYSTEM: 'system',
  },
  // AI Analysis Constants
  ANALYSIS_VERSION: '1.0.0',
  FALLBACK_MODEL: 'fallback',
  DEFAULT_VALUES: {
    N_A: 'N/A',
    NONE: 'None',
    EMPTY_STRING: '',
  },
  SCORE_LIMITS: {
    MAX_QUALITY: 100,
    MIN_QUALITY: 0,
    MAX_OVERALL_HEALTH: 10,
    MIN_OVERALL_HEALTH: 0,
    MAX_VULNERABILITIES: 200,
    MAX_BUGS: 500,
    MAX_BUILD_TIME: 300,
    MIN_BUILD_TIME: 30,
    MAX_TEST_COVERAGE: 100,
    MIN_TEST_COVERAGE: 0,
  },
  DEFAULT_SCORES: {
    QUALITY: 50,
    MAINTAINABILITY: 50,
    SECURITY: 50,
    INNOVATION: 50,
    OVERALL_HEALTH: 5,
    TEST_COVERAGE: 30,
    BUILD_TIME: 120,
    CONFIDENCE: 75,
  },
  ORGANIZATION_DEFAULTS: {
    PERSONAL: 60,
    ORGANIZATION: 70,
    SCHOOL: 50,
  },
  FALLBACK_COEFFICIENTS: {
    STARS_MULTIPLIER: 20,
    ACTIVE_PROJECTS_MULTIPLIER: 5,
    LANGUAGES_MULTIPLIER: 3,
    MAX_FOLLOWERS_BONUS: 30,
    REPO_QUALITY_MULTIPLIER: 15,
    DESCRIPTION_BONUS: 20,
    FALLBACK_CONFIDENCE: 60,
    // Fallback score adjustments
    MAINTAINABILITY_OFFSET: 10,
    SECURITY_OFFSET: 20,
    INNOVATION_OFFSET: 15,
    OVERALL_HEALTH_DIVISOR: 10,
    OVERALL_HEALTH_MIN: 3,
    // Vulnerability and bug coefficients
    VULNERABILITIES_COEFFICIENT: 0.5,
    BUGS_COEFFICIENT: 1.2,
    // Organization adjustments
    ORGANIZATION_BONUS: 10,
    SCHOOL_MALUS: 20,
    // Repository quality
    REPO_MIN_SCORE: 20,
  },
  REPOSITORY_LIMITS: {
    MAX_REPOSITORIES: 200,
    TOP_REPOSITORIES: 200,
    FALLBACK_REPOSITORIES: 50,
  },
  TIME_CONSTANTS: {
    THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
    ONE_YEAR_MS: 365 * 24 * 60 * 60 * 1000,
  },
  SYSTEM_PROMPT:
    'You are an expert in code analysis and software development. You analyze GitHub profiles to provide precise insights on quality, security, and performance. Respond ONLY in a valid JSON schema as requested.',
  // AI Analysis Prompt Templates
  PROMPT_TEMPLATES: {
    ANALYSIS_PROMPT: `Analyze this GitHub profile and generate a JSON with the following metrics:

USER PROFILE:
- Login: {login}
- Name: {name}
- Bio: {bio}
- Company: {company}
- Public repositories: {publicRepos}
- Followers: {followers}
- Years of activity: {yearsOfActivity}

STATISTICS:
- Total repositories: {totalRepositories}
- Total stars: {totalStars}
- Total commits: {totalCommits}
- Languages: {totalLanguages}
- Lines of code: {totalLinesOfCode}
- Active projects: {activeProjects}

{repositoryBreakdown}

IMPORTANT: Use the repository breakdown above to calculate accurate qualityByOrganization scores:
- "personal": Average quality of {personalRepos} personal repositories
- "organization": Average quality of {organizationRepos} organization repositories  
- "school": Average quality of {schoolRepos} school/educational repositories

TOP REPOSITORIES:
{topRepositories}

Generate ONLY this JSON (no markdown):
{
  "qualityScore": 0 - {maxQuality},
  "maintenabilityScore": 0 - {maxQuality},
  "securityScore": 0 - {maxQuality},
  "innovationScore": 0 - {maxQuality},
  "overallHealthScore": 0 - {maxOverallHealth},
  "estimatedVulnerabilities": 0 - {maxVulnerabilities},
  "estimatedBugs": 0 - {maxBugs},
  "estimatedBuildTime": {minBuildTime} - {maxBuildTime},
  "estimatedTestCoverage": 0 - {maxTestCoverage},
  "qualityByOrganization": {
    "personal": 0 - {maxQuality},
    "organization": 0 - {maxQuality},
    "school": 0 - {maxQuality}
  },
  "repositoryScores": [
    {
      "name": "repo-name",
      "qualityScore": 0 - {maxQuality},
      "recommendation": "short-advice",
      "strengths": ["strength1", "strength2"],
      "improvementAreas": ["improvement1", "improvement2"]
    }
  ],
  "insights": {
    "summary": "2-phrase-profile-summary",
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
    "careerAdvice": ["career-advice1", "career-advice2"]
  }
}`,
    REPOSITORY_TEMPLATE: `- {name}: {primaryLanguage}, {stargazerCount} stars, {size} KB
  Description: {description}
  Topics: {topics}`,
  },
} as const;
