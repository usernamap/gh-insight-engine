import { jest } from '@jest/globals';
// Mock pour @octokit/graphql
const graphql = jest.fn();

module.exports = { graphql };
module.exports.graphql = graphql; 