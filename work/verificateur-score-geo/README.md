# Vérificateur de Score GEO

On entre une URL — une page ou un site entier — l'outil audite sa visibilité dans les réponses des moteurs IA (ChatGPT, Perplexity, Claude) et sort un score /100 avec un détail par catégorie, plus un badge copiable pour le partager.

**Score (idée)** : 79/100 (Facilité 55 · Viralité 90 · Utilité 80 · Différenciation 80)

## Deux modes

- **Une page** — analyse immédiate d'une URL unique.
- **Site entier** — découvre les pages du site via `sitemap.xml`/`robots.txt` (repli sur les liens de la page d'accueil si pas de sitemap), sélectionne un échantillon représentatif de 20 pages (voir ci-dessous), puis analyse chaque page indépendamment et agrège en score de site (moyenne, moyennes par catégorie, pages les plus faibles à améliorer en priorité). Le crawl est orchestré côté client (chaque page = un appel séparé à `/api/analyze`) pour rester dans les limites de durée des fonctions serverless.

### Sélection des 20 pages

Un site peut avoir des centaines de pages ; prendre les 20 premières trouvées dans le sitemap donnerait un échantillon biaisé (souvent une avalanche d'articles de blog). À la place :

1. Chaque URL découverte est classée par mot-clé d'URL en une catégorie : Accueil, Pricing, Produit, Ressources, À propos, Carrières, Contact, Légal, Autre — aucun appel réseau ni IA, juste une lecture du chemin. Le matching se fait sur des tokens entiers de chemin (segments séparés par `/`, `-`, `_`), jamais en sous-chaîne libre, pour éviter par exemple qu'un article `/news/electricity-price-increases` soit classé "pricing" à cause du mot "price" isolé dans le slug.
2. Un quota par catégorie (accueil : 1, pricing : 2, produit : 4, ressources : 5, à propos : 1, carrières : 1, contact : 1, légal : 0 par défaut) garantit un échantillon représentatif de la structure du site.
3. Les places restantes sont comblées en priorité par la catégorie "Autre" (souvent les pages de contenu individuelles — fiches produit, articles — les plus rentables à auditer), les pages légales/boilerplate n'étant piochées qu'en tout dernier recours.
4. Au sein d'une catégorie, les chemins les plus courts sont préférés (proxy pour "plus proche de la racine = plus probablement important").

## Comment le score est calculé

Pondération sur 100 points, répartie ainsi (voir le panneau « Méthodologie & sources » dans l'app pour le détail) :

- **Structure du contenu (/10)** — H1 unique, meta description, longueur du contenu.
- **Données structurées (/15)** — JSON-LD présent, schema FAQPage, autres types utiles (Organization, Article, Product...). Source : documentation Google Search Central sur les données structurées.
- **Citations, statistiques & sources (/25)** — liens sortants vers des sources externes, données chiffrées, citations/verbatims. C'est la catégorie la plus lourde : selon l'étude *« GEO: Generative Engine Optimization »* (Aggarwal et al., 2023, arXiv:2311.09735), citer des sources et ajouter des statistiques est le levier avec le plus fort impact sur la visibilité dans les réponses générées — contrairement au bourrage de mots-clés, qui n'a quasi aucun effet.
- **Clarté des réponses (/15)** — sous-titres formulés en question, listes structurées.
- **Fraîcheur & auteur (/10)** — date de publication, auteur identifié. Source : guide E-E-A-T de Google.
- **Clarté d'entité (/25, optionnel)** — évaluation qualitative par Claude : un moteur de réponse IA pourrait-il citer précisément de quoi parle la page ? Nécessite `ANTHROPIC_API_KEY`.

Sans clé API, les 5 premières catégories tournent quand même (score plafonné à 75/100) — la clé n'est nécessaire que pour la partie IA.

Limite assumée : c'est une approximation heuristique basée sur la littérature publiée, pas une mesure garantie — aucun outil externe ne peut connaître la citabilité réelle d'une page dans un moteur IA donné sans accès à ses journaux internes.

## Getting Started

```bash
cp .env.example .env.local   # puis renseigner ANTHROPIC_API_KEY (optionnel)
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Analyse HTML côté serveur via `cheerio`, appel optionnel à l'API Claude (`@anthropic-ai/sdk`) pour la clarté d'entité. Découverte de pages via `robots.txt` + `sitemap.xml` (parsing XML avec `cheerio` en mode xmlMode).

## Sécurité

Les routes `/api/analyze` et `/api/discover` font des `fetch` server-side sur des URLs fournies par l'utilisateur (risque SSRF classique). Protections en place : whitelist de protocoles (`http`/`https`), rejet des hostnames privés/loopback, résolution DNS + vérification de l'IP résolue avant la requête, timeout de 10s (8s pour le crawl), taille de réponse plafonnée. Ce n'est pas un blindage complet (pas de protection contre le DNS rebinding entre la vérification et le fetch) — à durcir avant un déploiement à fort trafic public.

Aucune limitation de débit n'est en place sur les deux routes : un usage public à fort trafic consommerait rapidement le crédit API Anthropic configuré côté serveur — à ajouter avant une mise en avant large (ex. Upstash Redis).
