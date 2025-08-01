import { Request, Response } from 'express';
import { asyncHandler, createError, generateJWT } from '@/middleware';
import { githubConfig } from '@/config/github';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models';
import { GitHubService } from '@/services';
import { UserProfile, GitHubOrganization, AuthenticatedUser } from '@/types';
import {
  AUTH_MESSAGES,
  AUTH_LOG_MESSAGES,
  JWT_CONSTANTS,
  GITHUB_SCOPES,
  DEFAULT_USER_PROFILE,
  NETWORK_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from '@/constants';

interface LoginRequestBody {
  username: string;
  fullName: string;
  githubToken: string;
}
export class AuthController {
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, fullName, githubToken }: LoginRequestBody = req.body;
    logWithContext.auth(AUTH_LOG_MESSAGES.LOGIN_ATTEMPT, username, true, {
      fullName,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const tokenValidation = await githubConfig.validateToken(githubToken);

    if (!tokenValidation.valid) {
      // Handle rate limit errors specifically
      if (tokenValidation.isRateLimitError === true) {
        logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
          reason: 'rate_limit',
          error: tokenValidation.error,
        });
        throw createError.authorization('GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.');
      }

      if (tokenValidation.isNetworkError === true) {
        logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_NETWORK_ERROR_DEGRADED, username, true, {
          reason: tokenValidation.error,
        });

        const degradedUser: UserProfile = {
          login: username.trim(),
          id: DEFAULT_USER_PROFILE.ID,
          node_id: DEFAULT_USER_PROFILE.EMPTY_STRING,
          avatar_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          gravatar_id: DEFAULT_USER_PROFILE.EMPTY_STRING,
          url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          html_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          followers_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          following_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          gists_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          starred_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          subscriptions_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          organizations_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          repos_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          events_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          received_events_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          type: DEFAULT_USER_PROFILE.TYPE,
          site_admin: DEFAULT_USER_PROFILE.BOOLEAN_FALSE,
          name: fullName,
          company: DEFAULT_USER_PROFILE.EMPTY_STRING,
          blog: DEFAULT_USER_PROFILE.EMPTY_STRING,
          location: DEFAULT_USER_PROFILE.EMPTY_STRING,
          email: DEFAULT_USER_PROFILE.EMPTY_STRING,
          hireable: DEFAULT_USER_PROFILE.BOOLEAN_FALSE,
          bio: DEFAULT_USER_PROFILE.EMPTY_STRING,
          twitter_username: DEFAULT_USER_PROFILE.EMPTY_STRING,
          public_repos: DEFAULT_USER_PROFILE.ID,
          public_gists: DEFAULT_USER_PROFILE.ID,
          followers: DEFAULT_USER_PROFILE.ID,
          following: DEFAULT_USER_PROFILE.ID,
          created_at: new Date(),
          updated_at: new Date(),
          organizations: {
            totalCount: DEFAULT_USER_PROFILE.ORGANIZATIONS.TOTAL_COUNT,
            nodes: [] as GitHubOrganization[],
          },
        };

        const user = await UserModel.upsert(degradedUser);

        const jwtPayload = {
          userId: user.id,
          username: degradedUser.login,
          githubToken,
        };
        const accessToken = generateJWT(jwtPayload);

        const responseData = {
          message: AUTH_MESSAGES.SUCCESS_DEGRADED,
          user: {
            id: user.id,
            username: degradedUser.login,
            hasValidToken: true,
            degradedMode: true,
          },
          tokens: {
            accessToken,
            tokenType: JWT_CONSTANTS.TOKEN_TYPE,
            expiresIn: JWT_CONSTANTS.EXPIRES_IN,
          },
          permissions: {
            canAccessPrivateRepos: false,
            canReadOrgs: false,
            canReadUser: true,
          },
          warning: AUTH_MESSAGES.WARNING_DEGRADED,
          timestamp: new Date().toISOString(),
        };

        logWithContext.auth(AUTH_LOG_MESSAGES.LOGIN_SUCCESS_DEGRADED, username, true, {
          userId: user.id,
          degradedMode: true,
        });

        res.status(HTTP_STATUS_CODES.OK).json(responseData);
        return;
      }

      logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
        reason: tokenValidation.error,
        scopes: tokenValidation.scopes,
      });
      throw createError.authentication(`${AUTH_MESSAGES.INVALID_TOKEN}${tokenValidation.error}`);
    }

    try {
      const initResult = await githubConfig.initialize(githubToken);

      // Handle initialization failures gracefully
      if (!initResult.success) {
        if (initResult.isRateLimitError === true) {
          logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
            reason: 'rate_limit_during_initialization',
            error: initResult.error,
          });
          throw createError.authorization(initResult.error ?? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.');
        } else {
          logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
            reason: 'initialization_failed',
            error: initResult.error,
          });
          throw createError.authentication(initResult.error ?? 'GitHub configuration initialization failed');
        }
      }

      const githubService = await GitHubService.create(githubToken);
      const userProfile = await githubService.getUserProfile();
      const cleanUsername = username.trim();

      if (userProfile == null) {
        logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_USER_NOT_FOUND, username, false);
        throw createError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
      }

      if (userProfile.login !== cleanUsername) {
        logWithContext.auth(AUTH_LOG_MESSAGES.TOKEN_USERNAME_MISMATCH, username, false, {
          tokenOwner: userProfile.login,
        });
        throw createError.authorization(AUTH_MESSAGES.TOKEN_USERNAME_MISMATCH);
      }

      const jwtPayload = {
        userId: userProfile.login,
        username: userProfile.login,
        githubToken,
      };
      const accessToken = generateJWT(jwtPayload);

      const responseData = {
        message: AUTH_MESSAGES.SUCCESS,
        user: {
          id: userProfile.login,
          username: userProfile.login,
          hasValidToken: true,
        },
        tokens: {
          accessToken,
          tokenType: JWT_CONSTANTS.TOKEN_TYPE,
          expiresIn: JWT_CONSTANTS.EXPIRES_IN,
        },
        permissions: {
          canAccessPrivateRepos: tokenValidation.scopes?.includes(GITHUB_SCOPES.REPO) ?? false,
          canReadOrgs: tokenValidation.scopes?.includes(GITHUB_SCOPES.READ_ORG) ?? false,
          canReadUser: tokenValidation.scopes?.includes(GITHUB_SCOPES.USER) ?? false,
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.auth(AUTH_LOG_MESSAGES.LOGIN_SUCCESS, username, true, {
        userId: userProfile.login,
        tokenScopes: tokenValidation.scopes,
        hasPrivateAccess: tokenValidation.scopes?.includes(GITHUB_SCOPES.REPO),
      });

      res.status(HTTP_STATUS_CODES.OK).json(responseData);
    } catch (networkError) {
      // Handle rate limit errors specifically
      if (networkError instanceof Error && networkError.name === 'GitHubRateLimitError') {
        logWithContext.auth(AUTH_LOG_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
          reason: 'rate_limit_during_initialization',
          error: networkError.message,
        });
        throw createError.authorization(networkError.message);
      }
      if (
        networkError instanceof Error &&
        (networkError.message.includes(NETWORK_ERROR_MESSAGES.TIMEOUT) ||
          networkError.message.includes(NETWORK_ERROR_MESSAGES.ECONNRESET) ||
          networkError.message.includes(NETWORK_ERROR_MESSAGES.CONNECT_TIMEOUT_ERROR))
      ) {
        logWithContext.auth(
          AUTH_LOG_MESSAGES.GITHUB_SERVICE_NETWORK_ERROR_FALLBACK,
          username,
          true,
          {
            error: networkError.message,
          }
        );

        const fallbackUser: UserProfile = {
          login: tokenValidation.username ?? username.trim(),
          id: DEFAULT_USER_PROFILE.ID,
          node_id: DEFAULT_USER_PROFILE.EMPTY_STRING,
          avatar_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          gravatar_id: DEFAULT_USER_PROFILE.EMPTY_STRING,
          url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          html_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          followers_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          following_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          gists_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          starred_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          subscriptions_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          organizations_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          repos_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          events_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          received_events_url: DEFAULT_USER_PROFILE.EMPTY_STRING,
          type: DEFAULT_USER_PROFILE.TYPE,
          site_admin: DEFAULT_USER_PROFILE.BOOLEAN_FALSE,
          name: fullName,
          company: DEFAULT_USER_PROFILE.EMPTY_STRING,
          blog: DEFAULT_USER_PROFILE.EMPTY_STRING,
          location: DEFAULT_USER_PROFILE.EMPTY_STRING,
          email: DEFAULT_USER_PROFILE.EMPTY_STRING,
          hireable: DEFAULT_USER_PROFILE.BOOLEAN_FALSE,
          bio: DEFAULT_USER_PROFILE.EMPTY_STRING,
          twitter_username: DEFAULT_USER_PROFILE.EMPTY_STRING,
          public_repos: DEFAULT_USER_PROFILE.ID,
          public_gists: DEFAULT_USER_PROFILE.ID,
          followers: DEFAULT_USER_PROFILE.ID,
          following: DEFAULT_USER_PROFILE.ID,
          created_at: new Date(),
          updated_at: new Date(),
          organizations: {
            totalCount: DEFAULT_USER_PROFILE.ORGANIZATIONS.TOTAL_COUNT,
            nodes: [] as GitHubOrganization[],
          },
        };

        const user = await UserModel.upsert(fallbackUser);
        const jwtPayload = {
          userId: user.id,
          username: fallbackUser.login,
          githubToken,
        };
        const accessToken = generateJWT(jwtPayload);

        res.status(HTTP_STATUS_CODES.OK).json({
          message: AUTH_MESSAGES.SUCCESS_FALLBACK,
          user: {
            id: user.id,
            username: fallbackUser.login,
            hasValidToken: true,
            fallbackMode: true,
          },
          tokens: {
            accessToken,
            tokenType: JWT_CONSTANTS.TOKEN_TYPE,
            expiresIn: JWT_CONSTANTS.EXPIRES_IN,
          },
          permissions: {
            canAccessPrivateRepos: tokenValidation.scopes?.includes(GITHUB_SCOPES.REPO) ?? false,
            canReadOrgs: tokenValidation.scopes?.includes(GITHUB_SCOPES.READ_ORG) ?? false,
            canReadUser: tokenValidation.scopes?.includes(GITHUB_SCOPES.USER) ?? false,
          },
          warning: AUTH_MESSAGES.WARNING_FALLBACK,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throw networkError;
    }
  });

  /**
   * Get current user authentication status
   * GET /api/auth/me
   */
  static me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.auth(AUTH_LOG_MESSAGES.ME_ENDPOINT_CALLED, 'anonymous', true, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      isAuthenticated: authenticatedUser != null,
    });

    if (authenticatedUser == null) {
      res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: AUTH_MESSAGES.NOT_AUTHENTICATED,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logWithContext.auth(AUTH_LOG_MESSAGES.ME_ENDPOINT_SUCCESS, authenticatedUser.username, true, {
      userId: authenticatedUser.id,
      username: authenticatedUser.username,
    });

    res.status(HTTP_STATUS_CODES.OK).json({
      authenticated: true,
      message: AUTH_MESSAGES.AUTHENTICATED,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

export default AuthController;
