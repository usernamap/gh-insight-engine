
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const DOC_FILE = path.join(DOCS_DIR, 'AI_CLASSIFICATION_GUIDE.md');

const DOC_CONTENT = `# 🧠 Guide de Maintenance : Classification IA des Langages

Ce document explique comment gérer, mettre à jour et dépanner le système de classification automatique des langages via OpenAI.

## 📌 Architecture
Le système utilise l'IA (GPT-5-mini) pour classer dynamiquement les langages détectés dans les dépôts GitHub en catégories d'expertise (Frontend, Backend, DevOps, etc.).

- **Service** : \`src/services/LanguageCategoryAIService.ts\`
- **Modèle** : \`gpt-5-mini\`
- **Cache** : En mémoire (RAM) - duréé 24h.

## 🛠️ Comment mettre à jour les règles ?

### 1. Modifier les Catégories ou le Prompt
Toute la logique de classification réside dans le **System Prompt** défini dans le code.

**Fichier** : \`src/services/LanguageCategoryAIService.ts\`

Recherchez la constante \`AI_CLASSIFICATION_CONSTANTS\` :

\`\`\`typescript
const AI_CLASSIFICATION_CONSTANTS = {
    // ...
    SYSTEM_PROMPT: \`You are an expert developer skill classifier...
    
    SUGGESTED CATEGORIES:
    - frontend: ...
    - backend: ...
    // AJOUTER OU MODIFIER ICI
    - nouvelle_cat: Description...
    \`
}
\`\`\`

Pour forcer le système à utiliser une nouvelle catégorie, ajoutez-la simplement à la liste \`SUGGESTED CATEGORIES\` dans le prompt. L'IA la prendra en compte au prochain rafraîchissement.

### 2. Ajuster le Modèle (Coût/Performance)
Vous pouvez changer le modèle utilisé (ex: passer à GPT-4o ou GPT-3.5-turbo) dans le même fichier :

\`\`\`typescript
MODEL: 'gpt-5-mini', // Modifier ici
\`\`\`

## 🔄 Forcer la Mise à Jour (Vider le Cache)
Le résultat est mis en cache pour **24 heures** pour éviter de payer l'API à chaque requête.

Pour forcer une re-classification immédiate :
1.  **Redémarrer le serveur** (le cache est en RAM, il sera vidé).
2.  Lancer une synchronisation des données utilisateur.

## ⚠️ Dépannage

### Erreur "Invalid schema"
Si OpenAI renvoie une erreur de schéma (400), assurez-vous que la structure \`zodTextFormat\` dans \`performAIClassification\` correspond strictement aux attentes (notamment l'utilisation de \`z.array\` au lieu de dictionnaires dynamiques).

### Erreur "OpenAI client not available"
Vérifiez que la variable d'environnement est bien définie dans \`.env\` :
\`\`\`bash
OPENAI_API_KEY=sk-...
\`\`\`

### Fallback (Mode Secours)
Si l'IA échoue (quota dépassé, erreur réseau), le système bascule automatiquement sur une classification "hardcodée" (fonction \`generateFallbackClassification\`). Les catégories seront plus basiques mais le système continuera de fonctionner.
`;

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Write file
fs.writeFileSync(DOC_FILE, DOC_CONTENT);

console.log(`✅ Documentation générée avec succès : ${DOC_FILE}`);
