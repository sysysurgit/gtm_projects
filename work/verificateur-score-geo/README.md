# Vérificateur de Score GEO

On entre une URL, l'outil audite sa visibilité dans les réponses des moteurs IA (ChatGPT, Perplexity, Claude) et sort un score /100 avec un détail par catégorie, plus un badge copiable pour le partager.

**Score (idée)** : 79/100 (Facilité 55 · Viralité 90 · Utilité 80 · Différenciation 80)

## Comment le score est calculé

- **Structure du contenu (/20)** — H1 unique, meta description, longueur du contenu.
- **Données structurées (/25)** — JSON-LD présent, schema FAQPage, autres types utiles (Organization, Article, Product...).
- **Clarté des réponses (/20)** — sous-titres formulés en question, listes structurées.
- **Autorité & citabilité (/15)** — date de publication, auteur identifié, liens sortants vers des sources.
- **Clarté d'entité (/20, optionnel)** — évaluation qualitative par Claude : un moteur de réponse IA pourrait-il citer précisément de quoi parle la page ? Nécessite `ANTHROPIC_API_KEY`.

Sans clé API, les 4 premières catégories tournent quand même (score plafonné sous 100) — la clé n'est nécessaire que pour la partie IA.

## Getting Started

```bash
cp .env.example .env.local   # puis renseigner ANTHROPIC_API_KEY (optionnel)
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Analyse HTML côté serveur via `cheerio`, appel optionnel à l'API Claude (`@anthropic-ai/sdk`) pour la clarté d'entité.

## Sécurité

La route `/api/analyze` fait un `fetch` server-side sur une URL fournie par l'utilisateur (risque SSRF classique). Protections en place : whitelist de protocoles (`http`/`https`), rejet des hostnames privés/loopback, résolution DNS + vérification de l'IP résolue avant la requête, timeout de 10s, taille de réponse plafonnée. Ce n'est pas un blindage complet (pas de protection contre le DNS rebinding entre la vérification et le fetch) — à durcir avant un déploiement à fort trafic public.
