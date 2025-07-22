/**
 * Index des modèles - Export centralisé
 * Point d'entrée unique pour tous les modèles de données
 */

export { UserModel } from './User';
export { RepositoryModel } from './Repository';
export { DatasetModel } from './Dataset';

// Re-export des types Prisma pour commodité
export type {
  User as PrismaUser,
  Repository as PrismaRepository,
  Dataset as PrismaDataset,
} from '@prisma/client';
