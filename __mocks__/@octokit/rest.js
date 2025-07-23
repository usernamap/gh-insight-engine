/* eslint-disable no-undef */
// Mock pour @octokit/rest - utilise les vraies données d'environnement
const mockUserData = {
  login: process.env.GITHUB_USERNAME || 'test-user',
  id: 1,
  name: process.env.GITHUB_FULL_NAME || 'Test User',
  email: `${process.env.GITHUB_USERNAME || 'test-user'}@github.com`,
  avatar_url: `https://avatars.githubusercontent.com/u/1?v=4`,
  bio: null,
  company: null,
  location: null,
  followers: 0,
  following: 0,
  public_repos: 0,
  public_gists: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  type: 'User',
  site_admin: false
};

class Octokit {
  constructor(options = {}) {
    this.options = options;
    // Vérifier si le token fourni correspond au token d'environnement
    this.isValidToken = options.auth === process.env.GH_TOKEN;
  }

  rest = {
    users: {
      getAuthenticated: jest.fn().mockImplementation(() => {
        if (!this.isValidToken) {
          throw new Error('Bad credentials');
        }
        return Promise.resolve({
          data: mockUserData,
          headers: {
            'x-oauth-scopes': 'repo, user:email, read:user, read:org, read:packages, security_events, admin:repo_hook, repo:status',
            'x-accepted-oauth-scopes': '',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600
          }
        });
      }),
      getByUsername: jest.fn().mockImplementation((params) => {
        // Retourner les données réelles seulement si le username correspond
        if (params.username === process.env.GITHUB_USERNAME) {
          return Promise.resolve({
            data: mockUserData
          });
        }
        throw new Error('Not Found');
      }),
    },
    repos: {
      listForAuthenticatedUser: jest.fn().mockResolvedValue({
        data: []
      }),
      get: jest.fn().mockImplementation((params) => {
        // Simuler un repository réel basé sur les données d'environnement
        return Promise.resolve({
          data: {
            id: Math.floor(Math.random() * 1000000),
            name: params.repo,
            full_name: `${params.owner}/${params.repo}`,
            description: null,
            private: false,
            archived: false,
            fork: false,
            stargazers_count: 0,
            forks_count: 0,
            watchers_count: 0,
            open_issues_count: 0,
            language: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pushed_at: new Date().toISOString()
          }
        });
      }),
      listLanguages: jest.fn().mockResolvedValue({
        data: {}
      }),
      getContents: jest.fn().mockResolvedValue({
        data: {
          name: 'README.md',
          content: '',
          encoding: 'base64'
        }
      }),
      listCommits: jest.fn().mockResolvedValue({
        data: []
      }),
      listPullRequests: jest.fn().mockResolvedValue({
        data: []
      }),
      listIssues: jest.fn().mockResolvedValue({
        data: []
      }),
    },
    rateLimit: {
      get: jest.fn().mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 1
          }
        }
      }),
    },
  };

  graphql = jest.fn().mockImplementation(() => {
    if (!this.isValidToken) {
      throw new Error('Bad credentials');
    }
    
    // Retourner des données basées sur les variables d'environnement
    // Le service attend 'viewer' pas 'user'
    return Promise.resolve({
      viewer: {
        login: process.env.GITHUB_USERNAME,
        name: process.env.GITHUB_FULL_NAME,
        email: `${process.env.GITHUB_USERNAME}@github.com`,
        avatarUrl: `https://avatars.githubusercontent.com/u/1?v=4`,
        bio: null,
        company: null,
        location: null,
        websiteUrl: null,
        twitterUsername: null,
        followers: { totalCount: 0 },
        following: { totalCount: 0 },
        repositories: { totalCount: 0 },
        gists: { totalCount: 0 },
        organizations: { totalCount: 0, nodes: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __typename: 'User',
        isSiteAdmin: false,
        isHireable: null
      }
    });
  });
  
  paginate = jest.fn().mockResolvedValue([]);
  
  static defaults = jest.fn();
}

module.exports = { Octokit };
module.exports.Octokit = Octokit; 