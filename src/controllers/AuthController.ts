import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { generateJWT } from '@/middleware/auth';
import { githubConfig } from '@/config/github';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { GitHubService } from '@/services/GitHubService';
import { UserProfile } from '@/types/github';

interface LoginRequestBody {
  username: string;
  fullName: string;
  githubToken: string;
}
export class AuthController {
  static login = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username, fullName, githubToken }: LoginRequestBody = req.body;
      logWithContext.auth('login_attempt', username, true, {
        fullName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const tokenValidation = await githubConfig.validateToken(githubToken);

      // Si c'est une erreur de réseau, permettre un mode dégradé
      if (!tokenValidation.valid) {
        if (tokenValidation.isNetworkError === true) {
          // Mode dégradé : créer un utilisateur temporaire sans validation GitHub complète
          logWithContext.auth('github_network_error_degraded_mode', username, true, {
            reason: tokenValidation.error,
          });

          // Créer un utilisateur basique sans appeler l'API GitHub
          const degradedUser: UserProfile = {
            login: username.trim(),
            name: fullName,
            email: '',
            avatarUrl: '',
            bio: '',
            company: '',
            location: '',
            blog: '',
            twitterUsername: '',
            followers: 0,
            following: 0,
            publicRepos: 0,
            publicGists: 0,
            privateRepos: 0,
            ownedPrivateRepos: 0,
            totalPrivateRepos: 0,
            collaborators: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'User',
            siteAdmin: false,
            hireable: false,
            organizations: {
              totalCount: 0,
              nodes: [],
            },
          };

          // Mise à jour ou création du profil utilisateur en base avec données dégradées
          const user = await UserModel.upsert(degradedUser);

          // Génération du JWT en mode dégradé
          const jwtPayload = {
            userId: user.id,
            username: degradedUser.login,
            githubToken, // Inclure le token GitHub dans le JWT
          };
          const accessToken = generateJWT(jwtPayload);

          const responseData = {
            message: 'Authentification réussie (mode dégradé - connectivité GitHub limitée)',
            user: {
              id: user.id,
              username: degradedUser.login,
              hasValidToken: true,
              degradedMode: true,
            },
            tokens: {
              accessToken,
              tokenType: 'Bearer',
              expiresIn: '24h',
            },
            permissions: {
              canAccessPrivateRepos: false, // Conservateur en mode dégradé
              canReadOrgs: false,
              canReadUser: true,
            },
            warning: 'Mode dégradé activé en raison de problèmes de connectivité avec GitHub API',
            timestamp: new Date().toISOString(),
          };

          logWithContext.auth('login_success_degraded', username, true, {
            userId: user.id,
            degradedMode: true,
          });

          res.status(200).json(responseData);
          return;
        }

        // Erreur de token non liée au réseau
        logWithContext.auth('github_token_invalid', username, false, {
          reason: tokenValidation.error,
          scopes: tokenValidation.scopes,
        });
        throw createError.authentication(
          `Token GitHub invalide: ${tokenValidation.error}`,
        );
      }

      // Mode normal : validation GitHub réussie
      try {
        // Initialiser la configuration GitHub avec le token
        await githubConfig.initialize(githubToken);

        // Utiliser GitHubService pour récupérer le profil
        const githubService = await GitHubService.create(githubToken);
        const userProfile = await githubService.getUserProfile();
        const cleanUsername = username.trim();

        if (userProfile == null) {
          logWithContext.auth('github_user_not_found', username, false);
          throw createError.notFound('Utilisateur GitHub');
        }

        if (userProfile.login !== cleanUsername) {
          logWithContext.auth('token_username_mismatch', username, false, {
            tokenOwner: userProfile.login,
          });
          throw createError.authorization(
            "Le token GitHub ne correspond pas au nom d'utilisateur fourni",
          );
        }

        // Mise à jour ou création du profil utilisateur en base
        const user = await UserModel.upsert(userProfile);

        // Génération du JWT (adapter le payload au schéma attendu)
        const jwtPayload = {
          userId: user.id,
          username: userProfile.login,
          githubToken, // Inclure le token GitHub dans le JWT
        };
        const accessToken = generateJWT(jwtPayload);

        const responseData = {
          message: 'Authentification réussie',
          user: {
            id: user.id,
            username: userProfile.login,
            hasValidToken: true,
          },
          tokens: {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          permissions: {
            canAccessPrivateRepos:
              tokenValidation.scopes?.includes('repo') ?? false,
            canReadOrgs: tokenValidation.scopes?.includes('read:org') ?? false,
            canReadUser: tokenValidation.scopes?.includes('user') ?? false,
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.auth('login_success', username, true, {
          userId: user.id,
          tokenScopes: tokenValidation.scopes,
          hasPrivateAccess: tokenValidation.scopes?.includes('repo'),
        });

        res.status(200).json(responseData);
      } catch (networkError) {
        // Si erreur réseau pendant l'appel à GitHubService, basculer en mode dégradé
        if (networkError instanceof Error && (
          networkError.message.includes('timeout') ||
          networkError.message.includes('ECONNRESET') ||
          networkError.message.includes('Connect Timeout Error')
        )) {
          logWithContext.auth('github_service_network_error_fallback', username, true, {
            error: networkError.message,
          });

          // Utiliser les données du token validation pour créer un utilisateur basique
          const fallbackUser: UserProfile = {
            login: tokenValidation.username ?? username.trim(),
            name: fullName,
            email: '',
            avatarUrl: '',
            bio: '',
            company: '',
            location: '',
            blog: '',
            twitterUsername: '',
            followers: 0,
            following: 0,
            publicRepos: 0,
            publicGists: 0,
            privateRepos: 0,
            ownedPrivateRepos: 0,
            totalPrivateRepos: 0,
            collaborators: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'User',
            siteAdmin: false,
            hireable: false,
            organizations: {
              totalCount: 0,
              nodes: [],
            },
          };

          const user = await UserModel.upsert(fallbackUser);
          const jwtPayload = {
            userId: user.id,
            username: fallbackUser.login,
            githubToken,
          };
          const accessToken = generateJWT(jwtPayload);

          res.status(200).json({
            message: 'Authentification réussie (mode de secours - connectivité GitHub instable)',
            user: {
              id: user.id,
              username: fallbackUser.login,
              hasValidToken: true,
              fallbackMode: true,
            },
            tokens: {
              accessToken,
              tokenType: 'Bearer',
              expiresIn: '24h',
            },
            permissions: {
              canAccessPrivateRepos: tokenValidation.scopes?.includes('repo') ?? false,
              canReadOrgs: tokenValidation.scopes?.includes('read:org') ?? false,
              canReadUser: tokenValidation.scopes?.includes('user') ?? false,
            },
            warning: 'Mode de secours activé en raison de problèmes de connectivité temporaires',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Autres erreurs, les faire remonter
        throw networkError;
      }
    },
  );
}

export default AuthController;
