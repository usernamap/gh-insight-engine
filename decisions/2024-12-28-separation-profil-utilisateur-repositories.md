# Décision Architecturale: Séparation Profil Utilisateur et Repositories

**Date**: 2024-12-28  
**Statut**: En cours d'implémentation  
**Contexte**: Optimisation API et cohérence architecturale  

## Problème

Actuellement, les endpoints `POST/GET /api/users/{username}` récupèrent et retournent à la fois:
1. Le profil utilisateur complet
2. Tous les repositories de l'utilisateur avec enrichissement DevOps complet

Cela pose plusieurs problèmes:
- **Performance**: Requêtes lourdes et lentes 
- **Cohérence**: Redondance avec les endpoints `/api/repositories/{username}`
- **Architecture**: Mélange des responsabilités
- **Optimisation GitHub API**: Trop de calls API pour récupérer des données non nécessaires

## Solution Décidée

### Séparation claire des responsabilités:

#### Endpoints Users (`/api/users/{username}`)
- **Objectif**: Profil utilisateur uniquement
- **Données**: Informations de base GitHub + totaux agrégés 
- **Repositories**: AUCUN repository individuel retourné
- **Totaux seulement**: `public_repos`, `private_repos`, `total_private_repos`, etc.

#### Endpoints Repositories (`/api/repositories/{username}`) 
- **Objectif**: Repositories avec analyses DevOps complètes
- **Données**: Liste des repositories enrichis + métadonnées
- **Profil**: Référence minimal vers le profil utilisateur

## Modifications Techniques

### 1. Types GitHub
- Mettre à jour `UserProfile` pour refléter exactement l'API GitHub officielle
- Ajouter tous les champs manquants de l'API REST GitHub
- Inclure les champs privés conditionnels (`private_gists`, `total_private_repos`, etc.)

### 2. Schéma Base de Données
```prisma
model User {
  // Tous les champs de l'API GitHub REST
  login                    String   @unique
  id                      Int      // GitHub ID
  node_id                 String
  avatar_url              String
  gravatar_id             String?
  url                     String
  html_url                String
  type                    String
  site_admin              Boolean
  name                    String?
  company                 String?
  blog                    String?
  location                String?
  email                   String?
  hireable                Boolean?
  bio                     String?
  twitter_username        String?
  public_repos            Int
  public_gists            Int
  followers               Int
  following               Int
  created_at              DateTime
  updated_at              DateTime
  
  // Champs privés (seulement si propriétaire)
  private_gists           Int?
  total_private_repos     Int?
  owned_private_repos     Int?
  disk_usage              Int?
  collaborators           Int?
  two_factor_authentication Boolean?
  plan                    Json?    // Plan GitHub
  
  // Relations (inchangées)
  repositories            Repository[]
  datasets                Dataset[]
}
```

### 3. UserController Modifications

#### `collectUserData` (POST)
- Récupérer SEULEMENT le profil utilisateur depuis GitHub API
- Stocker le profil avec tous les champs GitHub
- NE PAS récupérer ni stocker les repositories
- Retourner confirmation + totaux du profil

#### `getUserProfile` (GET)  
- Retourner SEULEMENT le profil utilisateur depuis la DB
- Inclure tous les totaux (`public_repos`, `private_repos`, etc.)
- NE PAS inclure la liste des repositories
- Filtrage des données privées si pas propriétaire

### 4. UserModel Modifications
- Supprimer `include: { repositories: ... }` dans `findByLogin`
- Garder seulement le profil utilisateur de base
- Pas de récupération automatique des repositories

### 5. GitHubService Modifications
- Séparer `getUserProfile()` et `getUserRepos()`
- `getUserProfile()` utilise GET /user ou GET /users/{username}
- Retourner exactement la structure API GitHub REST

## Avantages

1. **Performance**: Endpoints users ultra-rapides
2. **Cohérence**: Responsabilités claires et séparées  
3. **Optimisation API GitHub**: Moins d'appels, requêtes ciblées
4. **Scalabilité**: Pagination naturelle des repositories
5. **Architecture**: Respect du principe de responsabilité unique

## Impact

### Changements Breaking
- Les réponses des endpoints users ne contiendront plus les repositories
- Les clients devront utiliser `/api/repositories/{username}` pour les repositories

### Migration
- Mise à jour de la documentation OpenAPI
- Communication des changements aux clients API
- Versioning si nécessaire

## Structure de Réponse

### GET/POST /api/users/{username}
```json
{
  "userProfile": {
    "login": "octocat",
    "id": 1,
    "node_id": "MDQ6VXNlcjE=",
    "avatar_url": "https://github.com/images/error/octocat_happy.gif",
    "name": "monalisa octocat",
    "company": "GitHub",
    "blog": "https://github.com/blog",
    "location": "San Francisco", 
    "email": "octocat@github.com",
    "hireable": false,
    "bio": "There once was...",
    "twitter_username": "monatheoctocat",
    "public_repos": 2,
    "public_gists": 1,
    "followers": 20,
    "following": 0,
    "created_at": "2008-01-14T04:33:35Z",
    "updated_at": "2008-01-14T04:33:35Z",
    // Champs privés si propriétaire
    "private_gists": 81,
    "total_private_repos": 100,
    "owned_private_repos": 100,
    "disk_usage": 10000,
    "collaborators": 8,
    "two_factor_authentication": true,
    "plan": {
      "name": "Medium",
      "space": 400,
      "private_repos": 20,
      "collaborators": 0
    }
  },
  "metadata": {
    "dataSource": "database",
    "dataAge": 2,
    "isStale": false,
    "accessLevel": "full",
    "collectedAt": "2024-12-28T10:00:00Z"
  },
  "timestamp": "2024-12-28T10:00:00Z"
}
```

### GET /api/repositories/{username}
```json
{
  "repositories": [...], // Liste complète des repositories enrichis
  "metadata": {
    "username": "octocat",
    "totalRepositories": 25,
    "dataSource": "database",
    "breakdown": {
      "public": 20,
      "private": 5,
      "forks": 3,
      "archived": 1
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "hasNextPage": true
  }
}
```

## Validation

- [ ] Types GitHub conformes à l'API REST officielle
- [ ] Schéma Prisma mis à jour
- [ ] UserController séparé et optimisé  
- [ ] UserModel sans inclusion repositories
- [ ] GitHubService séparé
- [ ] OpenAPI spec mise à jour
- [ ] Tests passants
- [ ] Documentation à jour 