## 🚦 Règle de Qualité Absolue

**Ce projet impose le respect intransigeant de toutes les règles TypeScript (mode strict) et ESLint (voir eslint.config.js).**

- **Aucune erreur ESLint ni TypeScript n’est tolérée** (strict-boolean-expressions, nullish checks, typage explicite, optional chaining, etc.).
- **Toute contribution doit passer la CI sans le moindre warning ou erreur.**
- **Les PRs non conformes sont systématiquement refusées.**
- **Exception : dans de très rares cas, si une règle ESLint empêche une logique réellement indispensable, il est permis d’utiliser ponctuellement `// eslint-disable-next-line [règle]`** — mais uniquement si la dérogation est justifiée, commentée, et validée lors de la revue de code.

_La rigueur sur la qualité de code est une exigence fondamentale pour la sécurité, la maintenabilité et la robustesse du projet._

