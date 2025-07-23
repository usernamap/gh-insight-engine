import { jest } from '@jest/globals';
// Mock pour @octokit/auth-token
const createTokenAuth = jest.fn(() => ({
  type: 'token',
  token: 'mock-token',
  tokenType: 'oauth'
}));

module.exports = { createTokenAuth };
module.exports.createTokenAuth = createTokenAuth; 