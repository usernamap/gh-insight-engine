import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
export declare class DatabaseConfig {
    private prismaClient;
    private mongooseConnection;
    private isConnected;
    initialize(): Promise<void>;
    private initializePrisma;
    private initializeMongoose;
    healthCheck(): Promise<{
        prisma: boolean;
        mongoose: boolean;
        overall: boolean;
    }>;
    transaction<T>(operations: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    createIndexes(): Promise<void>;
    cleanup(): Promise<void>;
    cleanupTestData(): Promise<void>;
    private sanitizeUrl;
    getPrismaClient(): PrismaClient | null;
    getMongooseConnection(): mongoose.Connection | null;
    getConnectionStatus(): boolean;
    findMany<T>(model: string, options?: any): Promise<T[]>;
    findUnique<T>(model: string, where: any): Promise<T | null>;
    create<T>(model: string, data: any): Promise<T>;
    update<T>(model: string, where: any, data: any): Promise<T>;
    delete<T>(model: string, where: any): Promise<T>;
}
export declare const databaseConfig: DatabaseConfig;
export default databaseConfig;
//# sourceMappingURL=database.d.ts.map