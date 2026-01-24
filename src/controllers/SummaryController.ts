import { Request, Response } from 'express';
import { asyncHandler, createError } from '@/middleware';
import { logWithContext } from '@/utils/logger';
import { UserModel, RepositoryModel } from '@/models';
import { AuthenticatedUser } from '@/types';

export class SummaryController {
  /**
   * Generate an ultra-complete summary of a developer
   * GET /api/summary/:username
   */
  static getDeveloperSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;
    const startTime = Date.now();

    logWithContext.api('get_developer_summary', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
      isAuthenticated: authenticatedUser != null,
    });

    try {
      const userData = await UserModel.findByLogin(String(username));
      if (userData == null) {
        throw createError.notFound(
          'No data found for this user. Use POST /users/{username} to collect data.'
        );
      }

      const repositoriesResult = await RepositoryModel.findByUserId(userData.id, {
        limit: 1000,
        includePrivate: true,
      });

      const repositories = repositoriesResult.repositories;

      const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
      const totalForks = repositories.reduce((sum, repo) => sum + repo.forkCount, 0);
      const totalWatchers = repositories.reduce((sum, repo) => sum + repo.watchersCount, 0);

      const publicRepositories = repositories.filter(repo => !repo.isPrivate).length;
      const privateRepositories = repositories.filter(repo => repo.isPrivate).length;

      const totalLinesOfCode = repositories.reduce((sum, repo) => {
        if (repo.languages != null && typeof repo.languages === 'object') {
          const languages = repo.languages as {
            totalSize: number;
            nodes: Array<{ name: string; size: number }>;
          };
          return sum + (languages.totalSize ?? 0);
        }
        return sum;
      }, 0);

      const organizationBreakdown = {
        personal: repositories.filter(repo => {
          if (repo.owner != null && typeof repo.owner === 'object') {
            const owner = repo.owner as { type?: string; name?: string };
            return owner.type === 'User';
          }
          return false;
        }).length,
        organization: repositories.filter(repo => {
          if (repo.owner != null && typeof repo.owner === 'object') {
            const owner = repo.owner as { type?: string; name?: string };
            return (
              owner.type === 'Organization' &&
              (owner.name?.toLowerCase().includes('company') === true ||
                owner.name?.toLowerCase().includes('corp') === true ||
                owner.name?.toLowerCase().includes('ltd') === true ||
                owner.name?.toLowerCase().includes('inc') === true)
            );
          }
          return false;
        }).length,
        school: repositories.filter(repo => {
          if (repo.owner != null && typeof repo.owner === 'object') {
            const owner = repo.owner as { type?: string; name?: string };
            return (
              owner.type === 'Organization' &&
              (owner.name?.toLowerCase().includes('school') === true ||
                owner.name?.toLowerCase().includes('university') === true ||
                owner.name?.toLowerCase().includes('college') === true ||
                owner.name?.toLowerCase().includes('edu') === true)
            );
          }
          return false;
        }).length,
      };

      const languageStats: Record<
        string,
        { count: number; totalBytes: number; repositories: string[] }
      > = {};
      let totalCommits = 0;
      let totalPullRequests = 0;
      let totalIssues = 0;

      repositories.forEach(repo => {
        if (repo.primaryLanguage != null && repo.primaryLanguage !== '') {
          if (!(repo.primaryLanguage in languageStats)) {
            languageStats[repo.primaryLanguage] = {
              count: 0,
              totalBytes: 0,
              repositories: [],
            };
          }
          languageStats[repo.primaryLanguage].count++;
          languageStats[repo.primaryLanguage].repositories.push(repo.name);
        }

        if (repo.languages != null && typeof repo.languages === 'object') {
          const languages = repo.languages as {
            totalSize: number;
            nodes: Array<{ name: string; size: number }>;
          };
          if (languages.nodes != null) {
            languages.nodes.forEach(lang => {
              if (!(lang.name in languageStats)) {
                languageStats[lang.name] = {
                  count: 0,
                  totalBytes: 0,
                  repositories: [],
                };
              }
              languageStats[lang.name].totalBytes += lang.size;
              if (!languageStats[lang.name].repositories.includes(repo.name)) {
                languageStats[lang.name].repositories.push(repo.name);
              }
            });
          }
        }

        if (repo.commits != null && typeof repo.commits === 'object') {
          const commits = repo.commits as { totalCount: number };
          totalCommits += commits.totalCount ?? 0;
        }

        if (repo.pullRequests != null && typeof repo.pullRequests === 'object') {
          const prs = repo.pullRequests as { totalCount: number };
          totalPullRequests += prs.totalCount ?? 0;
        }

        if (repo.issues != null && typeof repo.issues === 'object') {
          const issues = repo.issues as { totalCount: number };
          totalIssues += issues.totalCount ?? 0;
        }
      });

      const sortedLanguages = Object.entries(languageStats)
        .sort(([, a], [, b]) => b.totalBytes - a.totalBytes)
        .slice(0, 10);

      const primaryLanguages = sortedLanguages.slice(0, 5).map(([name, stats]) => ({
        name,
        proficiencyLevel: Math.min(100, Math.round(stats.totalBytes / 10000 + stats.count * 5)),
        totalBytes: stats.totalBytes,
        repositoryCount: stats.count,
        recentUsage: stats.repositories.some(repoName => {
          const repo = repositories.find(r => r.name === repoName);
          return (
            repo?.pushedAt != null &&
            new Date(repo.pushedAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          );
        }),
        trend:
          stats.totalBytes > 100000 ? 'growing' : ('stable' as 'growing' | 'stable' | 'declining'),
      }));

      const emergingLanguages = sortedLanguages.slice(5, 8).map(([name, stats]) => ({
        name,
        proficiencyLevel: Math.min(100, Math.round(stats.totalBytes / 20000 + stats.count * 3)),
        totalBytes: stats.totalBytes,
        repositoryCount: stats.count,
        recentUsage: true,
        trend: 'growing' as 'growing' | 'stable' | 'declining',
      }));

      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const recentRepos30 = repositories.filter(
        repo => repo.pushedAt != null && new Date(repo.pushedAt) > last30Days
      ).length;
      const recentRepos90 = repositories.filter(
        repo => repo.pushedAt != null && new Date(repo.pushedAt) > last90Days
      ).length;
      const recentReposYear = repositories.filter(
        repo => repo.pushedAt != null && new Date(repo.pushedAt) > lastYear
      ).length;

      const reputationScore = Math.min(
        100,
        Math.round(
          (userData.followers || 0) * 2 + totalStars * 3 + totalForks * 2 + publicRepositories
        )
      );

      const averageStarsPerRepo = repositories.length > 0 ? totalStars / repositories.length : 0;
      const portfolioQualityScore = Math.min(
        100,
        Math.round(
          averageStarsPerRepo * 20 +
          (repositories.filter(r => r.description != null && r.description.length > 10).length /
            repositories.length) *
          30 +
          (repositories.filter(r => r.homepageUrl != null).length / repositories.length) * 20 +
          (repositories.filter(r => r.readmeEnabled != null).length / repositories.length) * 30
        )
      );

      const oldestRepo = repositories.reduce((oldest, repo) => {
        return oldest == null || new Date(repo.createdAt) < new Date(oldest.createdAt)
          ? repo
          : oldest;
      }, repositories[0]);
      const activeYears =
        oldestRepo != null
          ? Math.max(1, new Date().getFullYear() - new Date(oldestRepo.createdAt).getFullYear())
          : 1;

      let careerLevel = 'Entry-Level';
      if (reputationScore > 70 && activeYears > 3 && primaryLanguages.length > 3) {
        careerLevel = 'Senior-Level';
      } else if (reputationScore > 40 && activeYears > 1 && primaryLanguages.length > 2) {
        careerLevel = 'Mid-Level';
      }

      const technologyLevels = {
        expert: primaryLanguages.filter(lang => lang.proficiencyLevel >= 80).length,
        advanced: primaryLanguages.filter(
          lang => lang.proficiencyLevel >= 60 && lang.proficiencyLevel < 80
        ).length,
        operational: primaryLanguages.filter(
          lang => lang.proficiencyLevel >= 40 && lang.proficiencyLevel < 60
        ).length,
      };

      const summary = {
        profile: {
          login: userData.login,
          name: userData.name ?? userData.login,
          bio: userData.bio ?? '',
          location: userData.location ?? '',
          company: userData.company ?? '',
          blog: userData.blog ?? '',
          email: userData.email ?? '',
          avatarUrl: userData.avatarUrl ?? '',

          reputationScore,
          influenceLevel:
            reputationScore > 70 ? 'Expert' : reputationScore > 40 ? 'Growing' : 'Emerging',
          expertiseAreas: primaryLanguages.slice(0, 3).map(lang => lang.name),

          totalContributions: repositories.length,
          activeYears,
          consistencyScore: Math.min(
            100,
            Math.round((recentReposYear / repositories.length) * 100)
          ),

          totalStars,
          totalForks,
          totalWatchers,

          careerLevel,
          specializations: primaryLanguages.slice(0, 2).map(lang => ({
            area: lang.name,
            level: lang.proficiencyLevel,
            yearsOfExperience: Math.min(activeYears, Math.round(lang.repositoryCount / 3)),
            confidence: Math.min(100, lang.proficiencyLevel),
          })),
        },

        portfolioOverview: {
          totalRepositories: repositories.length,
          publicRepositories,
          privateRepositories,
          contributedRepositories: repositories.filter(r => r.isFork).length,
          portfolioQualityScore,
          averageStarsPerRepo: Math.round(averageStarsPerRepo * 10) / 10,
          projectDiversityScore: Math.min(100, sortedLanguages.length * 10),
          totalLinesOfCode,
          organizationBreakdown,
          technologyLevels,
          projectTypes: {
            webApplications: repositories.filter(
              r =>
                r.primaryLanguage != null &&
                ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular'].includes(r.primaryLanguage)
            ).length,
            mobileApplications: repositories.filter(
              r =>
                r.primaryLanguage != null &&
                ['Swift', 'Kotlin', 'Java', 'React Native', 'Flutter'].includes(r.primaryLanguage)
            ).length,
            libraries: repositories.filter(
              r => r.topics.includes('library') || r.topics.includes('package')
            ).length,
            frameworks: repositories.filter(r => r.topics.includes('framework')).length,
            tools: repositories.filter(r => r.topics.includes('tool') || r.topics.includes('cli'))
              .length,
            games: repositories.filter(
              r => r.topics.includes('game') || r.topics.includes('gaming')
            ).length,
            aiMl: repositories.filter(r =>
              r.topics.some(topic =>
                ['ai', 'ml', 'machine-learning', 'tensorflow', 'pytorch'].includes(topic)
              )
            ).length,
            iot: repositories.filter(r => r.topics.includes('iot') || r.topics.includes('arduino'))
              .length,
            blockchain: repositories.filter(r =>
              r.topics.some(topic => ['blockchain', 'crypto', 'web3'].includes(topic))
            ).length,
            other: repositories.filter(r => r.topics.length === 0 && r.primaryLanguage == null)
              .length,
          },

          projectMaturity: {
            prototype: repositories.filter(r => r.stargazerCount === 0 && r.homepageUrl == null)
              .length,
            mvp: repositories.filter(r => r.stargazerCount > 0 && r.stargazerCount < 5).length,
            production: repositories.filter(r => r.stargazerCount >= 5 && r.homepageUrl != null)
              .length,
            mature: repositories.filter(r => r.stargazerCount >= 20).length,
            legacy: repositories.filter(r => {
              return (
                r.pushedAt != null &&
                new Date(r.pushedAt) < new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
              );
            }).length,
          },

          totalLanguages: sortedLanguages.length,
          primaryLanguages,
          emergingLanguages,

          recentActivity: {
            last30Days: {
              commits: Math.round(totalCommits * (recentRepos30 / repositories.length)),
              pullRequests: Math.round(totalPullRequests * 0.1),
              issues: Math.round(totalIssues * 0.1),
              repositories: recentRepos30,
            },
            last90Days: {
              commits: Math.round(totalCommits * (recentRepos90 / repositories.length)),
              pullRequests: Math.round(totalPullRequests * 0.3),
              issues: Math.round(totalIssues * 0.3),
              repositories: recentRepos90,
            },
            lastYear: {
              commits: totalCommits,
              pullRequests: totalPullRequests,
              issues: totalIssues,
              repositories: recentReposYear,
            },
          },

          productivityMetrics: {
            commitsPerDay: totalCommits / (activeYears * 365),
            averageCommitSize: 50,
            codeChurnRate: recentRepos30 / repositories.length,
            featureDeliveryRate: totalPullRequests / repositories.length,
            bugFixRate: totalIssues / repositories.length,
          },
        },

        technologyExpertise: {
          overallExpertiseScore: Math.round(
            primaryLanguages.reduce((sum, lang) => sum + lang.proficiencyLevel, 0) /
            primaryLanguages.length
          ),

          frontendExpertise: {
            score: Math.round(
              primaryLanguages
                .filter(l =>
                  ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'CSS', 'HTML'].includes(
                    l.name
                  )
                )
                .reduce((sum, l) => sum + l.proficiencyLevel, 0) /
              Math.max(
                1,
                primaryLanguages.filter(l =>
                  ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'CSS', 'HTML'].includes(
                    l.name
                  )
                ).length
              )
            ),
            dominantTechnologies: primaryLanguages
              .filter(l =>
                ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'CSS', 'HTML'].includes(
                  l.name
                )
              )
              .map(l => l.name),
            emergingInterests: emergingLanguages
              .filter(l => ['Svelte', 'Next.js', 'Nuxt.js'].includes(l.name))
              .map(l => l.name),
            marketabilityScore: 90,
          },

          backendExpertise: {
            score: Math.round(
              primaryLanguages
                .filter(l =>
                  ['Node.js', 'Python', 'Java', 'PHP', 'Go', 'Rust', 'C#'].includes(l.name)
                )
                .reduce((sum, l) => sum + l.proficiencyLevel, 0) /
              Math.max(
                1,
                primaryLanguages.filter(l =>
                  ['Node.js', 'Python', 'Java', 'PHP', 'Go', 'Rust', 'C#'].includes(l.name)
                ).length
              )
            ),
            dominantTechnologies: primaryLanguages
              .filter(l =>
                ['Node.js', 'Python', 'Java', 'PHP', 'Go', 'Rust', 'C#'].includes(l.name)
              )
              .map(l => l.name),
            emergingInterests: emergingLanguages
              .filter(l => ['Go', 'Rust', 'Deno'].includes(l.name))
              .map(l => l.name),
            marketabilityScore: 85,
          },

          mobileExpertise: {
            score:
              Math.round(
                primaryLanguages
                  .filter(l =>
                    ['Swift', 'Kotlin', 'Java', 'Flutter', 'React Native'].includes(l.name)
                  )
                  .reduce((sum, l) => sum + l.proficiencyLevel, 0) /
                Math.max(
                  1,
                  primaryLanguages.filter(l =>
                    ['Swift', 'Kotlin', 'Java', 'Flutter', 'React Native'].includes(l.name)
                  ).length
                )
              ) || 30,
            dominantTechnologies: primaryLanguages
              .filter(l => ['Swift', 'Kotlin', 'Java', 'Flutter', 'React Native'].includes(l.name))
              .map(l => l.name),
            emergingInterests: ['React Native', 'Flutter'],
            marketabilityScore: 70,
          },

          devOpsExpertise: {
            score:
              repositories.filter(r =>
                r.topics.some(topic => ['docker', 'kubernetes', 'ci-cd', 'devops'].includes(topic))
              ).length > 0
                ? 60
                : 30,
            dominantTechnologies: repositories.some(r => r.topics.includes('docker'))
              ? ['Docker']
              : [],
            emergingInterests: ['Kubernetes', 'GitHub Actions'],
            marketabilityScore: 95,
          },

          dataExpertise: {
            score:
              Math.round(
                primaryLanguages
                  .filter(l => ['Python', 'R', 'SQL', 'Scala'].includes(l.name))
                  .reduce((sum, l) => sum + l.proficiencyLevel, 0) /
                Math.max(
                  1,
                  primaryLanguages.filter(l => ['Python', 'R', 'SQL', 'Scala'].includes(l.name))
                    .length
                )
              ) || 40,
            dominantTechnologies: primaryLanguages
              .filter(l => ['Python', 'R', 'SQL', 'Scala'].includes(l.name))
              .map(l => l.name),
            emergingInterests: ['GraphQL', 'PostgreSQL'],
            marketabilityScore: 90,
          },

          aiMlExpertise: {
            score:
              repositories.filter(r =>
                r.topics.some(topic => ['ai', 'ml', 'tensorflow', 'pytorch'].includes(topic))
              ).length * 20,
            dominantTechnologies: [],
            emergingInterests: ['TensorFlow', 'PyTorch'],
            marketabilityScore: 100,
          },

          expertLevel: primaryLanguages
            .filter(l => l.proficiencyLevel >= 80)
            .map(lang => ({
              technology: lang.name,
              masteryLevel: lang.proficiencyLevel,
              yearsOfExperience: Math.min(activeYears, Math.round(lang.repositoryCount / 3)),
              projectCount: lang.repositoryCount,
              marketDemand: 'Very High' as const,
            })),

          advancedLevel: primaryLanguages
            .filter(l => l.proficiencyLevel >= 60 && l.proficiencyLevel < 80)
            .map(lang => ({
              technology: lang.name,
              masteryLevel: lang.proficiencyLevel,
              yearsOfExperience: Math.min(activeYears, Math.round(lang.repositoryCount / 4)),
              projectCount: lang.repositoryCount,
              marketDemand: 'High' as const,
            })),

          intermediateLevel: primaryLanguages
            .filter(l => l.proficiencyLevel >= 40 && l.proficiencyLevel < 60)
            .map(lang => ({
              technology: lang.name,
              masteryLevel: lang.proficiencyLevel,
              yearsOfExperience: Math.min(activeYears, Math.round(lang.repositoryCount / 5)),
              projectCount: lang.repositoryCount,
              marketDemand: 'Medium' as const,
            })),

          beginnerLevel: emergingLanguages
            .filter(l => l.proficiencyLevel < 40)
            .map(lang => ({
              technology: lang.name,
              masteryLevel: lang.proficiencyLevel,
              yearsOfExperience: 0,
              projectCount: lang.repositoryCount,
              marketDemand: 'Medium' as const,
            })),

          learningTrends: primaryLanguages
            .filter(l => l.trend === 'growing')
            .map(lang => ({
              technology: lang.name,
              progressRate: 1.5,
              learningVelocity: 'Accelerating' as const,
              futureRelevance: 95,
            })),

          recommendedTechnologies: ['Docker', 'AWS', 'GraphQL', 'Next.js', 'Prisma'],
        },

        devOpsMaturity: {
          devOpsScore:
            repositories.filter(r =>
              r.topics.some(topic => ['ci-cd', 'docker', 'kubernetes'].includes(topic))
            ).length > 0
              ? 70
              : 40,
          maturityLevel: 'Developing',
          cicdAdoption:
            repositories.filter(
              r => r.deployments != null && (r.deployments as { totalCount: number }).totalCount > 0
            ).length > 0
              ? 70
              : 30,
          testingMaturity: 60,
          securityMaturity: repositories.filter(r => r.securityPolicyEnabled != null).length * 20,
          monitoringMaturity: 30,
          automationScore: 45,
          workflowEfficiency: 55,
          codeQualityScore: Math.round(portfolioQualityScore * 0.8),
          documentationScore:
            (repositories.filter(r => r.readmeEnabled != null).length / repositories.length) * 100,
          bestPractices: [
            {
              practice: 'Version Control',
              adoptionLevel: 100,
              implementationQuality: 90,
              industryStandard: true,
            },
            {
              practice: 'Code Review',
              adoptionLevel: totalPullRequests > 10 ? 80 : 40,
              implementationQuality: 75,
              industryStandard: true,
            },
          ],
          improvementAreas: ['CI/CD Implementation', 'Security Scanning', 'Monitoring Setup'],
        },

        communityImpact: {
          impactScore: Math.round(reputationScore * 0.6),
          influenceRadius: userData.followers || 0,
          openSourceContributions: publicRepositories,
          maintainedProjects: repositories.filter(r => !r.isFork && !r.isArchived).length,
          issuesResolved: Math.round(totalIssues * 0.7),
          pullRequestsMerged: Math.round(totalPullRequests * 0.8),
          followersGrowth: {
            current: userData.followers || 0,
            sixMonthsAgo: Math.round((userData.followers || 0) * 0.8),
            oneYearAgo: Math.round((userData.followers || 0) * 0.6),
            growthRate: 25,
            trajectory: 'Steady' as const,
          },
          starsMilestones:
            totalStars > 0
              ? [
                {
                  type: 'First Star',
                  value: 1,
                  achievedAt: new Date(),
                  significance: totalStars > 10 ? 'Significant' : 'Minor',
                },
              ]
              : [],
          featuredProjects: repositories
            .sort((a, b) => b.stargazerCount - a.stargazerCount)
            .slice(0, 3)
            .filter(r => r.stargazerCount > 0)
            .map(repo => ({
              name: repo.name,
              description: repo.description ?? 'A notable project',
              stars: repo.stargazerCount,
              significance: repo.stargazerCount > 10 ? 'Growing impact' : 'Emerging project',
              technologies: [repo.primaryLanguage].filter(Boolean),
              impactScore: Math.min(100, repo.stargazerCount * 10),
            })),
          achievements: [
            {
              title: 'Getting Started',
              description: 'Created first repository',
              category: 'Milestone',
              rarity: 'Common',
              unlockedAt: new Date(oldestRepo?.createdAt ?? new Date()),
            },
          ],
          mentoringScore: Math.round((userData.followers || 0) / 5),
          leadershipIndicators: [
            {
              type: 'Technical Leadership',
              evidence: 'Maintains active repositories',
              strength: Math.min(100, publicRepositories * 5),
            },
          ],
        },

        growthInsights: {
          growthTrajectory: {
            direction: 'Upward',
            velocity: Math.min(2.0, recentRepos30 / 10),
            momentum: Math.min(100, reputationScore),
            sustainability: Math.min(100, (recentReposYear / repositories.length) * 100),
          },
          careerProgression: {
            currentLevel: careerLevel,
            yearsToNext: careerLevel === 'Entry-Level' ? 2 : careerLevel === 'Mid-Level' ? 3 : 5,
            progressToNext: Math.min(100, reputationScore),
            keyMilestones:
              careerLevel === 'Entry-Level'
                ? ['Build portfolio projects', 'Learn new technologies']
                : ['Lead a project', 'Mentor junior developers'],
          },
          activityTrends: [
            {
              metric: 'Commits',
              trend: recentRepos30 > recentRepos90 / 3 ? 'Increasing' : 'Stable',
              changeRate: 15,
              seasonality: false,
            },
          ],
          productivityTrends: [
            {
              period: 'Last Quarter',
              efficiency: Math.min(100, (recentRepos90 / repositories.length) * 100),
              quality: portfolioQualityScore,
              innovation: Math.min(100, emergingLanguages.length * 20),
            },
          ],
          technologyEvolution: [],
          skillProgression: [],
          futureGrowthPotential: Math.min(100, reputationScore + emergingLanguages.length * 10),
          recommendedFocusAreas:
            careerLevel === 'Entry-Level'
              ? ['Portfolio Building', 'Skill Development', 'Open Source Contribution']
              : ['DevOps Skills', 'System Design', 'Technical Leadership'],
        },

        recommendations: {
          careerRecommendations: [
            {
              type: 'Skill',
              title:
                primaryLanguages.length < 3
                  ? 'Learn Additional Programming Languages'
                  : 'Deepen Existing Skills',
              description:
                primaryLanguages.length < 3
                  ? 'Expand your technology stack'
                  : 'Become expert in your core technologies',
              priority: 'High',
              effort: 'Medium',
              timeline: '3 months',
              potentialImpact: 85,
            },
          ],
          technologyRecommendations: [
            {
              technology: emergingLanguages.length > 0 ? emergingLanguages[0].name : 'Docker',
              rationale: 'High growth potential technology',
              currentRelevance: 90,
              futureRelevance: 95,
              learningDifficulty: 'Medium',
              marketDemand: 'Very High',
            },
          ],
          projectRecommendations: [
            {
              type: 'Portfolio',
              title:
                repositories.filter(r => r.homepageUrl != null).length < 3
                  ? 'Build Deployed Applications'
                  : 'Contribute to Open Source',
              description:
                repositories.filter(r => r.homepageUrl != null).length < 3
                  ? 'Create projects with live demos'
                  : 'Build community reputation',
              technologies: primaryLanguages.slice(0, 3).map(l => l.name),
              estimatedImpact: 90,
              complexity: 'Medium',
            },
          ],
          learningRecommendations: [
            {
              topic: careerLevel === 'Entry-Level' ? 'Best Practices' : 'System Design',
              resources: ['Online courses', 'Books'],
              priority: 80,
              estimatedTime: '2 months',
              prerequisites: primaryLanguages.slice(0, 1).map(l => l.name),
            },
          ],
          communityRecommendations: [
            {
              type: 'Contribution',
              title: totalStars < 10 ? 'Build Notable Projects' : 'Contribute to OSS',
              description:
                totalStars < 10
                  ? 'Create projects that attract stars'
                  : 'Build community reputation',
              potentialImpact: 75,
            },
          ],
        },

        industryBenchmarks: {
          overallPercentile: Math.min(95, Math.round(reputationScore)),
          categoryPercentiles: [
            {
              category: 'Technical Skills',
              percentile: Math.min(
                95,
                Math.round(
                  primaryLanguages.reduce((sum, l) => sum + l.proficiencyLevel, 0) /
                  primaryLanguages.length
                )
              ),
              rank:
                primaryLanguages.reduce((sum, l) => sum + l.proficiencyLevel, 0) /
                  primaryLanguages.length >
                  70
                  ? 'Above Average'
                  : 'Average',
            },
            {
              category: 'Community Impact',
              percentile: Math.min(95, Math.round((userData.followers || 0) * 10 + totalStars * 5)),
              rank: totalStars > 20 ? 'Above Average' : 'Average',
            },
          ],
          industryComparisons: [
            {
              industry: 'Web Development',
              position: primaryLanguages.some(l => ['JavaScript', 'TypeScript'].includes(l.name))
                ? 'Above Average'
                : 'Average',
              metrics: {
                avgSkillLevel: Math.round(
                  primaryLanguages.reduce((sum, l) => sum + l.proficiencyLevel, 0) /
                  primaryLanguages.length
                ),
                avgContributions: repositories.length,
              },
            },
          ],
          marketPosition: {
            overallRank:
              reputationScore > 70 ? 'Top 25%' : reputationScore > 40 ? 'Top 50%' : 'Average',
            strengths: primaryLanguages.slice(0, 2).map(l => `${l.name} Development`),
            differentiators: [
              repositories.length > 20 ? 'Prolific contributor' : 'Active developer',
              primaryLanguages.length > 3 ? 'Multi-technology expertise' : 'Focused specialization',
            ],
            marketValue:
              careerLevel === 'Senior-Level'
                ? 'High'
                : careerLevel === 'Mid-Level'
                  ? 'Mid'
                  : 'Entry',
          },
          competitiveAdvantages: primaryLanguages.slice(0, 2).map(l => `Strong ${l.name} skills`),
          industryTrends: [
            {
              technology: 'TypeScript',
              trend: primaryLanguages.some(l => l.name === 'TypeScript') ? 'Adopted' : 'Growing',
              adoptionRate: 85,
              futureOutlook: 'Promising',
            },
            {
              technology: 'AI/ML',
              trend: repositories.some(r => r.topics.some(t => ['ai', 'ml'].includes(t)))
                ? 'Adopted'
                : 'Emerging',
              adoptionRate: 45,
              futureOutlook: 'Promising',
            },
          ],
        },

        interfaceMetrics: {
          projects: repositories.length,
          commits: totalCommits,
          technologies: sortedLanguages.length,
          activeProjects: recentRepos30,
          projectsAnalyzed: repositories.length,
          totalLinesOfCode,
          totalStars,
          totalForks,
          organizationBreakdown: {
            personal: {
              count: organizationBreakdown.personal,
              percentage:
                repositories.length > 0
                  ? Math.round((organizationBreakdown.personal / repositories.length) * 100)
                  : 0,
            },
            organization: {
              count: organizationBreakdown.organization,
              percentage:
                repositories.length > 0
                  ? Math.round((organizationBreakdown.organization / repositories.length) * 100)
                  : 0,
            },
            school: {
              count: organizationBreakdown.school,
              percentage:
                repositories.length > 0
                  ? Math.round((organizationBreakdown.school / repositories.length) * 100)
                  : 0,
            },
          },
          technologyLevels: {
            expert: technologyLevels.expert,
            advanced: technologyLevels.advanced,
            operational: technologyLevels.operational,
          },
          averageScore: Math.round(
            primaryLanguages.reduce((sum, l) => sum + l.proficiencyLevel, 0) /
            Math.max(1, primaryLanguages.length)
          ),
          topRepositories: repositories
            .sort((a, b) => b.stargazerCount - a.stargazerCount)
            .slice(0, 10)
            .map(repo => ({
              name: repo.name,
              description: repo.description ?? 'No description',
              category:
                organizationBreakdown.personal > 0 &&
                  repo.owner != null &&
                  typeof repo.owner === 'object' &&
                  (repo.owner as { type?: string }).type === 'User'
                  ? 'Personal'
                  : 'Organization',
              stars: repo.stargazerCount,
              forks: repo.forkCount,
              languages: repo.primaryLanguage != null ? [repo.primaryLanguage] : [],
              lastUpdate: repo.updatedAt,
              source: 'GitHub',
            })),
        },

        metadata: {
          generatedAt: new Date(),
          dataFreshness: {
            userProfile: new Date(userData.updatedAt),
            repositories: new Date(),
            overallFreshness: 'Recent',
            recommendedUpdate: false,
          },
          analysisVersion: '2.0.0',
          computationTime: Date.now() - startTime,
          dataCompleteness: repositories.length > 0 ? 95 : 50,
          confidenceScore: repositories.length > 5 ? 90 : 60,
          dataSources: [
            {
              name: 'GitHub Profile',
              lastUpdated: new Date(userData.updatedAt),
              completeness: 95,
              reliability: 98,
            },
            {
              name: 'GitHub Repositories',
              lastUpdated: new Date(),
              completeness: repositories.length > 0 ? 98 : 0,
              reliability: 99,
            },
          ],
          analysisParameters: {
            includePrimaryLanguagesOnly: false,
            minimumStarsThreshold: 0,
            timeRangeMonths: 12,
            includeForkedRepos: true,
            weightingStrategy: 'Metrics-Based',
          },
        },
      };

      logWithContext.api('get_developer_summary_success', req.path, true, {
        targetUsername: username,
        computationTime: Date.now() - startTime,
        repositoriesAnalyzed: repositories.length,
        totalStars,
        totalLanguages: sortedLanguages.length,
      });

      res.status(200).json({
        summary,
        generatedAt: new Date().toISOString(),
        computationTime: Date.now() - startTime,
        accessLevel: authenticatedUser?.username === username ? 'complete' : 'public',
        timestamp: new Date().toISOString(),
        dataSource: 'realtime',
        repositoriesAnalyzed: repositories.length,
      });
    } catch (error) {
      logWithContext.api('get_developer_summary_error', req.path, false, {
        targetUsername: username,
        error: String(error),
      });
      throw error;
    }
  });
}

export default SummaryController;
