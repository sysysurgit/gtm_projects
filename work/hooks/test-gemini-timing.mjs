import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const envLocal = fs.readFileSync("./.env.local", "utf8");
const apiKey = envLocal.match(/^GEMINI_API_KEY=(.*)$/m)[1].trim();
const gemini = new GoogleGenAI({ apiKey });

const responseSchema = {
  type: Type.ARRAY,
  minItems: "3",
  maxItems: "5",
  items: {
    type: Type.OBJECT,
    properties: {
      angle: { type: Type.STRING },
      title: { type: Type.STRING, description: "Le hook — UNE SEULE phrase courte qui arrête le scroll. Jamais deux phrases collées par un point : une seule idée, pas un chapô d'article." },
      description: { type: Type.STRING },
      cta: { type: Type.STRING },
    },
    required: ["angle", "title"],
  },
};

const systemPrompt = `Tu es un copywriter direct-response senior, spécialisé en publicité payante B2B (LinkedIn, Meta, Google, Reddit Ads). Tu ne produis JAMAIS de paragraphe marketing générique — un hook est UNE ligne qui arrête le scroll, pas une présentation produit.

RÈGLE ABSOLUE SUR LE "title" — LA PLUS IMPORTANTE DE CE PROMPT :
Le title est UNE SEULE phrase, UNE SEULE idée. JAMAIS deux phrases collées par un point. Si tu as deux idées, la deuxième va dans "description", jamais dans "title".

❌ MAUVAIS (deux phrases, ressemble à un titre d'article, pas à un hook) :
"Vos salariés ignorent les e-learnings de 45 minutes. Passez aux micro-trainings de 3 minutes sur Slack et Teams."

✅ BON (une seule phrase, courte, qui arrête le scroll) :
"0 erreur sur 14 200 bulletins de paie en 2023."
"Vos commerciaux perdent 3h/semaine sur des devis manuels."

Techniques : AIDA, PAS, Before-After-Bridge, curiosity gap, pattern interrupt, preuve sociale, direct-response, urgence/FOMO, spécificité.

Régie : LinkedIn Ads — Format : Image unique
Le title est le texte d'intro affiché au-dessus du visuel (LinkedIn tronque vers 150 caractères, mais un hook efficace tient en 90 : une seule idée, jamais deux). La description est la ligne courte affichée sous le visuel (headline LinkedIn).

Méthode de travail obligatoire : pour chaque angle, rédige d'abord un brouillon, critique-le toi-même honnêtement, puis retravaille-le jusqu'à ce qu'il soit vraiment bon — en particulier, vérifie que le title n'est jamais devenu deux phrases collées. Ne renvoie que le résultat final retravaillé. Génère entre 3 et 5 cards.

Contraintes strictes : title ≤ 90 caractères, description ≤ 70 caractères, cta ≤ 40 caractères.`;

const userPrompt = `Brief annonceur :
RÉGIE : LinkedIn Ads (Image unique)
Budget média : 1000-5000€/mois
Étape du funnel : Consideration

MON PRODUIT
- Industrie / secteur : SaaS RH
- Produit / offre : Outil de paie automatisée pour PME
- Fonctionnalités clés : Calcul automatique, DSN, virements en 1 clic
- Preuves de crédibilité : 0 erreur sur 14200 bulletins en 2023

MA CIBLE
- Persona : VP Sales scale-up B2B 80 salariés
- Rêves / objectifs recherchés : Scaler sans complexifier la RH
- Douleurs & objections actuelles : Peur de migrer les données, trop cher

CONCURRENCE
- Ce que les concurrents apportent : Prix d'appel bas, intégration Slack
- Ce qu'ils n'ont pas / leurs limites : Pas de DSN automatique, support lent

Génère entre 3 et 5 cards.`;

async function run(label, config) {
  const t0 = Date.now();
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema,
        maxOutputTokens: 4096,
        ...config,
      },
    });
    const elapsed = (Date.now() - t0) / 1000;
    const u = response.usageMetadata;
    let cards;
    let parseError = null;
    try {
      cards = JSON.parse(response.text || "[]");
    } catch (e) {
      parseError = e.message;
    }
    console.log(
      `[${label}] ${elapsed.toFixed(1)}s think=${u?.thoughtsTokenCount ?? 0} out=${u?.candidatesTokenCount ?? 0}${parseError ? " PARSE_ERROR: " + parseError.slice(0, 80) : " cards=" + cards.length}`
    );
    if (cards) {
      for (const c of cards) console.log(`     [${c.title.length}c] "${c.title}"`);
    }
    return { elapsed, ok: !parseError };
  } catch (e) {
    const elapsed = (Date.now() - t0) / 1000;
    console.log(`[${label}] ${elapsed.toFixed(1)}s FAILED: ${e.message?.slice(0, 150)}`);
    return { elapsed, ok: false };
  }
}

const TRIALS = 3;
for (const [label, config] of [
  ["automatic(-1)", { thinkingConfig: { thinkingBudget: -1 } }],
  ["budget(1024)", { thinkingConfig: { thinkingBudget: 1024 } }],
  ["budget(512)", { thinkingConfig: { thinkingBudget: 512 } }],
]) {
  console.log(`\n=== ${label} — ${TRIALS} trials ===`);
  for (let i = 0; i < TRIALS; i++) {
    await run(`${label} #${i + 1}`, config);
  }
}
