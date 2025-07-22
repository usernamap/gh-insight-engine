import { User as PrismaUser } from '@/generated/prisma';
import { UserProfile } from '@/types/github';
export declare class UserModel {
    static create(userData: UserProfile): Promise<PrismaUser>;
    static findByLogin(login: string): Promise<PrismaUser | null>;
    static findById(id: string): Promise<PrismaUser | null>;
    static update(id: string, updateData: Partial<UserProfile>): Promise<PrismaUser>;
    static delete(id: string): Promise<void>;
    static search(filters: {
        search?: string;
        location?: string;
        company?: string;
        minFollowers?: number;
        maxFollowers?: number;
        limit?: number;
        offset?: number;
    }): Promise<{
        users: PrismaUser[];
        total: number;
    }>;
    static getStats(): Promise<{
        totalUsers: number;
        totalRepositories: number;
        averageFollowers: number;
        topLanguages: Array<{
            language: string;
            count: number;
        }>;
    }>;
    static exists(login: string): Promise<boolean>;
    static upsert(userData: UserProfile): Promise<PrismaUser>;
}
//# sourceMappingURL=User.d.ts.map