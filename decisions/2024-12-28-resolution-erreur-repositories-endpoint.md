# Résolution erreur "Cannot read properties of undefined" dans endpoints repositories

**Date:** 2024-12-28  
**Type:** Correction critique  
**Impact:** Endpoint GET `/api/repositories/{username}` inaccessible  

## 🚨 Problème identifié

### Erreur observée
```
Cannot read properties of undefined (reading 'totalCount')
at RepoController.ts:334:67
at calculateAnalyticsFromStoredData()
```

### Cause racine
Les anciens datasets contenaient des **ObjectIds sous forme de chaînes** au lieu d'objets JSON complets dans le champ `repositories`. 

**Workflow défaillant :**
1. Ancienne méthode `DatasetModel.upsert()` stockait incorrectement les repositories
2. Schema Prisma attendait `repositories: String[] @db.ObjectId` (références)
3. Mais le code essayait de parser ces ObjectIds comme JSON
4. Parsing échoue → objets vides `{}` 
5. `calculateAnalyticsFromStoredData()` accède à `repo.issues.totalCount`
6. `repo.issues` est `undefined` → **CRASH**

## 🔧 Solutions implémentées

### 1. Gestion défensive dans `calculateAnalyticsFromStoredData()`

**Avant :**
```typescript
totalIssues: repositories.reduce((sum, r) => sum + r.issues.totalCount, 0)
```

**Après :**
```typescript
// Filtrer les repositories valides
const validRepositories = repositories.filter((repo): repo is GitHubRepo =>
  Boolean(repo) &&
  typeof repo === 'object' &&
  'nameWithOwner' in repo &&
  typeof repo.nameWithOwner === 'string' &&
  'stargazerCount' in repo &&
  typeof repo.stargazerCount === 'number',
);

// Protection avec optional chaining
totalIssues: validRepositories.reduce((sum, r) => sum + (r.issues?.totalCount || 0), 0),
```

### 2. Script de nettoyage des datasets corrompus

**Fichier:** `scripts/clean-corrupted-datasets.cjs`

**Fonctionnalités :**
- Identifie automatiquement les datasets corrompus
- Mode `--dry-run` pour inspection sans suppression  
- Mode `--force` pour suppression effective
- Statistiques détaillées

**Résultat :**
```bash
npm run clean:datasets -- --dry-run
# ❌ 1 datasets corrompus identifiés (159 repositories)

npm run clean:datasets -- --force  
# ✅ 1 datasets corrompus supprimés avec succès !
```

## 📊 Résultats

### Impact des corrections
- ✅ **Endpoint GET `/api/repositories/{username}` fonctionnel**
- ✅ **Gestion robuste des données corrompues**
- ✅ **Base de données nettoyée**
- ✅ **Prévention des futures corruptions**

### Statistiques par défaut si aucun repository valide
```typescript
{
  totalStats: {
    totalRepositories: 0,
    totalStars: 0,
    // ... autres stats à 0
  },
  languageAnalytics: {},
  topicsAnalytics: {},
  devOpsMaturity: { /* tous à 0 */ }
}
```

## 🛡️ Prévention future

### Architecture corrigée
1. **UserController** utilise `DatabaseService.saveCompleteUserDataset()`
2. **RepoController** utilise `RepositoryModel.upsert()` pour repositories individuels
3. **Suppression** de `DatasetModel.upsert()` incompatible

### Validation continue
- Script de nettoyage disponible : `npm run clean:datasets`
- Gestion défensive dans toutes les méthodes d'analytics
- Protection avec optional chaining systématique

## 🔗 Fichiers modifiés

- `src/controllers/RepoController.ts` - Gestion défensive
- `scripts/clean-corrupted-datasets.cjs` - Script de nettoyage  
- `package.json` - Ajout script `clean:datasets`

## 📈 Métriques

**Avant :** 
- 1 dataset corrompu (159 repositories)
- Endpoint inaccessible (erreur 502)

**Après :**
- 0 dataset corrompu  
- Endpoint fonctionnel avec gestion robuste
- Prévention des corruptions futures 