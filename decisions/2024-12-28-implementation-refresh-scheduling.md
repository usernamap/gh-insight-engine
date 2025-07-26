# Décision d'implémentation : Endpoint Refresh et Système de Scheduling

**Date :** 28 décembre 2024  
**Statut :** ✅ Implémenté  
**Contexte :** Demande utilisateur d'endpoint unifié et de scheduling automatique

## Problème résolu

L'utilisateur souhaitait :
1. Un endpoint unique `POST /refresh/{username}` pour mettre à jour toutes les données d'un utilisateur
2. Un système de scheduling automatique configurable pour maintenir les données à jour

## Architecture implémentée

### 1. RefreshController (`src/controllers/RefreshController.ts`)

**Fonctionnalités :**
- Endpoint `POST /api/refresh/{username}`
- Enchaînement séquentiel : `users` → `repositories` → `ai`
- Gestion robuste des erreurs avec rapport détaillé
- Logging complet de chaque étape
- Statut HTTP 207 (Multi-Status) en cas de succès partiel

**Interface de réponse :**
```typescript
interface RefreshResponse {
  success: boolean;
  message: string;
  username: string;
  totalDuration: number;
  steps: RefreshStepResult[];
  completedSteps: number;
  failedAt?: string;
}
```

### 2. SchedulingService (`src/services/SchedulingService.ts`)

**Fonctionnalités :**
- Pattern Singleton pour instance unique
- Configuration via variables d'environnement
- Support fréquences : `daily`, `weekly`, `monthly`
- Intégration node-cron avec timezone personnalisée
- Arrêt/redémarrage gracieux
- Monitoring et logs détaillés

**Configuration requise :**
```env
SCHEDULE_ENABLED=true|false
SCHEDULE_FREQUENCY=daily|weekly|monthly
SCHEDULE_TIME=HH:MM (ex: 02:00)
SCHEDULE_TIMEZONE=Europe/Paris
SCHEDULE_AUTH_TOKEN=jwt_token_for_api_calls
```

## Décisions techniques

### Gestion des erreurs de l'endpoint refresh

1. **Échec étape `users`** → Arrêt immédiat, aucune donnée sauvée
2. **Échec étape `repositories`** → Données user conservées, statut 207
3. **Échec étape `ai`** → Données GitHub conservées, statut 207

**Justification :** Les données GitHub ont plus de valeur que l'analyse IA qui peut être relancée facilement.

### Pattern d'appel des controllers

Utilisation de mock responses plutôt que d'appels HTTP internes :
```typescript
const mockRes = {
  status: (code: number) => mockRes,
  json: (data: any) => data,
} as any;

await UserController.collectUserData(req, mockRes);
```

**Justification :** Plus efficace qu'un appel HTTP, évite les problèmes de ports et de networking.

### Scheduling avec node-cron

- **Expression cron dynamique** selon la fréquence
- **Timezone configurable** pour exécution précise
- **Timeout 10 minutes** pour éviter les blocages
- **Logging différencié** success/error avec détails

## Sécurité

1. **Authentification requise** pour l'endpoint refresh
2. **Autorisation stricte** : utilisateur ne peut rafraîchir que ses propres données
3. **Token dédié** pour le scheduling automatique
4. **Validation des paramètres** username avec regex GitHub

## Intégration

### Routes
- Ajout dans `src/routes/index.ts`
- Documentation OpenAPI complète
- Export pour tests unitaires

### Application lifecycle
- Démarrage automatique dans `src/app.ts`
- Arrêt gracieux dans `gracefulShutdown()`
- Logs de statut au démarrage

### Variables d'environnement
```env
# Nouveau bloc ajouté
SCHEDULE_ENABLED=false
SCHEDULE_FREQUENCY=weekly
SCHEDULE_TIME=02:00
SCHEDULE_TIMEZONE=Europe/Paris
SCHEDULE_AUTH_TOKEN=
```

## Bénéfices

1. **Endpoint unifié** : Une seule requête pour tout mettre à jour
2. **Robustesse** : Gestion d'erreurs avec succès partiel
3. **Automatisation** : Maintenance des données sans intervention
4. **Flexibilité** : Configuration adaptable aux besoins
5. **Monitoring** : Logs détaillés pour debugging
6. **Performance** : Pas de surcharge réseau interne

## Tests et validation

- ✅ Endpoint refresh fonctionnel avec gestion d'erreurs
- ✅ Service de scheduling configurable
- ✅ Intégration dans le cycle de vie de l'application
- ✅ Documentation OpenAPI complète
- ✅ Conformité ESLint et TypeScript strict

## Impact sur l'architecture

- **Nouveau controller** : RefreshController
- **Nouveau service** : SchedulingService  
- **Nouvelle route** : `/api/refresh/{username}`
- **Nouvelles dépendances** : `node-cron`, `@types/node-cron`
- **Variables d'environnement** : 5 nouvelles variables

## Conclusion

Implémentation réussie répondant parfaitement aux besoins utilisateur :
- Endpoint unifié opérationnel
- Scheduling automatique configurable
- Architecture cohérente avec l'existant
- Gestion d'erreurs robuste
- Documentation complète 