import { RepositoryModel } from '@/models';
import logger from '@/utils/logger';
import { GitHubRepo } from '@/types';
import { GitHubService } from '@/services/GitHubService';

interface RawArtifact {
    repoName: string;
    source: 'dependency-graph' | 'manifest-file' | 'infra-file';
    path: string;
    content?: string; // For files like package.json, Dockerfile
    dependencies?: string[]; // For API results
}

export class TechnologyExtractionService {
    /**
     * Harvest raw technology artifacts from all user repositories
     * Uses "No Limit" strategy: API + Deep File Scan
     */
    public async collectRawArtifacts(userId: string, githubToken: string): Promise<RawArtifact[]> {
        const repos = await RepositoryModel.findByUserId(userId, { limit: 10000 }); // Unbounded
        const artifacts: RawArtifact[] = [];

        // Initialize scoped GitHub service for this request
        const scopedGithubService = await import('@/services/GitHubService').then(m => m.GitHubService.create(githubToken));

        logger.info('Starting Advanced Technology Extraction', { repoCount: repos.repositories.length });

        // Parallelize with concurrency limit to respect rate limits
        const CONCURRENCY = 5;
        const chunks = this.chunkArray(repos.repositories, CONCURRENCY);

        for (const chunk of chunks) {
            const results = await Promise.allSettled(
                chunk.map(repo => this.processRepository(repo as unknown as GitHubRepo, scopedGithubService))
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    artifacts.push(...result.value);
                } else {
                    logger.error('Failed to process repository for tech extraction', {
                        error: String(result.reason)
                    });
                }
            }
        }

        logger.info('Technology Extraction Complete', { artifactCount: artifacts.length });
        return artifacts;
    }

    private async processRepository(repo: Pick<GitHubRepo, 'name' | 'nameWithOwner'> & { defaultBranchRef?: string | null; owner?: { login?: string } | null }, githubService: GitHubService): Promise<RawArtifact[]> {
        if (repo.defaultBranchRef == null || repo.defaultBranchRef === '') {
            return [];
        }
        const artifacts: RawArtifact[] = [];
        const ownerLogin = repo.owner?.login ?? repo.nameWithOwner.split('/')[0];
        const owner = typeof ownerLogin === 'string' ? ownerLogin : String(ownerLogin);
        const name = repo.name;

        // 1. GitHub Dependency Graph API (Official SBOM)
        try {
            // Note: This endpoint might require specific permissions or might return 404 if disabled
            // We accept 404/403 as "no data" and proceed
            const sbom = await githubService.githubConfig.executeRestRequest(
                `GET /repos/${owner}/${name}/dependency-graph/sbom`,
                {},
                { logErrorAsWarn: true }
            ) as unknown as { sbom?: { packages?: Array<{ name: string }> } };

            if (sbom?.sbom?.packages != null) {
                const dependencies = sbom.sbom.packages.map((pkg: { name: string }) => pkg.name);
                artifacts.push({
                    repoName: repo.name,
                    source: 'dependency-graph',
                    path: 'github-sbom',
                    dependencies
                });
            }
        } catch {
            // Silent fail for dependency graph (often disabled or private)
            // logger.debug('Dependency graph not available', { repo: repo.name });
        }

        // 2. File Scanner (Key Files)
        // We look for specific "high value" files
        const TARGET_FILES = [
            'package.json',
            'go.mod',
            'requirements.txt',
            'Gemfile',
            'Cargo.toml',
            'composer.json',
            'pom.xml',
            'build.gradle',
            'Dockerfile',
            'docker-compose.yml',
            'docker-compose.yaml',
            'netlify.toml',
            'vercel.json',
            'next.config.js',
            'nuxt.config.js',
            'pyproject.toml',
        ];

        try {
            // Use GraphQL to fetch file existence/content efficiently if possible
            // Or recursively scan tree. For now, let's try direct content fetch for root files
            // To be truly "No Limit" recursive, we should use the Git Tree API

            // Fetch Git Tree (Recursive)
            // Warning: Huge trees can be heavy. We limit to depth 3 or 4 implicitly by likely file locations
            const tree = await githubService.githubConfig.executeRestRequest(
                `GET /repos/${owner}/${name}/git/trees/${repo.defaultBranchRef}?recursive=1`
            ) as { truncated: boolean; tree: Array<{ path: string; type: string; url: string }> };

            if (tree.truncated === true) {
                logger.warn('Git tree truncated', { repo: repo.name });
            }

            const IGNORED_DIRS = ['node_modules/', 'dist/', 'build/', 'coverage/', 'vendor/', 'public/'];

            const relevantFiles = tree.tree.filter((node) => {
                const isIgnored = IGNORED_DIRS.some(dir => node.path.includes(dir));
                return !isIgnored && node.type === 'blob' && TARGET_FILES.some(target => node.path.endsWith(target));
            });

            // Fetch content for relevant files (limit 20 per repo to avoid quota explosion)
            const filesToFetch = relevantFiles.slice(0, 20);

            for (const file of filesToFetch) {
                try {
                    // Fetch raw content
                    const contentData = await githubService.githubConfig.executeRestRequest(
                        `GET /repos/${owner}/${name}/contents/${file.path}`,
                        {},
                        { logErrorAsWarn: true }
                    ) as { content?: string };

                    if (contentData.content != null) {
                        const decoded = Buffer.from(contentData.content, 'base64').toString('utf-8');
                        artifacts.push({
                            repoName: repo.name,
                            source: file.path.includes('Docker') || file.path.includes('compose') ? 'infra-file' : 'manifest-file',
                            path: file.path,
                            content: decoded
                        });
                    }
                } catch {
                    // Ignore file fetch error
                }
            }

        } catch (error) {
            logger.error('Failed to scan files', { repo: repo.name, error: String(error) });
        }

        return artifacts;
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunked: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    }
}

export const technologyExtractionService = new TechnologyExtractionService();
