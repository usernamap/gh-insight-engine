# Décision d'architecture : Signature de la méthode transaction (Prisma)

## Date : 2024-05-10

### Contexte
La méthode `transaction` de la classe `DatabaseConfig` doit permettre l'exécution de transactions Prisma dans tout le codebase, notamment pour les opérations atomiques sur plusieurs modèles.

### Décision
- La signature de la méthode est : `(prisma: PrismaClient) => Promise<T>`
- Le paramètre `prisma` est requis par l'API transactionnelle de Prisma et par les usages transactionnels du codebase (ex : suppression atomique d'un utilisateur et de ses dépendances).
- Même si le paramètre `prisma` n'est pas utilisé dans l'implémentation directe de la méthode, il doit être conservé pour garantir la compatibilité avec tous les usages transactionnels.
- Un éventuel warning ESLint sur le paramètre non utilisé est accepté et documenté, car il garantit la robustesse et la sécurité transactionnelle du projet.

### Justification
- Compatibilité stricte avec Prisma et tous les usages transactionnels du codebase.
- Sécurité et atomicité des opérations critiques (ex : suppression en cascade).
- Auditabilité et traçabilité de la décision pour toute évolution future.

---
_Décision prise et documentée pour garantir la cohérence, la robustesse et la maintenabilité du projet._ 