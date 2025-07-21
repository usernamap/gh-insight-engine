"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
class AnalyticsService {
    async generateAnalyticsOverview(userProfile, repositories, timeframe) {
        const startTime = Date.now();
        try {
            logger_1.default.info('Démarrage génération analytics', {
                username: userProfile.login,
                repositoriesCount: repositories.length,
            });
            const [performance, productivity, languages, activity, complexity, devops, collaboration] = await Promise.all([
                this.calculatePerformanceMetrics(userProfile, repositories, timeframe),
                this.calculateProductivityScore(userProfile, repositories, timeframe),
                this.analyzeLanguages(repositories),
                this.analyzeActivityPatterns(repositories, timeframe),
                this.analyzeProjectComplexity(repositories),
                this.analyzeDevOpsMaturity(repositories),
                this.analyzeCollaborationMetrics(userProfile, repositories),
            ]);
            const analytics = {
                userId: userProfile._id || '',
                generatedAt: new Date(),
                timeframe: timeframe || {
                    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
                    end: new Date(),
                    totalDays: 365,
                },
                performance,
                productivity,
                languages,
                activity,
                complexity,
                devops,
                collaboration,
            };
            const processingTime = (Date.now() - startTime) / 1000;
            logger_1.default.info('Analytics générées avec succès', {
                username: userProfile.login,
                processingTime: `${processingTime}s`,
            });
            return analytics;
        }
        catch (error) {
            logger_1.default.error('Erreur génération analytics', {
                username: userProfile.login,
                error: error.message,
            });
            throw new Error(`Génération analytics échouée: ${error.message}`);
        }
    }
    async calculatePerformanceMetrics(userProfile, repositories, timeframe) {
        try {
            const allCommits = repositories.flatMap(repo => repo.commits.recent);
            const relevantCommits = timeframe ?
                allCommits.filter(commit => {
                    const commitDate = new Date(commit.committedDate);
                    return commitDate >= timeframe.start && commitDate <= timeframe.end;
                }) : allCommits;
            const now = new Date();
            const commitFrequency = {
                daily: this.calculateCommitFrequency(relevantCommits, 1),
                weekly: this.calculateCommitFrequency(relevantCommits, 7),
                monthly: this.calculateCommitFrequency(relevantCommits, 30),
                yearly: this.calculateCommitFrequency(relevantCommits, 365),
            };
            const averageCommitSize = relevantCommits.length > 0 ?
                relevantCommits.reduce((sum, commit) => sum + (commit.additions || 0) + (commit.deletions || 0), 0) / relevantCommits.length : 0;
            const commitMessageQuality = this.analyzeCommitMessageQuality(relevantCommits);
            const branchingStrategy = this.detectBranchingStrategy(repositories);
            const pullRequestRatio = this.calculatePullRequestRatio(repositories, relevantCommits);
            const codeReviewParticipation = this.calculateCodeReviewParticipation(repositories);
            const issueResolutionTime = this.calculateAverageIssueResolutionTime(repositories);
            return {
                commitFrequency,
                codeQuality: {
                    averageCommitSize: Math.round(averageCommitSize),
                    commitMessageQuality,
                    branchingStrategy,
                },
                collaboration: {
                    pullRequestRatio,
                    codeReviewParticipation,
                    issueResolutionTime,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Erreur calcul métriques performance', { error: error.message });
            throw error;
        }
    }
    async calculateProductivityScore(userProfile, repositories, timeframe) {
        try {
            const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
            const totalForks = repositories.reduce((sum, repo) => sum + repo.forkCount, 0);
            const totalCommits = repositories.reduce((sum, repo) => sum + repo.commits.totalCount, 0);
            const activeRepos = repositories.filter(repo => !repo.isArchived).length;
            const consistency = this.calculateConsistencyScore(repositories);
            const volume = Math.min(100, Math.round((totalCommits / 100) * 20 + (activeRepos / 10) * 30));
            const impact = Math.min(100, Math.round((totalStars / 50) * 40 + (totalForks / 20) * 60));
            const recentActivity = repositories.filter(repo => {
                const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                return lastPush > sixMonthsAgo;
            }).length;
            const maintenance = Math.min(100, Math.round((recentActivity / repositories.length) * 100));
            const overall = Math.round(consistency * 0.25 +
                volume * 0.25 +
                impact * 0.25 +
                maintenance * 0.25);
            const trend = this.detectProductivityTrend(repositories);
            const benchmarkPercentile = this.calculateBenchmarkPercentile(overall, totalStars, totalCommits);
            return {
                overall,
                breakdown: {
                    consistency,
                    volume,
                    impact,
                    maintenance,
                },
                trend,
                benchmarkPercentile,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur calcul score productivité', { error: error.message });
            throw error;
        }
    }
    async analyzeLanguages(repositories) {
        try {
            const languageStats = {};
            repositories.forEach(repo => {
                if (repo.primaryLanguage) {
                    if (!languageStats[repo.primaryLanguage]) {
                        languageStats[repo.primaryLanguage] = {
                            count: 0,
                            totalSize: 0,
                            repositories: [],
                        };
                    }
                    languageStats[repo.primaryLanguage].count++;
                    languageStats[repo.primaryLanguage].repositories.push(repo.nameWithOwner);
                }
                repo.languages.nodes.forEach(lang => {
                    if (!languageStats[lang.name]) {
                        languageStats[lang.name] = {
                            count: 0,
                            totalSize: 0,
                            repositories: [],
                        };
                    }
                    languageStats[lang.name].totalSize += lang.size;
                    if (!languageStats[lang.name].repositories.includes(repo.nameWithOwner)) {
                        languageStats[lang.name].repositories.push(repo.nameWithOwner);
                    }
                });
            });
            const totalSize = Object.values(languageStats).reduce((sum, stat) => sum + stat.totalSize, 0);
            const distribution = Object.entries(languageStats)
                .map(([language, stat]) => ({
                language,
                percentage: Math.round((stat.totalSize / totalSize) * 100),
                linesOfCode: stat.totalSize,
                repositoriesCount: stat.repositories.length,
                proficiencyScore: this.calculateLanguageProficiency(language, stat.count, stat.totalSize),
            }))
                .sort((a, b) => b.percentage - a.percentage);
            const primary = distribution[0]?.language || 'Unknown';
            const trends = this.analyzeLanguageTrends(repositories);
            const expertise = this.classifyLanguageExpertise(distribution);
            return {
                primary,
                distribution,
                trends,
                expertise,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse langages', { error: error.message });
            throw error;
        }
    }
    async analyzeActivityPatterns(repositories, timeframe) {
        try {
            const allCommits = repositories.flatMap(repo => repo.commits.recent);
            const hourlyDistribution = this.calculateHourlyDistribution(allCommits);
            const dailyDistribution = this.calculateDailyDistribution(allCommits);
            const monthlyDistribution = this.calculateMonthlyDistribution(repositories);
            const seasonality = this.analyzeSeasonality(allCommits);
            return {
                hourlyDistribution,
                dailyDistribution,
                monthlyDistribution,
                seasonality,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse patterns d\'activité', { error: error.message });
            throw error;
        }
    }
    async analyzeProjectComplexity(repositories) {
        try {
            let simple = 0;
            let moderate = 0;
            let complex = 0;
            let enterprise = 0;
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const maintainedProjects = repositories.filter(repo => {
                const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
                return lastPush > sixMonthsAgo;
            }).length;
            repositories.forEach(repo => {
                const commitCount = repo.commits.totalCount;
                const languageCount = repo.languages.nodes.length;
                const hasCI = !!repo.githubActions?.workflowsCount;
                const hasSecurity = !!repo.security;
                const isTeamProject = repo.forkCount > 5 || repo.stargazerCount > 20;
                if (commitCount < 10 && languageCount <= 1) {
                    simple++;
                }
                else if (commitCount < 100 && languageCount <= 3) {
                    moderate++;
                }
                else if (commitCount < 1000 && languageCount > 3) {
                    complex++;
                }
                else if (commitCount >= 1000 && (hasCI || hasSecurity || isTeamProject)) {
                    enterprise++;
                }
                else {
                    complex++;
                }
            });
            const total = repositories.length;
            const averageComplexity = total > 0 ?
                Math.round(((simple * 25) + (moderate * 50) + (complex * 75) + (enterprise * 100)) / total) : 0;
            return {
                simple,
                moderate,
                complex,
                enterprise,
                averageComplexity,
                maintainedProjects,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse complexité projets', { error: error.message });
            throw error;
        }
    }
    async analyzeDevOpsMaturity(repositories) {
        try {
            const totalRepos = repositories.length;
            if (totalRepos === 0) {
                return {
                    cicdAdoption: 0,
                    testingCulture: 0,
                    securityPractices: 0,
                    documentationQuality: 0,
                    communityEngagement: 0,
                    overallMaturity: 'beginner',
                };
            }
            const reposWithCI = repositories.filter(repo => repo.githubActions?.workflowsCount > 0).length;
            const cicdAdoption = Math.round((reposWithCI / totalRepos) * 100);
            const reposWithTests = repositories.filter(repo => repo.githubActions?.workflows?.some(workflow => workflow.name.toLowerCase().includes('test') ||
                workflow.name.toLowerCase().includes('ci'))).length;
            const testingCulture = Math.round((reposWithTests / totalRepos) * 100);
            const reposWithSecurity = repositories.filter(repo => repo.security?.dependabotAlerts.totalCount > 0 ||
                repo.security?.hasSecurityPolicy ||
                repo.branchProtection?.rules.length > 0).length;
            const securityPractices = Math.round((reposWithSecurity / totalRepos) * 100);
            const reposWithDocs = repositories.filter(repo => repo.community?.hasReadme ||
                repo.community?.hasContributing ||
                repo.hasWikiEnabled).length;
            const documentationQuality = Math.round((reposWithDocs / totalRepos) * 100);
            const reposWithEngagement = repositories.filter(repo => repo.stargazerCount > 0 ||
                repo.forkCount > 0 ||
                repo.issues.totalCount > 0).length;
            const communityEngagement = Math.round((reposWithEngagement / totalRepos) * 100);
            const overallScore = (cicdAdoption + testingCulture + securityPractices +
                documentationQuality + communityEngagement) / 5;
            let overallMaturity;
            if (overallScore >= 80)
                overallMaturity = 'expert';
            else if (overallScore >= 60)
                overallMaturity = 'advanced';
            else if (overallScore >= 40)
                overallMaturity = 'intermediate';
            else
                overallMaturity = 'beginner';
            return {
                cicdAdoption,
                testingCulture,
                securityPractices,
                documentationQuality,
                communityEngagement,
                overallMaturity,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse maturité DevOps', { error: error.message });
            throw error;
        }
    }
    async analyzeCollaborationMetrics(userProfile, repositories) {
        try {
            const teamProjects = repositories.filter(repo => repo.forkCount > 0 || repo.stargazerCount > 5 || repo.collaborators.totalCount > 1).length;
            const soloProjects = repositories.length - teamProjects;
            const contributionsToOthers = repositories.filter(repo => repo.isFork && repo.commits.totalCount > 0).length;
            const pullRequestsReceived = repositories.reduce((sum, repo) => sum + repo.pullRequests.totalCount, 0);
            const pullRequestsMade = contributionsToOthers * 2;
            const codeReviewsGiven = Math.round(pullRequestsReceived * 0.3);
            const mentorshipActivity = this.calculateMentorshipScore(userProfile, repositories);
            const leadershipScore = this.calculateLeadershipScore(userProfile, repositories);
            return {
                teamProjects,
                soloProjects,
                contributionsToOthers,
                pullRequestsReceived,
                pullRequestsMade,
                codeReviewsGiven,
                mentorshipActivity,
                leadershipScore,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse métriques collaboration', { error: error.message });
            throw error;
        }
    }
    calculateCommitFrequency(commits, days) {
        if (commits.length === 0)
            return 0;
        const now = new Date();
        const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        const recentCommits = commits.filter(commit => {
            const commitDate = new Date(commit.committedDate);
            return commitDate >= startDate;
        });
        return Math.round((recentCommits.length / days) * 10) / 10;
    }
    analyzeCommitMessageQuality(commits) {
        if (commits.length === 0)
            return 0;
        const qualityScore = commits.reduce((score, commit) => {
            const message = commit.message || '';
            let points = 0;
            if (message.length >= 20 && message.length <= 100)
                points += 30;
            if (/^(feat|fix|docs|style|refactor|test|chore)[:(\[]/.test(message.toLowerCase())) {
                points += 40;
            }
            if (message !== message.toUpperCase())
                points += 10;
            if (!/^(update|fix|wip|tmp|test)$/i.test(message.trim()))
                points += 20;
            return score + Math.min(points, 100);
        }, 0);
        return Math.round(qualityScore / commits.length);
    }
    detectBranchingStrategy(repositories) {
        const mainBranches = repositories.map(repo => repo.defaultBranchRef).filter(Boolean);
        const hasMain = mainBranches.some(branch => branch === 'main');
        const hasMaster = mainBranches.some(branch => branch === 'master');
        const hasDevelop = repositories.some(repo => repo.branchProtection?.rules.some(rule => rule.pattern.includes('develop')));
        if (hasDevelop)
            return 'gitflow';
        if (hasMain || hasMaster)
            return 'feature';
        return 'mixed';
    }
    calculatePullRequestRatio(repositories, commits) {
        const totalPRs = repositories.reduce((sum, repo) => sum + repo.pullRequests.totalCount, 0);
        const totalCommits = commits.length;
        return totalCommits > 0 ? Math.round((totalPRs / totalCommits) * 100) / 100 : 0;
    }
    calculateCodeReviewParticipation(repositories) {
        const reposWithPRs = repositories.filter(repo => repo.pullRequests.totalCount > 0).length;
        const reposWithReviewRules = repositories.filter(repo => repo.branchProtection?.rules.some(rule => rule.requiresCodeOwnerReviews)).length;
        const total = repositories.length;
        if (total === 0)
            return 0;
        return Math.round(((reposWithPRs + reposWithReviewRules) / (total * 2)) * 100);
    }
    calculateAverageIssueResolutionTime(repositories) {
        const totalIssues = repositories.reduce((sum, repo) => sum + repo.issues.totalCount, 0);
        const openIssues = repositories.reduce((sum, repo) => sum + repo.issues.openCount, 0);
        if (totalIssues === 0)
            return 0;
        const closureRate = (totalIssues - openIssues) / totalIssues;
        return Math.round((1 - closureRate) * 30);
    }
    calculateConsistencyScore(repositories) {
        if (repositories.length === 0)
            return 0;
        const now = new Date();
        const recentlyActive = repositories.filter(repo => {
            const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
            const monthsAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            return lastPush > monthsAgo;
        }).length;
        return Math.round((recentlyActive / repositories.length) * 100);
    }
    detectProductivityTrend(repositories) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
        const oneYearAgo = new Date(now.getTime() - (12 * 30 * 24 * 60 * 60 * 1000));
        const recentActivity = repositories.filter(repo => {
            const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
            return lastPush > sixMonthsAgo;
        }).length;
        const oldActivity = repositories.filter(repo => {
            const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
            return lastPush > oneYearAgo && lastPush <= sixMonthsAgo;
        }).length;
        if (recentActivity > oldActivity * 1.2)
            return 'increasing';
        if (recentActivity < oldActivity * 0.8)
            return 'decreasing';
        return 'stable';
    }
    calculateBenchmarkPercentile(overall, stars, commits) {
        let percentile = 50;
        if (overall > 80)
            percentile += 30;
        else if (overall > 60)
            percentile += 15;
        else if (overall < 40)
            percentile -= 15;
        if (stars > 100)
            percentile += 15;
        else if (stars > 10)
            percentile += 5;
        if (commits > 1000)
            percentile += 10;
        else if (commits > 100)
            percentile += 5;
        return Math.min(95, Math.max(5, percentile));
    }
    calculateLanguageProficiency(language, repoCount, totalSize) {
        let score = 0;
        score += Math.min(repoCount * 15, 60);
        if (totalSize > 100000)
            score += 30;
        else if (totalSize > 10000)
            score += 20;
        else if (totalSize > 1000)
            score += 10;
        const popularLanguages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'C#', 'Go', 'Rust'];
        if (popularLanguages.includes(language))
            score += 10;
        return Math.min(100, score);
    }
    analyzeLanguageTrends(repositories) {
        const languageActivity = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        repositories.forEach(repo => {
            if (repo.primaryLanguage) {
                if (!languageActivity[repo.primaryLanguage]) {
                    languageActivity[repo.primaryLanguage] = { recent: 0, total: 0 };
                }
                languageActivity[repo.primaryLanguage].total++;
                if (repo.pushedAt && new Date(repo.pushedAt) > sixMonthsAgo) {
                    languageActivity[repo.primaryLanguage].recent++;
                }
            }
        });
        return Object.entries(languageActivity)
            .map(([language, activity]) => {
            const ratio = activity.recent / activity.total;
            let trend;
            let monthlyGrowth;
            if (ratio > 0.7) {
                trend = 'rising';
                monthlyGrowth = Math.round(ratio * 20);
            }
            else if (ratio < 0.3) {
                trend = 'declining';
                monthlyGrowth = Math.round((ratio - 0.5) * 20);
            }
            else {
                trend = 'stable';
                monthlyGrowth = 0;
            }
            return { language, trend, monthlyGrowth };
        })
            .slice(0, 10);
    }
    classifyLanguageExpertise(distribution) {
        const expertise = {
            beginner: [],
            intermediate: [],
            advanced: [],
            expert: [],
        };
        distribution.forEach(lang => {
            if (lang.proficiencyScore >= 80) {
                expertise.expert.push(lang.language);
            }
            else if (lang.proficiencyScore >= 60) {
                expertise.advanced.push(lang.language);
            }
            else if (lang.proficiencyScore >= 30) {
                expertise.intermediate.push(lang.language);
            }
            else {
                expertise.beginner.push(lang.language);
            }
        });
        return expertise;
    }
    calculateHourlyDistribution(commits) {
        const hourlyStats = new Array(24).fill(0);
        commits.forEach(commit => {
            const hour = new Date(commit.committedDate).getHours();
            hourlyStats[hour]++;
        });
        const maxCommits = Math.max(...hourlyStats);
        return hourlyStats.map((commits, hour) => ({
            hour,
            commits,
            intensity: commits === 0 ? 'low' :
                commits < maxCommits * 0.3 ? 'low' :
                    commits < maxCommits * 0.7 ? 'medium' : 'high'
        }));
    }
    calculateDailyDistribution(commits) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dailyStats = new Array(7).fill(0);
        commits.forEach(commit => {
            const dayIndex = new Date(commit.committedDate).getDay();
            dailyStats[dayIndex]++;
        });
        const maxCommits = Math.max(...dailyStats);
        return dailyStats.map((commits, index) => ({
            day: days[index],
            commits,
            intensity: commits === 0 ? 'low' :
                commits < maxCommits * 0.3 ? 'low' :
                    commits < maxCommits * 0.7 ? 'medium' : 'high'
        }));
    }
    calculateMonthlyDistribution(repositories) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months.map((month, index) => ({
            month,
            commits: Math.floor(Math.random() * 50) + 10,
            repositories: Math.floor(repositories.length / 12),
            newProjects: Math.floor(Math.random() * 3),
        }));
    }
    analyzeSeasonality(commits) {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const quarterCounts = [0, 0, 0, 0];
        commits.forEach(commit => {
            const month = new Date(commit.committedDate).getMonth();
            const quarter = Math.floor(month / 3);
            quarterCounts[quarter]++;
        });
        const maxQuarter = quarterCounts.indexOf(Math.max(...quarterCounts));
        const mostActiveQuarter = quarters[maxQuarter];
        const avg = quarterCounts.reduce((sum, count) => sum + count, 0) / 4;
        const variance = quarterCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 4;
        const consistency = Math.max(0, 100 - Math.round(Math.sqrt(variance) / avg * 100));
        return {
            mostActiveQuarter,
            consistency,
            vacationPeriods: [],
        };
    }
    calculateMentorshipScore(userProfile, repositories) {
        const publicRepos = repositories.filter(repo => !repo.isPrivate).length;
        const docsRepos = repositories.filter(repo => repo.community?.hasReadme || repo.community?.hasContributing).length;
        const starredRepos = repositories.filter(repo => repo.stargazerCount > 0).length;
        return Math.min(100, Math.round((publicRepos * 10 + docsRepos * 20 + starredRepos * 15) / 3));
    }
    calculateLeadershipScore(userProfile, repositories) {
        const ownedRepos = repositories.filter(repo => !repo.isFork).length;
        const popularRepos = repositories.filter(repo => repo.stargazerCount > 5).length;
        const teamRepos = repositories.filter(repo => repo.collaborators.totalCount > 1).length;
        return Math.min(100, Math.round((ownedRepos * 15 + popularRepos * 25 + teamRepos * 20) / 3));
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=AnalyticsService.js.map