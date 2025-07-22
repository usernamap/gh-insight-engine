"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/utils/logger"));
class UserModel {
    static async create(userData) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.create({
                data: {
                    login: userData.login,
                    name: userData.name ?? '',
                    email: userData.email ?? '',
                    avatarUrl: userData.avatarUrl ?? '',
                    bio: userData.bio ?? null,
                    company: userData.company ?? null,
                    location: userData.location ?? null,
                    blog: userData.blog ?? null,
                    twitterUsername: userData.twitterUsername ?? null,
                    followers: userData.followers ?? 0,
                    following: userData.following ?? 0,
                    publicRepos: userData.publicRepos ?? 0,
                    publicGists: userData.publicGists ?? 0,
                    privateRepos: userData.privateRepos ?? null,
                    ownedPrivateRepos: userData.ownedPrivateRepos ?? null,
                    totalPrivateRepos: userData.totalPrivateRepos ?? null,
                    collaborators: userData.collaborators ?? null,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt,
                    type: userData.type,
                    siteAdmin: userData.siteAdmin ?? false,
                    hireable: userData.hireable ?? null,
                    organizations: userData.organizations ?? { totalCount: 0, nodes: [] },
                },
            });
            logger_1.default.info('Utilisateur créé avec succès', {
                userId: user.id,
                login: user.login,
            });
            return user;
        }
        catch (_error) {
            logger_1.default.error("Erreur lors de la création de l'utilisateur", {
                login: userData.login,
                error: _error.message,
            });
            throw new Error(`Création utilisateur échouée: ${_error.message}`);
        }
    }
    static async findByLogin(login) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.findUnique({
                where: { login },
                include: {
                    repositories: {
                        take: 10,
                        orderBy: { pushedAt: 'desc' },
                    },
                    datasets: {
                        take: 5,
                        orderBy: { updatedAt: 'desc' },
                    },
                },
            });
            logger_1.default.debug('Recherche utilisateur par login', {
                login,
                found: user != null,
            });
            return user;
        }
        catch (_error) {
            logger_1.default.error('Erreur lors de la recherche utilisateur', {
                login,
                error: _error.message,
            });
            throw _error;
        }
    }
    static async findById(id) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.findUnique({
                where: { id },
            });
            logger_1.default.debug('Recherche utilisateur par ID', {
                id,
                found: user != null,
            });
            return user;
        }
        catch (_error) {
            logger_1.default.error('Erreur lors de la recherche utilisateur par ID', {
                id,
                error: _error.message,
            });
            throw _error;
        }
    }
    static async update(id, updateData) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.update({
                where: { id },
                data: {
                    ...(updateData.name != null && { name: updateData.name }),
                    ...(updateData.email != null && { email: updateData.email }),
                    ...(updateData.avatarUrl != null && { avatarUrl: updateData.avatarUrl }),
                    ...(updateData.bio !== undefined && { bio: updateData.bio }),
                    ...(updateData.company !== undefined && {
                        company: updateData.company,
                    }),
                    ...(updateData.location !== undefined && {
                        location: updateData.location,
                    }),
                    ...(updateData.blog !== undefined && { blog: updateData.blog }),
                    ...(updateData.twitterUsername !== undefined && {
                        twitterUsername: updateData.twitterUsername,
                    }),
                    ...(updateData.followers !== undefined && {
                        followers: updateData.followers,
                    }),
                    ...(updateData.following !== undefined && {
                        following: updateData.following,
                    }),
                    ...(updateData.publicRepos !== undefined && {
                        publicRepos: updateData.publicRepos,
                    }),
                    ...(updateData.publicGists !== undefined && {
                        publicGists: updateData.publicGists,
                    }),
                    ...(updateData.privateRepos !== undefined && {
                        privateRepos: updateData.privateRepos,
                    }),
                    ...(updateData.hireable !== undefined && {
                        hireable: updateData.hireable,
                    }),
                    ...(updateData.organizations && {
                        organizations: updateData.organizations,
                    }),
                    updatedAt: new Date(),
                },
            });
            logger_1.default.info('Utilisateur mis à jour', {
                userId: user.id,
                login: user.login,
            });
            return user;
        }
        catch (_error) {
            logger_1.default.error('Erreur lors de la mise à jour utilisateur', {
                id,
                error: _error.message,
            });
            throw new Error(`Mise à jour utilisateur échouée: ${_error.message}`);
        }
    }
    static async delete(id) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            await database_1.default.transaction(async (tx) => {
                await tx.dataset.deleteMany({
                    where: { userProfileId: id },
                });
                await tx.repository.deleteMany({
                    where: { userId: id },
                });
                await tx.user.delete({
                    where: { id },
                });
            });
            logger_1.default.info('Utilisateur supprimé avec succès', { userId: id });
        }
        catch (_error) {
            logger_1.default.error('Erreur lors de la suppression utilisateur', {
                id,
                error: _error.message,
            });
            throw new Error(`Suppression utilisateur échouée: ${_error.message}`);
        }
    }
    static async search(filters) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const where = {};
            if (filters.search != null) {
                where.OR = [
                    { login: { contains: filters.search, mode: 'insensitive' } },
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { bio: { contains: filters.search, mode: 'insensitive' } },
                ];
            }
            if (filters.location != null) {
                where.location = { contains: filters.location, mode: 'insensitive' };
            }
            if (filters.company != null) {
                where.company = { contains: filters.company, mode: 'insensitive' };
            }
            if (filters.minFollowers !== undefined ||
                filters.maxFollowers !== undefined) {
                where.followers = {};
                if (filters.minFollowers !== undefined) {
                    where.followers.gte = filters.minFollowers;
                }
                if (filters.maxFollowers !== undefined) {
                    where.followers.lte = filters.maxFollowers;
                }
            }
            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    take: filters.limit ?? 10,
                    skip: filters.offset ?? 0,
                    orderBy: { followers: 'desc' },
                }),
                prisma.user.count({ where }),
            ]);
            logger_1.default.debug("Recherche d'utilisateurs", {
                filtersCount: Object.keys(filters).length,
                resultsCount: users.length,
                total,
            });
            return { users, total };
        }
        catch (_error) {
            logger_1.default.error("Erreur lors de la recherche d'utilisateurs", {
                filters,
                error: _error.message,
            });
            throw _error;
        }
    }
    static async getStats() {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const [totalUsers, totalRepositories, avgFollowers] = await Promise.all([
                prisma.user.count(),
                prisma.repository.count(),
                prisma.user.aggregate({
                    _avg: { followers: true },
                }),
            ]);
            const repositories = await prisma.repository.findMany({
                where: { primaryLanguage: { not: null } },
                select: { primaryLanguage: true },
            });
            const languageCount = repositories.reduce((acc, repo) => {
                if (repo.primaryLanguage != null) {
                    acc[repo.primaryLanguage] = (acc[repo.primaryLanguage] ?? 0) + 1;
                }
                return acc;
            }, {});
            const topLanguages = Object.entries(languageCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([language, count]) => ({ language, count: count }));
            return {
                totalUsers,
                totalRepositories,
                averageFollowers: Math.round(avgFollowers._avg.followers ?? 0),
                topLanguages,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur lors du calcul des statistiques', {
                error: _error.message,
            });
            throw _error;
        }
    }
    static async exists(login) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.findUnique({
                where: { login },
                select: { id: true },
            });
            return user != null;
        }
        catch (_error) {
            logger_1.default.error("Erreur lors de la vérification d'existence utilisateur", {
                login,
                error: _error.message,
            });
            return false;
        }
    }
    static async upsert(userData) {
        const prisma = database_1.default.getPrismaClient();
        if (prisma == null) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const user = await prisma.user.upsert({
                where: { login: userData.login },
                update: {
                    name: userData.name ?? '',
                    email: userData.email ?? '',
                    avatarUrl: userData.avatarUrl ?? '',
                    bio: userData.bio ?? null,
                    company: userData.company ?? null,
                    location: userData.location ?? null,
                    blog: userData.blog ?? null,
                    twitterUsername: userData.twitterUsername ?? null,
                    followers: userData.followers ?? 0,
                    following: userData.following ?? 0,
                    publicRepos: userData.publicRepos ?? 0,
                    publicGists: userData.publicGists ?? 0,
                    privateRepos: userData.privateRepos ?? null,
                    hireable: userData.hireable ?? null,
                    organizations: userData.organizations ?? { totalCount: 0, nodes: [] },
                    updatedAt: new Date(),
                },
                create: {
                    login: userData.login,
                    name: userData.name ?? '',
                    email: userData.email ?? '',
                    avatarUrl: userData.avatarUrl ?? '',
                    bio: userData.bio ?? null,
                    company: userData.company ?? null,
                    location: userData.location ?? null,
                    blog: userData.blog ?? null,
                    twitterUsername: userData.twitterUsername ?? null,
                    followers: userData.followers ?? 0,
                    following: userData.following ?? 0,
                    publicRepos: userData.publicRepos ?? 0,
                    publicGists: userData.publicGists ?? 0,
                    privateRepos: userData.privateRepos ?? null,
                    ownedPrivateRepos: userData.ownedPrivateRepos ?? null,
                    totalPrivateRepos: userData.totalPrivateRepos ?? null,
                    collaborators: userData.collaborators ?? null,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt,
                    type: userData.type,
                    siteAdmin: userData.siteAdmin ?? false,
                    hireable: userData.hireable ?? null,
                    organizations: userData.organizations ?? { totalCount: 0, nodes: [] },
                },
            });
            logger_1.default.info('Utilisateur upsert réussi', {
                userId: user.id,
                login: user.login,
            });
            return user;
        }
        catch (_error) {
            logger_1.default.error("Erreur lors de l'upsert utilisateur", {
                login: userData.login,
                error: _error.message,
            });
            throw new Error(`Upsert utilisateur échoué: ${_error.message}`);
        }
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map